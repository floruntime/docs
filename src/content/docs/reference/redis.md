---
title: Redis Compatibility
description: Use redis-cli, ioredis, go-redis, redis-py and other Redis clients against Flo.
---

Flo speaks **RESP** (the Redis serialization protocol) on the same TCP port as its native protocol. The [Acceptor](/architecture/node) detects RESP by the leading byte (`*`, `$`, `+`, `-`, `:`) and dispatches to a translation layer that maps each command onto an equivalent Flo opcode. No proxy, no separate port, no additional configuration.

This makes Flo a drop-in target for tools that already speak Redis — `redis-cli`, RedisInsight, ioredis, go-redis, redis-py, Lettuce, etc. — for the subset of commands listed below.

## Supported commands

### Strings & basic KV

| Redis | Flo opcode | Notes |
|-------|-----------|-------|
| `GET key` | `kv_get` | Returns `nil` if missing. |
| `SET key value` | `kv_put` | |
| `SET key value EX seconds` | `kv_put` + TTL | TTL TLV. |
| `SET key value NX` | `kv_put` + `if_not_exists` | |
| `SET key value XX` | `kv_put` + `if_exists` | |
| `DEL key [key ...]` | `kv_delete` | Per-key. |
| `EXISTS key` | `kv_exists` | |
| `EXPIRE key seconds` | `kv_touch` | |
| `PEXPIRE key ms` | `kv_touch` | Rounded down to seconds. |
| `PERSIST key` | `kv_persist` | |
| `TTL key` | (synthesized) | Computed from key metadata. |

### Counters

| Redis | Flo opcode | Notes |
|-------|-----------|-------|
| `INCR key` | `kv_incr` (delta=1) | |
| `INCRBY key n` | `kv_incr` (delta=n) | Signed `i64`. |
| `DECR key` | `kv_incr` (delta=-1) | |
| `DECRBY key n` | `kv_incr` (delta=-n) | |

A counter and a string value cannot share a key. Mixing returns `WRONGTYPE`-style `Conflict`.

### JSON (RedisJSON-style)

| Redis | Flo opcode | Notes |
|-------|-----------|-------|
| `JSON.GET key [path]` | `kv_json_get` | Path defaults to `$`. |
| `JSON.SET key path value` | `kv_json_set` | Atomic per-Raft-entry sub-field set. |
| `JSON.DEL key [path]` | `kv_json_del` | |

Path syntax is a small JSONPath subset: `$`, `.field`, `.field.nested`, `[index]`.

### Scan

| Redis | Flo opcode | Notes |
|-------|-----------|-------|
| `SCAN cursor MATCH pattern` | `kv_scan` | Prefix-only; `*` suffix supported. |
| `KEYS pattern` | `kv_scan` (drained) | Avoid in production — scans the whole keyspace. |

### Lists → Queues

| Redis | Flo opcode | Notes |
|-------|-----------|-------|
| `LPUSH queue value` | `queue_enqueue` | |
| `RPOP queue` | `queue_dequeue` | Single-message dequeue. |
| `BRPOP queue timeout` | `queue_dequeue` + `block_ms` | Long-poll. |

Flo queues are leased / acked, not auto-removed. After `RPOP`, the message is held under a lease until ack/nack/expiry. See [Queues](/primitives/queue).

### Streams

| Redis | Flo opcode | Notes |
|-------|-----------|-------|
| `XADD stream * field value` | `stream_append` | |
| `XREAD COUNT n STREAMS stream id` | `stream_read` | |
| `XLEN stream` | `stream_info` | |

## Optimistic concurrency: WATCH/MULTI/EXEC

Flo does **not** implement multi-key transactions. The `WATCH/MULTI/EXEC` pattern translates idiomatically to Flo's CAS:

```text
# Redis
WATCH counter
val = GET counter
MULTI
SET counter (val+1)
EXEC

# Flo equivalent (single Raft entry, no coordinator)
r = kv.get("counter")               # returns value + version
kv.put("counter", new_val,
       cas_version = r.version)     # fails with Conflict if version moved
```

For atomic increments specifically, prefer `INCR` / `kv.incr` — it's unconditional and never conflicts.

## Differences from Redis

| Area | Behavior |
|------|----------|
| Persistence | Every write is Raft-replicated and committed to UAL before responding. There is no `SAVE`/`BGSAVE` — Flo is always durable. |
| Eviction | No `maxmemory` LRU eviction. Out-of-memory rejects new writes; configure TTLs explicitly. |
| Pub/Sub | Not supported via RESP. Use [Streams](/primitives/stream) or [Streaming Updates](/primitives/kv#streaming-updates). |
| Lua scripting | `EVAL`/`EVALSHA` not supported. Use [WASM Processing](/orchestration/processing) for server-side logic. |
| Cluster slots | `CLUSTER` commands return a single-slot response. Flo's partitioning is internal and works without client awareness. |
| Transactions | `MULTI/EXEC` returns an error. Use CAS or model multi-field state as a single JSON document. |
| `OBJECT ENCODING` etc. | Not supported. |

## Connecting

```bash
# redis-cli
redis-cli -h flo.example.com -p 9000

127.0.0.1:9000> SET hello world
OK
127.0.0.1:9000> INCR counter
(integer) 1
127.0.0.1:9000> JSON.SET order:42 $ '{"items":3,"status":"new"}'
OK
127.0.0.1:9000> JSON.SET order:42 $.status '"shipped"'
OK
127.0.0.1:9000> JSON.GET order:42 $.status
"\"shipped\""
```

Any RESP client library should connect with the same host/port settings you'd give a Redis instance. There is no AUTH negotiation today — see [Security](/operations/security) for transport-level options.
