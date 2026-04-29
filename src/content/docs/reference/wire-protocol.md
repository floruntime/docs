---
title: Wire Protocol
description: Binary wire protocol reference for the Flo client-server communication.
---

Flo uses a custom binary protocol for client-server communication on port **9000**. The protocol supports TLV (Type-Length-Value) encoding for efficiency and zero-copy parsing.

## Connection

Clients connect via TCP to the server's client port (default 9000). The first bytes sent identify the protocol:

| Magic Bytes | Protocol |
|-------------|----------|
| `FLO\x01` | Binary wire protocol |
| `*`, `$`, `+`, `-` | RESP (Redis protocol) |
| `GET`, `POST`, ... | HTTP (redirected to dashboard) |
| WebSocket upgrade | WebSocket (binary protocol over WS frames) |

The Acceptor thread peeks at the first bytes to detect the protocol and routes accordingly.

## Request Format

Every request has a fixed 32-byte header followed by a variable-length payload:

```
┌──────────────────────────────────────────────────────────────────┐
│                    Request Header (32 bytes)                      │
├──────────┬──────────┬───────┬──────────┬──────────┬──────────────┤
│ magic    │ opcode   │ flags │ req_id   │ payload  │ namespace    │
│ (4B)     │ (2B)     │ (2B)  │ (8B)     │ _len(4B) │ _hash (8B)  │
├──────────┴──────────┴───────┴──────────┴──────────┴──────────────┤
│ key_length │ padding                                              │
│ (2B)       │ (2B)                                                │
├────────────┴─────────────────────────────────────────────────────┤
│                    Payload (variable)                             │
│ [key bytes] [value bytes] [optional TLV fields]                  │
└──────────────────────────────────────────────────────────────────┘
```

### Header Fields

| Field | Type | Description |
|-------|------|-------------|
| `magic` | `u32` | Protocol magic: `0x464C4F01` ("FLO\x01") |
| `opcode` | `u16` | Operation code (see OpCode table) |
| `flags` | `u16` | Request flags (compression, etc.) |
| `req_id` | `u64` | Client-assigned request ID for response matching |
| `payload_len` | `u32` | Length of payload following the header |
| `namespace_hash` | `u64` | FNV-1a hash of the namespace string |
| `key_length` | `u16` | Length of the key in the payload |

## Response Format

```
┌──────────────────────────────────────────────────────────────────┐
│                   Response Header (24 bytes)                      │
├──────────┬──────────┬───────┬──────────┬──────────────────────────┤
│ magic    │ status   │ flags │ req_id   │ payload_len              │
│ (4B)     │ (2B)     │ (2B)  │ (8B)     │ (4B)                    │
├──────────┴──────────┴───────┴──────────┴──────────────────────────┤
│                    Payload (variable)                             │
└──────────────────────────────────────────────────────────────────┘
```

### Status Codes

| Code | Name | Description |
|------|------|-------------|
| `0x00` | `OK` | Operation succeeded |
| `0x01` | `NOT_FOUND` | Key / queue / stream not found |
| `0x02` | `BAD_REQUEST` | Invalid request parameters |
| `0x03` | `CONFLICT` | CAS version mismatch |
| `0x04` | `UNAUTHORIZED` | Authentication required |
| `0x05` | `OVERLOADED` | Server at capacity (retry) |
| `0x06` | `INTERNAL_ERROR` | Server error |
| `0x07` | `NOT_LEADER` | Node is not the leader for this partition |

## OpCodes

The protocol defines 167 operation codes organized by subsystem:

### KV Operations (0x100–0x118)

| OpCode | Value | Description |
|--------|-------|-------------|
| `kv_put` | `0x100` | Set key-value pair (returns new version) |
| `kv_get` | `0x101` | Get value + version by key |
| `kv_mget` | `0x102` | Multi-key get |
| `kv_delete` | `0x103` | Delete a key |
| `kv_scan` | `0x104` | Prefix scan |
| `kv_history` | `0x105` | Get version history |
| `kv_incr` | `0x10B` | Atomic counter (signed i64 delta, default +1) |
| `kv_json_get` | `0x10C` | Extract JSON sub-field via JSONPath |
| `kv_json_set` | `0x10D` | Atomically set a JSON sub-field |
| `kv_json_del` | `0x10E` | Atomically delete a JSON sub-field |
| `kv_touch` | `0x113` | Update TTL on existing key (no value rewrite) |
| `kv_persist` | `0x114` | Clear TTL (make key permanent) |
| `kv_exists` | `0x115` | Existence check (no value transferred) |
| `kv_begin_txn` | `0x110` | Open a per-shard transaction (returns `txn_id` + pinned partition hash) |
| `kv_commit_txn` | `0x111` | Commit a transaction atomically (returns `commit_index` + `op_count`) |
| `kv_rollback_txn` | `0x112` | Discard a transaction (idempotent) |
| `kv_txn_response` | `0x119` | Reply envelope for ops executed inside a transaction |

