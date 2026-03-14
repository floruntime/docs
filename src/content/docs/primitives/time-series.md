---
title: Time-Series
description: Columnar time-series storage with InfluxDB line protocol and FloQL query language.
---

Flo includes a built-in time-series engine for metrics, telemetry, and IoT data. It accepts writes in InfluxDB line protocol format and queries via FloQL.

## Writing Data

### CLI

```bash
# InfluxDB line protocol: measurement tags fields
flo ts write cpu host=web-01,region=us-east usage=82.5,idle=17.5
flo ts write memory host=web-01 used=4096,total=8192
flo ts write http_requests host=web-01,method=GET,path=/api count=1523
```

### Line Protocol Format

```
measurement,tag1=val1,tag2=val2 field1=value1,field2=value2 [timestamp]
```

- **Measurement** — The metric name
- **Tags** — Indexed key-value pairs for filtering (comma-separated)
- **Fields** — The actual metric values (comma-separated)
- **Timestamp** — Optional, nanosecond precision. Defaults to server time.

## Querying Data

### FloQL

FloQL is Flo's query language for time-series data:

```bash
# Average CPU usage over 5-minute windows in the last hour
flo ts query "cpu{host=web-01}[1h] | avg(5m)"

# Max memory usage across all hosts
flo ts query "memory{region=us-east}[24h] | max(1h)"

# Count HTTP requests by method
flo ts query "http_requests{method=GET}[1h] | sum(5m)"
```

### Query Syntax

```
measurement{tag_filters}[time_range] | aggregation(window)
```

| Component | Example | Description |
|-----------|---------|-------------|
| Measurement | `cpu` | Metric name |
| Tag filter | `{host=web-01}` | Filter by tag values |
| Time range | `[1h]` | Lookback window (s, m, h, d) |
| Aggregation | `avg(5m)` | Aggregate function with window |

### Aggregation Functions

| Function | Description |
|----------|-------------|
| `avg(window)` | Mean value per window |
| `sum(window)` | Sum per window |
| `min(window)` | Minimum per window |
| `max(window)` | Maximum per window |
| `count(window)` | Count per window |
| `last(window)` | Last value per window |
| `first(window)` | First value per window |

## How It Works

Time-series data has different access patterns from KV/Queues — writes are append-only timestamped points, and reads are range scans over millions of points. The TS Projection uses:

- **Write buffers** — Per-series, per-field in-memory buffers. When full (1024 points or 10 seconds), flushed to a columnar block
- **Columnar blocks** — `.floc` files storing timestamps and values separately for compression and vectorized aggregation
- **Block index** — Maps `(series_hash, field_hash, time_range)` to `(file_id, offset, size)` for fast range lookups

Series metadata (measurement names, tag sets, field names) lives in the KV Projection under `_ts:meta:*` keys.

See [Storage Internals](/architecture/storage/) for details.
