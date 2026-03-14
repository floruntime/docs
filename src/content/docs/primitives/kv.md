---
title: Key-Value
description: Strongly consistent, versioned key-value storage with CAS, TTL, and blocking gets.
---

Flo's KV store provides strongly consistent key-value storage backed by the Unified Append Log. Every write is Raft-replicated for durability.

## Core Operations

### Put

```bash
flo kv set mykey "hello world"
```

### Get

```bash
flo kv get mykey
```

### Delete

```bash
flo kv delete mykey
```

### List / Scan

```bash
# List all keys
flo kv list

# Prefix scan
flo kv list --prefix "user:"
```

## Advanced Features

### TTL (Time-to-Live)

Set an expiration on keys:

```bash
flo kv set session:abc '{"user":"alice"}' --ttl 3600
```

The key automatically expires after 3600 seconds.

### Compare-and-Swap (CAS)

Optimistic locking for concurrent updates:

```bash
# Get current version
flo kv get counter  # returns version=1

# Update only if version matches
flo kv set counter "2" --cas-version 1
```

If another client modified the key since you read it, the CAS operation fails with a conflict error.

### Conditional Writes

```bash
# Only set if key doesn't already exist
flo kv set mykey "value" --if-not-exists

# Only set if key exists
flo kv set mykey "new-value" --if-exists
```

### Blocking Gets

Wait for a key to appear (long polling):

```bash
# Block up to 5 seconds waiting for key
flo kv get mykey --block 5000
```

This is useful for coordination patterns where one process writes a result and another waits for it.

### Version History

Every mutation creates a new version. Query the history:

```bash
flo kv history mykey --limit 10
```

Returns a list of previous values with version numbers and timestamps.

## SDK Examples

import { Tabs, TabItem } from '@astrojs/starlight/components';

<Tabs>
<TabItem label="Go">
```go
client := flo.NewClient("localhost:9000")
client.Connect()
defer client.Close()

// Put with TTL
ttl := uint64(3600)
client.KV.Put("session:abc", []byte(`{"user":"alice"}`), &flo.PutOptions{
    TTLSeconds: &ttl,
})

// Get
value, _ := client.KV.Get("session:abc", nil)

// CAS update
version := uint64(1)
err := client.KV.Put("counter", []byte("2"), &flo.PutOptions{
    CASVersion: &version,
})
if flo.IsConflict(err) {
    // Handle conflict
}

// Blocking get
blockMS := uint32(5000)
value, _ = client.KV.Get("key", &flo.GetOptions{BlockMS: &blockMS})

// Prefix scan
result, _ := client.KV.Scan("user:", &flo.ScanOptions{Limit: ptr(uint32(100))})
for _, entry := range result.Entries {
    fmt.Printf("%s = %s\n", entry.Key, entry.Value)
}
```
</TabItem>
<TabItem label="Python">
```python
async with FloClient("localhost:9000") as client:
    # Put with TTL
    await client.kv.put("session:abc", b'{"user":"alice"}',
        PutOptions(ttl_seconds=3600))

    # Get
    value = await client.kv.get("session:abc")

    # CAS update
    await client.kv.put("counter", b"2", PutOptions(cas_version=1))

    # Blocking get
    value = await client.kv.get("key", GetOptions(block_ms=5000))

    # Prefix scan
    result = await client.kv.scan("user:", ScanOptions(limit=100))
    for entry in result.entries:
        print(f"{entry.key}: {entry.value}")
```
</TabItem>
<TabItem label="JavaScript">
```typescript
const client = new FloClient("localhost:9000");
await client.connect();

// Put with TTL
await client.kv.put("session:abc", encode('{"user":"alice"}'), {
  ttlSeconds: 3600n,
});

// Get
const value = await client.kv.get("session:abc");

// CAS update
try {
  await client.kv.put("counter", encode("2"), { casVersion: 1n });
} catch (err) {
  // Handle conflict
}

// Prefix scan
const result = await client.kv.scan("user:", { limit: 100 });
```
</TabItem>
<TabItem label="Zig">
```zig
var client = flo.Client.init(allocator, "localhost:9000", .{});
defer client.deinit();
try client.connect();

var kv = flo.KV.init(&client);

// Put with TTL
try kv.put("session:abc", "{\"user\":\"alice\"}", .{ .ttl_seconds = 3600 });

// Get
if (try kv.get("session:abc", .{})) |value| {
    defer allocator.free(value);
    std.debug.print("Got: {s}\n", .{value});
}

// CAS update
try kv.put("counter", "2", .{ .cas_version = 1 });

// Prefix scan
var result = try kv.scan("user:", .{ .limit = 100 });
defer result.deinit();
```
</TabItem>
</Tabs>

## How It Works

The KV store is implemented as a **KV Projection** — a hash table with MVCC version chains, derived from the Unified Append Log.

- Every `kv_put` is first proposed to Raft, then committed to the UAL, then applied to the projection
- Reads go directly to the projection (no Raft round-trip)
- On recovery, the projection is rebuilt by replaying UAL entries from the last snapshot
- Version history is maintained as a bounded ring buffer per key (default: 8 versions)

See [Storage Internals](/architecture/storage/) for details.
