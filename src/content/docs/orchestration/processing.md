---
title: Stream Processing
description: Real-time stateful pipelines with windowing, keyed state, and checkpointing.
---

Flo includes a built-in stream processing engine for real-time, stateful pipelines. Define jobs declaratively in YAML — Flo handles checkpointing, watermarks, state management, and exactly-once semantics internally. No separate cluster needed.

## Defining a Processing Job

```yaml
kind: ProcessingJob
name: user-spend-alerts
version: "1.0.0"

sources:
  - name: transactions
    stream: payment-events
    start: latest
    watermark:
      strategy: bounded-out-of-order
      max_delay_ms: 5000

operators:
  - name: by-user
    type: keyBy
    input: transactions
    key: "$.user_id"

  - name: spend-per-hour
    type: window
    input: by-user
    window: { type: tumbling, size: 1h }
    aggregate: { type: sum, field: "$.amount" }
    trigger: event-time

  - name: high-spenders
    type: filter
    input: spend-per-hour
    condition: "$.value > 10000"

sinks:
  - name: alerts
    input: high-spenders
    stream: high-spend-alerts

checkpointing:
  interval: 30s
  mode: exactly-once
```

## Operator Types

| Operator | Description | Example |
|----------|-------------|---------|
| `keyBy` | Partition by a key field | `key: "$.user_id"` |
| `window` | Time-based windowing | `tumbling`, `sliding`, `session` |
| `filter` | Keep records matching condition | `condition: "$.value > 100"` |
| `map` | Transform records | `expression: "$.amount * 100"` |
| `flatMap` | One-to-many transform | Splits records into multiple |
| `aggregate` | Reduce within windows | `sum`, `avg`, `min`, `max`, `count` |

### Window Types

| Window | Description |
|--------|-------------|
| `tumbling` | Fixed, non-overlapping. `size: 5m` → one window per 5 minutes |
| `sliding` | Overlapping. `size: 10m, slide: 1m` → 10-min window every minute |
| `session` | Gap-based. `gap: 30m` → new window after 30 min of inactivity |

## Sources and Sinks

- **Sources** read from Flo streams with configurable start position (`earliest`, `latest`, or a specific offset)
- **Sinks** write to Flo streams, KV, or external systems
- **Watermarks** track event-time progress for out-of-order data

## CLI Usage

```bash
# Submit a job
flo processing submit --file jobs/user-spend-alerts.yaml

# Check status
flo processing status user-spend-alerts

# Create a savepoint (consistent snapshot)
flo processing savepoint user-spend-alerts

# Stop a job (with savepoint)
flo processing stop user-spend-alerts

# Resume from savepoint
flo processing resume user-spend-alerts --from-savepoint
```

## Checkpointing

Checkpointing captures the state of all operators and source offsets at regular intervals. On failure, the job restarts from the last checkpoint.

| Mode | Guarantee | Performance |
|------|-----------|-------------|
| `exactly-once` | No duplicates, no data loss | Checkpoint barriers through pipeline |
| `at-least-once` | No data loss, possible duplicates | Faster, no barriers |

## WASM Operators

For custom logic, you can use WASM operators:

```yaml
operators:
  - name: enrich
    type: wasm
    input: events
    module: "./enricher.wasm"
    function: "process"
```

WASM modules must export the standard Flo action ABI (`handle`, `alloc`, `dealloc`).
