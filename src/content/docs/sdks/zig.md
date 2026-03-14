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

// Read from beginning
var records = try stream.read("events", .{});
defer records.deinit();

// Read from offset
var records = try stream.read("events", .{
    .start_mode = .offset, .offset = 100, .count = 50,
});
defer records.deinit();

// Read from tail with long polling
var records = try stream.read("events", .{
    .start_mode = .tail, .block_ms = 5000,
});
defer records.deinit();

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

## Worker / Action Operations

```zig
var worker = flo.Worker.init(&client);

// Register action
try worker.registerAction("send-email", .user, .{
    .timeout_ms = 30000, .max_retries = 3,
});

// Invoke action
const run_id = try worker.invoke("send-email", "{\"to\":\"user@example.com\"}", .{});
defer allocator.free(run_id);

// Worker loop
try worker.register("worker-1", &[_][]const u8{"send-email"}, .{});
while (true) {
    if (try worker.awaitTask("worker-1", &[_][]const u8{"send-email"}, .{
        .block_ms = 0,
    })) |*task| {
        defer task.deinit();
        if (processTask(task.payload).success) {
            try worker.complete("worker-1", task.task_id, output, .{});
        } else {
            try worker.fail("worker-1", task.task_id, error_msg, .{ .retry = true });
        }
    }
}

// Extend lease for long tasks
try worker.touch("worker-1", task.task_id, .{ .extend_ms = 30000 });
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
