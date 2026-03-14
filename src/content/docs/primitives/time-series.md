---
title: Time-Series
description: Columnar time-series storage with InfluxDB line protocol, structured queries, FloQL pipelines, retention policies, and downsampling.
---

Flo includes a built-in time-series engine for metrics, telemetry, and IoT data. It supports single-point writes, batch ingestion via InfluxDB line protocol, structured aggregation queries, and FloQL — a pipeline query language for advanced analytics. All writes are Raft-replicated.

## Core Concepts

Each data point consists of four components:

- **Measurement** — The metric name (e.g., `cpu`, `memory`, `http_requests`)
- **Tags** — Indexed key-value pairs for filtering (e.g., `host=web-01,region=us-east`)
- **Fields** — The actual metric values. A single value uses the default field name `value`; multi-field writes name each field explicitly (e.g., `user=72.5,system=7.4`)
- **Timestamp** — Millisecond precision. Defaults to server time when omitted.

A **series** is the unique combination of measurement + tag set + field name. Each series maintains its own write buffer and block chain.

## Writing Data

### Single Point

```bash
# Write a single value (field name defaults to "value")
flo ts write cpu --tags host=web-01,region=us-east --value 82.5

# Write with an explicit timestamp (milliseconds since epoch)
flo ts write cpu --tags host=web-01 --value 72.5 --timestamp 1708700400000

# Write with no tags
flo ts write global_metric --value 99.9
```

### Multi-Field

Write multiple named fields in a single data point:

```bash
flo ts write cpu --tags host=web-01 --fields "user=72.5,system=7.4,idle=20.1"
```

Each field creates a separate series under the same measurement and tag set. Query individual fields with `--field`.

### Batch Write (InfluxDB Line Protocol)

Ingest many points at once using InfluxDB line protocol format:

```
measurement,tag1=val1,tag2=val2 field1=value1,field2=value2 [timestamp]
```

```bash
# From a file
flo ts write --batch --file /path/to/data.txt --precision ms

# From stdin
cat data.txt | flo ts write --batch --precision ns
```

The `--precision` flag specifies the timestamp unit in the payload:

| Precision | Description | Conversion |
|-----------|-------------|------------|
| `ns` | Nanoseconds (InfluxDB default) | ÷ 1,000,000 |
| `us` | Microseconds | ÷ 1,000 |
| `ms` | Milliseconds (Flo default) | identity |
| `s` | Seconds | × 1,000 |

Field types: float values are stored natively, integers (suffix `i`) are converted to `f64`, booleans become `0.0`/`1.0`. String fields are not supported.

## Reading Data

### Raw Reads

Retrieve individual data points within a time range:

```bash
# Read last hour of CPU data for host web-01
flo ts read cpu --tags host=web-01 --from -1h

# Read a specific time range
flo ts read cpu --tags host=web-01 --from 1708700000000 --to 1708700500000

# Read a specific field
flo ts read cpu --tags host=web-01 --field system --from -1h

# Limit results
flo ts read cpu --tags host=web-01 --from -1h --limit 100

# Output as JSON
flo ts read cpu --tags host=web-01 --from -1h --format json
```

The `--from` and `--to` flags accept relative durations (`-1h`, `-30m`, `-7d`) or absolute epoch-millisecond timestamps.

### Structured Queries

Aggregate data over time windows using built-in functions:

```bash
# Average CPU usage over 5-minute windows in the last hour
flo ts query cpu --tags host=web-01 --from -1h --window 5m --agg avg

# Sum of HTTP requests over 1-minute windows
flo ts query http_requests --tags method=GET --from -1h --window 1m --agg sum

# Count points per 10-minute window
flo ts query cpu --tags host=web-01 --from -6h --window 10m --agg count

# Min and max
flo ts query temperature --tags sensor=A1 --from -24h --window 1h --agg min
flo ts query temperature --tags sensor=A1 --from -24h --window 1h --agg max
```

| Flag | Default | Description |
|------|---------|-------------|
| `--agg` | `avg` | Aggregation function: `avg`, `sum`, `count`, `min`, `max` |
| `--window` | `1m` | Window size: `Ns`, `Nm`, `Nh`, `Nd` |
| `--from` | `-1h` | Start time (relative or epoch ms) |
| `--to` | now | End time |

### Output Formats

All read and query commands support three output formats via `--format`:

- **table** (default) — Formatted columns with headers
- **json** — JSON array with `timestamp_ms` and `value` fields
- **raw** — Space-separated `timestamp value` per line, suitable for piping

## FloQL

FloQL is Flo's pipeline query language for time-series analytics. It combines source selection, filtering, windowing, aggregation, and transformation in a single expression:

```bash
# Average CPU usage over 5-minute windows in the last hour
flo ts floql "cpu{host=web-01}[1h] | window(5m) | avg()"

# Rate of change per minute
flo ts floql "http_requests{method=GET}[1h] | rate(1m)"

# Filter, window, aggregate, and transform
flo ts floql "cpu{region=us-east}[6h] | window(15m) | max() | where(value > 90)"

# Group by tag, then aggregate
flo ts floql "cpu[1h] | group_by(host) | window(5m) | avg()"

# Arithmetic transformation
flo ts floql "temperature{unit=celsius}[24h] | math(value * 1.8 + 32) | alias(fahrenheit)"
```

