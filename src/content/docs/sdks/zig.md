---
title: Zig SDK
description: Native Zig SDK for Flo — zero-allocation wire protocol.
---

## Installation

Add to `build.zig.zon`:

```zig
.dependencies = .{
    .flo = .{
        .url = "https://github.com/floruntime/flo-zig/archive/refs/tags/v0.1.0.tar.gz",
        .hash = "...",
    },
},
```

In `build.zig`:

```zig
const flo = b.dependency("flo", .{ .target = target, .optimize = optimize });
exe.root_module.addImport("flo", flo.module("flo"));
```

## Quick Start

```zig
const std = @import("std");
const flo = @import("flo");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = flo.Client.init(allocator, "localhost:9000", .{ .namespace = "myapp" });
    defer client.deinit();
    try client.connect();

    // KV
    var kv = flo.KV.init(&client);
    try kv.put("key", "value", .{});
    if (try kv.get("key", .{})) |value| {
        defer allocator.free(value);
        std.debug.print("Got: {s}\n", .{value});
    }

    // Queue
    var queue = flo.Queue.init(&client);
    const seq = try queue.enqueue("tasks", "payload", .{ .priority = 5 });
    var result = try queue.dequeue("tasks", 10, .{});
    defer result.deinit();

    // Stream
    var stream = flo.Stream.init(&client);
    _ = try stream.append("events", "data", .{});
    var records = try stream.read("events", .{});
    defer records.deinit();
}
```

## KV Operations

```zig
var kv = flo.KV.init(&client);

// Get (returns null if not found)
const value = try kv.get("key", .{});

// Blocking get
const value = try kv.get("key", .{ .block_ms = 5000 });

// Put with options
try kv.put("key", "value", .{
    .ttl_seconds = 3600,
    .cas_version = 5,
    .if_not_exists = true,
    .namespace = "other-ns",  // override default
});

// Delete
try kv.delete("key", .{});

// Scan
var result = try kv.scan("prefix:", .{ .limit = 100, .keys_only = true });
defer result.deinit();

// History
const versions = try kv.history("key", .{ .limit = 10 });
```

## Queue Operations

```zig
var queue = flo.Queue.init(&client);

// Enqueue with options
const seq = try queue.enqueue("tasks", "payload", .{
    .priority = 5,
    .delay_ms = 1000,
    .dedup_key = "unique-id",
});

// Dequeue with long polling
var result = try queue.dequeue("tasks", 10, .{
    .visibility_timeout_ms = 60000,
    .block_ms = 5000,
});
defer result.deinit();

// Ack, Nack, DLQ
try queue.ack("tasks", &seqs, .{});
try queue.nack("tasks", &seqs, .{ .to_dlq = false });
var dlq = try queue.dlqList("tasks", .{ .limit = 100 });
defer dlq.deinit();
try queue.dlqRequeue("tasks", &seqs, .{});
```

## Stream Operations

```zig
var stream = flo.Stream.init(&client);

// Append
const result = try stream.append("events", "payload", .{});

// Append with headers
const result = try stream.append("events", "payload", .{
    .headers = "content-type=application/json\nsource=web",
});

// Read from beginning
var records = try stream.read("events", .{});
defer records.deinit();

// Read from a specific position
var records = try stream.read("events", .{
    .start = flo.StreamID.fromSequence(100), .count = 50,
});
defer records.deinit();

// Read from tail with long polling
var records = try stream.read("events", .{
    .tail = true, .block_ms = 5000,
});
defer records.deinit();

// Access record fields
for (records.records) |rec| {
    std.debug.print("Stream: {s}\n", .{rec.stream});   // stream name
    std.debug.print("Payload: {s}\n", .{rec.payload});  // raw bytes
    // rec.headers = ?[]const u8 (raw wire bytes, null if no headers)
}

// Consumer groups
try stream.groupJoin("events", "my-group", "worker-1", .{});
var group_records = try stream.groupRead("events", "my-group", "worker-1", .{
    .count = 10, .block_ms = 5000,
});
defer group_records.deinit();
try stream.groupAck("events", "my-group", seqs, .{});

// Info and trim
const info = try stream.info("events", .{});
try stream.trim("events", .{ .max_len = 1000 });
```

