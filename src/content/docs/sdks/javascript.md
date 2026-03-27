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

// Read-only KV (config, feature flags)
const value = await client.kv.get("config:flags");

// Streams (subscribe + publish)
await client.streams.subscribe("chat:room-123", (record) => {
  console.log(new TextDecoder().decode(record.payload));
});

await client.close();
```

:::note
The web SDK is limited to **streams** and **KV read-only**. For full KV mutations (put, delete), queues, and actions, use `@floruntime/node` on the backend.
:::

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
```

### ActionWorker (high-level)

The recommended approach for executing actions is the `ActionWorker` class, which handles connection management, concurrency, heartbeats, and graceful shutdown:

```typescript
import { ActionWorker } from "@floruntime/node";

const worker = new ActionWorker({
  endpoint: "localhost:9000",
  namespace: "myapp",
  concurrency: 10,
});

worker.action("process-image", async (ctx) => {
  const input = ctx.json<{ url: string }>();
  const output = await processImage(input.url);
  return ctx.toBytes({ status: "done", result: output });
});

await worker.start();
```
```

## Workflow Operations

`client.workflow` manages the full lifecycle of [workflow](/orchestration/workflows/) definitions and runs.

### Declarative Sync

Deploy or update a workflow definition safely — calling this on every app boot is idiomatic:

```typescript
// Sync from a YAML string
const result = await client.workflow.sync(yamlString);
console.log(`${result.name} v${result.version}: ${result.action}`);
// result.action → "created" | "updated" | "unchanged"

// Sync from raw bytes
const result2 = await client.workflow.syncBytes(
  new TextEncoder().encode(yamlString)
);
```

### Start and Monitor Runs

```typescript
// Start a run
const runId = await client.workflow.start(
  "process-order",
  JSON.stringify({ orderId: "ORD-123", amount: 99.99 })
);

// Poll status
const status = await client.workflow.status(runId);
console.log(status.run_id);        // string
console.log(status.workflow);      // workflow name
console.log(status.version);       // version string
console.log(status.status);        // "pending"|"running"|"waiting"|"completed"|"failed"|...
console.log(status.current_step);  // current or last step name
// status.input          → Uint8Array (raw input bytes)
// status.created_at     → bigint (epoch ms)
// status.started_at?    → bigint | undefined
// status.completed_at?  → bigint | undefined
// status.wait_signal?   → string | undefined (signal type being waited for)

// Cancel a run
await client.workflow.cancel(runId, "User requested cancellation");
```

### Signals

Deliver external events to a waiting workflow:

```typescript
// The workflow must have a waitForSignal step expecting "approval_decision"
await client.workflow.signal(
  runId,
  "approval_decision",
  JSON.stringify({ approved: true, approver: "manager@corp.com" })
);
```

### History and Listings

```typescript
// Run event history
const events = await client.workflow.history(runId, { limit: 20 });
for (const event of events) {
  console.log(`[${event.timestamp}] ${event.type}: ${event.detail}`);
}

// List runs for a workflow
const runs = await client.workflow.listRuns({
  workflowName: "process-order",
  limit: 50,
});
for (const run of runs) {
  console.log(`${run.run_id} — ${run.status} (${run.created_at})`);
}

// List all registered definitions
const defs = await client.workflow.listDefinitions();
for (const def of defs) {
  console.log(`${def.name} v${def.version}`);
}

// Download a definition's YAML
const yaml = await client.workflow.getDefinition("process-order");
// yaml → Uint8Array | null
```

### Disable / Enable

```typescript
// Pause new runs (existing runs continue)
await client.workflow.disable("process-order");

// Resume
await client.workflow.enable("process-order");
```

### Full Example

See [examples/workflow.ts](https://github.com/floruntime/flo-js/blob/dev/examples/workflow.ts) for a complete walkthrough covering sync, signals, signal timeouts, outcome-based routing, history, and cancellation.

---

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

### Workflow Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `sync` | `sync(yaml) → Promise<SyncResult>` | Deploy/update definition from YAML string |
| `syncBytes` | `syncBytes(bytes) → Promise<SyncResult>` | Deploy/update from raw bytes |
| `start` | `start(name, input?) → Promise<string>` | Start a run, returns run ID |
| `status` | `status(runId) → Promise<WorkflowStatusResult>` | Get run status |
| `signal` | `signal(runId, type, data?) → Promise<void>` | Deliver a signal to a waiting run |
| `cancel` | `cancel(runId, reason?) → Promise<void>` | Cancel a run |
| `history` | `history(runId, opts?) → Promise<HistoryEvent[]>` | Run event history |
| `listRuns` | `listRuns(opts?) → Promise<RunEntry[]>` | List runs for a workflow |
| `listDefinitions` | `listDefinitions() → Promise<DefinitionEntry[]>` | List registered definitions |
| `getDefinition` | `getDefinition(name) → Promise<Uint8Array \| null>` | Download definition YAML |
| `disable` | `disable(name) → Promise<void>` | Pause new runs |
| `enable` | `enable(name) → Promise<void>` | Resume new runs |
