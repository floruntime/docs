---
title: Stream Processing
description: Build continuous data pipelines with declarative YAML — filter, map, aggregate, enrich, window, and route data across streams, time-series, KV, and queues without leaving Flo.
---

Flo ships a **built-in stream processing engine** inspired by Apache Flink. Jobs are defined in YAML, submitted via the CLI or SDKs, and executed entirely inside the Flo node — no external cluster required. The engine reads from Flo streams or time-series measurements, transforms records through a chain of operators, and writes results to stream, time-series, KV, or queue sinks.

## Why Built-In Processing?

Traditional architectures pair a storage layer (Kafka, Redis) with a separate processing framework (Flink, Spark Streaming). This means two clusters to deploy, two failure domains to monitor, and serialization overhead at every boundary.

Flo eliminates that gap:

- **Zero-copy reads** — source records are read directly from the Unified Append Log, no network hop
- **Thread-per-shard execution** — each pipeline runs on the shard that owns the source partition, no cross-thread coordination
- **Integrated state** — operators can read and write Flo KV directly (e.g., `kv_lookup`), no external state store
- **Single deployment** — one binary, one config, one monitoring surface

## Core Concepts

### Jobs

A **job** is a long-running processing pipeline defined by a YAML file. Each job specifies:

| Field | Description |
|-------|-------------|
| `kind` | Always `Processing` |
| `name` | Human-readable job name |
| `namespace` | Namespace scope (default: `"default"`) |
| `parallelism` | Number of parallel task slots (default: `1`) |
| `batch_size` | Records to process per tick (default: `100`) |
| `sources` | Where to read data from |
| `sinks` | Where to write results to |
| `operators` | Transformation chain applied to every record |

### Records

The fundamental data unit flowing through a pipeline is a **ProcessingRecord**:

- **key** — optional partitioning key (empty = broadcast)
- **value** — payload bytes (typically JSON)
- **event_time_ms** — event timestamp used for windowing and watermarks
- **source** — origin stream name, partition, and offset for checkpoint tracking
- **headers** — optional key-value metadata

### Pipeline Topology

