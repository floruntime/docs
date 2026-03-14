---
title: Introduction
description: What is Flo and why it exists.
---

Flo is a distributed runtime that unifies **streams**, **key-value storage**, **queues**, **time-series**, **durable actions**, and **workflow orchestration** in a single binary. Instead of stitching together separate systems for each concern, Flo provides all six as primitives over one Raft-replicated log — with a single connection, consistent durability, and zero integration overhead.

- **Layer 3 — Orchestration**: Workflows
- **Layer 2 — Execution**: Actions · Workers · Stream Processing · WASM Operators
- **Layer 1 — Primitives**: Streams · KV · Queues · Time-Series
- **Layer 0 — Foundation**: Unified Append Log · Raft Consensus

## Why Flo?

Modern backends tend to accumulate a separate system for every concern — an event log here, a cache there, a job queue, a workflow engine. Each one brings its own connection pool, failure mode, and consistency model. Developers end up spending as much time wiring infrastructure together as building the actual product.

Flo takes a different approach. All primitives share one Raft consensus log as their storage engine. Streams expose the log directly. KV and Queues are deterministic state machines that consume it. Because everything lives in the same replication path, there are no dual-write race conditions, no cross-system sync issues, and one fewer thing to operate.

## Features

- **Streams** — Partitioned, append-only commit log with consumer groups, configurable storage tiers, and exactly-once delivery
- **Key-Value** — Strongly consistent, versioned storage with compare-and-swap (CAS), TTL, blocking gets, and prefix scans
- **Queues** — Priority queues with competing consumers, lease-based delivery, dead-letter support, and visibility timeouts
- **Time-Series** — Columnar write buffers with block index, InfluxDB line protocol ingest, and FloQL query language
- **Actions** — Durable execution of external business logic with automatic retries, timeouts, and dead-letter handling
- **Stream Processing** — Real-time stateful pipelines with windowing, keyed state, checkpointing, watermarks, and WASM operators
- **Workflows** — Multi-step orchestration with YAML definitions, signals, timers, circuit breakers, and health-weighted routing
- **Thread-per-Core** — Shared-nothing architecture with io_uring/kqueue per core. No locks, no GC pauses
- **Raft Consensus** — Linearizable writes, tiered storage (hot RAM → warm disk → cold remote), automatic leader election
- **Built-in Dashboard** — Real-time web UI for monitoring streams, keys, queues, and cluster health

## Performance

Benchmarked on the shard-per-core architecture (Apple M-series, single core, ReleaseFast):

| Benchmark | Throughput | Latency |
|-----------|-----------|--------|
| UAL append | 12.9M ops/sec | 77 ns/op |
| KV put | 4.4M ops/sec | 225 ns/op |
| KV get | 11.9M ops/sec | 84 ns/op |
| KV scan | 6.0M ops/sec | 165 ns/op |
| Inbox SPSC | 28.5M msg/sec | 35 ns/msg |

## SDKs

Flo has official SDKs for:

| Language | Package | Transport |
|----------|---------|-----------|
| **Go** | `github.com/floruntime/flo-go` | TCP |
| **Python** | `pip install flo` | TCP (asyncio) |
| **JavaScript** | `@floruntime/node` | TCP |
| **JavaScript** | `@floruntime/web` | WebSocket |
| **Zig** | `flo-zig` | TCP |

## Next Steps

- [Install Flo](/docs/getting-started/installation/) to get the binary
- [Quick Start](/docs/getting-started/quickstart/) to try it in 2 minutes
- [Architecture Overview](/docs/architecture/overview/) to understand the internals
