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

# Put returns PutResult with the new version
res = await client.kv.put("session:abc", b"data", PutOptions(ttl_seconds=3600))
print("committed at v", res.version)

# Get returns GetResult | None \u2014 carries both value and version
r = await client.kv.get("key")
if r is not None:
    print(r.value, "@", r.version)

# Blocking get
r = await client.kv.get("key", GetOptions(block_ms=5000))

# Put with CAS \u2014 use the version returned by Get/Put
r = await client.kv.get("counter")
await client.kv.put("counter", b"2", PutOptions(cas_version=r.version))

# Conditional writes
await client.kv.put("key", b"value", PutOptions(if_not_exists=True))

# Delete
await client.kv.delete("key")

# Multi-key get (single round trip, up to 256 keys, may span shards)
entries = await client.kv.mget(["user:1", "user:2", "user:3"])
for e in entries:
    if e.found:
        print(f"{e.key} = {e.value!r} (v{e.version})")
    else:
        print(f"{e.key} missing")

# Scan with pagination
result = await client.kv.scan("user:", ScanOptions(limit=100))
while result.has_more:
    result = await client.kv.scan("user:", ScanOptions(cursor=result.cursor))

# Version history
history = await client.kv.history("user:123", HistoryOptions(limit=10))

# Atomic counter
n = await client.kv.incr("visits:home")        # +1
n = await client.kv.incr("visits:home", KVIncrOptions(delta=10))

# TTL lifecycle and existence
await client.kv.touch("lock:resource", 60)     # extend TTL
await client.kv.persist("lock:resource")       # clear TTL
ok = await client.kv.exists("lock:resource")

# JSON paths
await client.kv.json_set("order:42", "$", b'{"items":3,"status":"new"}')
res = await client.kv.json_set("order:42", "$.status", b'"shipped"')  # atomic sub-field
print("doc now at v", res.version)
status = await client.kv.json_get("order:42", "$.status")             # GetResult | None
print(f"{status.value!r} @ v{status.version}")
await client.kv.json_del("order:42", "$.status")

# Per-shard transaction \u2014 atomic multi-key writes on one partition
txn = await client.kv.begin("user:42")
try:
    await txn.put("user:42:name", b"Jane")
    await txn.incr("user:42:visits")
    result = await txn.commit()
    print(f"committed {result.op_count} ops at index {result.commit_index}")
except Exception:
    await txn.rollback()  # idempotent
    raise

# Or use as an async context manager (auto-rollback on exception)
async with await client.kv.begin("user:42") as txn:
    await txn.put("user:42:last_seen", b"now")
    await txn.commit()
```

`scan`, `mget`, `json_get`, `json_set`, `json_del`, and `history` are not supported inside a transaction and raise `TxnUnsupportedOpError`. Server caps: 256 ops per transaction, 1 MiB total payload.

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
