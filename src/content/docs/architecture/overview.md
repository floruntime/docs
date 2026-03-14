---
title: Architecture Overview
description: Shard-per-core distributed runtime with unified append log storage.
---

## Design Principles

1. **The log is the database.** All writes go through the Unified Append Log (UAL). The Raft consensus log and the storage log are the same thing — no separate WAL.
2. **Thread-per-core, shared-nothing.** Each CPU core runs an independent shard. Shards never share mutable state; they communicate via lock-free MPSC inboxes.
3. **Projections, not tables.** KV, Queue, Stream, and Time-Series are deterministic projections derived from the UAL. On recovery, projections are rebuilt by replaying the log.
4. **Handler self-registration.** The Dispatcher is a ~300-line opcode→handler lookup table. Each domain subsystem registers its own handlers — the Dispatcher imports nothing.

## System Layout

```
┌───────────────────────────────────────────────────────────────┐
│                           NODE                                │
│                                                               │
│  Acceptor Thread     TCP accept → peek → route → hand-off     │
│                                                               │
│  Shard 0 Thread      Reactor → Dispatcher → Partitions        │
│  Shard 1 Thread      Reactor → Dispatcher → Partitions        │
│  Shard N Thread      Reactor → Dispatcher → Partitions        │
│                                                               │
│  Dashboard Thread    HTTP REST API → Inbox queries            │
│  Metrics Thread      Prometheus /metrics → per-shard agg      │
└───────────────────────────────────────────────────────────────┘
```

### Acceptor

Dedicated thread running a TCP accept loop. On each new connection:

1. Accept the socket
2. Peek at the first bytes to detect the protocol (binary, RESP, HTTP, WebSocket)
3. Parse the routing key from the first request
4. Hash the routing key → partition → shard
5. Hand off the file descriptor to the target shard via a pipe

Connections have **shard affinity** — once assigned, a connection stays on its shard to avoid cross-core cache thrashing.

### Shard

Each shard is a dedicated OS thread pinned to a CPU core that owns:

| Component | Purpose |
|-----------|---------|
| **Reactor** | Single kqueue/io_uring event loop handling all I/O, timers, and inbox draining |
| **Dispatcher** | Opcode→handler table for request routing |
| **ConnectionPool** | All connections assigned to this shard |
| **Partitions** | Raft groups with UAL + Projections (`partition_id % shard_count = shard_id`) |
| **Inbox** | MPSC ring buffer for receiving cross-shard messages |
| **Slab allocator** | For cross-shard payload lifetimes |

The shard's main loop:

```
loop {
    reactor.poll()                  // I/O events
    processEvents()                 // handle ready connections
    drainInbox()                    // cross-shard messages
    waiter_pool.expireTimeouts()    // blocking operation expiry
    taskScheduler.tick()            // background tasks
}
```

### Dispatcher

Table-driven routing with a flat 256-slot handler array. Each subsystem (KV, Stream, Queue, TS, Actions, Workflows, Processing) calls `dispatcher.register(.opcode, handler)` during initialization — the Dispatcher never imports domain code.

### Router

Hash-based partition assignment:

```
hash(key) → partition_id
partition_id % shard_count → shard_id
```

If a request lands on the wrong shard, the handler detects the mismatch and forwards via the Inbox.

## Write Path

```
1. Client sends request to Acceptor
2. Acceptor routes to correct Shard
3. Dispatcher maps opcode to Handler
4. Handler calls Raft.propose(entry)
5. Raft replicates to quorum
6. On commit: UAL.append(entry)
7. ProjectionRouter.apply(entry) → updates KV/Queue/Stream/TS
8. Response sent to client
```

Write latency: ~1 RTT to quorum + local UAL write.

## Read Path

```
1. Client sends request to Shard
2. Dispatcher maps opcode to Handler
3. Handler queries Projection directly (no Raft needed)
4. If cross-shard: Inbox message → remote Shard → response
5. Response sent to client
```

Read latency: 0 RTT for local reads on the leader.

## Cross-Shard Communication

Shards communicate via 32-byte envelopes on lock-free MPSC ring buffers:

```
┌─────┬───────────┬──────────────┬─────────────┬─────────────┬──────────┬─────────┐
│ tag │ src_shard │ partition_id │ payload_ptr │ payload_len │ sequence │ padding │
│ u8  │ u8        │ u16          │ ptr         │ u32         │ u64      │ 8B      │
└─────┴───────────┴──────────────┴─────────────┴─────────────┴──────────┴─────────┘
```

Payloads are allocated from the slab allocator, not embedded in the envelope. This keeps the MPSC ring's cache line footprint minimal.

## Clustering

| Component | Purpose |
|-----------|---------|
| **SWIM gossip** | Failure detection and membership protocol |
| **Controller Raft** | Runs on Shard 0, manages partition table |
| **Partition Table** | Maps partition → node, updated on membership changes |
| **Forwarder** | Routes requests to the correct node when partitions aren't local |

## Ports

| Port | Purpose |
|------|---------|
| 9000 | Binary wire protocol (client traffic) |
| 9001 | Prometheus metrics |
| 9002 | Dashboard REST API |

## Performance

Benchmarked on the new architecture (Apple M-series, single core, ReleaseFast):

| Benchmark | Throughput | Latency |
|-----------|-----------|--------|
| UAL append | 12.9M ops/sec | 77 ns/op |
