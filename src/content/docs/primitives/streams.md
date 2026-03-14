---
title: Streams
description: Append-only commit log with consumer groups, offsets, and partitioning.
---

Streams are append-only, ordered logs of records. They're the foundation of event sourcing, activity feeds, change data capture, and real-time data pipelines.

In Flo, stream records **are** the Unified Append Log entries — there is no separate stream projection. Reading a stream is reading the log directly, making it zero-copy and the fastest primitive.

## Core Operations

### Append

```bash
flo stream append events '{"type": "signup", "user": "alice"}'
flo stream append events '{"type": "login", "user": "alice"}'
```

### Read

```bash
# Read from the beginning
flo stream read events

# Read the last N records
flo stream read events --last 10

# Read from a specific offset
flo stream read events --offset 100 --count 50
```

### Stream Info

```bash
flo stream info events
```

### Trim

```bash
# Keep only the last 10,000 records
flo stream trim events --max-len 10000
```

## Consumer Groups

Consumer groups allow multiple consumers to process a stream in parallel, with each record delivered to exactly one consumer in the group.

```bash
# Each consumer reads a disjoint subset of records
# Consumer 1:
flo stream read events --group processors --consumer worker-1

# Consumer 2:
flo stream read events --group processors --consumer worker-2
```

The server tracks each consumer's offset automatically. When consumer-1 acknowledges records 1–50, consumer-2 gets records 51–100, and so on.

## SDK Examples

import { Tabs, TabItem } from '@astrojs/starlight/components';

<Tabs>
<TabItem label="Go">
```go
client := flo.NewClient("localhost:9000")
client.Connect()
defer client.Close()

// Append
client.Stream.Append("events", []byte(`{"event":"signup"}`), nil)

// Read from beginning
records, _ := client.Stream.Read("events", nil)
for _, rec := range records.Records {
    fmt.Printf("offset=%d: %s\n", rec.Offset, rec.Payload)
}

// Consumer group
records, _ = client.Stream.GroupRead("events", &flo.GroupReadOptions{
    Group:    "processors",
    Consumer: "worker-1",
    Count:    10,
    BlockMS:  ptr(uint32(30000)),
})
// ... process records ...
client.Stream.GroupAck("events", "processors", offsets)
```
</TabItem>
<TabItem label="Python">
```python
async with FloClient("localhost:9000") as client:
    # Append
    result = await client.stream.append("events", b'{"event":"signup"}')
    print(f"Appended at offset {result.offset}")

    # Read from beginning
    result = await client.stream.read("events")
    for record in result.records:
        print(f"offset={record.offset}: {record.payload}")

    # Consumer group
    await client.stream.group_join("events", "processors", "worker-1")
    result = await client.stream.group_read(
        "events", "processors", "worker-1",
        StreamGroupReadOptions(count=10, block_ms=30000)
    )
    await client.stream.group_ack("events", "processors",
        [r.id for r in result.records])
```
</TabItem>
<TabItem label="JavaScript">
```typescript
const client = new FloClient("localhost:9000");
await client.connect();

// Append
const result = await client.stream.append(
  "events", encode('{"event":"signup"}')
);

// Read from beginning
const records = await client.stream.read("events", { offset: 0n, limit: 10 });
for (const rec of records.records) {
  console.log(decode(rec.payload));
}

// Consumer group
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
</TabItem>
<TabItem label="Zig">
```zig
var client = flo.Client.init(allocator, "localhost:9000", .{});
defer client.deinit();
try client.connect();

var stream = flo.Stream.init(&client);

// Append
const result = try stream.append("events", "{\"event\":\"signup\"}", .{});

// Read from beginning
var records = try stream.read("events", .{});
defer records.deinit();
for (records.records) |rec| {
    std.debug.print("seq={d}: {s}\n", .{ rec.seq, rec.payload });
}

// Consumer group
try stream.groupJoin("events", "my-group", "worker-1", .{});
var group_records = try stream.groupRead("events", "my-group", "worker-1", .{
    .count = 10,
    .block_ms = 5000,
});
defer group_records.deinit();
```
</TabItem>
</Tabs>

## Reading Modes

| Mode | CLI Flag | Description |
|------|----------|-------------|
| From beginning | _(default)_ | Read from offset 0 |
| From offset | `--offset N` | Start at specific offset |
| From tail | `--last N` | Read last N records |
| From timestamp | `--since <ts>` | Read records after a timestamp |
| Blocking | `--block <ms>` | Wait for new records (long polling) |

## How It Works

Streams are the most direct primitive in Flo. Stream records are simply UAL entries with `entry_type = stream_append`. There is no separate data structure — reading a stream is reading a range of UAL entries filtered by type.

- The UAL index **is** the stream offset
- Zero copy — no derived state, no overhead
- Consumer group offsets are stored as KV entries (prefix `cg:`)
- The "stream projection" is mostly bookkeeping: high water marks and consumer group cursors

See [Storage Internals](/architecture/storage/) for details.