## StreamWorker (high-level)

The recommended way to consume streams is the `StreamWorker`. It handles consumer group join, polling, concurrency, ack/nack, and reconnection automatically:

```zig
fn processEvent(ctx: *flo.StreamContext) !void {
    const data = try ctx.json(Event);
    defer data.deinit();

    std.debug.print("Stream: {s}, ID: {d}\n", .{ ctx.stream(), ctx.streamID().sequence });
    if (ctx.headers()) |hdrs| {
        // iterate parsed headers
        _ = hdrs;
    }
}

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var worker = try flo.StreamWorker.init(allocator, .{
        .endpoint = "localhost:9000",
        .namespace = "myapp",
        .stream = "events",
        .group = "processors",
        .concurrency = 5,
        .batch_size = 10,
        .block_ms = 30_000,
    }, processEvent);
    defer worker.deinit();

    try worker.start();
}
```

### StreamWorkerConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `stream` | `[]const u8` | `""` | Single stream name |
| `streams` | `?[]const []const u8` | `null` | Multiple streams |
| `group` | `[]const u8` | `"default"` | Consumer group name |
| `consumer` | `?[]const u8` | auto | Consumer ID |
| `concurrency` | `u32` | `10` | Max concurrent handlers |
| `batch_size` | `u32` | `10` | Records per poll |
| `block_ms` | `u32` | `30_000` | Long-poll timeout (ms) |
| `heartbeat_interval_ms` | `u64` | `30_000` | Heartbeat interval (ms) |

### StreamContext

The handler receives a `*StreamContext` with convenience accessors:

```zig
fn handler(ctx: *flo.StreamContext) !void {
    ctx.payload();    // []const u8
    ctx.streamID();   // StreamID
    ctx.stream();     // stream name
    ctx.headers();    // ?std.StringHashMap([]const u8)
    ctx.json(T);      // parsed JSON
}
```

Records are **auto-acked** on handler success and **auto-nacked** on error. Connection errors trigger automatic reconnect and consumer group re-join.

## ActionWorker

The `ActionWorker` is a high-level worker that manages connection, registration, polling, heartbeats, and graceful shutdown:

```zig
const flo = @import("flo");

fn processOrder(ctx: *flo.ActionContext) ![]const u8 {
    const input = try ctx.json(OrderRequest);
    defer input.deinit();

    // For long tasks, extend the lease
    try ctx.touch(30000);

    return ctx.toBytes(.{ .status = "completed" });
}

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var worker = try flo.ActionWorker.init(allocator, .{
        .endpoint = "localhost:9000",
        .namespace = "myapp",
        .concurrency = 10,
    });
    defer worker.deinit();

    try worker.registerAction("process-order", processOrder);
    try worker.start();
}
```

For low-level action operations (register, invoke, status), use `flo.Actions`:

```zig
var actions = flo.Actions.init(&client);

// Register an action type
try actions.register("send-email", .user, .{
    .timeout_ms = 30000, .max_retries = 3,
});

// Invoke an action
const run_id = try actions.invoke("send-email", "{\"to\":\"user@example.com\"}", .{});
defer allocator.free(run_id);

// Check status
const status = try actions.status(run_id, .{});
```

## Error Handling

All operations return `flo.FloError`:

| Error | Description |
|-------|-------------|
| `NotConnected` | Client not connected |
| `ConnectionFailed` | TCP connection failed |
| `NotFound` | Key/queue not found |
| `BadRequest` | Invalid request |
| `Conflict` | CAS conflict |
| `ServerError` | Internal server error |

## Memory Management

- All results that allocate memory have a `.deinit()` method — always `defer result.deinit()`
- The client requires an allocator at init time
- String values returned from `get()` must be freed by the caller
