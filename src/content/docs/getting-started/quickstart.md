---
title: Quick Start
description: Get Flo running and try every primitive in 2 minutes.
---

## Start the Server

```bash
flo server start
```

Flo starts on port `9000` (client API). Metrics and dashboard are available on ports `9001` and `9002` by default.

## KV

```bash
# Store a JSON document
flo kv set user:alice '{"name": "Alice", "role": "admin"}'

# Retrieve it
flo kv get user:alice

# Delete it
flo kv delete user:alice

# List keys
flo kv list
```

## Streams

```bash
# Append events to a stream
flo stream append events '{"type": "signup", "user": "alice"}'
flo stream append events '{"type": "login", "user": "alice"}'

# Read the last 10 records
flo stream read events --limit 10
```

## Queues

```bash
# Enqueue a job
flo queue enqueue jobs '{"task": "send-welcome-email", "to": "alice"}'

# Dequeue the next job (with visibility timeout)
flo queue dequeue jobs
```

## Time-Series

```bash
# Write a metric
flo ts write cpu --tags host=web-01 --value 82.5

# Query with FloQL
flo ts floql "cpu{host=web-01}[1h] | window(5m) | avg()"
```

## Actions

```bash
# Register an action
flo action register send-email

# Invoke it
flo action invoke send-email '{"to": "alice@example.com", "subject": "Welcome!"}'

# Check run status
flo action status <run-id>

# List all runs
flo action list
```

## Workflows

```bash
# Create a workflow from YAML
flo workflow create --file order-workflow.yaml

# Start an instance
flo workflow start process-order '{"order_id": "ORD-123", "amount": 99.99}'

# Check status
flo workflow status <run-id>
```

## Stream Processing

```bash
# Submit a processing job
flo processing submit --file jobs/user-spend-alerts.yaml

# Check status
flo processing status user-spend-alerts
```

## Dashboard

Open [http://localhost:9002](http://localhost:9002) to see the built-in web UI for monitoring streams, keys, queues, and cluster health.

## Next Steps

- [KV guide](/docs/primitives/kv/) — CAS, TTL, versioning, blocking gets
- [Streams guide](/docs/primitives/streams/) — Consumer groups, offsets, partitioning
- [Queues guide](/docs/primitives/queues/) — Priority, DLQ, visibility timeouts
- [Time-Series guide](/docs/primitives/time-series/) — InfluxDB ingest, FloQL queries
- [SDK guides](/docs/sdks/overview/) — Go, Python, JavaScript, Zig
