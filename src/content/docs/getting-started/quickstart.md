---
title: Quick Start
description: Get Flo running and try every primitive in 2 minutes.
---

## Start the Server

```bash
flo server start
```

Flo starts on port `9000` (client API), `9001` (metrics), and `9002` (dashboard).

## Key-Value

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
flo stream read events --last 10
```

## Queues

```bash
# Push a job onto a queue
flo queue push jobs '{"task": "send-welcome-email", "to": "alice"}'

# Pop the next job (with visibility timeout)
flo queue pop jobs
```

## Time-Series

```bash
# Write a metric using InfluxDB line protocol
flo ts write cpu host=web-01 usage=82.5

# Query with FloQL
flo ts query "cpu{host=web-01}[1h] | avg(5m)"
```

## Actions

```bash
# Register an action
flo action register send-email

# Invoke it
flo action invoke send-email '{"to": "alice@example.com", "subject": "Welcome!"}'

# Check status
flo action runs send-email
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

- [Key-Value guide](/primitives/kv/) — CAS, TTL, versioning, blocking gets
- [Streams guide](/primitives/streams/) — Consumer groups, offsets, partitioning
- [Queues guide](/primitives/queues/) — Priority, DLQ, visibility timeouts
- [SDK guides](/sdks/overview/) — Go, Python, JavaScript, Zig