Response opcodes occupy `0x106–0x10A` and `0x116–0x118`. CAS is expressed as a TLV option on `kv_put`, not a separate opcode. Per-shard transactions (see [Transactions](/primitives/kv#transactions)) are scoped to a single partition and carry the open `txn_id` via the `txn_id` TLV option (tag `0x09`, u64 LE) on subsequent KV ops.

### Queue Operations (0x20–0x2F)

| OpCode | Value | Description |
|--------|-------|-------------|
| `queue_enqueue` | `0x20` | Add message to queue |
| `queue_dequeue` | `0x21` | Fetch and lease messages |
| `queue_ack` | `0x22` | Acknowledge messages |
| `queue_nack` | `0x23` | Negative acknowledge |
| `queue_peek` | `0x24` | Peek without leasing |
| `queue_touch` | `0x25` | Extend lease |
| `queue_dlq_list` | `0x26` | List DLQ messages |
| `queue_dlq_requeue` | `0x27` | Requeue from DLQ |

### Stream Operations (0x30–0x3F)

| OpCode | Value | Description |
|--------|-------|-------------|
| `stream_append` | `0x30` | Append record |
| `stream_read` | `0x31` | Read records |
| `stream_create` | `0x32` | Create stream |
| `stream_info` | `0x33` | Stream metadata |
| `stream_trim` | `0x34` | Trim old records |
| `stream_group_create` | `0x35` | Create consumer group |
| `stream_group_read` | `0x36` | Consumer group read |
| `stream_group_ack` | `0x37` | Consumer group ack |

### Time-Series Operations (0x40–0x4F)

| OpCode | Value | Description |
|--------|-------|-------------|
| `ts_write` | `0x40` | Write data point |
| `ts_write_batch` | `0x41` | Batch write points |
| `ts_query` | `0x42` | Execute FloQL query |
| `ts_create_measurement` | `0x43` | Create measurement |

### Action Operations (0x50–0x5F)

| OpCode | Value | Description |
|--------|-------|-------------|
| `action_register` | `0x50` | Register action type |
| `action_invoke` | `0x51` | Invoke action |
| `action_status` | `0x52` | Get execution status |
| `action_result` | `0x53` | Get execution result |

### Worker Operations (0x60–0x6F)

| OpCode | Value | Description |
|--------|-------|-------------|
| `worker_register` | `0x60` | Register worker |
| `worker_await` | `0x61` | Await task assignment |
| `worker_complete` | `0x62` | Complete task |
| `worker_fail` | `0x63` | Fail task |
| `worker_heartbeat` | `0x64` | Worker heartbeat |
| `worker_touch` | `0x65` | Extend task lease |

### Cluster Operations (0xC0–0xCF)

| OpCode | Value | Description |
|--------|-------|-------------|
| `cluster_join` | `0xC0` | Join cluster |
| `cluster_leave` | `0xC1` | Leave cluster |
| `cluster_status` | `0xC2` | Cluster health |
| `cluster_partition_table` | `0xC3` | Get partition table |

## TLV Extended Fields

Some operations include optional TLV (Type-Length-Value) fields after the key and value:

```
┌──────┬────────┬───────────┐
│ type │ length │ value     │
│ (1B) │ (2B)   │ (var)     │
└──────┴────────┴───────────┘
```

| Type | Name | Used By |
|------|------|---------|
| `0x01` | TTL | KV put |
| `0x02` | CAS version | KV put/delete |
| `0x03` | Priority | Queue enqueue |
| `0x04` | Delay | Queue enqueue |
| `0x05` | Dedup key | Queue enqueue |
| `0x06` | Block timeout | Get, dequeue, stream read |
| `0x07` | Consumer group | Stream group operations |
| `0x08` | Idempotency key | Action invoke |

## RESP Compatibility

Flo also accepts Redis RESP protocol on the same port. The Acceptor detects RESP by the leading character (`*`, `$`, `+`, `-`, `:`). RESP commands are translated to Flo operations:

| RESP Command | Flo Operation |
|-------------|---------------|
| `SET key value [EX sec] [NX] [XX]` | `kv_put` |
| `GET key` | `kv_get` |
| `DEL key` | `kv_delete` |
| `EXISTS key` | `kv_exists` |
| `INCR key` / `INCRBY key n` / `DECR key` | `kv_incr` |
| `EXPIRE key sec` | `kv_touch` |
| `PERSIST key` | `kv_persist` |
| `JSON.GET key [path]` | `kv_json_get` |
| `JSON.SET key path value` | `kv_json_set` |
| `JSON.DEL key [path]` | `kv_json_del` |
| `SCAN cursor MATCH pattern` | `kv_scan` |
| `LPUSH queue value` | `queue_enqueue` |
| `RPOP queue` | `queue_dequeue` |
| `XADD stream * field value` | `stream_append` |
| `XREAD COUNT n STREAMS stream id` | `stream_read` |

This allows Redis clients (`redis-cli`, `ioredis`, `redis-py`, `go-redis`, RedisInsight, etc.) to connect to Flo without modification for the operations above. See [Redis compatibility](/reference/redis) for the full mapping and known semantic differences.
