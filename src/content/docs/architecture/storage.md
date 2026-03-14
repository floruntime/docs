---
title: Storage Internals
description: How Flo stores data — the Unified Append Log, projections, snapshots, and recovery.
---

## Philosophy: The Log Is the Database

Most databases maintain two copies of every write: a write-ahead log (WAL) for durability and a primary data structure (B-tree, LSM tree, heap file) for queries. Flo doesn't do this. The log *is* the primary data structure.

The Unified Append Log captures every mutation — KV puts, queue enqueues, stream appends, time-series writes — as a sequenced, typed entry. The Raft consensus log and the storage log are the same thing. There is no separate WAL.

Everything else — the KV hash table, the queue's priority heap, the time-series columnar buffers — is a **projection**: a derived view rebuilt deterministically from the log. If you deleted every projection and replayed the log from the beginning, you'd get back to exactly the same state.

## Unified Append Log (UAL)

The UAL is a sequence of entries, each identified by a monotonically increasing 64-bit index.

### Entry Format

Every UAL entry has a 40-byte header followed by a variable-length payload:

```
┌──────────┬──────────┬───────┬───────────┬────────────┬─────────────┬───────┐
│ CRC32C   │ entry_   │ flags │ raft_term │ raft_index │ timestamp   │ pay-  │
│ (4B)     │ type(2B) │ (2B)  │ (8B)      │ (8B)       │ _ns (8B)    │ load  │
└──────────┴──────────┴───────┴───────────┴────────────┴─────────────┴───────┘
```

The CRC covers the header and payload together. Payload layout varies by entry type — each projection knows how to parse its own payloads.

### Three-Tier Storage

| Tier | Implementation | Purpose |
|------|---------------|---------|
| **Hot** | mmap'd ring buffer in RAM (default 64 MB) | Recent entries for active reads. O(1) by index. |
| **Warm** | Sealed disk segments (`.flseg` files), memory-mapped | Historical data, bounded by local disk space. |
| **Cold** | S3/GCS/Azure Blob (planned) | Long-term archival, on-demand download. |

When entries age out of the hot ring, they're flushed to warm segments. A warm store hash map keeps payload copies in memory (default 32 MB) so reads don't have to go to disk immediately.

### Segment Format

Each sealed segment is a `.flseg` file:

```
[SegmentHeader]   magic "FLOSEG\0\0", version, segment_id, index range, entry count
[Entry 0..N]      Sequential entries
[SparseIndex]     Sampled every ~256 entries: index → file offset
[SegmentFooter]   index_offset, index_count, crc32c
```

The sparse index enables binary search by UAL index without scanning every entry. The footer CRC covers the entire segment — corruption is detected on read.

## Projections

Projections are specialized data structures that consume UAL entries and maintain queryable state.

### KV Projection

- Hash table mapping keys to values, plus MVCC version chains (ring buffer, default 8 versions per key)
- TTL tracking for automatic expiry
- Reads are O(1) hash table lookups — no Raft round-trip needed
- Historical lookups walk the version chain

### Queue Projection

The old system stored each message as 8 separate KV entries (~1.5 KB overhead per message). The new design uses native structures:

- **Ready heap** — min-heap ordered by priority, 16 bytes per node
- **Lease tracker** — maps sequences to lease expiry timestamps
- **DLQ state** — tracks retry counts, moves failures to dead-letter queue

Per-message overhead: **~64 bytes** (23× reduction from the old design).

### Stream Projection

Streams have *no* traditional projection. Stream records are UAL entries with `entry_type = stream_append`. Reading a stream is reading a range of UAL entries — the log index *is* the stream offset. Zero copy, no derived state.

Consumer group offsets are stored as KV entries (prefixed with `cg:`), so the KV projection handles that state.

### Time-Series Projection

TS data has **no dedicated disk files**. All `ts_write` entries are appended to the shared UAL (same `.flseg` segments as KV, queue, and stream data).

- **Write buffers** — per-series, per-field in-memory buffers (1024 points capacity)
- **Block index** — in-memory metadata: min/max timestamp, point count, UAL index range
- Series metadata lives in KV projection under `_ts:meta:*` keys

When a write buffer fills, `flushBuffer()` records a block metadata entry (timestamps + UAL index range) and **discards the raw points**. Reconstructing historical block data requires replaying the UAL in `[ual_index_start..ual_index_end]`. This means hot reads (from the write buffer) are fast, while cold reads (from flushed blocks) require UAL replay.

### Projection Router

Single fan-out point between the UAL and projections. Routes committed entries by type:

