---
title: Python SDK
description: Async Python SDK for Flo — native asyncio with full type annotations.
---

## Installation

```bash
pip install flo
```

## Quick Start

```python
import asyncio
from flo import FloClient

async def main():
    async with FloClient("localhost:9000") as client:
        # KV
        await client.kv.put("user:123", b"John Doe")
        value = await client.kv.get("user:123")
        print(f"Got: {value.decode()}")

        # Queue
        seq = await client.queue.enqueue("tasks", b'{"task": "process"}')
        result = await client.queue.dequeue("tasks", 10)
        for msg in result.messages:
            await client.queue.ack("tasks", [msg.seq])

        # Stream
        await client.stream.append("events", b'{"event": "login"}')
        result = await client.stream.read("events")
        for rec in result.records:
            print(rec.payload)

asyncio.run(main())
```

## KV Operations

```python
from flo import GetOptions, PutOptions, ScanOptions, HistoryOptions

# Get
value = await client.kv.get("key")

# Blocking get
value = await client.kv.get("key", GetOptions(block_ms=5000))

# Put with TTL
await client.kv.put("session:abc", b"data", PutOptions(ttl_seconds=3600))

# Put with CAS
await client.kv.put("counter", b"2", PutOptions(cas_version=1))

# Conditional writes
await client.kv.put("key", b"value", PutOptions(if_not_exists=True))

# Delete
await client.kv.delete("key")

# Scan with pagination
result = await client.kv.scan("user:", ScanOptions(limit=100))
while result.has_more:
    result = await client.kv.scan("user:", ScanOptions(cursor=result.cursor))

# Version history
history = await client.kv.history("user:123", HistoryOptions(limit=10))
```

## Queue Operations

```python
from flo import EnqueueOptions, DequeueOptions, NackOptions

# Enqueue with priority and delay
seq = await client.queue.enqueue("tasks", payload,
    EnqueueOptions(priority=10, delay_ms=60000))

# Dequeue with long polling
result = await client.queue.dequeue("tasks", 10,
    DequeueOptions(block_ms=30000))

# Process and ack/nack
for msg in result.messages:
    try:
        process(msg.payload)
        await client.queue.ack("tasks", [msg.seq])
    except Exception:
        await client.queue.nack("tasks", [msg.seq], NackOptions(to_dlq=True))

# DLQ operations
result = await client.queue.dlq_list("tasks")
await client.queue.dlq_requeue("tasks", [msg.seq for msg in result.messages])

# Peek (no lease) and Touch (extend lease)
result = await client.queue.peek("tasks", 5)
await client.queue.touch("tasks", [msg.seq])
```

## Stream Operations

```python
from flo import StreamReadOptions, StreamAppendOptions, StreamID, StreamGroupReadOptions

# Append
result = await client.stream.append("events", b'{"event": "click"}')

# Append with headers
result = await client.stream.append("events", b'{"event": "click"}',
    StreamAppendOptions(headers={"content-type": "application/json", "source": "web"}))

# Read from a specific position
result = await client.stream.read("events",
    StreamReadOptions(start=StreamID(timestamp_ms=1700000000000, sequence=0), count=10))

# Read from tail (latest records)
result = await client.stream.read("events",
    StreamReadOptions(tail=True, count=10))

# Blocking read (long polling)
result = await client.stream.read("events",
    StreamReadOptions(tail=True, count=10, block_ms=30000))

# Access record fields
for rec in result.records:
    print(rec.stream)    # stream name (e.g. "events")
    print(rec.payload)   # raw bytes
    print(rec.headers)   # dict[str, str] or None
    print(rec.id)        # StreamID(timestamp_ms, sequence)

# Consumer groups
await client.stream.group_join("events", "processors", "worker-1")
result = await client.stream.group_read("events", "processors", "worker-1",
    StreamGroupReadOptions(count=10, block_ms=30000))
await client.stream.group_ack("events", "processors", [r.id for r in result.records])
```

## StreamWorker (high-level)

The recommended way to consume streams is the `StreamWorker`, created from a connected client. It handles consumer group join, polling, concurrency, ack/nack, and reconnection automatically:

```python
from flo import FloClient, StreamContext

async with FloClient("localhost:9000", namespace="myapp") as client:
    worker = client.new_stream_worker(
        stream="events",
        group="processors",
        handler=process_event,
        concurrency=5,
    )

    async def process_event(ctx: StreamContext) -> None:
        data = ctx.json()
        print(f"Stream: {ctx.stream}, ID: {ctx.stream_id}")
        print(f"Headers: {ctx.headers}")
        await handle(data)

    await worker.start()
```

### StreamWorker Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `stream` | `str` | *required* | Stream name to consume |
| `group` | `str` | `""` | Consumer group name |
| `consumer` | `str` | auto-generated | Consumer ID within the group |
| `handler` | `Callable` | *required* | Async function receiving `StreamContext` |
| `concurrency` | `int` | `10` | Max concurrent handler invocations |
| `batch_size` | `int` | `10` | Records per poll |
| `block_ms` | `int` | `30000` | Long-poll timeout (ms) |
| `message_timeout` | `float` | `300.0` | Max seconds per handler call |

### StreamContext

The handler receives a `StreamContext` with convenience accessors:

```python
async def process(ctx: StreamContext) -> None:
    ctx.payload              # raw bytes
    ctx.json()               # JSON-decoded payload
    ctx.into(MyModel)        # JSON-decoded into a class
    ctx.stream_id            # StreamID (timestamp_ms, sequence)
    ctx.stream               # stream name
    ctx.headers              # dict[str, str] (empty dict if no headers)
    ctx.record               # full StreamRecord
```

Records are **auto-acked** on handler success and **auto-nacked** on exception. Connection errors trigger automatic reconnect and consumer group re-join.

### Context Manager

```python
async with client.new_stream_worker(
    stream="events", group="processors", handler=process,
) as worker:
    await worker.start()
```

## Action & Worker Operations

```python
from flo import ActionType, ActionRegisterOptions, ActionInvokeOptions

# Register and invoke actions
await client.action.register("process-image", ActionType.USER,
    ActionRegisterOptions(timeout_ms=60000, max_retries=3))

result = await client.action.invoke("process-image", payload,
    ActionInvokeOptions(priority=10, idempotency_key="order-123"))

status = await client.action.status(result.run_id)
```

### ActionWorker (high-level)

The recommended way to execute actions is the `ActionWorker`, created from a connected client. It handles registration, polling, concurrency, and heartbeats automatically:

```python
from flo import FloClient, ActionContext

async with FloClient("localhost:9000", namespace="myapp") as client:
    worker = client.new_action_worker(concurrency=5)

    @worker.action("process-image")
    async def process_image(ctx: ActionContext) -> bytes:
        data = ctx.json()
        result = await do_processing(data)
        return ctx.to_bytes({"status": "done", "result": result})

    await worker.start()
```

## Features

- Native **asyncio** support
- Full **type annotations** for IDE support
- Context manager (`async with`) for automatic cleanup
- **StreamWorker** and **ActionWorker** for managed consumption
- **Headers** on stream records (read and write)
- All operations support namespace overrides