Pipelines are linear chains: **source → operator₁ → operator₂ → … → sink**. All operators in a chain execute on the same shard thread with zero-copy record passing (fused execution, mirroring Flink's operator chaining).

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Source   │───▶│  Filter  │───▶│  KeyBy   │───▶│ Aggregate│───▶│   Sink   │
│ (stream)  │    │          │    │          │    │          │    │ (stream) │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

## Job Definition (YAML)

Server-side job definitions use nested YAML or JSON. The examples below use YAML.

### Minimal Pipeline

The simplest pipeline: read a stream, write to another stream, no transformation:

```yaml
kind: Processing
name: user-events-pipe
namespace: analytics
parallelism: 1
batch_size: 100

sources:
  - name: input
    stream:
      name: payment-events
      namespace: analytics

sinks:
  - name: output
    stream:
      name: enriched-events
      namespace: analytics
```

The job continuously polls `payment-events` and appends every record to `enriched-events`.

### Full Example with Operators

```yaml
kind: Processing
name: order-analytics
namespace: production
parallelism: 4
batch_size: 200

sources:
  - name: orders
    stream:
      name: raw-orders
      namespace: production
      batch_size: 500

sinks:
  - name: output
    stream:
      name: order-totals
      namespace: production

operators:
  - type: filter
    name: completed-only
    condition: "value_contains:completed"

  - type: keyby
    name: by-customer
    key_expression: "$.customer_id"

  - type: aggregate
    name: hourly-total
    function: sum
    field: "$.amount"
    window: tumbling
    window_size: 3600
```

## Sources

Sources define where the pipeline reads data. Two source kinds are supported: **stream** and **time-series (ts)**.

### Stream Source

Reads records from a Flo stream, tracking offsets for exactly-once semantics:

```yaml
sources:
  - name: events
    stream:
      name: click-events
      namespace: production
      partitions: 0           # single partition (integer)
      batch_size: 500         # per-source override
```

#### Partition Selection

| Syntax | Behavior |
|--------|----------|
| `partitions: 0` | Read partition 0 only |
| `partitions: "0-63"` | Expand into one source per partition (64 sources) |
| `partitions: "0,3,7"` | Explicit partition list |
| `partitions: "all"` | Resolved at runtime from stream metadata |
| *(omitted)* | Defaults to partition 0 |

### Time-Series Source

Polls a TS measurement at a configurable interval, emitting data points as JSON records:

```yaml
sources:
  - name: cpu-metrics
    ts:
      measurement: cpu_usage
      namespace: production
      field: value              # field to read (default: "value")
      tags:                     # optional tag filter
        host: web-01
      poll_interval_ms: 1000    # polling interval (default: 1000)
```

Each emitted record looks like:

```json
{"measurement": "cpu_usage", "value": 72.5, "timestamp_ms": 1700000000000}
```

### Multi-Source Merge

Multiple sources are polled round-robin into the same pipeline:

```yaml
sources:
  - name: clicks
    stream:
      name: click-events
  - name: checkouts
    stream:
      name: checkout-events

sinks:
  - name: merged
    stream:
      name: unified-events
```

## Sinks

Sinks define where the pipeline writes results. Four sink kinds are supported.

### Stream Sink

Appends records to a Flo stream:

```yaml
sinks:
  - name: output
    stream:
      name: enriched-events
      namespace: production
```

### Time-Series Sink

Extracts tags and numeric fields from JSON record payloads and writes them as time-series data points:

```yaml
sinks:
  - name: cpu-ts
    ts:
      measurement: proc_cpu_metrics
      namespace: metrics
      tags:
        host: hostname          # TS tag "host" ← JSON field "hostname"
      fields:
        cpu: cpu_percent        # TS field "cpu" ← JSON field "cpu_percent"
```

Given the input `{"hostname":"web-01","cpu_percent":72.5}`, the sink writes a point to `proc_cpu_metrics` with tag `host=web-01` and field `cpu=72.5`.

#### `value_field` Shorthand

If the JSON payload contains a single scalar field to use as the value, use `value_field` instead of a full `fields:` map:

```yaml
sinks:
  - name: temp
    ts:
      measurement: proc_temp
      value_field: temperature
      tags:
        sensor: sensor
```

### KV Sink

Writes records to Flo KV storage:

```yaml
sinks:
  - name: profiles
    kv:
      namespace: profiles
      key_prefix: user          # prepended to record key
      separator: ":"            # between prefix and key (default: ":")
      write_mode: upsert        # upsert | if_absent | versioned
      ttl_ms: 86400000          # optional TTL
```

### Queue Sink

Enqueues records into a Flo queue:

```yaml
sinks:
  - name: tasks
    queue:
      name: task-queue
      namespace: default
      priority: 5
      delay_ms: 1000            # visibility delay
```

### Tag-Based Routing

Sinks can subscribe to **tagged records** instead of receiving the full pipeline output. Tags are set by the `classify` operator and matched with AND logic — a record reaches a sink only when it carries **all** of the sink's declared `match` tags.

Up to 32 distinct tag names per pipeline.

```yaml
operators:
  - type: classify
    name: route-events
    rules:
      - condition: "json:level=error"
        tag: errors
      - condition: "json:$.latency_ms>5000"
        tag: slow

sinks:
  - name: main
    stream:
      name: results

  - name: late-events
    stream:
      name: late-data
    match: [late]

  - name: failures
    queue:
      name: dead-letter
    match: [errors]

  - name: slow-errors
    stream:
      name: slow-error-stream
    match: [errors, slow]          # AND — must have BOTH tags
```

Sinks without `match` receive all records from the main operator chain. A single `match:` value is also accepted as sugar: `match: late` is equivalent to `match: [late]`.

## Operators

Operators are the transformation steps between source and sink. They are declared in the `operators:` array and execute in order. Flo includes eight built-in operator types.

### `filter` — Expression-Based Filter

Drops records that don't match a condition. Supported expressions:

**Record-level:**

| Expression | Matches when… |
|-----------|---------------|
| `value_contains:<substring>` | Record value contains the substring |
| `key_contains:<substring>` | Record key contains the substring |
| `key_equals:<exact>` | Record key equals the exact string |
| `key_prefix:<prefix>` | Record key starts with the prefix |
| `value_prefix:<prefix>` | Record value starts with the prefix |
| `not_empty` | Record value is non-empty |
| `key_not_empty` | Record key is non-empty |
| `min_length:<n>` | Record value length ≥ n |

**JSON field — `json:<path><op><value>`:**

| Expression | Matches when… |
|-----------|---------------|
| `json:<path>=<value>` | Field equals value |
| `json:<path>!=<value>` | Field does not equal value |
| `json:<path>^=<value>` | Field starts with value (prefix) |
| `json:<path>*=<value>` | Field contains value (substring) |
| `json:<path>!^=<value>` | Field does not start with value |
| `json:<path>!*=<value>` | Field does not contain value |
| `json:<path>><value>` | Field > value (numeric) |
| `json:<path>>=<value>` | Field >= value (numeric) |
| `json:<path><<value>` | Field < value (numeric) |
| `json:<path><=<value>` | Field <= value (numeric) |

```yaml
operators:
  - type: filter
    name: keep-important
    condition: "value_contains:important"
```

### `keyby` — JSON Key Extraction

Re-keys records by extracting a field from the JSON value using JSONPath expressions. Downstream operators like `aggregate` group by this key.

```yaml
operators:
  - type: keyby
    name: by-user
    key_expression: "$.user_id"
```

Supports nested paths: `"$.metadata.region"`.

If the value isn't valid JSON or the field doesn't exist, the record passes through with its original key.

### `map` — Declarative Field Projection

A 1:1 transformation that restructures JSON records by projecting, renaming, and adding fields:

```yaml
operators:
  - type: map
    name: extract-user
    user_id: "$.data.user_id"        # JSONPath extraction
    amount: "$.transaction.amount"    # nested field
    source: "payment-service"         # constant string
```

Rules:
- Values starting with `$.` are **JSONPath extractions** from the input
- All other values are treated as **string constants**
- Output is always a JSON object with the declared fields

### `flatmap` — Array Explosion

A 1:N transformation that explodes a JSON array into individual records:

```yaml
operators:
  - type: flatmap
    name: explode-items
    array_field: "$.order.items"
    element_key: "$.sku"            # optional: extract key from each element
```

Each element of the array at `$.order.items` becomes a separate downstream record. If the field is missing or not an array, the record is dropped.

### `aggregate` — Declarative Aggregation

Accumulates numeric values extracted from JSON records. Records are grouped by key — chain a `keyby` operator before `aggregate` for custom grouping.

**Functions:** `sum`, `count`, `avg`, `min`, `max`

**Window modes:**

| Mode | Config | Behavior |
|------|--------|----------|
| Running | *(no window config)* | Emits updated aggregate on every record |
| Tumbling | `window: tumbling`, `window_size: <seconds>` | Emits when window closes (on watermark) |
| Count-based | `window: count`, `window_size: <n>` | Emits after every N records per key |

Output format: `{"value": <result>, "count": <n>}`

```yaml
operators:
  # Running total (emits on every record)
  - type: aggregate
    name: running-total
    function: sum
    field: "$.amount"

  # Count per key in 60-second tumbling windows
  - type: aggregate
    name: event-counter
    function: count
    window: tumbling
    window_size: 60

  # Average every 100 records per key
  - type: aggregate
    name: batch-avg
    function: avg
    field: "$.latency_ms"
    window: count
    window_size: 100
```

### `kv_lookup` — KV-Backed Enrichment & Filtering

Looks up keys in Flo KV storage to filter or enrich streaming records. The lookup key is constructed from a **template** that interpolates JSON fields from the record.

**Template syntax:** Mix literal text with `${<jsonpath>}` placeholders:

| Template | Resolved key (for `{"account_id":"alice"}`) |
|----------|----------------------------------------------|
| `"account:${$.account_id}"` | `account:alice` |
| `"${$.account_id}"` | `alice` |
| `"user.${$.org}.${$.user_id}"` | `user.acme.u1` |

**Modes:**

| Mode | Behavior |
|------|----------|
| `filter` (default) | Drop the record if the constructed key is **not found** in KV |
| `enrich` | Attach the KV value to the record as a JSON field; records with no match pass through unchanged |

```yaml
operators:
  - type: kv_lookup
    name: check-account
    lookup_key: "account:${$.account_id}"
    namespace: default
    mode: filter
```

Enrich example — adds a `"tier"` field to each record:

```yaml
operators:
  - type: kv_lookup
    name: enrich-user
    lookup_key: "user:${$.user_id}"
    namespace: default
    mode: enrich
    enrich_field: tier
```

### `classify` — Tag-Based Record Labeling

Evaluates rules against each record and sets tag bits for matching conditions. Records continue flowing — classify never drops or forks, it only labels. Downstream sinks filter by AND-matching their `tags` list against the record's tag bitfield.

Rules use the same condition expressions as `filter`.

```yaml
operators:
  - type: classify
    name: route-payments
    default_tag: unmatched           # optional: tag when no rules match
    rules:
      - condition: "json:type^=payment"
        tag: payments
      - condition: "json:type*=transfer"
        tag: transfers
      - condition: "json:amount>10000"
        tag: high-value
```

A single record can match multiple rules and carry multiple tags. This enables multi-way routing: a `payments` sink, a `high-value` sink, and a `high-value, payments` sink can all coexist.

Records that match no rules pass through untagged by default. Set `default_tag` to route unmatched records to a specific sink.

### `passthrough` — Identity / Debug Tap

Emits every record unchanged. Useful for testing and as a pipeline placeholder:

```yaml
operators:
  - type: passthrough
    name: debug-tap
```

### `wasm` — WebAssembly Operator

Runs a compiled WASM module for each record. Supports three execution modes depending on how the guest `handle()` function behaves:

| Mode | Guest behavior | Result |
|------|---------------|--------|
| **Map** (1→1) | `handle()` returns packed ptr\|len | Single output record |
| **Filter** (1→0) | `handle()` returns `0` | Record is dropped |
| **FlatMap** (1→N) | Calls `flo.emit()` 0..N times | Each emit becomes an output record |

The mode is determined at runtime by the WASM code — no YAML flag needed.

```yaml
operators:
  - type: wasm
    name: classify-txn
    module: ./transforms/txn_classifier.wasm
```

WASM operators can also **dynamically tag** records via the `flo.set_tag()` host function, enabling WASM-driven sink routing:

```yaml
operators:
  - type: wasm
    name: classify-txn
    module: ./transforms/txn_classifier.wasm

sinks:
  - name: all-txns
    stream: { name: classified-txns }

  - name: high-value
    stream: { name: high-value-out }
    match: [high-value]              # receives records tagged by WASM

  - name: refunds
    stream: { name: refunds-out }
    match: [refund]
```

See [WASM Modules](#wasm-modules) below for the full ABI contract, host functions, and building guides.

### Chaining Operators

Operators execute in declaration order. Records flow through each operator sequentially:

```yaml
operators:
  - type: filter
    name: completed-only
    condition: "value_contains:completed"

  - type: map
    name: extract-fields
    order_id: "$.order.id"
    total: "$.order.total"

  - type: keyby
    name: by-customer
    key_expression: "$.customer_id"

  - type: aggregate
    name: daily-total
    function: sum
    field: "$.total"
    window: tumbling
    window_size: 86400
```

## Windowing

The processing engine supports event-time windowing for time-based aggregations.

### Window Types

| Type | Description |
|------|-------------|
| **Tumbling** | Fixed-size, non-overlapping time windows. E.g., every 60 seconds. |
| **Sliding** | Fixed-size windows that overlap by a slide interval. |
| **Count** | Windows defined by element count, not time. |
| **Session** | Dynamic, gap-based windows per key. A session extends as long as records arrive within the gap. |
| **Global** | Single window for all elements (useful with custom triggers). |

### Triggers

Triggers decide when a window fires (evaluates its function and emits results):

| Trigger | Fires when… |
|---------|-------------|
| **Event-time** (default) | Watermark passes the window end |
| **Processing-time** | Wall clock reaches the window end |
| **Count** | Element count reaches a threshold |
| **Continuous** | At regular intervals |

### Watermarks

Watermarks signal event-time progress through the pipeline. They propagate the guarantee that no record with an earlier timestamp will arrive. The engine tracks watermarks across multiple inputs and advances them based on the minimum across all sources.

### Late Data Handling

Records that arrive after the watermark has passed their window are classified as:

1. **On-time** — within the expected window
2. **Late** — past the watermark but within the allowed lateness (re-fires window)
3. **Dropped** — too late, beyond the allowed lateness threshold

Late records can be tagged (via a `classify` rule) and routed to a dedicated sink for monitoring or reprocessing.

## Keyed State

Stateful operators (like `aggregate`) access per-key state scoped to the job and operator instance. Three state primitives are available:

| Primitive | Description |
|-----------|-------------|
| **ValueState** | Single value per key |
| **ListState** | Append-only list per key |
| **MapState** | Sub-key → value map per key |

State is stored in the per-shard state backend with automatic key namespacing:

```
proc:{job_id}:{operator_id}:kv:{user_key}          — ValueState
proc:{job_id}:{operator_id}:list:{user_key}:{idx}  — ListState
proc:{job_id}:{operator_id}:map:{user_key}:{mk}    — MapState
```

No locks are needed — single-threaded shard execution guarantees isolation.

## Checkpoints and Savepoints

### Checkpoints

The engine implements Chandy-Lamport distributed snapshots for fault tolerance:

1. **Trigger** — coordinator assigns a new `checkpoint_id`
2. **Barrier injection** — `CheckpointBarrier` is injected into sources
3. **Source snapshot** — sources save their current offsets
4. **Operator snapshot** — each operator snapshots its state, forwards the barrier
5. **Sink acknowledgment** — sinks confirm receipt of the barrier
6. **Completion** — all acks received, checkpoint is marked complete

Checkpoint metadata is persisted internally under `_proc:` keys in KV storage.

### Savepoints

Savepoints are user-triggered snapshots of a job's state:

```bash
flo processing savepoint job-1 -n analytics
```

A savepoint captures:

- The job binding and configuration
- Creation timestamp
- `records_processed` at the savepoint time

You can restore a job from a savepoint:

```bash
flo processing restore job-1 sp-1 -n analytics
```

## Pipeline Patterns

### Stream to Stream (Passthrough)

The simplest pipeline — data flows unmodified from source to sink:

```yaml
kind: Processing
name: mirror
sources:
  - stream: { name: events }
sinks:
  - stream: { name: events-copy }
```

### Stream to Time-Series (Metrics Extraction)

Convert JSON event streams into queryable time-series data:

```yaml
kind: Processing
name: cpu-pipeline
namespace: metrics
sources:
  - stream: { name: cpu-json }
sinks:
  - ts:
      measurement: proc_cpu_metrics
      tags:
        host: hostname
      fields:
        cpu: cpu_percent
```

### Time-Series to Stream (Alerting Feed)

Poll TS measurements and produce JSON records for downstream consumers:

```yaml
kind: Processing
name: ts-to-alerts
namespace: metrics
sources:
  - ts:
      measurement: cpu_usage
      field: value
      tags:
        host: web-01
sinks:
  - stream: { name: cpu-alerts }
```

### Time-Series to Time-Series (Derived Metrics)

Build derived metrics from raw measurements:

```yaml
kind: Processing
name: derive-temperature
namespace: metrics
sources:
  - ts:
      measurement: raw_temperature
      field: value
sinks:
  - ts:
      measurement: derived_temp
      value_field: value
```

### KV-Enriched Pipeline

Filter or enrich events using data stored in Flo KV:

```yaml
kind: Processing
name: account-filter
namespace: production
sources:
  - stream: { name: transactions }
sinks:
  - stream: { name: valid-transactions }
operators:
  - type: kv_lookup
    name: check-account
    lookup_key: "account:${$.account_id}"
    namespace: production
    mode: filter
```

### WASM Classification Pipeline

Use a WASM module to classify, filter, and route records to multiple sinks:

```yaml
kind: Processing
name: txn-pipeline
namespace: production
sources:
  - stream: { name: raw-transactions }

operators:
  - type: wasm
    name: classify-txn
    module: ./transforms/txn_classifier.wasm

sinks:
  - name: all-txns
    stream: { name: classified-txns }

  - name: high-value
    stream: { name: high-value-out }
    match: [high-value]

  - name: refunds
    stream: { name: refunds-out }
    match: [refund]

  - name: standard
    stream: { name: standard-out }
    match: [standard]
```

The WASM module calls `flo.set_tag("high-value")`, `flo.set_tag("refund")`, or `flo.set_tag("standard")` during `handle()`, and the engine routes each output record to the matching sink(s). Sinks without `match` receive all records.

### WASM Enrichment with State

Combine filter, flatmap, and stateful enrichment in a single WASM operator:

```yaml
kind: Processing
name: enrich-pipeline
namespace: production
sources:
  - stream: { name: raw-events }

operators:
  - type: wasm
    name: enrich
    module: ./transforms/txn_enricher.wasm

sinks:
  - name: all
    stream: { name: enriched-events }
  - name: high-value
    stream: { name: high-value-alerts }
    match: [high-value]
  - name: standard
    stream: { name: standard-events }
    match: [standard]
```

The enricher WASM module demonstrates all three modes:
- **Filter** — records missing required fields are dropped (`handle()` returns 0)
- **FlatMap** — high-value records emit both an enriched record and an alert via `flo.emit()`
- **State** — per-merchant transaction counts are tracked via `flo.state_get()`/`flo.state_set()`

## WASM Modules

Flo supports **WebAssembly (WASM) modules** for custom processing logic. WASM modules run inside the Flo node using a pure-Zig WASM 2.0 interpreter — no external runtime (Wasmtime, Wasmer) required. The same WASM runtime is shared by both the **Actions** subsystem (stateless request/response) and the **Processing** subsystem (per-record streaming).

### How It Works

1. You write your transformation logic (in Zig, Rust, C, Go, or any language that compiles to WASM)
2. Compile to `wasm32-freestanding`
3. Reference the `.wasm` file in a pipeline operator (`type: wasm`, `module: path`) or register it as an action
4. Flo instantiates a fresh WASM instance per invocation — no state leaks between calls

### WASM ABI Contract

Your WASM module must export these functions:

#### Required Exports

| Export | Signature | Description |
|--------|-----------|-------------|
| `handle` | `(input_ptr: u32, input_len: u32) -> i64` | Main entry point. Receives input bytes, returns packed output pointer and length |
| `alloc` | `(size: u32) -> u32` | Allocate bytes in guest memory. Returns pointer, `0` on failure |
| `dealloc` | `(ptr: u32, size: u32) -> void` | Free previously allocated memory |

#### Optional Exports

| Export | Signature | Description |
|--------|-----------|-------------|
| `init` | `() -> i32` | Called once after instantiation. Return `0` for success |
| `describe` | `() -> i64` | Return packed ptr\|len to a JSON description string |

#### Return Value Encoding

`handle` returns an `i64` with the output location packed as:

```
success:  (output_ptr << 32) | output_len
```

Error codes (negative values):
- `-1` — invalid input
- `-2` — allocation failed
- `-3` — execution error

### Execution Modes

A single WASM operator supports three execution modes. The mode is determined at runtime by how the guest's `handle()` function behaves — no YAML configuration needed:

#### Map (1→1)

`handle()` returns a packed `(output_ptr << 32) | output_len`. The returned bytes become the single output record.

#### Filter (1→0)

`handle()` returns `0`. The record is silently dropped — no output is emitted for this input.

#### FlatMap (1→N)

During `handle()`, the guest calls `flo.emit()` one or more times. Each call produces a separate output record. The return value of `handle()` is ignored when `flo.emit()` has been called.

This enables splitting a single input record into multiple outputs — for example, emitting both an enriched record and an alert record:

```zig
// Inside handle(): emit two separate records
_ = flo.emit(enriched_ptr, enriched_len);
_ = flo.emit(alert_ptr, alert_len);
return 1; // return value ignored when flo.emit() was called
```

### Host Imports

Flo provides these host functions to WASM guests under the `flo` module:

**Logging:**

| Import | Signature | Description |
|--------|-----------|-------------|
| `flo.log` | `(level, msg_ptr, msg_len) -> void` | Log from guest. Levels: 0=debug, 1=info, 2=warn, 3=error |

**KV Access:**

| Import | Signature | Description |
|--------|-----------|-------------|
| `flo.kv_get` | `(key_ptr, key_len, buf_ptr, buf_len) -> i32` | Read from KV. Returns bytes written, `-1` not found, `-3` buffer too small |
| `flo.kv_set` | `(key_ptr, key_len, val_ptr, val_len) -> i32` | Write to KV. Returns `0` on success |
| `flo.kv_delete` | `(key_ptr, key_len) -> i32` | Delete from KV. Returns `0` on success, `-1` not found |

**Tag Routing:**

| Import | Signature | Description |
|--------|-----------|-------------|
| `flo.set_tag` | `(name_ptr, name_len) -> i32` | Tag the output record for match-based sink routing. Returns `0` on success, `-1` if tag name is unknown |

**Multi-Emit (FlatMap):**

| Import | Signature | Description |
|--------|-----------|-------------|
| `flo.emit` | `(ptr, len) -> i32` | Emit an additional output record. Can be called 0..N times during `handle()`. Returns `0` on success |

**Per-Key State:**

| Import | Signature | Description |
|--------|-----------|-------------|
| `flo.state_get` | `(key_ptr, key_len, buf_ptr, buf_len) -> i32` | Read per-key state. Returns bytes written, `-1` not found, `-3` buffer too small |
| `flo.state_set` | `(key_ptr, key_len, val_ptr, val_len) -> i32` | Write per-key state. Returns `0` on success |
| `flo.state_delete` | `(key_ptr, key_len) -> i32` | Delete per-key state. Returns `0` on success |

### Building a WASM Module (Zig)

Here's a complete example — a transaction classifier that uses **tagging** and **map** mode:

**`txn_classifier.zig`:**

```zig
// Host imports — provided by Flo runtime
extern "flo" fn set_tag(name_ptr: [*]const u8, name_len: u32) i32;
extern "flo" fn log(level: u32, msg_ptr: [*]const u8, msg_len: u32) void;

// Bump allocator over a 64KB static heap
var heap: [65536]u8 = undefined;
var heap_offset: usize = 0;

export fn alloc(size: u32) u32 {
    const s: usize = @intCast(size);
    const aligned = (heap_offset + 7) & ~@as(usize, 7);
    if (aligned + s > heap.len) return 0;
    const ptr: [*]u8 = @ptrCast(&heap[aligned]);
    heap_offset = aligned + s;
    return @intFromPtr(ptr);
}

export fn dealloc(_: u32, _: u32) void {}

var output_buf: [4096]u8 = undefined;

export fn handle(input_ptr: [*]const u8, input_len: u32) i64 {
    heap_offset = 0;
    const input = input_ptr[0..input_len];

    // Parse amount from JSON, classify, and tag
    const amount = parseIntField(input, "amount") orelse return 0; // FILTER
    if (amount >= 10000) {
        _ = set_tag("high-value".ptr, "high-value".len);
        // ... build output with class: "high-value" ...
    } else if (amount < 0) {
        _ = set_tag("refund".ptr, "refund".len);
    } else {
        _ = set_tag("standard".ptr, "standard".len);
    }

    // Return packed (ptr << 32) | len
    const ptr: u32 = @intFromPtr(&output_buf);
    return (@as(i64, ptr) << 32) | @as(i64, output_len);
}
```

Here's a second example using **filter**, **flatmap** (`flo.emit`), and **per-key state**:

**`txn_enricher.zig`:**

```zig
extern "flo" fn set_tag(name_ptr: [*]const u8, name_len: u32) i32;
extern "flo" fn emit(ptr: [*]const u8, len: u32) i32;
extern "flo" fn state_get(key_ptr: [*]const u8, key_len: u32, buf_ptr: [*]u8, buf_len: u32) i32;
extern "flo" fn state_set(key_ptr: [*]const u8, key_len: u32, val_ptr: [*]const u8, val_len: u32) i32;

export fn handle(input_ptr: [*]const u8, input_len: u32) i64 {
    const input = input_ptr[0..input_len];

    // FILTER: drop records missing "amount"
    const amount = parseIntField(input, "amount") orelse return 0;

    // STATE: read and increment per-merchant counter
    const merchant = parseStringField(input, "merchant") orelse "unknown";
    const count = readAndIncrementCounter(merchant);

    if (amount >= 10000) {
        // FLATMAP: emit enriched record + alert, tag both
        _ = set_tag("high-value".ptr, "high-value".len);
        _ = emit(enriched_output.ptr, enriched_output.len);
        _ = emit(alert_output.ptr, alert_output.len);
        return 1; // ignored when flo.emit() was called
    }

    // MAP: single enriched output with state counter
    _ = set_tag("standard".ptr, "standard".len);
    return (@as(i64, ptr) << 32) | @as(i64, output_len);
}
```

**Pipeline YAML** for the enricher:

```yaml
kind: Processing
name: txn-pipeline
sources:
  - stream: { name: raw-transactions }
operators:
  - type: wasm
    name: enrich-txns
    module: ./txn_enricher.wasm
sinks:
  - name: all-txns
    stream: { name: enriched-txns }
  - name: high-value
    stream: { name: high-value-out }
    match: [high-value]
  - name: standard
    stream: { name: standard-out }
    match: [standard]
```

**`build.zig`:**

```zig
const std = @import("std");

pub fn build(b: *std.Build) void {
    const lib = b.addExecutable(.{
        .name = "txn_classifier",
        .root_module = b.createModule(.{
            .root_source_file = b.path("txn_classifier.zig"),
            .target = b.resolveTargetQuery(.{
                .cpu_arch = .wasm32,
                .os_tag = .freestanding,
            }),
            .optimize = .ReleaseSmall,
        }),
    });

    lib.entry = .disabled;
    lib.rdynamic = true;  // export all `export fn` symbols

    b.installArtifact(lib);
}
```

Build with:

```bash
cd examples/processing/txn-classifier && zig build
```

The output is at `zig-out/bin/txn_classifier.wasm`.

### Building a WASM Module (Rust)

```toml
# Cargo.toml
[lib]
crate-type = ["cdylib"]

[profile.release]
opt-level = "s"
lto = true
```

```rust
// src/lib.rs
static mut HEAP: [u8; 65536] = [0u8; 65536];
static mut OFFSET: usize = 0;

#[no_mangle]
pub extern "C" fn alloc(size: u32) -> u32 {
    unsafe {
        let aligned = (OFFSET + 7) & !7;
        if aligned + size as usize > HEAP.len() { return 0; }
        let ptr = HEAP.as_mut_ptr().add(aligned);
        OFFSET = aligned + size as usize;
        ptr as u32
    }
}

#[no_mangle]
pub extern "C" fn dealloc(_ptr: u32, _size: u32) {}

#[no_mangle]
pub extern "C" fn handle(input_ptr: u32, input_len: u32) -> i64 {
    // Process input, write output, return packed ptr|len
    // ...
}
```

```bash
cargo build --target wasm32-unknown-unknown --release
```

### Building a WASM Module (C)

```c
// transform.c
static unsigned char heap[65536];
static unsigned int heap_offset = 0;

__attribute__((export_name("alloc")))
unsigned int alloc(unsigned int size) {
    unsigned int aligned = (heap_offset + 7) & ~7;
    if (aligned + size > sizeof(heap)) return 0;
    unsigned int ptr = (unsigned int)&heap[aligned];
    heap_offset = aligned + size;
    return ptr;
}

__attribute__((export_name("dealloc")))
void dealloc(unsigned int ptr, unsigned int size) {}

__attribute__((export_name("handle")))
long long handle(unsigned int input_ptr, unsigned int input_len) {
    // Process input, return packed (ptr << 32) | len
}
```

```bash
clang --target=wasm32 -O2 -nostdlib -Wl,--no-entry -Wl,--export-all -o transform.wasm transform.c
```

### Design Notes

- **Fresh instance per call** — no persistent heap state between invocations; the WASM module's memory is reset each time
- **Per-key state survives calls** — `flo.state_get`/`flo.state_set` access the operator's keyed state backend, which persists across records (unlike the WASM heap)
- **Dynamic tagging** — `flo.set_tag()` tags are OR'd with any tags the record already carries from upstream operators (e.g., `classify`)
- **One runner per shard** — matches Flo's thread-per-shard model
- **Concurrency limit** — max 4 concurrent WASM executions per shard (configurable)
- **Input/output are opaque bytes** — the engine doesn't validate content format (JSON, protobuf, etc.)
- **WASI shims** — minimal WASI stubs are provided (`clock_time_get`, `random_get`, `fd_write`, `proc_exit`) so WASI-compiled modules can load, but full WASI is not supported
- **Shared runtime** — the same WASM interpreter is used by both Actions and Processing, so modules are portable between the two subsystems

## Job Lifecycle

### Submitting a Job

```bash
flo processing submit pipeline.yaml -n analytics
# Output: Job submitted: job-1
```

On submission, the job enters the `RUNNING` state and begins polling its sources immediately.

### Checking Status

```bash
flo processing status job-1 -n analytics
```

Returns JSON:

```json
{
  "job_id": "job-1",
  "name": "order-analytics",
  "status": "RUNNING",
  "parallelism": 4,
  "batch_size": 200,
  "records_processed": 15420,
  "created_at_ms": 1700000000000
}
```

### Listing Jobs

```bash
flo processing list -n analytics
```

### Stopping a Job

Stops the job gracefully. The job can be restored later:

```bash
flo processing stop job-1 -n analytics
```

### Cancelling a Job

Cancels the job permanently:

```bash
flo processing cancel job-1 -n analytics
```

### Job States

| State | Description |
|-------|-------------|
| `RUNNING` | Actively processing records |
| `STOPPED` | Gracefully halted, can be restored |
| `CANCELLED` | Permanently terminated |
| `FAILED` | Terminated due to an error |
| `COMPLETED` | Finished (for bounded sources) |

### Savepoints

```bash
# Create a savepoint
flo processing savepoint job-1 -n analytics

# Restore from a savepoint
flo processing restore job-1 sp-1 -n analytics
```

### Rescaling

Change the parallelism of a running job:

```bash
flo processing rescale job-1 8 -n analytics
```

## Namespace Isolation

Jobs are scoped to namespaces, providing complete isolation:

- The same job name in different namespaces are **independent jobs**
- `list` returns only jobs in the specified namespace
- Pipeline data flows**only within** the namespace scope
- Source streams and sink targets are resolved within the job's namespace

```bash
# These are two separate, independent jobs
flo processing submit job.yaml -n production
flo processing submit job.yaml -n staging
```

## Persistence

Job state survives node restarts:

- Submitted jobs persist and resume on restart
- Stopped and cancelled job states are preserved
- Rescaled parallelism is remembered
- New job IDs don't collide with pre-restart IDs

All mutations (submit, stop, cancel, status updates) are persisted through Raft and replayed on startup.

## Processing Metrics

The engine collects per-operator and per-pipeline metrics:

| Metric | Description |
|--------|-------------|
| `records_in` | Records processed by each operator |
| `records_out` | Records emitted by each operator |
| `processing_time_ns` | Cumulative processing time |
| `errors` | Error count |
| `throughput` | Records per second (rolling) |
| `latency` | Processing latency histogram (buckets: <1ms, <5ms, <10ms, <50ms, <100ms, <500ms, 500ms+) |
| `backpressure` | Backpressure gauge (0.0–1.0) |

## Related Docs

- [Streams](/docs/primitives/streams/) — source and sink behavior for stream-backed pipelines
- [Time-Series](/docs/primitives/time-series/) — TS query and write semantics
- [KV](/docs/primitives/kv/) — KV storage used by `kv_lookup` operator and KV sinks
- [Queues](/docs/primitives/queues/) — queue sinks for task pipelines
- [Actions](/docs/orchestration/actions/) — WASM action registration and invocation
- [Workflows](/docs/orchestration/workflows/) — multi-step orchestration over actions