### Source Syntax

```
measurement{tag_filters}[time_range]
```

- **Measurement** — Metric name (required)
- **Tag filters** — Optional. Comma-separated `key=value` pairs inside `{}`
- **Time range** — Required. Duration (`[1h]`), absolute range (`[1708700000000..1708800000000]`), or omit brackets for default 1h

### Tag Filter Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `=` | Equals | `{host=web-01}` |
| `!=` | Not equals | `{env!=staging}` |
| `=~` | Regex match | `{host=~web-.*}` |
| `!~` | Regex not match | `{path!~health}` |

Multiple filters are comma-separated: `{host=web-01,region=us-east}`

### Time Range Formats

| Format | Example | Description |
|--------|---------|-------------|
| Duration | `[1h]` | Last N units from now |
| Duration units | `[30s]`, `[5m]`, `[1h]`, `[7d]` | Seconds, minutes, hours, days |
| Absolute | `[1708700000000..1708800000000]` | Epoch millisecond range |

### Pipeline Stages

Stages are chained with `|` and executed left to right. Each stage transforms a set of series:

| Stage | Syntax | Description |
|-------|--------|-------------|
| `window` | `window(5m)` | Bucket points into time windows |
| `avg` | `avg()` | Mean value per window |
| `sum` | `sum()` | Sum per window |
| `count` | `count()` | Count per window |
| `min` | `min()` | Minimum per window |
| `max` | `max()` | Maximum per window |
| `first` | `first()` | First value per window |
| `last` | `last()` | Last value per window |
| `percentile` | `percentile(99)` | Nth percentile (0–100) |
| `rate` | `rate(1m)` | Per-second rate of change |
| `delta` | `delta()` | Difference between consecutive points |
| `where` | `where(value > 90)` | Filter points by value |
| `group_by` | `group_by(host)` | Split series by tag value |
| `topk` | `topk(5)` | Keep top K series by value |
| `bottomk` | `bottomk(5)` | Keep bottom K series by value |
| `math` | `math(value * 100)` | Arithmetic: `+`, `-`, `*`, `/`, `%` |
| `field` | `field(system)` | Select a specific field name |
| `alias` | `alias(cpu_avg)` | Rename the output series |
| `abs` | `abs()` | Absolute value |
| `ceil` | `ceil()` | Ceiling |
| `floor` | `floor()` | Floor |
| `round` | `round(2)` | Round to N decimal places |

A typical query chains `window()` → aggregation → optional post-processing:

```
cpu{host=web-01}[1h] | window(5m) | avg() | where(value > 80) | round(2)
```

## Managing Data

### List Measurements

```bash
# List all measurements
flo ts list
flo ts ls

# List series under a specific measurement
flo ts list cpu

# Show field names for a measurement
flo ts list cpu --fields

# Limit results
flo ts list --limit 50

# JSON output
flo ts list --format json
```

### Delete

```bash
# Delete an entire measurement (requires --confirm)
flo ts delete cpu --confirm

# Delete a specific series by tag
flo ts delete cpu --tags host=web-01 --confirm
```

Without `--confirm`, the delete command fails with an error — this prevents accidental data loss.

### Retention & Downsampling

Set retention policies to automatically age out raw data and optionally create downsampled rollups:

```bash
# Keep raw data for 7 days
flo ts retention cpu --raw-ttl 7d

# Keep raw for 7 days, downsample to 1-minute averages for 30 days
flo ts retention cpu --raw-ttl 7d --downsample 1m:avg:30d

# Show current retention policy
flo ts retention cpu --show
```

The `--downsample` rule format is `interval:aggregation:ttl`:
- **interval** — Window size for rollup (e.g., `1m`, `5m`, `1h`)
- **aggregation** — Function to apply (`avg`, `sum`, `min`, `max`, `count`)
- **ttl** — How long to keep the downsampled data

## Namespace Isolation

Time-series data is isolated by namespace. The same measurement name in different namespaces contains independent data:

```bash
flo ts write cpu --tags host=web-01 --value 82.5 -n production
flo ts write cpu --tags host=web-01 --value 45.0 -n staging

# Each namespace has its own data
flo ts read cpu --tags host=web-01 --from -1h -n production
flo ts read cpu --tags host=web-01 --from -1h -n staging
```

## Durability

- All writes are Raft-replicated before the response is sent
- On recovery, the TS Projection replays committed UAL entries (`ts_write`, `ts_write_batch`) to rebuild in-memory state
- Write buffers are rebuilt from the UAL — no separate WAL for time-series data

## How It Works

The TS Projection uses columnar storage optimized for time-series access patterns:

- **Write buffers** — Per-series, per-field in-memory buffers (1,024 points capacity). When full, flushed to an immutable columnar block.
- **Columnar blocks** — Store timestamps and values separately for compression and vectorized aggregation. Each block tracks its min/max timestamp and point count.
- **Block index** — Maps `(series_hash, field_hash, time_range)` → `(block)` for fast range lookups.
- **Series key** — Each series is identified by `measurement + "\0" + field_name`, with tag sets hashed for routing.

Queries scan both the active write buffer and flushed blocks. Aggregation functions (avg, sum, min, max, count) operate directly on the columnar layout.

See [Storage Internals](/docs/architecture/storage/) for details.
