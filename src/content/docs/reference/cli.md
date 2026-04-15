---
title: CLI Reference
description: Complete reference for the flo command-line interface.
---

## Global Options

| Flag | Description |
|------|-------------|
| `--host <addr>` | Server address (default: `localhost:9000`) |
| `--namespace <name>` | Namespace for operations (default: `default`) |
| `--timeout <ms>` | Operation timeout in milliseconds |
| `--format <fmt>` | Output format: `text`, `json` |
| `--debug` | Enable debug output |

## Server

### `flo server start`

Start a Flo server.

```bash
flo server start [options]
```

| Flag | Description | Default |
|------|-------------|---------|
| `-c, --config <path>` | Config file path | `flo.toml` |
| `--port <port>` | Client protocol port | `9000` |
| `--data-dir <path>` | Data directory | `./data` |
| `--shard-count <n>` | Number of shard threads | CPU count |
| `--node-id <id>` | Unique node identifier | auto |
| `--seeds <addrs>` | Cluster seed addresses | — |

### `flo server status`

Show server status and health.

```bash
flo server status
```

## KV

### `flo kv set`

Set a key-value pair.

```bash
flo kv set <key> <value> [options]
```

| Flag | Description |
|------|-------------|
| `--ttl <seconds>` | Time-to-live |
| `--if-not-exists` | Only set if key doesn't exist |
| `--cas <version>` | Compare-and-swap version |

### `flo kv get`

Get a value by key.

```bash
flo kv get <key> [options]
```

| Flag | Description |
|------|-------------|
| `--block <ms>` | Block until key appears |

### `flo kv delete`

Delete a key.

```bash
flo kv delete <key>
```

### `flo kv list`

List keys by prefix.

```bash
flo kv list [prefix] [options]
```

| Flag | Description |
|------|-------------|
| `--limit <n>` | Maximum number of keys |
| `--keys-only` | Only return keys, not values |

### `flo kv history`

Show version history for a key.

```bash
flo kv history <key> [options]
```

| Flag | Description |
|------|-------------|
| `--limit <n>` | Maximum versions to return |

## Streams

### `flo stream create`

Create a stream.

```bash
flo stream create <name> [options]
```

| Flag | Description |
|------|-------------|
| `--retention <duration>` | Retention period (e.g., `7d`, `24h`) |
| `--max-size <bytes>` | Maximum stream size |

### `flo stream append`

Append a record to a stream.

```bash
flo stream append <stream> <data>
```

### `flo stream read`

Read records from a stream.

```bash
flo stream read <stream> [options]
```

| Flag | Description |
|------|-------------|
| `--offset <n>` | Start offset |
| `--count <n>` | Number of records |
| `--follow` | Follow mode (block for new records) |

### `flo stream info`

Show stream metadata.

```bash
flo stream info <stream>
```

### `flo stream group`

Manage consumer groups.

```bash
flo stream group create <stream> <group>
flo stream group read <stream> <group> <consumer> [--count <n>]
flo stream group ack <stream> <group> <offsets...>
flo stream group status <stream> <group>
```

## Queues

### `flo queue enqueue`

Add a message to a queue.

```bash
flo queue enqueue <queue> <data> [options]
```

| Flag | Description |
|------|-------------|
| `--priority <n>` | Message priority (higher = sooner) |
| `--delay <ms>` | Delivery delay in milliseconds |
| `--dedup-key <key>` | Deduplication key |

### `flo queue dequeue`

Dequeue messages.

```bash
flo queue dequeue <queue> [options]
```

| Flag | Description |
|------|-------------|
| `--count <n>` | Number of messages (default: 1) |
| `--block <ms>` | Block until messages available |
| `--visibility <ms>` | Visibility timeout for leased messages |

### `flo queue ack`

Acknowledge processed messages.

```bash
flo queue ack <queue> <sequence...>
```

### `flo queue nack`

Negative acknowledge (requeue or send to DLQ).

```bash
flo queue nack <queue> <sequence...> [options]
```

| Flag | Description |
|------|-------------|
| `--dlq` | Send to dead-letter queue |

### `flo queue peek`

Peek at messages without leasing.

```bash
flo queue peek <queue> [--count <n>]
```

### `flo queue dlq`

Manage dead-letter queue.

```bash
flo queue dlq list <queue> [--count <n>]
flo queue dlq requeue <queue> <sequence...>
flo queue dlq purge <queue>
```

## Time-Series

### `flo ts write`

Write a data point using InfluxDB line protocol.

```bash
flo ts write <measurement> <tags> <fields>
```

Examples:

```bash
flo ts write cpu host=web-01 usage=82.5
flo ts write temperature region=us-east,sensor=a1 value=23.4
```

### `flo ts query`

Run a FloQL query.

```bash
flo ts query "<query>"
```

Examples:

```bash
flo ts query "cpu{host=web-01}[1h] | avg(5m)"
flo ts query "temperature{region=us-east}[24h] | max(1h)"
```

## Actions

### `flo action register`

Register an action type.

```bash
flo action register <name> [options]
```

| Flag | Description |
|------|-------------|
| `--timeout <ms>` | Execution timeout |
| `--max-retries <n>` | Maximum retry count |

### `flo action invoke`

Invoke an action.

```bash
flo action invoke <name> [data] [options]
```

| Flag | Description |
|------|-------------|
| `--idempotency-key <key>` | Dedup key for at-most-once |
| `--priority <n>` | Execution priority |
| `--wait` | Wait for completion |

### `flo action status`

Check action execution status.

```bash
flo action status <run-id>
```

## Workflows

### `flo workflow create`

Create a workflow from a YAML definition.

```bash
flo workflow create -f <file.yaml>
```

### `flo workflow start`

Start a workflow execution.

```bash
flo workflow start <name> [data]
```

### `flo workflow status`

Check workflow execution status.

```bash
flo workflow status <execution-id>
```

### `flo workflow signal`

Send a signal to a running workflow.

```bash
flo workflow signal <execution-id> <signal-name> [data]
```

## Processing

### `flo processing submit`

Submit a stream processing job.

```bash
flo processing submit -f <job.yaml>
```

### `flo processing status`

Check job status.

```bash
flo processing status <job-id>
```

### `flo processing stop`

Stop a running job.

```bash
flo processing stop <job-id>
```

## Cluster

### `flo cluster status`

Show cluster membership and partition distribution.

```bash
flo cluster status
```

### `flo cluster rebalance`

Trigger partition rebalancing.

```bash
flo cluster rebalance
```