| Entry Types | Destination |
|-------------|-------------|
| `kv_put`, `kv_delete`, `kv_batch`, `cg_*` | KV Projection |
| `queue_enqueue`, `queue_ack`, `queue_requeue` | Queue Projection |
| `ts_write`, `ts_write_batch` | TS Projection |
| `stream_append` | Nothing (data stays in UAL) |
| `raft_noop`, `raft_config` | Nothing (consensus layer) |

An `applied_index` guard ensures replayed entries are silently skipped.

## Snapshots

Projections live in RAM. Without snapshots, recovery requires replaying the entire UAL from the beginning.

### Snapshot Format (`.fsnap`)

```
┌─────────────────────────────────┐
│ Header (64 bytes)               │
│   magic: "FLO_SNP\0"           │
│   ual_index (snapshot point)    │
│   raft_term, section_count      │
├─────────────────────────────────┤
│ Section: KV (type=0x01)         │
│ Section: Queue (type=0x02)      │
│ Section: TS (type=0x03)         │
│ Section: Stream (type=0x04)     │
├─────────────────────────────────┤
│ Footer (16 bytes)               │
│   crc32c, magic: "FLO_SNE"     │
└─────────────────────────────────┘
```

### Lifecycle

1. Serialize all four projections at the current `applied_index`
2. Write to `.fsnap.tmp`
3. `fdatasync` the temp file
4. Atomic rename `.fsnap.tmp` → `.fsnap`
5. Update `MANIFEST`
6. Old UAL segments with indices ≤ `snapshot_index` can now be compacted

The atomic rename guarantees crash safety — if the process crashes before the rename, the previous snapshot remains valid.

### Crash Safety

| Scenario | What You Lose | Why It's OK |
|----------|--------------|-------------|
| Crash during UAL append | The uncommitted entry | Wasn't acknowledged to client |
| Crash during snapshot write | The in-progress snapshot | Previous snapshot still valid |
| Crash after snapshot, before compaction | Nothing | Snapshot valid, extra UAL entries harmless |
| Power loss (no fsync) | At most ~1ms of entries | Bounded by group commit interval |

## Recovery

When a node restarts, each partition recovers:

1. **Load snapshot** — read MANIFEST, validate CRC, deserialize all projections
2. **Open UAL** — discover warm segments on disk
3. **Replay** — feed UAL entries from `snapshot_index + 1` through ProjectionRouter (same code path as live operation)
4. **Load cold manifest** — metadata only, no data fetched
5. **Ready for traffic**

If no snapshot exists, recovery replays the entire UAL from the first segment … slow, but correct.

## Memory Controller

Each shard gets a fixed memory budget. Default split for a 2 GB shard:

| Component | Share | Default Budget |
|-----------|-------|----------------|
| UAL Hot Ring | 12.5% | 256 MB |
| KV Projection | 37.5% | 768 MB |
| Queue Projection | 6.25% | 128 MB |
| TS Projection | 12.5% | 256 MB |
| I/O Buffers | 6.25% | 128 MB |
| Snapshot Buffer | 3.125% | 64 MB |
| Warm Store | 6.25% | 128 MB |
| Reserve | 15.625% | 320 MB |

### Backpressure Levels

1. **Eviction** — ask the component to free memory (drop old MVCC versions, spill to disk)
2. **Reserve borrow** — borrow from the reserve pool, tracked and repaid
3. **Client backpressure** — return `ShardMemoryPressure` as a retriable error
4. **Hard reject** — write rejected immediately to prevent OOM

## Directory Layout

```
{data_dir}/
├── SYSTEM                              # Topology lock (shards, partitions, version)
├── 00000/                              # Shard 0 (zero-padded 5 digits)
│   ├── MANIFEST                        # Latest snapshot ref + cold segment index
│   ├── segs/
│   │   ├── 0000000001.flseg            # UAL segment (10-digit zero-padded first index)
│   │   ├── 0000000257.flseg
│   │   └── *.flseg.tmp                 # Transient (in-flight writes only)
│   ├── snaps/
│   │   ├── 0000001000-1709234567.fsnap # Snapshot at UAL index 1000
│   │   └── *.fsnap.tmp                 # Transient (in-flight writes only)
│   └── cold.fcold                      # (optional) Cold tier manifest
├── 00001/
│   ├── MANIFEST
│   ├── segs/
│   └── snaps/
└── ...{shard_count - 1}/
```

### SYSTEM

Written once on first boot. If `shards` or `partitions` don't match on restart, the node refuses to start with `TopologyMismatch`. Format:

```json
{
  "shards": 8,
  "partitions": 256,
  "created_at": 1772033477,
  "version": "1.0.0"
}
```

### MANIFEST

One per shard — a JSON file tracking the latest snapshot pointer and cold segment inventory. No per-directory manifests to coordinate.

### Atomic Writes

Both segments and snapshots are written atomically via `.tmp` → `fdatasync` → rename. If the process crashes before the rename, the previous file remains valid.
