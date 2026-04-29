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
// Get returns GetResult | null \u2014 carries both value and version
const r = await client.kv.get("key");
if (r) console.log(r.value, "@", r.version); // r.version is bigint

// Put returns PutResult { version: bigint }
const res = await client.kv.put("key", encode("value"), {
  ttlSeconds: 3600n,
  casVersion: r?.version,  // optimistic locking against the latest read
  ifNotExists: true,
});
console.log("committed at v", res.version);

// Delete
await client.kv.delete("key");

// Multi-key get (single round trip, up to 256 keys, may span shards)
const entries = await client.kv.mget(["user:1", "user:2", "user:3"]);
const decoder = new TextDecoder();
for (const e of entries) {
  if (e.found) {
    console.log(`${e.key} = ${decoder.decode(e.value)} (v${e.version})`);
  } else {
    console.log(`${e.key} missing`);
  }
}

// Scan
const result = await client.kv.scan("user:", { limit: 100 });

// History
const versions = await client.kv.history("key");

// Atomic counter
const n = await client.kv.incr("visits:home");        // +1
const m = await client.kv.incr("visits:home", { delta: 10n });

// TTL lifecycle and existence
await client.kv.touch("lock:resource", 60n);   // extend TTL
await client.kv.persist("lock:resource");      // clear TTL
const exists = await client.kv.exists("lock:resource");

// JSON paths
await client.kv.jsonSet("order:42", "$", encode('{"items":3,"status":"new"}'));
const setRes = await client.kv.jsonSet("order:42", "$.status", encode('"shipped"'));
console.log("doc now at v", setRes.version);
const status = await client.kv.jsonGet("order:42", "$.status"); // GetResult | null
if (status) console.log(`${decode(status.value)} @ v${status.version}`);
await client.kv.jsonDel("order:42", "$.status");

// Per-shard transaction — atomic multi-key writes on one partition
const txn = await client.kv.begin("user:42");
try {
  await txn.put("user:42:name", encode("Jane"));
  await txn.incr("user:42:visits", 1n);
  const result = await txn.commit();
  console.log(`committed ${result.opCount} ops at index ${result.commitIndex}`);
} catch (err) {
  await txn.rollback(); // idempotent
  throw err;
}
```

`scan`, `mget`, `jsonGet`, `jsonSet`, `jsonDel`, and `history` are not supported inside a transaction and throw `TxnUnsupportedOpError`. Server caps: 256 ops per transaction, 1 MiB total payload.

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

// Access record fields
for (const rec of records.records) {
  console.log(rec.stream);   // stream name (e.g. "events")
  console.log(rec.payload);  // Uint8Array
  console.log(rec.headers);  // Record<string, string> | null
  console.log(rec.id);       // StreamID { timestampMs, sequence }
}

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

## StreamWorker (high-level)

The recommended way to consume streams is the `StreamWorker`, available in `@floruntime/node`. It handles consumer group join, polling, concurrency, ack/nack, and reconnection automatically:

```typescript
import { StreamWorker } from "@floruntime/node";

const worker = new StreamWorker("localhost:9000", {
  stream: "events",
  group: "processors",
  concurrency: 5,
  batchSize: 10,
  blockMs: 30000,
}, async (ctx) => {
  const data = ctx.json<{ event: string }>();
  console.log(`Stream: ${ctx.stream}, ID: ${ctx.streamId}`);
  console.log(`Headers:`, ctx.headers);
  await process(data);
});

await worker.start();
```

### StreamWorkerConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `stream` | `string` | *required* | Stream name to consume |
| `group` | `string` | `"default"` | Consumer group name |
| `consumer` | `string` | auto | Consumer ID within the group |
| `concurrency` | `number` | `10` | Max concurrent handlers |
| `batchSize` | `number` | `10` | Records per poll |
| `blockMs` | `number` | `30000` | Long-poll timeout (ms) |
| `messageTimeoutMs` | `number` | `300000` | Max handler duration (ms) |

### StreamContext

The handler receives a `StreamContext` with convenience accessors:

```typescript
async (ctx) => {
  ctx.payload;     // Uint8Array
  ctx.text();      // string (UTF-8 decoded)
  ctx.json<T>();   // parsed JSON
  ctx.streamId;    // StreamID
  ctx.stream;      // stream name
  ctx.headers;     // Record<string, string> (empty object if none)
  ctx.record;      // full StreamRecord
}
```

Records are **auto-acked** on handler success and **auto-nacked** on exception. Connection errors trigger automatic reconnect and consumer group re-join.

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
| `append` | `append(stream, payload, opts?) → Promise<AppendResult>` | Append record (with optional headers) |
| `read` | `read(stream, opts?) → Promise<ReadResult>` | Read records |
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
