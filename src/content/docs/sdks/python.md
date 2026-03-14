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
from flo import StreamReadOptions, StreamID, StreamGroupReadOptions

# Append
result = await client.stream.append("events", b'{"event": "click"}')

# Read from a specific position
result = await client.stream.read("events",
    StreamReadOptions(start=StreamID(timestamp_ms=1700000000000, sequence=0), count=10))

# Read from tail (latest records)
result = await client.stream.read("events",
    StreamReadOptions(tail=True, count=10))

# Blocking read (long polling)
result = await client.stream.read("events",
    StreamReadOptions(tail=True, count=10, block_ms=30000))

# Consumer groups
await client.stream.group_join("events", "processors", "worker-1")
result = await client.stream.group_read("events", "processors", "worker-1",
    StreamGroupReadOptions(count=10, block_ms=30000))
await client.stream.group_ack("events", "processors", [r.id for r in result.records])
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
- All operations support namespace overrides
