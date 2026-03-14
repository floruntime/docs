---
title: Queues
description: Priority queues with competing consumers, lease-based delivery, DLQ, and visibility timeouts.
---

Flo queues provide reliable task distribution with competing consumers, priority ordering, visibility timeouts, dead-letter handling, and deduplication.

## Core Operations

### Enqueue

```bash
flo queue push tasks '{"task": "send-email", "to": "alice@example.com"}'
```

### Dequeue

```bash
# Pop the highest-priority message (creates a lease)
flo queue pop tasks
```

When you dequeue a message, it becomes invisible to other consumers for a visibility timeout (default: 30 seconds). You must acknowledge it before the timeout expires, or it returns to the queue.

### Acknowledge

```bash
flo queue ack tasks <sequence-number>
```

## Advanced Features

### Priority

Higher priority messages are dequeued first:

```bash
flo queue push tasks '{"urgent": true}' --priority 10
flo queue push tasks '{"routine": true}' --priority 1
# Dequeue returns the priority-10 message first
```

### Delayed Delivery

Make a message invisible for a period after enqueue:

```bash
# Available after 60 seconds
flo queue push tasks '{"scheduled": true}' --delay 60000
```

### Deduplication

Prevent duplicate processing with a dedup key:

```bash
flo queue push tasks '{"order": "ORD-123"}' --dedup-key "order-ORD-123"
# Sending the same dedup key again is a no-op
```

### Dead Letter Queue (DLQ)

Messages that fail processing too many times are moved to a DLQ:

```bash
# List DLQ messages
flo queue dlq tasks

# Requeue DLQ messages back to the main queue
flo queue dlq-requeue tasks <sequence-numbers>
```

### Peek

Inspect messages without creating leases:

```bash
flo queue peek tasks --count 5
```

### Lease Renewal (Touch)

Extend the visibility timeout for long-running processing:

```bash
flo queue touch tasks <sequence-number>
```

## SDK Examples

import { Tabs, TabItem } from '@astrojs/starlight/components';

<Tabs>
<TabItem label="Go">
```go
client := flo.NewClient("localhost:9000")
client.Connect()
defer client.Close()

// Enqueue with priority
client.Queue.Enqueue("tasks", []byte(`{"task":"process"}`), &flo.EnqueueOptions{
    Priority: 10,
})

// Dequeue with long polling
blockMS := uint32(30000)
result, _ := client.Queue.Dequeue("tasks", 10, &flo.DequeueOptions{
    BlockMS: &blockMS,
})

for _, msg := range result.Messages {
    // Process message...
    client.Queue.Ack("tasks", []uint64{msg.Seq}, nil)
}

// Nack to DLQ
client.Queue.Nack("tasks", []uint64{msg.Seq}, &flo.NackOptions{ToDLQ: true})
```
</TabItem>
<TabItem label="Python">
```python
async with FloClient("localhost:9000") as client:
    # Enqueue with priority
    seq = await client.queue.enqueue("tasks",
        b'{"task":"process"}', EnqueueOptions(priority=10))

    # Dequeue with long polling
    result = await client.queue.dequeue("tasks", 10,
        DequeueOptions(block_ms=30000))

    for msg in result.messages:
        try:
            process(msg.payload)
            await client.queue.ack("tasks", [msg.seq])
        except Exception:
            await client.queue.nack("tasks", [msg.seq],
                NackOptions(to_dlq=True))
```
</TabItem>
<TabItem label="JavaScript">
```typescript
const client = new FloClient("localhost:9000");
await client.connect();

// Enqueue with priority
await client.queue.enqueue("tasks", encode('{"task":"process"}'), {
  priority: 10,
});

// Dequeue with long polling
const result = await client.queue.dequeue("tasks", 10, {
  blockMs: 30000,
});

for (const msg of result.messages) {
  await client.queue.ack("tasks", [msg.seq]);
}
```
</TabItem>
<TabItem label="Zig">
```zig
var client = flo.Client.init(allocator, "localhost:9000", .{});
defer client.deinit();
try client.connect();

var queue = flo.Queue.init(&client);

// Enqueue with priority
const seq = try queue.enqueue("tasks", "{\"task\":\"process\"}", .{
    .priority = 10,
});

// Dequeue with long polling
var result = try queue.dequeue("tasks", 10, .{ .block_ms = 30000 });
defer result.deinit();

for (result.messages) |msg| {
    // Process...
    try queue.ack("tasks", &[_]u64{msg.seq}, .{});
}
```
</TabItem>
</Tabs>

## How It Works

The Queue Projection uses native data structures instead of the old KV-based approach:

- **Ready heap** — Min-heap ordered by priority, holding `(sequence, ual_index)` pairs (16 bytes per node)
- **Lease tracker** — Maps sequence → lease expiry. Expired leases return messages to the ready heap
- **DLQ state** — Tracks attempt count per message. Exceeding the retry limit moves to DLQ

This reduces per-message overhead from ~1.5 KB (old KV-based design) to ~64 bytes — a 23x improvement.

See [Storage Internals](/architecture/storage/) for details.
