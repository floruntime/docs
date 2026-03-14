---
title: JavaScript / TypeScript SDK
description: TypeScript SDK for Node.js and Browser — TCP and WebSocket transports.
---

The JavaScript SDK is a monorepo with three packages:

| Package | Environment | Transport |
|---------|-------------|-----------|
| `@floruntime/core` | Shared | Wire protocol, types |
| `@floruntime/node` | Node.js | TCP |
| `@floruntime/web` | Browser | WebSocket |

## Installation

### Node.js

```bash
npm install @floruntime/node
```

### Browser

```bash
npm install @floruntime/web
```

## Quick Start

### Node.js

```typescript
import { FloClient } from "@floruntime/node";

const client = new FloClient("localhost:9000", {
  namespace: "myapp",
  timeoutMs: 5000,
});
await client.connect();

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// KV
await client.kv.put("greeting", encoder.encode("Hello, Flo!"));
const value = await client.kv.get("greeting");
console.log(decoder.decode(value!));

// Queue
await client.queue.enqueue("tasks", encoder.encode('{"task":"process"}'));
const result = await client.queue.dequeue("tasks", 10);
for (const msg of result.messages) {
  await client.queue.ack("tasks", [msg.seq]);
}

await client.close();
```

### Browser

```typescript
import { FloClient } from "@floruntime/web";

const client = new FloClient("wss://flo.example.com/ws", {
  namespace: "myapp",
});
await client.connect();

// Same API as Node.js
await client.kv.put("key", new TextEncoder().encode("value"));
const value = await client.kv.get("key");

await client.close();
```

## KV Operations

```typescript
// Get
const value = await client.kv.get("key"); // Uint8Array | null

// Put with options
await client.kv.put("key", encode("value"), {
  ttlSeconds: 3600n,
  casVersion: 1n,      // Optimistic locking
  ifNotExists: true,
});

// Delete
await client.kv.delete("key");

// Scan
const result = await client.kv.scan("user:", { limit: 100 });

// History
const versions = await client.kv.history("key");
```

## Queue Operations

```typescript
// Enqueue
const seq = await client.queue.enqueue("tasks", payload, {
  priority: 10,
  delayMs: 60000n,
  dedupKey: "task-123",
});

// Dequeue with long polling
const result = await client.queue.dequeue("tasks", 10, {
  blockMs: 30000,
  visibilityTimeoutMs: 60000,
});

// Ack / Nack
await client.queue.ack("tasks", [msg.seq]);
await client.queue.nack("tasks", [msg.seq], { toDlq: true });

// DLQ
const dlq = await client.queue.dlqList("tasks");
await client.queue.dlqRequeue("tasks", seqs);
```

## Stream Operations

```typescript
// Append
const result = await client.stream.append("events", payload, {
  partitionKey: "user-123",
});

// Read
const records = await client.stream.read("events", {
  offset: 0n,
  limit: 10,
});

// Consumer groups
await client.stream.groupJoin("events", "processors", "consumer-1");
const groupRecords = await client.stream.groupRead("events", {
  group: "processors",
  consumer: "consumer-1",
  limit: 10,
});
await client.stream.groupAck("events",
  groupRecords.records.map(r => r.id),
  { group: "processors" }
);
```

## Action & Worker Operations

```typescript
import { ActionType } from "@floruntime/node";

// Register and invoke
await client.action.register("process-image", ActionType.User, {
  timeoutMs: 60000, maxRetries: 3,
});
const result = await client.action.invoke("process-image", payload, {
  priority: 10, idempotencyKey: "order-123",
});

// Worker loop
await client.worker.register(workerId, taskTypes);
while (true) {
  const result = await client.worker.awaitTask(workerId, taskTypes, {
    blockMs: 30000,
  });
  if (!result.task) continue;
  try {
    const output = await processImage(result.task.payload);
    await client.worker.complete(workerId, result.task.taskId, output);
  } catch (err) {
    await client.worker.fail(workerId, result.task.taskId, String(err), {
      retry: true,
    });
  }
}
```

## API Reference Tables

### KV Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `get` | `get(key, opts?) → Promise<Uint8Array \| null>` | Get value |
| `put` | `put(key, value, opts?) → Promise<void>` | Set value |
| `delete` | `delete(key, opts?) → Promise<void>` | Delete key |
| `scan` | `scan(prefix, opts?) → Promise<ScanResult>` | Prefix scan |
| `history` | `history(key, opts?) → Promise<VersionEntry[]>` | Version history |

### Queue Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `enqueue` | `enqueue(queue, payload, opts?) → Promise<bigint>` | Add message |
| `dequeue` | `dequeue(queue, count, opts?) → Promise<DequeueResult>` | Fetch messages |
| `ack` | `ack(queue, seqs, opts?) → Promise<void>` | Acknowledge |
| `nack` | `nack(queue, seqs, opts?) → Promise<void>` | Nack (retry/DLQ) |
| `dlqList` | `dlqList(queue, opts?) → Promise<DequeueResult>` | List DLQ |
| `dlqRequeue` | `dlqRequeue(queue, seqs, opts?) → Promise<void>` | Requeue DLQ |

### Stream Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `append` | `append(stream, payload, opts?) → Promise<AppendResult>` | Append |
| `read` | `read(stream, opts?) → Promise<ReadResult>` | Read |
| `groupJoin` | `groupJoin(stream, group, consumer) → Promise<void>` | Join group |
| `groupRead` | `groupRead(stream, opts) → Promise<ReadResult>` | Group read |
| `groupAck` | `groupAck(stream, ids, opts) → Promise<void>` | Group ack |
