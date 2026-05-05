# Flo Documentation for Agents

This is a generated concatenation of the canonical Flo docs. Prefer the source pages for narrow citations; use this file when an agent benefits from a single loadable corpus.

Generated: 2026-05-05
Canonical docs site: https://docs.floruntime.io/

## Table of Contents

- Getting Started
  - Configuration (/getting-started/configuration/)
  - Installation (/getting-started/installation/)
  - Welcome to FloRuntime (/getting-started/introduction/)
  - Quick Start (/getting-started/quickstart/)
- Primitives
  - KV (/primitives/kv/)
  - Queues (/primitives/queues/)
  - Streams (/primitives/streams/)
  - Time-Series (/primitives/time-series/)
- Orchestration
  - Actions (/orchestration/actions/)
  - Stream Processing (/orchestration/processing/)
  - Workers (/orchestration/workers/)
  - Workflows (/orchestration/workflows/)
- Architecture
  - Architecture Overview (/architecture/overview/)
  - Storage Internals (/architecture/storage/)
- Deployment
  - Clustering (/deployment/clustering/)
  - Docker Deployment (/deployment/docker/)
- Reference
  - CLI Reference (/reference/cli/)
  - Redis Compatibility (/reference/redis/)
  - REST API (/reference/rest-api/)
  - Wire Protocol (/reference/wire-protocol/)
- SDKs
  - Go SDK (/sdks/go/)
  - JavaScript / TypeScript SDK (/sdks/javascript/)
  - SDK Overview (/sdks/overview/)
  - Python SDK (/sdks/python/)
  - Zig SDK (/sdks/zig/)

---

# Getting Started

Install Flo, start the runtime, and learn the core operating model.

---

## Configuration

Source path: src/content/docs/getting-started/configuration.md
Canonical URL: https://docs.floruntime.io/getting-started/configuration/

Flo is configured via a `flo.toml` file and CLI flags. CLI flags take the highest precedence: **CLI flags > flo.toml > built-in defaults**.

## Config File

By default, Flo looks for `flo.toml` in the current directory. Override with `--config`:

```bash
flo server start --config /etc/flo/flo.toml
```

Generate a default config file with all options:

```bash
flo server start --default-config > flo.toml
```

## Full Reference

### `[server]`

```toml
[server]
port = 9000               # Client API port (binary protocol + WebSocket)
bind = "0.0.0.0"          # Bind address
data_dir = "~/.flo/data"  # Data directory for UAL segments and storage files
shards = 0                # Number of shards (0 = auto-detect CPU count)
# partition_count = 0     # Virtual partitions (0 = auto: max(4096, shards × 32))
```

`shards` and `partition_count` define the on-disk data layout. **Cannot be changed after data exists without rebalancing.**

### `[storage]`

```toml
[storage]
durability = "async_flush"       # sync | async_flush | ephemeral
hot_buffer_capacity = 67108864   # Per-partition ring buffer size in bytes (64 MB)
# hot_flush_seconds = 300        # Max seconds before hot → warm flush (0 = disabled)
# max_hot_entries = 0            # Max entries in hot tier before eviction (0 = capacity only)
# max_local_segments = 100       # Max warm segments before archival to cold tier
# enable_wal_truncation = true   # Truncate WAL after safe segment flush
```

Durability modes:

| Mode | Behaviour |
|------|-----------|
| `sync` | `fsync` after every write — strongest guarantee, lowest throughput |
| `async_flush` | Background flush every ~1 ms — default, highest throughput |
| `ephemeral` | Skip WAL entirely — for caches or temporary data |

### `[logging]`

```toml
[logging]
level = "info"             # debug | info | warn | error
```

### `[auth]`

```toml
[auth]
enabled = false
# jwt_secret = "your-256-bit-secret-key-here"
# jwks_url = "https://your-project.supabase.co/.well-known/jwks.json"
```

When `enabled = true`, all client connections require a valid JWT. Supports HS256 (shared secret) and RS256/ES256 (JWKS URL with key rotation).

### `[websocket]`

```toml
[websocket]
rate_limit_requests = 1000    # Max requests per window (0 = unlimited)
rate_limit_window_ms = 1000   # Window size in milliseconds
ping_interval_ms = 30000      # Heartbeat ping interval (0 = disabled)
pong_timeout_ms = 10000       # Close connection if no pong within this time
```

### `[metrics]`

```toml
[metrics]
enabled = true
# port = 0                # 0 = auto (listen_port + 1), so 9001 by default
# bind = "0.0.0.0"
```

### `[dashboard]`

```toml
[dashboard]
enabled = true
# port = 0                # 0 = auto (listen_port + 2), so 9002 by default
# bind = "127.0.0.1"      # Localhost only by default
# cors_origins = "http://localhost:5173"
```

### `[cluster]`

```toml
[cluster]
enabled = false
# node_id = 1
# raft_port = 0           # 0 = auto (listen_port + 500)
# seeds = "192.168.1.10:9500,192.168.1.11:9500"
# replication_factor = 3
# election_timeout_min_ms = 150
# election_timeout_max_ms = 300
# heartbeat_interval_ms = 50
```

### `[cold_storage]`

```toml
[cold_storage]
# provider = "none"       # none | file | s3
# upload_workers = 2
# restore_workers = 4

# [cold_storage.file]
# base_path = "/var/lib/flo/archive"
# sync_on_write = true

# [cold_storage.s3]
# bucket = "my-flo-cold-storage"
# region = "us-east-1"
# endpoint = ""           # For S3-compatible services (MinIO, R2)
# use_path_style = false  # Set true for MinIO
# use_tls = true
```

## CLI Overrides

Common options can be set directly on the command line. These override everything:

```bash
flo server start \
  --port 4444 \
  --data-dir ./my-data \
  --shards 4 \
  --partitions 128 \
  --log-level debug \
  --log-format json \
  --metrics-port 9101 \
  --dashboard-port 9102 \
  --no-metrics \
  --no-dashboard
```

Clustering flags:

```bash
flo server start \
  --node-id 1 \
  --raft-port 9500 \
  --gossip-port 9600 \
  --join "192.168.1.10:9500,192.168.1.11:9500"
```

---

## Installation

Source path: src/content/docs/getting-started/installation.md
Canonical URL: https://docs.floruntime.io/getting-started/installation/

## One-Line Install (macOS / Linux)

```bash
curl -fsSL https://raw.githubusercontent.com/floruntime/flo/master/scripts/install.sh | sh
```

This installs the `flo` binary to `/usr/local/bin`.

## Homebrew (macOS)

```bash
brew tap floruntime/tap
brew install flo
```

## Docker

```bash
docker run -p 9000:9000 -p 9001:9001 -p 9002:9002 ghcr.io/floruntime/flo:latest
```

See the [Docker deployment guide](/deployment/docker/) for production usage with volumes and compose.

## Building from Source

Requires [Zig 0.15.2+](https://ziglang.org/download/).

```bash
git clone https://github.com/floruntime/flo.git
cd flo/flo
zig build -Drelease=true
```

The binary is at `zig-out/bin/flo`.

## Verify Installation

```bash
flo --version
```

## Default Ports

| Port | Purpose |
|------|---------|
| `9000` | Client API (binary protocol + WebSocket) |
| `9001` | Prometheus metrics (auto: port + 1) |
| `9002` | Dashboard web UI (auto: port + 2) |

---

## Welcome to FloRuntime

Source path: src/content/docs/getting-started/introduction.mdx
Canonical URL: https://docs.floruntime.io/getting-started/introduction/

Install Flo, start the runtime, and store your first value. Every primitive ships in one binary —
      no Kafka, no Redis, no separate workflow engine.

```bash
# Install via Homebrew
brew install floruntime/tap/flo

# Start the runtime
flo server start

# Store and read a value
flo kv set hello "world"
flo kv get hello
```

```bash
# Download and install
curl -fsSL https://get.floruntime.io | sh

# Start the runtime
flo server start

# Create a stream and append an event
flo stream create events
flo stream append events '{"type":"login","user":"alice"}'
```

```bash
# Pull and run
docker run -p 4222:4222 -p 9090:9090 floruntime/flo:latest

# Use the CLI from another terminal
flo kv set greeting "hello from docker"
flo kv get greeting
```

      Four data primitives — all backed by the same Raft-replicated log, shaped to fit
      different access patterns.

      Durable execution, multi-step workflows, and real-time stream processing — no
      separate cluster needed.

          Durable execution of external logic. Automatic retries, timeouts, and
          dead-letter handling. Workers poll for invocations and report results.
          Multi-step orchestration defined in YAML. Signals, timers, circuit breakers,
          and full state replay.
          Stateful pipelines with windowing, watermarks, checkpointing, and WASM
          operators. Sub-millisecond local hops.
          Thread-per-shard, single Raft log per partition, hot-warm-cold storage tiering.
          Designed for predictable tail latency.

      Native clients with the full TCP wire protocol. Drop-in Redis compatibility for
      KV. RESP, HTTP, and WebSocket transports.

---

## Quick Start

Source path: src/content/docs/getting-started/quickstart.md
Canonical URL: https://docs.floruntime.io/getting-started/quickstart/

## Start the Server

```bash
flo server start
```

Flo starts on port `9000` (client API). Metrics and dashboard are available on ports `9001` and `9002` by default.

## KV

```bash
# Store a JSON document
flo kv set user:alice '{"name": "Alice", "role": "admin"}'

# Retrieve it
flo kv get user:alice

# Delete it
flo kv delete user:alice

# List keys
flo kv list
```

## Streams

```bash
# Append events to a stream
flo stream append events '{"type": "signup", "user": "alice"}'
flo stream append events '{"type": "login", "user": "alice"}'

# Read the last 10 records
flo stream read events --limit 10
```

## Queues

```bash
# Enqueue a job
flo queue enqueue jobs '{"task": "send-welcome-email", "to": "alice"}'

# Dequeue the next job (with visibility timeout)
flo queue dequeue jobs
```

## Time-Series

```bash
# Write a metric
flo ts write cpu --tags host=web-01 --value 82.5

# Query with FloQL
flo ts floql "cpu{host=web-01}[1h] | window(5m) | avg()"
```

## Actions

```bash
# Register an action
flo action register send-email

# Invoke it
flo action invoke send-email '{"to": "alice@example.com", "subject": "Welcome!"}'

# Check run status
flo action status <run-id>

# List all runs
flo action list
```

## Workflows

```bash
# Create a workflow from YAML
flo workflow create --file order-workflow.yaml

# Start an instance
flo workflow start process-order '{"order_id": "ORD-123", "amount": 99.99}'

# Check status
flo workflow status <run-id>
```

## Stream Processing

```bash
# Submit a processing job
flo processing submit --file jobs/user-spend-alerts.yaml

# Check status
flo processing status user-spend-alerts
```

## Dashboard

Open [http://localhost:9002](http://localhost:9002) to see the built-in web UI for monitoring streams, keys, queues, and cluster health.

## Next Steps

- [KV guide](/primitives/kv/) — CAS, TTL, versioning, blocking gets
- [Streams guide](/primitives/streams/) — Consumer groups, offsets, partitioning
- [Queues guide](/primitives/queues/) — Priority, DLQ, visibility timeouts
- [Time-Series guide](/primitives/time-series/) — InfluxDB ingest, FloQL queries
- [SDK guides](/sdks/overview/) — Go, Python, JavaScript, Zig

---

# Primitives

KV, streams, queues, and time-series APIs and behavior.

---

## KV

Source path: src/content/docs/primitives/kv.mdx
Canonical URL: https://docs.floruntime.io/primitives/kv/

Flo's KV store provides strongly consistent key-value storage backed by the Unified Append Log. Every write is Raft-replicated across the cluster before being acknowledged. Reads go directly to the local projection — no Raft round-trip, no cross-node hops for single-key lookups.

## Core Concepts

### Versioned Writes

Every mutation to a key creates a new **version**. The version number is the Raft log index at which the write was committed. This means versions are globally ordered and monotonically increasing across all keys.

Put responses include the new version number, which you can use for subsequent CAS updates:

```bash
flo kv set counter "1"           # → version=1
flo kv set counter "2" --cas 1   # → version=2 (succeeds)
flo kv set counter "3" --cas 1   # → error: Version mismatch
```

### Namespace Isolation

Keys live inside **namespaces**. The default namespace is used when no `-n` flag is provided. Keys with the same name in different namespaces are fully independent — they have separate values, versions, and TTLs.

```bash
# Create namespaces
flo ns create staging
flo ns create production

# Same key, different namespaces
flo kv set db_url "postgres://staging" -n staging
flo kv set db_url "postgres://prod"    -n production

# Each returns its own value
flo kv get db_url -n staging      # → postgres://staging
flo kv get db_url -n production   # → postgres://prod
```

Deleting or overwriting a key in one namespace has no effect on the same key in other namespaces. Conditional flags like `--nx` are also per-namespace — a key can be "new" in one namespace while already existing in another.

## Operations

### Put

```bash
flo kv set mykey "hello world"
```

| Flag | Description |
|------|-------------|
| `--ttl <seconds>` | Expire after N seconds (0 = no expiry) |
| `--nx` | Only set if the key does **not** already exist |
| `--xx` | Only set if the key **does** already exist |
| `--cas <version>` | Only set if the current version matches exactly |
| `-n <namespace>` | Target namespace |
| `-r <routing-key>` | Explicit shard routing key for co-location |

`--nx` and `--xx` are mutually exclusive. `--cas` cannot be combined with `--nx`.

**CAS version 0** has a special meaning: it asserts the key must not exist yet. This is equivalent to `--nx` but expressed as a version constraint.

### Get

```bash
flo kv get mykey
flo kv get mykey --format json   # includes version number
```

| Flag | Description |
|------|-------------|
| `--wait <ms>` | Wait until the key exists, then return (0 = wait forever) |
| `--block <ms>` | Wait for the **next version change**, even if the key already exists (0 = forever) |
| `--format <fmt>` | Output format: `json`, `table`, `raw` |
| `-n <namespace>` | Target namespace |
| `-r <routing-key>` | Explicit shard routing key |

`--wait` and `--block` serve different purposes:

- **`--wait`** is for coordination — one process creates a key, another waits for it to appear. If the key already exists, it returns immediately.
- **`--block`** is for watching — subscribe to the next change on an existing key. Even if the key exists now, it waits for a newer version.

```bash
# Process A: wait for a result to appear
flo kv get job:result --wait 30000

# Process B: watch for config changes
flo kv get config:feature-flags --block 0
```

### Multi-key get

Fetch many keys in a single round trip. Keys may live on different shards — the server gathers results in parallel and returns one entry per requested key (with a `found` flag distinguishing missing keys from empty values).

```bash
flo kv mget user:1 user:2 user:3
flo kv mget user:1 user:2 --output json
```

| Flag | Description |
|------|-------------|
| `--output <fmt>` | `text` (default), `json`, `table` |
| `-n <namespace>` | Target namespace |

Limited to **256 keys per call**. The total response is capped at 1 MB; entries beyond that limit are omitted (re-issue the call with the remaining keys).

    ```go
    entries, err := client.KV.MGet([]string{"user:1", "user:2", "user:3"}, nil)
    if err != nil { return err }
    for _, e := range entries {
        if e.Found {
            fmt.Printf("%s = %s (v%d)\n", e.Key, e.Value, e.Version)
        } else {
            fmt.Printf("%s missing\n", e.Key)
        }
    }
    ```
    ```python
    entries = await client.kv.mget(["user:1", "user:2", "user:3"])
    for e in entries:
        if e.found:
            print(f"{e.key} = {e.value!r} (v{e.version})")
        else:
            print(f"{e.key} missing")
    ```
    ```ts
    const entries = await client.kv.mget(["user:1", "user:2", "user:3"]);
    for (const e of entries) {
      if (e.found) {
        console.log(`${e.key} = ${new TextDecoder().decode(e.value)} (v${e.version})`);
      } else {
        console.log(`${e.key} missing`);
      }
    }
    ```
    ```zig
    var result = try kv.mget(&.{ "user:1", "user:2", "user:3" }, .{});
    defer result.deinit();
    for (result.entries) |e| {
        if (e.found) {
            std.debug.print("{s} = {s} (v{d})\n", .{ e.key, e.value, e.version });
        } else {
            std.debug.print("{s} missing\n", .{e.key});
        }
    }
    ```

### Delete

```bash
flo kv delete mykey
```

Aliases: `del`. Deleting a non-existent key returns a not-found error.

| Flag | Description |
|------|-------------|
| `-n <namespace>` | Target namespace |
| `-r <routing-key>` | Explicit shard routing key |

### List / Scan

```bash
flo kv list                      # all keys
flo kv list --prefix "user:"     # prefix filter
flo kv list --limit 50           # cap results
```

Aliases: `ls`, `scan`.

| Flag | Description |
|------|-------------|
| `--prefix <p>` / `-p` | Filter by key prefix |
| `--limit <n>` / `-l` | Max keys to return (default: 100, max: 1,000) |
| `-n <namespace>` | Target namespace |

List walks **all shards** — keys are returned regardless of which shard they hash to. The prefix filter is applied on each shard locally before results are merged.

### Version History

```bash
flo kv history mykey
flo kv history mykey --limit 5
```

Aliases: `hist`. Returns previous values with version numbers and timestamps. History for a non-existent key returns an error.

| Flag | Description |
|------|-------------|
| `--limit <n>` / `-l` | Max entries (default: 10) |
| `-n <namespace>` | Target namespace |

Flo maintains a bounded version chain per key (default depth: 64). Oldest versions are evicted when the chain is full. Deletes create tombstone entries — prior versions remain queryable through history even after deletion.

## TTL (Time-to-Live)

Set an expiration on keys:

```bash
flo kv set session:abc '{"user":"alice"}' --ttl 3600
```

The key expires 3600 seconds after the write. Expired keys return `(nil)` on get, as if they were never written. Setting `--ttl 0` explicitly means "no expiration."

Overwriting a key **resets its TTL**. If you set a key with `--ttl 60` and then overwrite it without a TTL flag, the new value has no expiration:

```bash
flo kv set temp "short-lived" --ttl 5   # expires in 5s
flo kv set temp "permanent"             # TTL cleared
```

TTL combines with conditional flags. A common pattern is `--ttl` + `--nx` for "set once with expiry":

```bash
flo kv set lock:resource "owner-1" --ttl 30 --nx
```

Expiry is **lazy** — keys are checked at read time rather than proactively swept. This means expired keys don't consume I/O until accessed.

## Compare-and-Swap (CAS)

CAS enables optimistic concurrency control. Read the current version, then conditionally write only if nobody else has modified the key since:

```bash
# Step 1: read current value and version
flo kv get counter --format json
# {"key":"counter","value":"41","version":7}

# Step 2: update only if version is still 7
flo kv set counter "42" --cas 7
```

If another writer updated the key between your read and write, the CAS fails with "Version mismatch" and the original value is preserved.

**CAS guarantees hold across the cluster.** You can read the version from one node and CAS-update from another — the version is the Raft log index, which is globally consistent.

## Atomicity model

Flo's KV store is built around **per-key linearizable writes** rather than multi-key transactions. Every mutation goes through Raft as a single committed entry, so each individual operation is atomic and durable on its own — the same model used by etcd, Consul, and FoundationDB single-key paths.

### Conditional & atomic writes

Use the conditional flags on `kv set`/`KV.Put` to express "do this only if X". Each is a single Raft entry — no coordinator, no roundtrips, no rollback to worry about.

| Pattern | How |
|---------|-----|
| Insert if absent | `--nx` (or `--cas 0`) |
| Update only if present | `--xx` |
| Compare-and-swap by version | `--cas <version>` |
| Atomic create with lease | `--nx --ttl <seconds>` |
| Atomic counter | [`kv incr`](#counters) |
| Atomic JSON sub-field update | [`kv jset`](#json-paths) |

The classic read-modify-write loop becomes:

```bash
# 1. Read current state and version (PUT/GET both return the version)
flo kv get account:42 --format json     # → value + version=11

# 2. Compute new state client-side
# 3. Conditional write — fails if anyone else changed the key
flo kv set account:42 '{"balance":150}' --cas 11
```

If the CAS fails, re-read and retry. For a counter, prefer `kv incr` — it is unconditional and never conflicts.

#### CAS-guarded delete, touch, and persist

The same `if_match` guard is also accepted by `delete`, `touch`, and `persist`. This closes the classic distributed-lock race: the holder can release the lock (or extend its lease) only if it still owns the version it acquired.

```go
// Acquire: NX put with TTL returns version
v, _ := kv.Put(ctx, "lock:job-42", []byte(ownerID),
    &flo.PutOptions{NX: true, TTL: 30 * time.Second})

// ... do work ...

// Release: only the owner deletes — no risk of unlocking after expiry
_ = kv.Delete(ctx, "lock:job-42", &flo.DeleteOptions{IfMatch: &v.Version})
```

```python
v = await kv.put("lock:job-42", owner_id.encode(), nx=True, ttl=30)
# ... work ...
await kv.delete("lock:job-42", DeleteOptions(if_match=v.version))
# Renew the lease atomically
await kv.touch("lock:job-42", 30, KVTouchOptions(if_match=v.version))
```

A version mismatch (or a missing key when `if_match` is set) returns the same CAS-failed error as `put` with `--cas`, carrying the current version so callers can decide whether to retry or give up.

### Multi-key atomicity

For multi-key writes that must commit or fail as a unit, Flo offers [**per-shard transactions**](#transactions). Operations are buffered on a single pinned partition and replicated as one Raft entry on commit. Pick the right tool:

| Need | Recommended approach |
|------|---------------------|
| "Several keys, all-or-nothing" | Open a [transaction](#transactions) pinned to a routing key — all writes commit atomically as one Raft entry. |
| "All these keys live together" | Set the same `--routing-key` on every related key (see [Shard Co-location](#shard-co-location)). Reads and writes stay on one shard. |
| "Update several fields of one document" | Model the state as a **single key with a JSON value** and use [`kv jset`](#json-paths) or CAS on the whole document. One Raft entry, no coordination. |
| "Atomic counter" | Use [`kv incr`](#counters) — unconditional and conflict-free. |
| "Long-running multi-step state machine" | Use a [workflow](/orchestration/workflows). Workflows give you durable execution, retries, and compensation steps. |
| "Idempotent producer / exactly-once write" | Use `--nx` on a dedupe key (e.g. `dedupe:<request-id>`) before doing the work. |
| "Cross-partition transaction" | Not supported. Either restructure keys to share a routing key, or use a workflow with compensating actions. |

## Counters

`kv incr` (opcode `0x10B`) atomically adds a signed delta to a key holding a 64-bit counter. The first `incr` on a missing key creates it at the delta value. The operation is unconditional — it never conflicts — and is ideal for rate-limit buckets, sequence generators, and metric accumulators.

```bash
flo kv incr visits:home          # +1, returns new value
flo kv incr visits:home -d 10    # +10
flo kv incr visits:home -d -1    # decrement
```

A counter and a string value cannot share a key. `incr` against a non-counter key returns `Conflict`.

### Recipe: per-minute rate limiter

```python
minute = int(time.time() // 60)
key = f"rl:{user_id}:{minute}"
count = await client.kv.incr(key)
if count == 1:
    await client.kv.touch(key, ttl_seconds=120)  # auto-expire old buckets
if count > LIMIT:
    raise RateLimited()
```

## TTL lifecycle

TTLs are set at write time via `--ttl` / `PutOptions.TTLSeconds`, but you can also adjust them later:

| Op | Effect |
|----|--------|
| [`kv touch <key> --ttl N`](#touch--persist) | Update the TTL on an existing key without rewriting the value |
| [`kv touch <key> --ttl 0`](#touch--persist) | Clear the TTL (equivalent to `kv persist`) |
| [`kv persist <key>`](#touch--persist) | Make a key permanent |

These are single-shard, no-replication-skip operations. Use them to extend session leases, refresh distributed locks, or promote a temporary value to permanent without losing it.

## Existence check

`kv exists` (opcode `0x115`) returns a single byte (`0` or `1`) without transferring the value, and is significantly cheaper than `get` for large values.

```bash
flo kv exists user:123    # exit 0 if present, 1 if absent
```

## JSON paths

For keys whose value is a JSON document, three operations let you read or mutate **sub-fields** without round-tripping the whole document:

| Op | Wire | Purpose |
|----|------|---------|
| `kv jget <key> [path]` | `0x10C` | Extract `path` from the JSON document. Path defaults to `$` (the whole document). |
| `kv jset <key> <path> <json>` | `0x10D` | Atomically set the value at `path`. `path = "$"` replaces the document (and creates the key if missing). |
| `kv jdel <key> [path]` | `0x10E` | Remove the value at `path`. |

Paths use a tiny JSONPath subset: `$`, `.field`, `.field.nested`, `[index]`. The operations are atomic per Raft entry — a sub-field update is a single committed write, not a read-modify-write loop.

`jget` returns the document's current `version` alongside the bytes (same `GetResult` shape as `kv get`); `jset` and `jdel` return a `PutResult` with the new version. Use that version to drive CAS on subsequent writes.

### Recipe: status enrichment

```bash
flo kv set order:42 '{"id":42,"items":3,"status":"new"}'
flo kv jset order:42 '$.status' '"shipped"'
flo kv jget order:42 '$.status'      # → "shipped"
```

The `jset` is a single Raft entry; concurrent writers updating different fields on the same document still each succeed atomically (last writer wins per field).

## Transactions

Per-shard transactions buffer multiple writes on a single pinned partition and commit them atomically as **one Raft entry**. Open with a routing key — every key touched inside the transaction must hash to the same partition, otherwise the server returns `kv_txn_cross_shard`.

| Op | Wire | Purpose |
|----|------|---------|
| `kv begin <routing-key>` | `0x110` | Open a new transaction. Returns a `txn_id` and the partition's `pinned_hash`. |
| `kv commit <txn-id>` | `0x111` | Apply all buffered ops atomically. Returns the `commit_index` and `op_count`. |
| `kv rollback <txn-id>` | `0x112` | Discard buffered ops. Idempotent. |

Inside a transaction, normal `kv` ops (`put`, `get`, `delete`, `incr`, `touch`, `persist`, `exists`) accept a `--txn <id>` flag and are buffered until commit. **Reads inside the transaction see the buffered writes.** The following are **not supported** inside a transaction and return `kv_txn_unsupported_op`: `scan`, `mget`, `jget`, `jset`, `jdel`, `history`.

**Server caps**: 256 ops per transaction, 1 MiB total payload, 1024 open transactions per server.

```bash
# Open, write, commit
TXN=$(flo kv begin user:42 --format json | jq -r .txn_id)
flo kv set user:42:name "Jane"   --txn $TXN
flo kv incr user:42:visits       --txn $TXN
flo kv set user:42:last_seen "$(date -u +%s)" --txn $TXN
flo kv commit $TXN               # → commit_index=N op_count=3
```

If the client crashes before commit, the buffered ops are discarded automatically when the transaction expires server-side. Transactions survive across stateless connections — they are owned by `txn_id`, not by the TCP connection.

### When to use transactions vs. JSON or workflows

| Pattern | Use |
|---------|-----|
| Atomic update of 2–10 related keys on the same partition | **Transaction** |
| Atomic update of fields inside one document | [`kv jset`](#json-paths) |
| Atomic counter increment | [`kv incr`](#counters) |
| Multi-step business process across shards / external systems | [Workflow](/orchestration/workflows) |

## Shard Co-location

By default, each key is routed to a shard based on its hash. When you need related keys to land on the same shard (for locality or future atomic operations), use `--routing-key`:

```bash
flo kv set user:123:name "Alice" -r "user:123"
flo kv set user:123:email "alice@co.io" -r "user:123"
flo kv set user:123:prefs '{"theme":"dark"}' -r "user:123"
```

All three keys route to the same shard because they share the routing key `user:123`.

## Cluster Behavior

In a multi-node cluster:

- **Writes** are proposed to the Raft leader and replicated to a majority before being acknowledged.
- **Reads** are served from the local shard's projection — no Raft round-trip needed.
- **Data replicates** to all nodes. A key written on node 1 is readable from node 2 and node 3 after replication.
- **Node failures** are tolerated as long as a majority (quorum) of nodes remain healthy. A 3-node cluster survives 1 node failure.
- **CAS and conditional writes** are consistent across the cluster — the version check happens at the leader during Raft proposal.

## SDK Examples

```go
client := flo.NewClient("localhost:9000")
client.Connect()
defer client.Close()

// Put returns a PutResult with the new version
res, _ := client.KV.Put("mykey", []byte("hello"), nil)
fmt.Println("committed at version", res.Version)

// Put with TTL
ttl := uint64(3600)
client.KV.Put("session:abc", []byte(`{"user":"alice"}`), &flo.PutOptions{
    TTLSeconds: &ttl,
})

// Get returns *GetResult (nil if not found) — contains both value and version
if r, _ := client.KV.Get("session:abc", nil); r != nil {
    fmt.Printf("%s @ v%d\n", r.Value, r.Version)
}

// CAS update — read version from Get, conditional write
r, _ := client.KV.Get("counter", nil)
err := client.KV.Put("counter", []byte("42"), &flo.PutOptions{
    CASVersion: &r.Version,
})
if flo.IsConflict(err) {
    // Another writer modified the key — re-read and retry
}

// Conditional write (only if key doesn't exist)
client.KV.Put("lock:resource", []byte("owner-1"), &flo.PutOptions{
    IfNotExists: true,
    TTLSeconds:  ptr(uint64(30)),
})

// Atomic counter
n, _ := client.KV.Incr("visits:home", nil)

// TTL lifecycle
client.KV.Touch("lock:resource", 60, nil)   // extend lease
client.KV.Persist("lock:resource", nil)      // make permanent
ok, _ := client.KV.Exists("lock:resource", nil)

// JSON path operations
client.KV.JsonSet("order:42", "$.status", []byte(`"shipped"`), nil)
status, _ := client.KV.JsonGet("order:42", "$.status", nil)

// Blocking get — wait for key to appear
blockMS := uint32(5000)
r, _ = client.KV.Get("job:result", &flo.GetOptions{BlockMS: &blockMS})

// Prefix scan with pagination
result, _ := client.KV.Scan("user:", &flo.ScanOptions{Limit: ptr(uint32(100))})
for _, entry := range result.Entries {
    fmt.Printf("%s = %s\n", entry.Key, entry.Value)
}

// Version history
history, _ := client.KV.History("counter", &flo.HistoryOptions{Limit: ptr(uint32(5))})
for _, v := range history {
    fmt.Printf("v%d: %s (at %d)\n", v.Version, v.Value, v.Timestamp)
}

// Namespace-scoped operations
client.KV.Put("config", []byte("staging-db"), &flo.PutOptions{
    Namespace: "staging",
})
r, _ = client.KV.Get("config", &flo.GetOptions{Namespace: "staging"})

// Transaction — multiple writes on one shard, atomic commit
txn, _ := client.KV.Begin("user:42", nil)
_, _  = txn.Put("user:42:name", []byte("Jane"), nil)
_, _  = txn.Incr("user:42:visits", 1)
result, err := txn.Commit()
if err != nil {
    _ = txn.Rollback() // idempotent
}
fmt.Printf("committed %d ops at index %d\n", result.OpCount, result.CommitIndex)
```
```python
async with FloClient("localhost:9000") as client:
    # Put returns PutResult with the new version
    res = await client.kv.put("mykey", b"hello")
    print("committed at version", res.version)

    # Put with TTL
    await client.kv.put("session:abc", b'{"user":"alice"}',
        PutOptions(ttl_seconds=3600))

    # Get returns GetResult | None — contains both value and version
    r = await client.kv.get("session:abc")
    if r is not None:
        print(f"{r.value} @ v{r.version}")

    # CAS update — read version from Get, conditional write
    r = await client.kv.get("counter")
    try:
        await client.kv.put("counter", b"42", PutOptions(cas_version=r.version))
    except ConflictError:
        pass  # re-read and retry

    # Conditional write
    await client.kv.put("lock:resource", b"owner-1",
        PutOptions(if_not_exists=True, ttl_seconds=30))

    # Atomic counter
    n = await client.kv.incr("visits:home")

    # TTL lifecycle
    await client.kv.touch("lock:resource", 60)
    await client.kv.persist("lock:resource")
    ok = await client.kv.exists("lock:resource")

    # JSON paths
    await client.kv.json_set("order:42", "$.status", b'"shipped"')
    status = await client.kv.json_get("order:42", "$.status")

    # Blocking get
    r = await client.kv.get("job:result", GetOptions(block_ms=5000))

    # Prefix scan
    result = await client.kv.scan("user:", ScanOptions(limit=100))
    for entry in result.entries:
        print(f"{entry.key}: {entry.value}")

    # Version history
    history = await client.kv.history("counter", HistoryOptions(limit=5))
    for v in history:
        print(f"v{v.version}: {v.value}")

    # Namespace-scoped
    await client.kv.put("config", b"staging-db",
        PutOptions(namespace="staging"))

    # Transaction — multiple writes on one shard, atomic commit
    txn = await client.kv.begin("user:42")
    try:
        await txn.put("user:42:name", b"Jane")
        await txn.incr("user:42:visits")
        result = await txn.commit()
        print(f"committed {result.op_count} ops at index {result.commit_index}")
    except Exception:
        await txn.rollback()  # idempotent
        raise
```
```typescript
const client = new FloClient("localhost:9000");
await client.connect();

// Put returns PutResult with the new version
const res = await client.kv.put("mykey", encode("hello"));
console.log("committed at version", res.version);

// Put with TTL
await client.kv.put("session:abc", encode('{"user":"alice"}'), {
  ttlSeconds: 3600n,
});

// Get returns GetResult | null — contains both value and version
const r = await client.kv.get("session:abc");
if (r) console.log(`${decode(r.value)} @ v${r.version}`);

// CAS update — read version from Get, conditional write
const cur = await client.kv.get("counter");
try {
  await client.kv.put("counter", encode("42"), { casVersion: cur!.version });
} catch (err) {
  // ConflictError — re-read and retry
}

// Conditional write
await client.kv.put("lock:resource", encode("owner-1"), {
  ifNotExists: true,
  ttlSeconds: 30n,
});

// Atomic counter
const n = await client.kv.incr("visits:home");

// TTL lifecycle
await client.kv.touch("lock:resource", 60n);
await client.kv.persist("lock:resource");
const exists = await client.kv.exists("lock:resource");

// JSON paths
await client.kv.jsonSet("order:42", "$.status", encode('"shipped"'));
const status = await client.kv.jsonGet("order:42", "$.status");

// Blocking get
const pending = await client.kv.get("job:result", { blockMs: 5000 });

// Prefix scan
const result = await client.kv.scan("user:", { limit: 100 });
for (const entry of result.entries) {
  console.log(`${entry.key} = ${entry.value}`);
}

// Version history
const history = await client.kv.history("counter", { limit: 5 });

// Namespace-scoped
await client.kv.put("config", encode("staging-db"), {
  namespace: "staging",
});

// Transaction — multiple writes on one shard, atomic commit
const txn = await client.kv.begin("user:42");
try {
  await txn.put("user:42:name", encode("Jane"));
  await txn.incr("user:42:visits", 1n);
  const result = await txn.commit();
  console.log(`committed ${result.opCount} ops at index ${result.commitIndex}`);
} catch (err) {
  await txn.rollback(); // idempotent
  throw err;
}
```
```zig
var client = flo.Client.init(allocator, "localhost:9000", .{});
defer client.deinit();
try client.connect();

var kv = flo.KV.init(&client);

// Put returns PutResult with the new version
const put_res = try kv.put("mykey", "hello", .{});
std.debug.print("committed at v{d}\n", .{put_res.version});

// Put with TTL
_ = try kv.put("session:abc", "{\"user\":\"alice\"}", .{ .ttl_seconds = 3600 });

// Get returns ?GetResult — contains both value and version
if (try kv.get("session:abc", .{})) |r_const| {
    var r = r_const;
    defer r.deinit(allocator);
    std.debug.print("{s} @ v{d}\n", .{ r.value, r.version });
}

// CAS update — read version from Get, conditional write
if (try kv.get("counter", .{})) |r_const| {
    var r = r_const;
    defer r.deinit(allocator);
    _ = kv.put("counter", "42", .{ .cas_version = r.version }) catch |err| switch (err) {
        error.Conflict => {}, // re-read and retry
        else => return err,
    };
}

// Conditional write
_ = try kv.put("lock:resource", "owner-1", .{
    .if_not_exists = true,
    .ttl_seconds = 30,
});

// Atomic counter
const n = try kv.incr("visits:home", .{});

// TTL lifecycle
try kv.touch("lock:resource", 60, .{});
try kv.persist("lock:resource", .{});
const exists = try kv.exists("lock:resource", .{});

// JSON paths
_ = try kv.jsonSet("order:42", "$.status", "\"shipped\"", .{});
if (try kv.jsonGet("order:42", "$.status", .{})) |status_const| {
    var status = status_const;
    defer status.deinit(allocator);
    std.debug.print("{s} @ v{d}\n", .{ status.value, status.version });
}

// Blocking get
if (try kv.get("job:result", .{ .block_ms = 5000 })) |r_const| {
    var r = r_const;
    defer r.deinit(allocator);
}

// Prefix scan
var result = try kv.scan("user:", .{ .limit = 100 });
defer result.deinit();

// Version history
var history = try kv.history("counter", .{ .limit = 5 });
defer history.deinit();

// Namespace-scoped
try kv.put("config", "staging-db", .{ .namespace = "staging" });

// Transaction — multiple writes on one shard, atomic commit
var txn = try kv.begin("user:42", .{});
defer txn.deinit();
_ = try txn.put("user:42:name", "Jane", .{});
_ = try txn.incr("user:42:visits", 1);
const result = try txn.commit();
std.debug.print("committed {d} ops at index {d}\n", .{ result.op_count, result.commit_index });
```

## Use Cases

### Distributed Locks

Use `--nx` with `--ttl` as a simple distributed lock with automatic expiry:

```bash
# Acquire lock (fails if already held)
flo kv set lock:payment "worker-7" --ttl 30 --nx

# Release lock
flo kv delete lock:payment
```

The TTL acts as a safety net — if the lock holder crashes, the lock auto-expires.

### Configuration Store

Store configuration per environment using namespaces, and watch for changes with `--block`:

```bash
# Set config
flo kv set feature:dark-mode "true" -n production

# Watch for config changes (long-poll)
flo kv get feature:dark-mode --block 0 -n production
```

### Job Coordination

Use `--wait` for producer/consumer coordination where one process publishes a result and another waits for it:

```bash
# Worker: process job and publish result
flo kv set job:abc:result '{"status":"done","output":"..."}' --ttl 3600

# Requester: wait for result (up to 60 seconds)
flo kv get job:abc:result --wait 60000
```

## Internals

The KV store is implemented as a **KV Projection** — a hash table with MVCC version chains, derived from the Unified Append Log.

| Property | Value |
|----------|-------|
| Max key size | ~3.9 KB |
| Max value size | ~256 KB |
| Max namespace length | 128 bytes |
| Version chain depth | 64 versions per key (oldest evicted) |
| Default scan limit | 100 (max: 1,000) |
| Reserved key prefixes | `_action:`, `_worker:`, `_sys:`, `_internal:`, `_flo:` |

**Write path**: `kv_put` → Raft propose → majority commit → UAL append → KV projection update → response to client.

**Read path**: `kv_get` → KV projection lookup → response. No Raft involvement.

**Recovery**: On server restart, the projection is rebuilt by replaying UAL entries from the last snapshot. Read-after-write consistency is immediate after recovery — there is no warm-up period.

**TTL enforcement**: Lazy — expired keys are detected at read time rather than proactively swept. This avoids background I/O for expiry.

**Tombstones**: Deletes write a tombstone entry to the UAL. Prior versions remain in the version chain and are queryable via `history`. Tombstones are purged during compaction.

---

## Queues

Source path: src/content/docs/primitives/queues.mdx
Canonical URL: https://docs.floruntime.io/primitives/queues/

Flo queues provide reliable task distribution with competing consumers, priority ordering, visibility timeouts, dead-letter handling, and deduplication. Every enqueue is Raft-replicated before acknowledgment. Dequeued messages are automatically acked on consume — they won't reappear after restart.

## Core Concepts

### Sequence Numbers

Every message is assigned a monotonically increasing **sequence number** on enqueue. The sequence is returned by the enqueue operation and used to reference the message in ack, nack, and touch operations.

### Priority Ordering

Messages are dequeued in priority order. Lower numeric values are higher priority (0 is highest). Messages with equal priority are dequeued in FIFO order.

```bash
flo queue enqueue tasks '{"urgent":true}' --priority 1
flo queue enqueue tasks '{"routine":true}' --priority 10

# Dequeue returns the priority-1 message first
flo queue dequeue tasks
```

Priority is a `u8` value (0–255).

### Namespace Isolation

Queues live inside **namespaces**. The same queue name in different namespaces is fully independent — separate messages, separate DLQ, separate statistics.

Namespaces are set via `FLO_NAMESPACE` environment variable or client configuration:

```bash
export FLO_NAMESPACE=staging
flo queue enqueue tasks '{"env":"staging"}'

export FLO_NAMESPACE=production
flo queue enqueue tasks '{"env":"prod"}'
# Each namespace has its own "tasks" queue
```

## Operations

### Enqueue

```bash
# Basic enqueue
flo queue enqueue tasks '{"task":"send-email","to":"alice@example.com"}'

# With priority (lower = higher priority, default: 0)
flo queue enqueue tasks '{"urgent":true}' --priority 1

# Delayed delivery — invisible for 60 seconds after enqueue
flo queue enqueue tasks '{"scheduled":true}' --delay 60000
```

The response returns the assigned sequence number.

### Dequeue

```bash
# Pop one message (default count: 1)
flo queue dequeue tasks

# Batch dequeue — up to 10 messages at once (max: 100)
flo queue dequeue tasks --count 10

# Custom visibility timeout (default: 30 seconds)
flo queue dequeue tasks --timeout 60000
```

Dequeued messages are consumed immediately — they are removed from the queue and won't be delivered to other consumers. The sequence number and payload are returned for each message.

### Blocking Dequeue

If the queue is empty, a blocking dequeue waits for new messages instead of returning immediately.

```bash
# Block up to 30 seconds for new messages
flo queue dequeue tasks --block 30000

# Block indefinitely (0 = wait forever)
flo queue dequeue tasks --block 0
```

When a new message is enqueued, all blocking dequeue waiters on that queue are notified. If the timeout expires with no messages, an empty (but successful) result is returned.

### Acknowledge

Explicitly mark a message as processed:

```bash
flo queue ack tasks <seq>

# Ack multiple sequences
flo queue ack tasks 42 43 44
```

### Negative Acknowledge (Nack)

Return a message to the queue for redelivery, or send it directly to the DLQ:

```bash
# Nack — message goes back to the ready queue
flo queue nack tasks <seq>

# Nack directly to DLQ
flo queue nack tasks <seq> --dlq
```

### Peek

Inspect messages at the front of the queue without consuming them:

```bash
flo queue peek tasks --count 5
```

### Touch

Extend the visibility timeout on an in-flight message. Use this when processing takes longer than expected:

```bash
# Extend with default timeout
flo queue touch tasks <seq>

# Extend by a specific duration (60 seconds)
flo queue touch tasks <seq> --extend 60000
```

### List Queues

```bash
flo queue ls
flo queue list --limit 50 --json
```

Returns queue metadata: name, namespace, pending count, available count, total enqueued, total dequeued, and DLQ count.

### Watch

Continuously poll and display messages as they arrive:

```bash
flo queue watch tasks
```

## Dead Letter Queue

Messages that exceed the retry limit (default: 5 attempts) are moved to the DLQ. The DLQ is a bounded FIFO buffer (10,000 entries by default) — when full, the oldest DLQ entries are evicted.

```bash
# List DLQ messages
flo queue dlq list tasks
flo queue dlq list tasks --limit 50

# Requeue DLQ messages back to the main queue
flo queue dlq requeue tasks <seq> <seq> ...
```

Each DLQ entry records the sequence number, delivery attempt count, and the timestamp when it was moved to the DLQ.

## SDK Examples

```go
client := flo.NewClient("localhost:9000")
client.Connect()
defer client.Close()

// Enqueue with priority
seq, _ := client.Queue.Enqueue("tasks", []byte(`{"task":"process"}`),
    &flo.EnqueueOptions{Priority: 1})

// Dequeue with long polling
result, _ := client.Queue.Dequeue("tasks", 10, &flo.DequeueOptions{
    BlockMS: ptr(uint32(30000)),
})

for _, msg := range result.Messages {
    // Process message...
    client.Queue.Ack("tasks", []uint64{msg.Seq}, nil)
}

// Nack to DLQ on failure
client.Queue.Nack("tasks", []uint64{msg.Seq}, &flo.NackOptions{ToDLQ: true})

// Peek without consuming
peeked, _ := client.Queue.Peek("tasks", 5, nil)

// Touch to extend visibility
client.Queue.Touch("tasks", []uint64{msg.Seq}, nil)

// DLQ operations
dlq, _ := client.Queue.DLQList("tasks", nil)
client.Queue.DLQRequeue("tasks", []uint64{dlq.Messages[0].Seq}, nil)
```
```python
async with FloClient("localhost:9000") as client:
    # Enqueue with priority
    seq = await client.queue.enqueue("tasks",
        b'{"task":"process"}', EnqueueOptions(priority=1))

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

    # Peek without consuming
    peeked = await client.queue.peek("tasks", 5)

    # Touch to extend visibility
    await client.queue.touch("tasks", [msg.seq])

    # DLQ operations
    dlq = await client.queue.dlq_list("tasks")
    await client.queue.dlq_requeue("tasks", [m.seq for m in dlq.messages])
```
```typescript
const client = new FloClient("localhost:9000");
await client.connect();

// Enqueue with priority
const seq = await client.queue.enqueue("tasks",
  encode('{"task":"process"}'), { priority: 1 });

// Dequeue with long polling
const result = await client.queue.dequeue("tasks", 10, {
  blockMs: 30000,
});

for (const msg of result.messages) {
  try {
    process(decode(msg.payload));
    await client.queue.ack("tasks", [msg.seq]);
  } catch {
    await client.queue.nack("tasks", [msg.seq], { toDlq: true });
  }
}

// Peek without consuming
const peeked = await client.queue.peek("tasks", 5);

// Touch to extend visibility
await client.queue.touch("tasks", [msg.seq]);

// DLQ operations
const dlq = await client.queue.dlqList("tasks");
await client.queue.dlqRequeue("tasks", dlq.messages.map(m => m.seq));
```
```zig
var client = flo.Client.init(allocator, "localhost:9000", .{});
defer client.deinit();
try client.connect();

var queue = flo.Queue.init(&client);

// Enqueue with priority
const seq = try queue.enqueue("tasks", "{\"task\":\"process\"}", .{
    .priority = 1,
});

// Dequeue with long polling
var result = try queue.dequeue("tasks", 10, .{ .block_ms = 30000 });
defer result.deinit();

for (result.messages) |msg| {
    // Process...
    try queue.ack("tasks", &[_]u64{msg.seq}, .{});
}

// Peek without consuming
var peeked = try queue.peek("tasks", 5, .{});
defer peeked.deinit();

// Touch to extend visibility
try queue.touch("tasks", &[_]u64{seq}, .{});

// DLQ operations
var dlq = try queue.dlqList("tasks", .{});
defer dlq.deinit();
```

## Dequeue Message Fields

Each dequeued message includes:

| Field | Description |
|-------|-------------|
| `seq` | Sequence number (monotonically increasing per queue) |
| `payload` | The message body (bytes) |
| `priority` | Priority value (0–255, lower = higher priority) |
| `enqueued_at` | Timestamp when the message was enqueued |
| `delivery_count` | Number of delivery attempts |

## Durability

- All enqueues are Raft-replicated before the response is sent
- Dequeued messages are persisted as acked — they don't reappear after restart
- Un-consumed messages survive server restarts with sync durability
- Queue metadata (names, statistics) is rebuilt from the UAL on recovery

## How It Works

The Queue Projection uses purpose-built data structures:

- **Ready heap** — Min-heap ordered by `(priority, sequence)`. Lower priority values and lower sequences are dequeued first.
- **Lease tracker** — Min-heap of `(expiry_time, sequence)`. Expired leases return messages to the ready heap automatically.
- **DLQ ring** — Bounded FIFO buffer (default: 10,000 entries). Messages exceeding the max attempt count (default: 5) are moved here.
- **Message map** — `HashMap(seq → Message)` holding the full message state (~128 bytes fixed overhead per message plus payload).

Blocking dequeue uses the same waiter pool as blocking stream reads — enqueue operations notify all registered waiters on that queue.

See [Storage Internals](/architecture/storage/) for details.

---

## Streams

Source path: src/content/docs/primitives/streams.mdx
Canonical URL: https://docs.floruntime.io/primitives/streams/

Flo streams are append-only, ordered logs of records backed by the Unified Append Log. Every append is Raft-replicated before being acknowledged. There is no separate stream projection — reading a stream is reading UAL entries directly, making it zero-copy and the fastest primitive.

Streams are the foundation of event sourcing, activity feeds, change data capture, and real-time data pipelines.

## Core Concepts

### Stream IDs

Every record in a stream is identified by a **Stream ID** — a composite `<timestamp_ms>-<sequence>` value:

- **timestamp_ms**: Unix milliseconds when the record was appended
- **sequence**: Counter within the same millisecond (0-indexed)
- Example: `1703350800000-0`, `1703350800000-1`, `1703350801000-0`

Stream IDs are **monotonically increasing**. If the system clock goes backward, the previous timestamp is reused and the sequence increments — guaranteeing ordering without coordination.

Special values:
- `0-0` — the very beginning of the stream
- `$` — the current tail (only future records)

### Namespace Isolation

Streams live inside **namespaces**. The default namespace is used when no `-n` flag is provided. The same stream name in different namespaces is fully independent — separate records, separate consumer groups, separate metadata.

```bash
flo ns create staging
flo ns create production

flo stream append events '{"env":"staging"}' -n staging
flo stream append events '{"env":"prod"}' -n production

# Each namespace sees only its own records
flo stream read events --limit 10 -n staging
flo stream read events --limit 10 -n production

# Consumer groups are also namespace-scoped
flo stream group create events --group workers -n staging
flo stream group create events --group workers -n production
```

### Partitioning

Streams can have multiple **partitions** for parallel throughput. When you create a stream with `--partitions N`, each partition is an independent ordered log.

```bash
# Create a 4-partition stream
flo stream create orders --partitions 4
```

**Routing records to partitions:**

- **Explicit partition**: `--partition 2` sends to partition 2 directly
- **Partition key**: `--partition-key alice` hashes the key to a deterministic partition (Wyhash). All records with the same key land on the same partition, preserving per-key ordering.
- **No flag**: defaults to partition 0

```bash
# Explicit partition
flo stream append orders '{"id":1}' --partition 2

# Partition key — all alice events on the same partition
flo stream append orders '{"user":"alice"}' --partition-key alice
flo stream append orders '{"user":"alice"}' --partition-key alice  # same partition

# Different key may route to a different partition
flo stream append orders '{"user":"bob"}' --partition-key bob
```

**Reading from partitions:**

```bash
# Read only partition 1
flo stream read orders --partition 1

# Read using the same partition key (resolves to the same partition)
flo stream read orders --partition-key alice

# Bare read without --partition or --partition-key reads ALL partitions
flo stream read orders --limit 20
```

A bare `stream read` without partition flags returns records from **all partitions** merged together. This matches industry-standard behavior (Kafka, Redpanda, Pulsar).

## Operations

### Append

```bash
# Single record
flo stream append events '{"type":"signup","user":"alice"}'

# Batch append (multiple payloads in one request)
flo stream append events 'event-a' 'event-b' 'event-c'

# With headers
flo stream append events '{"type":"login"}' -H source=web -H trace-id=abc123

# To a specific partition
flo stream append events '{"type":"login"}' --partition 2

# With partition key routing
flo stream append events '{"type":"login"}' --partition-key alice

# JSON output (returns the Stream ID)
flo stream append events 'hello' --json
```

The response includes the assigned Stream ID (e.g., `1703350800000-0`).

### Read

```bash
# From the beginning
flo stream read events --start 0-0 --limit 10

# From a specific Stream ID
flo stream read events --start 1703350800000-0 --limit 50

# Bounded range (inclusive on both ends)
flo stream read events --start 1703350800000-0 --end 1703350815000-0

# JSON output (includes id, payload, tier, partition fields)
flo stream read events --limit 10 --json
```

The default limit is 10. Maximum is 1000 per request.

### Blocking Reads

Blocking reads wait for new data instead of returning empty results immediately.

```bash
# Block up to 5 seconds for new records
flo stream read events --block 5000 --start 0-0 --limit 5

# Block forever (0 = infinite timeout)
flo stream read events --block 0 --start 0-0 --limit 5

# Block for new records from the tail only (skip existing data)
flo stream read events --block 5000 --start '$' --limit 5
```

If matching data already exists, the blocking read returns immediately. If no data arrives within the timeout, it returns an empty (but successful) result.

### Follow Mode

Follow mode is a continuous tail — it keeps reading as new records arrive, like `tail -f`.

```bash
# Follow from the beginning (prints existing + new records)
flo stream read events --follow --start 0-0

# Follow from the tail (new records only)
flo stream read events --follow --start '$'
```

`--follow` implies a blocking timeout and loops internally. It runs until interrupted.

### Create

Streams are auto-created on first append. Explicit creation is only needed when you want multiple partitions or custom retention up front.

```bash
flo stream create events                     # 1 partition (default)
flo stream create events --partitions 4      # 4 partitions
flo stream create events --retention 72      # 72-hour retention
```

### Info

```bash
flo stream info events
flo stream info events --json
```

Returns stream metadata: name, partition count, first/last Stream IDs, record count.

### List

```bash
flo stream ls
flo stream ls --limit 50 --json
```

### Trim

Remove old records to reclaim storage.

```bash
# Keep only the last 10,000 records
flo stream trim events --maxlen 10000

# Remove records before a specific Stream ID
flo stream trim events --before 1703350800000-0

# Remove records older than 1 hour
flo stream trim events --maxage 3600

# Trim to a byte budget
flo stream trim events --maxbytes 1073741824

# Preview what would be trimmed (no changes made)
flo stream trim events --maxlen 10000 --dry-run
```

## Consumer Groups

Consumer groups allow multiple consumers to process a stream cooperatively. Each record is delivered to **exactly one** consumer in the group. The server tracks a **Pending Entry List (PEL)** — records that have been delivered but not yet acknowledged.

### Lifecycle

```bash
# Create a group explicitly (optional — group read auto-creates)
flo stream group create events --group processors

# Join a consumer to the group
flo stream group join events processors worker-1

# Read records (auto-creates group and joins consumer if needed)
flo stream group read events --group processors --consumer worker-1 --limit 10

# Acknowledge processed records
flo stream group ack events --group processors --consumer worker-1 \
  --ids 1703350800000-0,1703350800000-1

# Leave the group
flo stream group leave events --group processors --consumer worker-1

# Delete the entire group
flo stream group delete events --group processors
```

### Acknowledgment

Records delivered via `group read` are placed in the PEL. They must be acknowledged to advance the cursor. Unacknowledged records will be redelivered.

```bash
# Ack specific IDs (comma-separated)
flo stream group ack events --group processors --consumer worker-1 \
  --ids 1703350800000-0,1703350800000-1

# Read with auto-ack — no PEL tracking (at-most-once delivery)
flo stream group read events --group processors --consumer worker-1 --no-ack
```

### Redelivery and Nack

If processing fails, you can explicitly nack records to put them back in the delivery pool:

```bash
# Nack — make records available for redelivery immediately
flo stream group nack events --group processors --consumer worker-1 \
  --ids 1703350800000-0

# Nack with delay — records become visible again after 5 seconds
flo stream group nack events --group processors --consumer worker-1 \
  --ids 1703350800000-0 --delay 5000
```

The group can also auto-redeliver if the consumer doesn't ack within a deadline:

```bash
# Auto-redeliver after 30 seconds of no ack
flo stream group create events --group processors --ack-timeout 30000

# Give up after 5 delivery attempts (records go to DLQ)
flo stream group create events --group processors --max-deliver 5
```

### Extending Delivery Deadlines

If a consumer needs more time to process a record, it can extend the ack deadline:

```bash
# Extend the deadline by 60 seconds
flo stream group touch events --group processors --consumer worker-1 \
  --ids 1703350800000-0 --extend 60000
```

### Inspecting Pending State

```bash
# List all pending (delivered but unacked) records for a group
flo stream group pending events --group processors

# Group metadata (consumer count, PEL size, last delivered ID)
flo stream group info events --group processors
```

### Consumer Modes

Groups support three delivery modes, set at creation time:

| Mode | Behavior |
|------|----------|
| `shared` (default) | Records distributed round-robin across all consumers |
| `exclusive` | One active consumer holds the lease; others are standbys |
| `key_shared` | Records with the same key always go to the same consumer |

```bash
# Shared mode (default)
flo stream group create events --group processors --mode shared

# Exclusive — one active consumer, others wait
flo stream group create events --group processors --mode exclusive

# Singleton — exclusive with zero standbys allowed
flo stream group create events --group processors --mode exclusive --max-standbys 0

# Key-shared — partition by key across consumers
flo stream group create events --group processors --mode key_shared --slots 16
```

## SDK Examples

```go
client := flo.NewClient("localhost:9000")
client.Connect()
defer client.Close()

// Append
result, _ := client.Stream.Append("events", []byte(`{"event":"signup"}`), nil)

// Read from beginning
records, _ := client.Stream.Read("events", &flo.StreamReadOptions{
    Start: &flo.StreamID{TimestampMS: 0, Sequence: 0},
    Count: ptr(uint32(10)),
})
for _, rec := range records.Records {
    fmt.Printf("id=%d-%d: %s\n", rec.ID.TimestampMS, rec.ID.Sequence, rec.Payload)
}

// Blocking read
records, _ = client.Stream.Read("events", &flo.StreamReadOptions{
    Tail:    true,
    BlockMS: ptr(uint32(5000)),
    Count:   ptr(uint32(10)),
})

// Consumer group
records, _ = client.Stream.GroupRead("events", "processors", "worker-1",
    &flo.StreamGroupReadOptions{
        Count:   ptr(uint32(10)),
        BlockMS: ptr(uint32(30000)),
    },
)
// ... process records ...
ids := make([]flo.StreamID, len(records.Records))
for i, rec := range records.Records {
    ids[i] = rec.ID
}
client.Stream.GroupAck("events", "processors", ids, &flo.StreamGroupAckOptions{
    Consumer: "worker-1",
})
```
```python
async with FloClient("localhost:9000") as client:
    # Append
    result = await client.stream.append("events", b'{"event":"signup"}')
    print(f"Appended at {result.id.timestamp_ms}-{result.id.sequence}")

    # Read from beginning
    result = await client.stream.read("events", StreamReadOptions(
        start=StreamID(0, 0),
        count=10,
    ))
    for record in result.records:
        print(f"id={record.id}: {record.payload}")

    # Blocking read from tail
    result = await client.stream.read("events", StreamReadOptions(
        tail=True,
        block_ms=5000,
        count=10,
    ))

    # Consumer group
    result = await client.stream.group_read(
        "events", "processors", "worker-1",
        StreamGroupReadOptions(count=10, block_ms=30000),
    )
    await client.stream.group_ack(
        "events", "processors",
        [r.id for r in result.records],
        StreamGroupAckOptions(consumer="worker-1"),
    )
```
```typescript
const client = new FloClient("localhost:9000");
await client.connect();

// Append plain objects directly (auto-serialized to JSON)
const result = await client.stream.append(
  "events",
  { event: "signup", user: "alice" }
);

// Strings are UTF-8 encoded automatically
await client.stream.append("events", "user signed up");

// Read from beginning
const records = await client.stream.read("events", {
  start: StreamID.fromTimestamp(0n),
  limit: 10,
});
for (const rec of records.records) {
  console.log(`id=${rec.id}: ${decode(rec.payload)}`);
}

// Blocking read from tail
const newRecords = await client.stream.read("events", {
  tail: true,
  blockMs: 5000,
  limit: 10,
});

// Consumer group
const groupRecords = await client.stream.groupRead("events", {
  group: "processors",
  consumer: "worker-1",
  limit: 10,
  blockMs: 30000,
});
await client.stream.groupAck(
  "events",
  groupRecords.records.map(r => r.id),
  { group: "processors", consumer: "worker-1" },
);
```
```zig
var client = flo.Client.init(allocator, "localhost:9000", .{});
defer client.deinit();
try client.connect();

var stream = flo.Stream.init(&client);

// Append
const result = try stream.append("events", "{\"event\":\"signup\"}", .{});

// Read from beginning
var records = try stream.read("events", .{
    .start = .{ .timestamp_ms = 0, .sequence = 0 },
    .count = 10,
});
defer records.deinit();
for (records.records) |rec| {
    std.debug.print("id={d}-{d}: {s}\n", .{ rec.id.timestamp_ms, rec.id.sequence, rec.payload });
}

// Consumer group
var group_records = try stream.groupRead("events", "processors", "worker-1", .{
    .count = 10,
    .block_ms = 5000,
});
defer group_records.deinit();
try stream.groupAck("events", "processors", group_records.ids(), .{
    .consumer = "worker-1",
});
```

## Reading Modes

| Mode | CLI Flag | Behavior |
|------|----------|----------|
| From beginning | `--start 0-0` | Returns all records in order |
| From ID | `--start <id>` | Returns records starting at (or after) the given Stream ID |
| Range | `--start <id> --end <id>` | Bounded range, inclusive on both ends |
| Tail | `--start '$'` | Only records appended after the read begins |
| Blocking | `--block <ms>` | Waits up to `<ms>` for new data (0 = forever) |
| Follow | `--follow` | Continuous tail — keeps reading as new records arrive |
| Partition | `--partition <n>` | Reads from a specific partition only |
| Partition key | `--partition-key <key>` | Reads from the partition that key hashes to |
| JSON output | `--json` | Machine-readable output with `id`, `payload`, `tier`, `partition` fields |

## Tiered Storage

Stream data flows through a tiered storage hierarchy automatically:

| Tier | Location | Purpose |
|------|----------|---------|
| **Hot** | In-memory ring buffer | Recent writes, lowest latency |
| **Warm** | On-disk segments | Overflowed from hot tier, still fast |
| **Cold** | External backend (file, S3, Azure) | Archival storage |

When you read with `--json`, each record includes a `"tier"` field indicating where it was served from. Reads are transparent — the server merges results across tiers automatically.

The thresholds for spilling between tiers are configurable per server (hot buffer capacity, max hot entries). Cold storage can be enabled with file or cloud backends.

## Durability

- All appends are Raft-replicated before acknowledgment
- Stream data, consumer group offsets, and pending state all survive server restarts
- After restart, new appends continue with monotonically increasing Stream IDs (no duplicates, no gaps)
- Immediate consistency — a read right after restart returns all pre-restart data

## How It Works

Stream records are UAL entries with `opcode = stream_append`. Reading a stream is reading a range of UAL entries filtered by stream name hash — there is no separate data structure.

- Record IDs are derived from append wall-clock time plus sequence
- Zero-copy reads — no derived state, no projection overhead
- Consumer group state (cursors, PEL, mode) is managed per-shard
- Partition routing uses Wyhash on the partition key or explicit index
- Blocking reads register waiters that are notified on append

See [Storage Internals](/architecture/storage/) for details.

---

## Time-Series

Source path: src/content/docs/primitives/time-series.md
Canonical URL: https://docs.floruntime.io/primitives/time-series/

Flo includes a built-in time-series engine for metrics, telemetry, and IoT data. It supports single-point writes, batch ingestion via InfluxDB line protocol, structured aggregation queries, and FloQL — a pipeline query language for advanced analytics. All writes are Raft-replicated.

## Core Concepts

Each data point consists of four components:

- **Measurement** — The metric name (e.g., `cpu`, `memory`, `http_requests`)
- **Tags** — Indexed key-value pairs for filtering (e.g., `host=web-01,region=us-east`)
- **Fields** — The actual metric values. A single value uses the default field name `value`; multi-field writes name each field explicitly (e.g., `user=72.5,system=7.4`)
- **Timestamp** — Millisecond precision. Defaults to server time when omitted.

A **series** is the unique combination of measurement + tag set + field name. Each series maintains its own write buffer and block chain.

## Writing Data

### Single Point

```bash
# Write a single value (field name defaults to "value")
flo ts write cpu --tags host=web-01,region=us-east --value 82.5

# Write with an explicit timestamp (milliseconds since epoch)
flo ts write cpu --tags host=web-01 --value 72.5 --timestamp 1708700400000

# Write with no tags
flo ts write global_metric --value 99.9
```

### Multi-Field

Write multiple named fields in a single data point:

```bash
flo ts write cpu --tags host=web-01 --fields "user=72.5,system=7.4,idle=20.1"
```

Each field creates a separate series under the same measurement and tag set. Query individual fields with `--field`.

### Batch Write (InfluxDB Line Protocol)

Ingest many points at once using InfluxDB line protocol format:

```
measurement,tag1=val1,tag2=val2 field1=value1,field2=value2 [timestamp]
```

```bash
# From a file
flo ts write --batch --file /path/to/data.txt --precision ms

# From stdin
cat data.txt | flo ts write --batch --precision ns
```

The `--precision` flag specifies the timestamp unit in the payload:

| Precision | Description | Conversion |
|-----------|-------------|------------|
| `ns` | Nanoseconds (InfluxDB default) | ÷ 1,000,000 |
| `us` | Microseconds | ÷ 1,000 |
| `ms` | Milliseconds (Flo default) | identity |
| `s` | Seconds | × 1,000 |

Field types: float values are stored natively, integers (suffix `i`) are converted to `f64`, booleans become `0.0`/`1.0`. String fields are not supported.

## Reading Data

### Raw Reads

Retrieve individual data points within a time range:

```bash
# Read last hour of CPU data for host web-01
flo ts read cpu --tags host=web-01 --from -1h

# Read a specific time range
flo ts read cpu --tags host=web-01 --from 1708700000000 --to 1708700500000

# Read a specific field
flo ts read cpu --tags host=web-01 --field system --from -1h

# Limit results
flo ts read cpu --tags host=web-01 --from -1h --limit 100

# Output as JSON
flo ts read cpu --tags host=web-01 --from -1h --format json
```

The `--from` and `--to` flags accept relative durations (`-1h`, `-30m`, `-7d`) or absolute epoch-millisecond timestamps.

### Structured Queries

Aggregate data over time windows using built-in functions:

```bash
# Average CPU usage over 5-minute windows in the last hour
flo ts query cpu --tags host=web-01 --from -1h --window 5m --agg avg

# Sum of HTTP requests over 1-minute windows
flo ts query http_requests --tags method=GET --from -1h --window 1m --agg sum

# Count points per 10-minute window
flo ts query cpu --tags host=web-01 --from -6h --window 10m --agg count

# Min and max
flo ts query temperature --tags sensor=A1 --from -24h --window 1h --agg min
flo ts query temperature --tags sensor=A1 --from -24h --window 1h --agg max
```

| Flag | Default | Description |
|------|---------|-------------|
| `--agg` | `avg` | Aggregation function: `avg`, `sum`, `count`, `min`, `max` |
| `--window` | `1m` | Window size: `Ns`, `Nm`, `Nh`, `Nd` |
| `--from` | `-1h` | Start time (relative or epoch ms) |
| `--to` | now | End time |

### Output Formats

All read and query commands support three output formats via `--format`:

- **table** (default) — Formatted columns with headers
- **json** — JSON array with `timestamp_ms` and `value` fields
- **raw** — Space-separated `timestamp value` per line, suitable for piping

## FloQL

FloQL is Flo's pipeline query language for time-series analytics. It combines source selection, filtering, windowing, aggregation, and transformation in a single expression:

```bash
# Average CPU usage over 5-minute windows in the last hour
flo ts floql "cpu{host=web-01}[1h] | window(5m) | avg()"

# Rate of change per minute
flo ts floql "http_requests{method=GET}[1h] | rate(1m)"

# Filter, window, aggregate, and transform
flo ts floql "cpu{region=us-east}[6h] | window(15m) | max() | where(value > 90)"

# Group by tag, then aggregate
flo ts floql "cpu[1h] | group_by(host) | window(5m) | avg()"

# Arithmetic transformation
flo ts floql "temperature{unit=celsius}[24h] | math(value * 1.8 + 32) | alias(fahrenheit)"
```

### Source Syntax

```
measurement{tag_filters}[time_range]
```

- **Measurement** — Metric name (required)
- **Tag filters** — Optional. Comma-separated `key=value` pairs inside `{}`
- **Time range** — Required. Duration (`[1h]`), absolute range (`[1708700000000..1708800000000]`), or omit brackets for default 1h

### Tag Filter Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `=` | Equals | `{host=web-01}` |
| `!=` | Not equals | `{env!=staging}` |
| `=~` | Regex match | `{host=~web-.*}` |
| `!~` | Regex not match | `{path!~health}` |

Multiple filters are comma-separated: `{host=web-01,region=us-east}`

### Time Range Formats

| Format | Example | Description |
|--------|---------|-------------|
| Duration | `[1h]` | Last N units from now |
| Duration units | `[30s]`, `[5m]`, `[1h]`, `[7d]` | Seconds, minutes, hours, days |
| Absolute | `[1708700000000..1708800000000]` | Epoch millisecond range |

### Pipeline Stages

Stages are chained with `|` and executed left to right. Each stage transforms a set of series:

| Stage | Syntax | Description |
|-------|--------|-------------|
| `window` | `window(5m)` | Bucket points into time windows |
| `avg` | `avg()` | Mean value per window |
| `sum` | `sum()` | Sum per window |
| `count` | `count()` | Count per window |
| `min` | `min()` | Minimum per window |
| `max` | `max()` | Maximum per window |
| `first` | `first()` | First value per window |
| `last` | `last()` | Last value per window |
| `percentile` | `percentile(99)` | Nth percentile (0–100) |
| `rate` | `rate(1m)` | Per-second rate of change |
| `delta` | `delta()` | Difference between consecutive points |
| `where` | `where(value > 90)` | Filter points by value |
| `group_by` | `group_by(host)` | Split series by tag value |
| `topk` | `topk(5)` | Keep top K series by value |
| `bottomk` | `bottomk(5)` | Keep bottom K series by value |
| `math` | `math(value * 100)` | Arithmetic: `+`, `-`, `*`, `/`, `%` |
| `field` | `field(system)` | Select a specific field name |
| `alias` | `alias(cpu_avg)` | Rename the output series |
| `abs` | `abs()` | Absolute value |
| `ceil` | `ceil()` | Ceiling |
| `floor` | `floor()` | Floor |
| `round` | `round(2)` | Round to N decimal places |

A typical query chains `window()` → aggregation → optional post-processing:

```
cpu{host=web-01}[1h] | window(5m) | avg() | where(value > 80) | round(2)
```

## Managing Data

### List Measurements

```bash
# List all measurements
flo ts list
flo ts ls

# List series under a specific measurement
flo ts list cpu

# Show field names for a measurement
flo ts list cpu --fields

# Limit results
flo ts list --limit 50

# JSON output
flo ts list --format json
```

### Delete

```bash
# Delete an entire measurement (requires --confirm)
flo ts delete cpu --confirm

# Delete a specific series by tag
flo ts delete cpu --tags host=web-01 --confirm
```

Without `--confirm`, the delete command fails with an error — this prevents accidental data loss.

### Retention & Downsampling

Set retention policies to automatically age out raw data and optionally create downsampled rollups:

```bash
# Keep raw data for 7 days
flo ts retention cpu --raw-ttl 7d

# Keep raw for 7 days, downsample to 1-minute averages for 30 days
flo ts retention cpu --raw-ttl 7d --downsample 1m:avg:30d

# Show current retention policy
flo ts retention cpu --show
```

The `--downsample` rule format is `interval:aggregation:ttl`:
- **interval** — Window size for rollup (e.g., `1m`, `5m`, `1h`)
- **aggregation** — Function to apply (`avg`, `sum`, `min`, `max`, `count`)
- **ttl** — How long to keep the downsampled data

## Namespace Isolation

Time-series data is isolated by namespace. The same measurement name in different namespaces contains independent data:

```bash
flo ts write cpu --tags host=web-01 --value 82.5 -n production
flo ts write cpu --tags host=web-01 --value 45.0 -n staging

# Each namespace has its own data
flo ts read cpu --tags host=web-01 --from -1h -n production
flo ts read cpu --tags host=web-01 --from -1h -n staging
```

## Durability

- All writes are Raft-replicated before the response is sent
- On recovery, the TS Projection replays committed UAL entries (`ts_write`, `ts_write_batch`) to rebuild in-memory state
- Write buffers are rebuilt from the UAL — no separate WAL for time-series data

## How It Works

The TS Projection uses columnar storage optimized for time-series access patterns:

- **Write buffers** — Per-series, per-field in-memory buffers (1,024 points capacity). When full, flushed to an immutable columnar block.
- **Columnar blocks** — Store timestamps and values separately for compression and vectorized aggregation. Each block tracks its min/max timestamp and point count.
- **Block index** — Maps `(series_hash, field_hash, time_range)` → `(block)` for fast range lookups.
- **Series key** — Each series is identified by `measurement + "\0" + field_name`, with tag sets hashed for routing.

Queries scan both the active write buffer and flushed blocks. Aggregation functions (avg, sum, min, max, count) operate directly on the columnar layout.

See [Storage Internals](/architecture/storage/) for details.

---

# Orchestration

Actions, workers, workflows, and stream processing.

---

## Actions

Source path: src/content/docs/orchestration/actions.mdx
Canonical URL: https://docs.floruntime.io/orchestration/actions/

Actions are **named, durable task types**. You register an action once, then invoke it on demand — Flo handles dispatch, retries, lease management, and dead-letter routing. The handler can run in two places:

- **WASM** — Compile your logic to WebAssembly and deploy it to Flo. The action executes **inline** on the shard, with sub-millisecond overhead and zero network hops.
- **User-hosted workers** — Run a long-lived process (in Go, Python, JS, Zig, or any language that speaks the wire protocol) that pulls tasks from Flo and reports results.

Both models share the same invoke / status / list / delete API. The difference is where the code runs.

```
┌──────────────┐                   ┌───────────────────────┐
│  Client      │                   │  Flo Server (Shard)   │
│              │  action invoke    │                       │
│  flo action  │ ─────────────────▸│  ActionHandler        │
│  invoke X    │                   │    ├─ WASM?  Execute  │◄── inline, ~µs
│              │  ◀─ run_id ───────┤    │   inline         │
│              │                   │    └─ User?  Queue    │
└──────────────┘                   │         pending       │
                                   └──────────┬────────────┘
                                              │
┌──────────────┐   action_await                │ 
│  Worker      │ ◄─────────────────────────────┘
│  (Go/Py/JS)  │   task_id + payload
│              │
│  handler()   │
│              │   action_complete(result)
│              │ ────────────────────────────▸ Flo
└──────────────┘
```

---

## Quick Start

### 1. Register an action

```bash
flo action register send-email --timeout 60000 --max-retries 3
```

### 2. Invoke it

```bash
flo action invoke send-email '{"to":"alice@example.com","subject":"Welcome!"}'
# → Result: send-email-1
```

### 3. Check status

```bash
flo action status send-email-1
# → RUN ID          STATUS     CREATED
#   send-email-1    pending    2026-03-14 10:00:00
```

For user-hosted actions, nothing happens until a worker picks up the task. For WASM actions, the result is available immediately.

---

## Core Concepts

### Action

A named task type stored in Flo's action registry. Each action has:

| Field | Default | Description |
|-------|---------|-------------|
| `name` | — | Unique name within a namespace (max 256 chars) |
| `type` | `user` | `user` (worker-hosted) or `wasm` (Flo-hosted) |
| `timeout_ms` | `30000` | Max execution time before timeout |
| `max_retries` | `3` | Retries before dead-lettering |
| `retry_delay_ms` | `1000` | Base delay for exponential backoff |
| `description` | — | Human-readable description |
| `version` | `1` | Auto-incremented on re-registration |
| `enabled` | `true` | Can be disabled to block new invocations |

WASM actions additionally have:

| Field | Default | Description |
|-------|---------|-------------|
| `wasm_module` | — | WASM binary bytes |
| `wasm_entrypoint` | `handle` | Export function name |
| `wasm_memory_limit` | `16 MB` | Max linear memory (in pages of 64 KB) |

### Run

A single invocation of an action. Every invoke creates a run with a unique ID.

| Status | Description |
|--------|-------------|
| `pending` | Queued, waiting for a worker (or WASM execution) |
| `running` | Claimed by a worker, currently executing |
| `completed` | Finished successfully with output |
| `failed` | Failed permanently (retries exhausted or explicit fail) |
| `cancelled` | Cancelled by user |
| `timed_out` | Execution exceeded `timeout_ms` |

### Worker

A long-running process that pulls pending tasks from Flo and executes them. Workers:

- **Register** with Flo, declaring which action types they handle
- **Await** tasks using long polling (blocking dequeue)
- **Execute** the handler, optionally extending the lease with `touch`
- **Report** completion or failure back to Flo

Workers can run anywhere — on the same machine, in a container, across the network. Multiple workers can handle the same action type for horizontal scaling.

---

## Execution Models

### WASM Actions (Flo-Hosted)

WASM actions execute **inside the Flo shard** with no network overhead. They're ideal for:

- Pure data transformations (validation, enrichment, rules engines)
- Low-latency operations (sub-millisecond execution)
- Self-contained logic with no external dependencies

The WASM module must export three functions:

```
handle(input_ptr: u32, input_len: u32) → i64
alloc(size: u32) → u32
dealloc(ptr: u32, size: u32) → void
```

`handle` receives the input bytes and returns a packed `i64`: the upper 32 bits are the output pointer, the lower 32 bits are the output length. Negative return values indicate errors:

| Return Code | Meaning |
|-------------|---------|
| `-1` | Invalid input |
| `-2` | Allocation failed |
| `-3` | Execution error |

Optional exports:

| Export | Purpose |
|--------|---------|
| `init() → i32` | Called once after module instantiation |
| `describe() → i64` | Returns a JSON description (packed ptr\|len) |

#### Host Functions

WASM guest code can call these host functions:

| Function | Description |
|----------|-------------|
| `flo.log(level, msg_ptr, msg_len)` | Log a message (0=debug, 1=info, 2=warn, 3=error) |
| `flo.kv_get(key_ptr, key_len, buf_ptr, buf_len) → i32` | Read from KV store |
| `flo.kv_set(key_ptr, key_len, val_ptr, val_len) → i32` | Write to KV store |
| `flo.kv_delete(key_ptr, key_len) → i32` | Delete from KV store |

WASI shims (`wasi_snapshot_preview1.*`) are available for modules compiled with a WASI target.

#### Concurrency

Each shard allows up to 4 concurrent WASM executions (configurable via `max_concurrent_executions`). Additional invocations queue until a slot opens.

#### Building a WASM Action

Here's a complete rules engine in Zig targeting `wasm32-freestanding`:

```zig
// rules_engine.zig — Build with:
//   zig build-lib -target wasm32-freestanding -O ReleaseSmall rules_engine.zig

var heap: [65536]u8 = undefined;
var heap_offset: usize = 0;

export fn alloc(size: u32) u32 {
    const s: usize = @intCast(size);
    const aligned = (heap_offset + 7) & ~@as(usize, 7);
    if (aligned + s > heap.len) return 0;
    const ptr: [*]u8 = @ptrCast(&heap[aligned]);
    heap_offset = aligned + s;
    return @intFromPtr(ptr);
}

export fn dealloc(_: u32, _: u32) void {}

export fn handle(input_ptr: [*]const u8, input_len: u32) i64 {
    heap_offset = 0;
    const input = input_ptr[0..input_len];

    // Parse and evaluate rules against input...
    const output = processRules(input);

    const out_ptr = alloc(@intCast(output.len));
    if (out_ptr == 0) return -2;
    const dest: [*]u8 = @ptrFromInt(out_ptr);
    @memcpy(dest[0..output.len], output);

    return (@as(i64, out_ptr) << 32) | @as(i64, @intCast(output.len));
}
```

Register it:

```bash
flo action register rules-engine --wasm ./rules_engine.wasm
```

Now invocations execute inline — no worker needed:

```bash
flo action invoke rules-engine '{"age": 25, "country": "US"}'
# → Result: rules-engine-1  (completed immediately)

flo action status rules-engine-1
# → status: completed, output: {"eligible":true,"rules_evaluated":2,"rules_passed":2}
```

### User-Hosted Actions (Workers)

User-hosted actions are executed by external worker processes. This is the model for:

- Actions that call external APIs (payment gateways, email services)
- Long-running tasks (report generation, media processing)
- Logic that needs access to your infrastructure (databases, file systems)

The flow:

1. **Invoke** creates a run in `pending` status
2. A **worker** calls `await` (long poll) and receives the task
3. The worker runs the handler and calls **complete** or **fail**
4. Flo updates the run status and stores the result

---

## Worker Lifecycle

```
┌──────────┐   register    ┌──────────┐   await     ┌──────────┐
│  Init    │ ──────────▸   │  Idle    │ ──────────▸ │ Execute  │
│          │               │ (polling)│             │          │
└──────────┘               └──────┬───┘             └────┬─────┘
                                  │                      │
                            heartbeat (30s)         complete / fail
                                  │                      │
                                  ▼                      ▼
                           ┌──────────┐          ┌──────────┐
                           │ Draining │          │  Idle    │
                           └──────────┘          └──────────┘
```

### Register

The worker announces itself and the action types it handles:

```bash
flo worker register worker-1 process-order send-email
```

Registration includes:
- **Worker ID** — unique identifier (auto-generated if omitted)
- **Task types** — list of action names this worker can execute
- **Max concurrency** — how many tasks in parallel
- **Machine ID** — for grouping workers on the same host
- **Metadata** — arbitrary JSON for discovery

### Await (Long Poll)

Workers block-wait for tasks:

```bash
flo worker await process-order --worker-id worker-1 --block 30000
```

When a matching pending task exists, Flo returns a **task assignment**:

| Field | Description |
|-------|-------------|
| `task_id` | The run ID to complete/fail against |
| `task_type` | Action name |
| `payload` | Input bytes from the invoke call |
| `created_at` | When the invoke happened |
| `attempt` | Attempt number (starts at 1, increments on retry) |

### Complete

Report successful completion with the result:

```bash
flo worker complete <task-id> --worker-id worker-1 --action process-order --result '{"status":"done"}'
```

### Fail

Report failure, optionally requesting a retry:

```bash
# Retry — task goes back to pending
flo worker fail <task-id> --worker-id worker-1 --action process-order --error "Temporary failure" --retry

# Permanent failure — task is marked failed
flo worker fail <task-id> --worker-id worker-1 --action process-order --error "Invalid input"
```

### Touch (Lease Extension)

For long-running tasks, extend the execution lease to prevent timeout:

```bash
flo worker touch <task-id> --worker-id worker-1 --action process-order --extend 30000
```

### Heartbeat

Workers send periodic heartbeats (typically every 30 seconds) to report their current load and stay registered. If the server responds with a `draining` status, the worker should stop accepting new tasks and finish current ones.

### Drain

Signal that the worker should finish current tasks but accept no new ones:

```bash
flo worker drain --worker-id worker-1
```

---

## Labels

Actions can require specific worker capabilities using **labels**. When invoking an action with labels, only workers whose labels are a superset of the required labels will receive the task.

```bash
# Invoke with required labels
flo action invoke render-video '{"url":"..."}' --labels '{"gpu":true,"vram_gb":24}'
```

A worker with labels `{"gpu":true, "vram_gb":24, "region":"us-east"}` **matches** — it has all required keys with equal values. A worker with `{"gpu":true, "vram_gb":16}` **does not match** — `vram_gb` differs.

Label matching rules:
- All keys in `required` must exist in `worker` labels
- Values must be exactly equal (string, number, or boolean)
- Extra keys on the worker side are ignored
- Nested objects and arrays are not compared (flat values only)

---

## Invocation Options

| Option | Default | Description |
|--------|---------|-------------|
| `priority` | `10` | Higher = dequeued first (0–255) |
| `delay_ms` | `0` | Delay before the task becomes available |
| `idempotency_key` | — | Deduplication key (same key → same run ID) |
| `labels` | — | Required worker labels (JSON object) |
| `namespace` | `default` | Namespace isolation |

---

## Idempotency

Use `idempotency_key` to prevent duplicate invocations:

```bash
flo action invoke charge-payment '{"order":"ORD-123"}' --idempotency-key order-123-charge

# Same key returns the existing run (no new execution)
flo action invoke charge-payment '{"order":"ORD-123"}' --idempotency-key order-123-charge
# → same run ID
```

---

## Retry Behavior

When a worker reports failure with `--retry`:

1. The run status resets to `pending`
2. The attempt counter increments
3. The task goes back to the queue for the next available worker
4. Backoff delay is applied: `retry_delay_ms × 2^(attempt-1)`

When retries are exhausted (`max_retries` reached) or the worker fails without `--retry`:
- The run status is set to `failed`
- The error message and timestamps are recorded
- The run can still be queried via `action status`

---

## Namespace Isolation

Actions and runs are scoped to namespaces. The same action name can exist independently in different namespaces:

```bash
flo action register send-email --namespace prod
flo action register send-email --namespace staging

# These create separate runs in separate registries
flo action invoke send-email '{}' --namespace prod
flo action invoke send-email '{}' --namespace staging
```

---

## Persistence

Action registrations and run state are persisted to the Unified Append Log (UAL). On node restart:

- **Registrations** are replayed — all actions reappear in the registry
- **Runs** are replayed — pending and running tasks are restored
- Workers must re-register and resume polling

---

## SDK: Building Workers

The SDKs provide a high-level `ActionWorker` that handles registration, polling, concurrency, heartbeats, and error recovery. You just write handler functions.

### Handler Signature

Every action handler receives an `ActionContext` and returns result bytes:

```go
type ActionHandler func(actx *ActionContext) (result []byte, err error)
```
```python
async def handler(ctx: ActionContext) -> bytes:
```
```typescript
type ActionHandler = (ctx: ActionContext) => Promise<Uint8Array>;
```
```zig
pub const ActionHandler = *const fn (*ActionContext) anyerror![]const u8;
```

### ActionContext

The context object passed to every handler:

| Property | Type | Description |
|----------|------|-------------|
| `taskId` / `task_id` | string | Unique task/run identifier |
| `actionName` / `action_name` | string | Which action this is |
| `input` / `payload` | bytes | Raw input from the invoke call |
| `attempt` | int | Attempt number (1-based) |
| `createdAt` / `created_at` | timestamp | When the invoke happened |
| `namespace` | string | Namespace scope |

Methods:

| Method | Description |
|--------|-------------|
| `json()` / `Into()` | Parse input as JSON (typed or untyped) |
| `toBytes()` / `Bytes()` | Serialize a value to JSON bytes for the response |
| `touch(extendMs)` | Extend the execution lease (for long-running tasks) |

### Complete Examples

```go
package main

import (
    "context"
    "fmt"
    "log"
    "os"
    "os/signal"
    "syscall"

    flo "github.com/floruntime/flo-go"
)

type OrderRequest struct {
    OrderID    string  `json:"order_id"`
    CustomerID string  `json:"customer_id"`
    Amount     float64 `json:"amount"`
    Items      []Item  `json:"items"`
}

type Item struct {
    SKU      string `json:"sku"`
    Quantity int    `json:"quantity"`
}

func processOrder(actx *flo.ActionContext) ([]byte, error) {
    var req OrderRequest
    if err := actx.Into(&req); err != nil {
        return nil, fmt.Errorf("invalid input: %w", err)
    }

    log.Printf("Processing order %s ($%.2f)", req.OrderID, req.Amount)

    // For long-running tasks, extend the lease periodically
    for i, item := range req.Items {
        log.Printf("  Item %d/%d: %s", i+1, len(req.Items), item.SKU)

        // Extend lease every 3 items
        if (i+1) % 3 == 0 {
            actx.Touch(30000)
        }
    }

    return actx.Bytes(map[string]string{
        "order_id": req.OrderID,
        "status":   "processed",
    })
}

func sendEmail(actx *flo.ActionContext) ([]byte, error) {
    var input map[string]string
    actx.Into(&input)

    log.Printf("Sending email to %s", input["to"])

    return actx.Bytes(map[string]string{"status": "sent"})
}

func main() {
    client := flo.NewClient("localhost:9000",
        flo.WithNamespace("myapp"),
    )
    if err := client.Connect(); err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    w, err := client.NewActionWorker(flo.ActionWorkerOptions{
        Concurrency:   10,
        ActionTimeout: 5 * time.Minute,
    })
    if err != nil {
        log.Fatal(err)
    }
    defer w.Close()

    w.MustRegisterAction("process-order", processOrder)
    w.MustRegisterAction("send-email", sendEmail)

    // Graceful shutdown
    ctx, cancel := context.WithCancel(context.Background())
    go func() {
        sigCh := make(chan os.Signal, 1)
        signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
        <-sigCh
        w.Stop()
        cancel()
    }()

    log.Println("Worker starting...")
    w.Start(ctx)
}
```
```python
import asyncio
import logging
import signal
from flo import FloClient, ActionContext

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def process_order(ctx: ActionContext) -> bytes:
    data = ctx.json()
    logger.info(f"Processing order {data['order_id']} (${data['amount']:.2f})")

    items = data.get("items", [])
    for i, item in enumerate(items):
        logger.info(f"  Item {i+1}/{len(items)}: {item['sku']}")
        await asyncio.sleep(1)

        # Extend lease every 3 items
        if (i + 1) % 3 == 0:
            await ctx.touch(30000)

    return ctx.to_bytes({
        "order_id": data["order_id"],
        "status": "processed",
    })

async def send_email(ctx: ActionContext) -> bytes:
    data = ctx.json()
    logger.info(f"Sending email to {data['to']}")
    return ctx.to_bytes({"status": "sent"})

async def main():
    client = FloClient("localhost:9000", namespace="myapp")
    await client.connect()

    worker = client.new_action_worker(concurrency=10, action_timeout=300)

    worker.register_action("process-order", process_order)
    worker.register_action("send-email", send_email)

    # Decorator syntax also works
    @worker.action("health-check")
    async def health_check(ctx: ActionContext) -> bytes:
        return ctx.to_bytes({"status": "healthy"})

    # Shutdown handling
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, lambda: (worker.stop(), stop.set()))

    try:
        await worker.start()
    finally:
        await worker.close()
        await client.close()

asyncio.run(main())
```
```typescript
import { ActionWorker, ActionContext } from "@floruntime/node";

async function processOrder(ctx: ActionContext): Promise<Uint8Array> {
  const req = ctx.json<{
    orderId: string;
    amount: number;
    items: { sku: string; quantity: number }[];
  }>();

  console.log(`Processing order ${req.orderId} ($${req.amount.toFixed(2)})`);

  for (let i = 0; i < req.items.length; i++) {
    console.log(`  Item ${i + 1}/${req.items.length}: ${req.items[i].sku}`);
    await new Promise((r) => setTimeout(r, 1000));

    // Extend lease every 3 items
    if ((i + 1) % 3 === 0) {
      await ctx.touch(30000);
    }
  }

  return ctx.toBytes({
    orderId: req.orderId,
    status: "processed",
  });
}

async function sendEmail(ctx: ActionContext): Promise<Uint8Array> {
  const data = ctx.json<{ to: string; subject: string }>();
  console.log(`Sending email to ${data.to}`);
  return ctx.toBytes({ status: "sent" });
}

const worker = new ActionWorker({
  endpoint: "localhost:9000",
  namespace: "myapp",
  concurrency: 10,
  actionTimeoutMs: 300_000,
});

worker.action("process-order", processOrder);
worker.action("send-email", sendEmail);

process.on("SIGINT", () => worker.stop());

await worker.start();
await worker.close();
```
```zig
const std = @import("std");
const flo = @import("flo");

fn processOrder(ctx: *flo.ActionContext) anyerror![]const u8 {
    const input = try ctx.json(struct {
        order_id: []const u8,
        amount: f64,
        items: []const struct { sku: []const u8, quantity: u32 },
    });

    std.log.info("Processing order {s} (${d:.2})", .{ input.order_id, input.amount });

    for (input.items, 0..) |item, i| {
        std.log.info("  Item {d}/{d}: {s}", .{ i + 1, input.items.len, item.sku });

        if ((i + 1) % 3 == 0) {
            try ctx.touch(30000);
        }
    }

    return ctx.toBytes(.{
        .order_id = input.order_id,
        .status = "processed",
    });
}

fn sendEmail(ctx: *flo.ActionContext) anyerror![]const u8 {
    const input = try ctx.json(struct { to: []const u8, subject: []const u8 });
    std.log.info("Sending email to {s}", .{input.to});
    return ctx.toBytes(.{ .status = "sent" });
}

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var worker = try flo.ActionWorker.init(allocator, .{
        .endpoint = "localhost:9000",
        .namespace = "myapp",
        .concurrency = 10,
        .action_timeout_ms = 300_000,
    });
    defer worker.deinit();

    try worker.registerAction("process-order", processOrder);
    try worker.registerAction("send-email", sendEmail);

    try worker.start();
}
```

### Worker Configuration

```go
flo.ActionWorkerOptions{
    WorkerID:      "my-worker",       // auto-generated if empty
    MachineID:     "host-01",         // defaults to hostname
    Concurrency:   10,                // max parallel tasks
    ActionTimeout: 5 * time.Minute,   // per-task timeout
    BlockMS:       30000,             // long-poll timeout
}
```
```python
client.new_action_worker(
    worker_id="my-worker",            # auto-generated if empty
    concurrency=10,                   # max parallel tasks
    action_timeout=300,               # seconds
    block_ms=30000,                   # long-poll timeout
)
```
```typescript
new ActionWorker({
  endpoint: "localhost:9000",
  namespace: "myapp",
  workerId: "my-worker",             // auto-generated if omitted
  machineId: "host-01",
  concurrency: 10,                   // max parallel tasks
  actionTimeoutMs: 300_000,          // per-task timeout
  blockMs: 30_000,                   // long-poll timeout
  heartbeatIntervalMs: 30_000,       // heartbeat interval
});
```
```zig
flo.WorkerConfig{
    .endpoint = "localhost:9000",
    .namespace = "myapp",
    .worker_id = "my-worker",        // null = auto-generated
    .concurrency = 10,               // max parallel tasks
    .action_timeout_ms = 300_000,    // per-task timeout
    .block_ms = 30_000,              // long-poll timeout
    .heartbeat_interval_ms = 30_000, // heartbeat interval
    .machine_id = "host-01",
}
```

---

## SDK: Invoking Actions

You don't need a worker to invoke actions — any client can invoke and check status:

```go
client := flo.NewClient("localhost:9000")
client.Connect()
defer client.Close()

// Register
client.Action.Register("process-image", flo.ActionTypeUser, &flo.ActionRegisterOptions{
    TimeoutMS:   ptr(60000),
    MaxRetries:  ptr(3),
    Description: "Resize and optimize images",
})

// Invoke
result, _ := client.Action.Invoke("process-image",
    []byte(`{"url":"https://example.com/img.jpg","width":800}`),
    &flo.ActionInvokeOptions{
        Priority:       ptr(uint8(100)),
        IdempotencyKey: "img-resize-abc",
    },
)
fmt.Println("Run ID:", result.RunID)

// Poll for status
status, _ := client.Action.Status(result.RunID, nil)
fmt.Printf("Status: %s, Output: %s\n", status.Status, status.Output)

// Delete
client.Action.Delete("process-image", nil)
```
```python
from flo import FloClient, ActionType, ActionRegisterOptions, ActionInvokeOptions

async with FloClient("localhost:9000") as client:
    # Register
    await client.action.register("process-image", ActionType.USER,
        ActionRegisterOptions(timeout_ms=60000, max_retries=3))

    # Invoke
    result = await client.action.invoke("process-image",
        b'{"url":"https://example.com/img.jpg","width":800}',
        ActionInvokeOptions(priority=100, idempotency_key="img-resize-abc"))
    print(f"Run ID: {result.run_id}")

    # Poll for status
    status = await client.action.status(result.run_id)
    print(f"Status: {status.status}")

    # Delete
    await client.action.delete("process-image")
```
```typescript
import { FloClient, ActionType } from "@floruntime/node";

const client = new FloClient("localhost:9000");
await client.connect();

// Register
await client.action.register("process-image", ActionType.User, {
  timeoutMs: 60000,
  maxRetries: 3,
});

// Invoke
const result = await client.action.invoke(
  "process-image",
  encode('{"url":"https://example.com/img.jpg","width":800}'),
  { priority: 100, idempotencyKey: "img-resize-abc" }
);
console.log("Run ID:", result.runId);

// Poll for status
const status = await client.action.status(result.runId);
console.log("Status:", status.status);

// Delete
await client.action.delete("process-image");
```
```zig
var client = try flo.Client.init(allocator, "localhost:9000", .{});
defer client.deinit();
try client.connect();

// Register
try client.actions.registerAction("process-image", .user, .{
    .timeout_ms = 60000,
    .max_retries = 3,
});

// Invoke
const result = try client.actions.invoke("process-image",
    "{\"url\":\"https://example.com/img.jpg\"}", .{
    .priority = 100,
    .idempotency_key = "img-resize-abc",
});
defer result.deinit();

// Status
const status = try client.actions.getStatus(result.run_id, .{});
defer status.deinit();

// Delete
try client.actions.deleteAction("process-image", .{});
```

---

## Workflows Integration

Actions are the building blocks that [Workflows](/orchestration/workflows/) compose. A workflow step references an action with the `@actions/` prefix:

```yaml
steps:
  charge:
    run: "@actions/charge-payment"
    retry:
      max_attempts: 3
      backoff: exponential
    transitions:
      success: ship
      failure: flo.Failed
```

When a workflow invokes a WASM action, the result is available synchronously. When it invokes a user-hosted action, the workflow parks in `waiting` until the worker reports completion.

---

## Related Docs

- [Workers](/orchestration/workers/) — Low-level worker protocol details
- [Workflows](/orchestration/workflows/) — Compose actions into multi-step orchestrations
- [Stream Processing](/orchestration/processing/) — Continuous data pipelines (different from actions)

---

## Stream Processing

Source path: src/content/docs/orchestration/processing.md
Canonical URL: https://docs.floruntime.io/orchestration/processing/

Flo ships a **built-in stream processing engine** inspired by Apache Flink. Jobs are defined in YAML, submitted via the CLI or SDKs, and executed entirely inside the Flo node — no external cluster required. The engine reads from Flo streams or time-series measurements, transforms records through a chain of operators, and writes results to stream, time-series, KV, or queue sinks.

## Why Built-In Processing?

Traditional architectures pair a storage layer (Kafka, Redis) with a separate processing framework (Flink, Spark Streaming). This means two clusters to deploy, two failure domains to monitor, and serialization overhead at every boundary.

Flo eliminates that gap:

- **Zero-copy reads** — source records are read directly from the Unified Append Log, no network hop
- **Thread-per-shard execution** — each pipeline runs on the shard that owns the source partition, no cross-thread coordination
- **Integrated state** — operators can read and write Flo KV directly (e.g., `kv_lookup`), no external state store
- **Single deployment** — one binary, one config, one monitoring surface

## Core Concepts

### Jobs

A **job** is a long-running processing pipeline defined by a YAML file. Each job specifies:

| Field | Description |
|-------|-------------|
| `kind` | Always `Processing` |
| `name` | Human-readable job name |
| `namespace` | Namespace scope (default: `"default"`) |
| `parallelism` | Number of parallel task slots (default: `1`) |
| `batch_size` | Records to process per tick (default: `100`) |
| `sources` | Where to read data from |
| `sinks` | Where to write results to |
| `operators` | Transformation chain applied to every record |

### Records

The fundamental data unit flowing through a pipeline is a **ProcessingRecord**:

- **key** — optional partitioning key (empty = broadcast)
- **value** — payload bytes (typically JSON)
- **event_time_ms** — event timestamp used for windowing and watermarks
- **source** — origin stream name, partition, and offset for checkpoint tracking
- **headers** — optional key-value metadata

### Pipeline Topology

Pipelines are linear chains: **source → operator₁ → operator₂ → … → sink**. All operators in a chain execute on the same shard thread with zero-copy record passing (fused execution, mirroring Flink's operator chaining).

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Source   │───▶│  Filter  │───▶│  KeyBy   │───▶│ Aggregate│───▶│   Sink   │
│ (stream)  │    │          │    │          │    │          │    │ (stream) │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

## Job Definition (YAML)

Server-side job definitions use nested YAML or JSON. The examples below use YAML.

### Minimal Pipeline

The simplest pipeline: read a stream, write to another stream, no transformation:

```yaml
kind: Processing
name: user-events-pipe
namespace: analytics
parallelism: 1
batch_size: 100

sources:
  - name: input
    stream:
      name: payment-events
      namespace: analytics

sinks:
  - name: output
    stream:
      name: enriched-events
      namespace: analytics
```

The job continuously polls `payment-events` and appends every record to `enriched-events`.

### Full Example with Operators

```yaml
kind: Processing
name: order-analytics
namespace: production
parallelism: 4
batch_size: 200

sources:
  - name: orders
    stream:
      name: raw-orders
      namespace: production
      batch_size: 500

sinks:
  - name: output
    stream:
      name: order-totals
      namespace: production

operators:
  - type: filter
    name: completed-only
    condition: "value_contains:completed"

  - type: keyby
    name: by-customer
    key_expression: "$.customer_id"

  - type: aggregate
    name: hourly-total
    function: sum
    field: "$.amount"
    window: tumbling
    window_size: 3600
```

## Sources

Sources define where the pipeline reads data. Two source kinds are supported: **stream** and **time-series (ts)**.

### Stream Source

Reads records from a Flo stream, tracking offsets for exactly-once semantics:

```yaml
sources:
  - name: events
    stream:
      name: click-events
      namespace: production
      partitions: 0           # single partition (integer)
      batch_size: 500         # per-source override
```

#### Partition Selection

| Syntax | Behavior |
|--------|----------|
| `partitions: 0` | Read partition 0 only |
| `partitions: "0-63"` | Expand into one source per partition (64 sources) |
| `partitions: "0,3,7"` | Explicit partition list |
| `partitions: "all"` | Resolved at runtime from stream metadata |
| *(omitted)* | Defaults to partition 0 |

### Time-Series Source

Polls a TS measurement at a configurable interval, emitting data points as JSON records:

```yaml
sources:
  - name: cpu-metrics
    ts:
      measurement: cpu_usage
      namespace: production
      field: value              # field to read (default: "value")
      tags:                     # optional tag filter
        host: web-01
      poll_interval_ms: 1000    # polling interval (default: 1000)
```

Each emitted record looks like:

```json
{"measurement": "cpu_usage", "value": 72.5, "timestamp_ms": 1700000000000}
```

### Multi-Source Merge

Multiple sources are polled round-robin into the same pipeline:

```yaml
sources:
  - name: clicks
    stream:
      name: click-events
  - name: checkouts
    stream:
      name: checkout-events

sinks:
  - name: merged
    stream:
      name: unified-events
```

## Sinks

Sinks define where the pipeline writes results. Four sink kinds are supported.

### Stream Sink

Appends records to a Flo stream:

```yaml
sinks:
  - name: output
    stream:
      name: enriched-events
      namespace: production
```

### Time-Series Sink

Extracts tags and numeric fields from JSON record payloads and writes them as time-series data points:

```yaml
sinks:
  - name: cpu-ts
    ts:
      measurement: proc_cpu_metrics
      namespace: metrics
      tags:
        host: hostname          # TS tag "host" ← JSON field "hostname"
      fields:
        cpu: cpu_percent        # TS field "cpu" ← JSON field "cpu_percent"
```

Given the input `{"hostname":"web-01","cpu_percent":72.5}`, the sink writes a point to `proc_cpu_metrics` with tag `host=web-01` and field `cpu=72.5`.

#### `value_field` Shorthand

If the JSON payload contains a single scalar field to use as the value, use `value_field` instead of a full `fields:` map:

```yaml
sinks:
  - name: temp
    ts:
      measurement: proc_temp
      value_field: temperature
      tags:
        sensor: sensor
```

### KV Sink

Writes records to Flo KV storage:

```yaml
sinks:
  - name: profiles
    kv:
      namespace: profiles
      key_prefix: user          # prepended to record key
      separator: ":"            # between prefix and key (default: ":")
      write_mode: upsert        # upsert | if_absent | versioned
      ttl_ms: 86400000          # optional TTL
```

### Queue Sink

Enqueues records into a Flo queue:

```yaml
sinks:
  - name: tasks
    queue:
      name: task-queue
      namespace: default
      priority: 5
      delay_ms: 1000            # visibility delay
```

### Tag-Based Routing

Sinks can subscribe to **tagged records** instead of receiving the full pipeline output. Tags are set by the `classify` operator and matched with AND logic — a record reaches a sink only when it carries **all** of the sink's declared `match` tags.

Up to 32 distinct tag names per pipeline.

```yaml
operators:
  - type: classify
    name: route-events
    rules:
      - condition: "json:level=error"
        tag: errors
      - condition: "json:$.latency_ms>5000"
        tag: slow

sinks:
  - name: main
    stream:
      name: results

  - name: late-events
    stream:
      name: late-data
    match: [late]

  - name: failures
    queue:
      name: dead-letter
    match: [errors]

  - name: slow-errors
    stream:
      name: slow-error-stream
    match: [errors, slow]          # AND — must have BOTH tags
```

Sinks without `match` receive all records from the main operator chain. A single `match:` value is also accepted as sugar: `match: late` is equivalent to `match: [late]`.

## Operators

Operators are the transformation steps between source and sink. They are declared in the `operators:` array and execute in order. Flo includes eight built-in operator types.

### `filter` — Expression-Based Filter

Drops records that don't match a condition. Supported expressions:

**Record-level:**

| Expression | Matches when… |
|-----------|---------------|
| `value_contains:<substring>` | Record value contains the substring |
| `key_contains:<substring>` | Record key contains the substring |
| `key_equals:<exact>` | Record key equals the exact string |
| `key_prefix:<prefix>` | Record key starts with the prefix |
| `value_prefix:<prefix>` | Record value starts with the prefix |
| `not_empty` | Record value is non-empty |
| `key_not_empty` | Record key is non-empty |
| `min_length:<n>` | Record value length ≥ n |

**JSON field — `json:<path><op><value>`:**

| Expression | Matches when… |
|-----------|---------------|
| `json:<path>=<value>` | Field equals value |
| `json:<path>!=<value>` | Field does not equal value |
| `json:<path>^=<value>` | Field starts with value (prefix) |
| `json:<path>*=<value>` | Field contains value (substring) |
| `json:<path>!^=<value>` | Field does not start with value |
| `json:<path>!*=<value>` | Field does not contain value |
| `json:<path>><value>` | Field > value (numeric) |
| `json:<path>>=<value>` | Field >= value (numeric) |
| `json:<path><<value>` | Field < value (numeric) |
| `json:<path><=<value>` | Field <= value (numeric) |

```yaml
operators:
  - type: filter
    name: keep-important
    condition: "value_contains:important"
```

### `keyby` — JSON Key Extraction

Re-keys records by extracting a field from the JSON value using JSONPath expressions. Downstream operators like `aggregate` group by this key.

```yaml
operators:
  - type: keyby
    name: by-user
    key_expression: "$.user_id"
```

Supports nested paths: `"$.metadata.region"`.

If the value isn't valid JSON or the field doesn't exist, the record passes through with its original key.

### `map` — Declarative Field Projection

A 1:1 transformation that restructures JSON records by projecting, renaming, and adding fields:

```yaml
operators:
  - type: map
    name: extract-user
    user_id: "$.data.user_id"        # JSONPath extraction
    amount: "$.transaction.amount"    # nested field
    source: "payment-service"         # constant string
```

Rules:
- Values starting with `$.` are **JSONPath extractions** from the input
- All other values are treated as **string constants**
- Output is always a JSON object with the declared fields

### `flatmap` — Array Explosion

A 1:N transformation that explodes a JSON array into individual records:

```yaml
operators:
  - type: flatmap
    name: explode-items
    array_field: "$.order.items"
    element_key: "$.sku"            # optional: extract key from each element
```

Each element of the array at `$.order.items` becomes a separate downstream record. If the field is missing or not an array, the record is dropped.

### `aggregate` — Declarative Aggregation

Accumulates numeric values extracted from JSON records. Records are grouped by key — chain a `keyby` operator before `aggregate` for custom grouping.

**Functions:** `sum`, `count`, `avg`, `min`, `max`

**Window modes:**

| Mode | Config | Behavior |
|------|--------|----------|
| Running | *(no window config)* | Emits updated aggregate on every record |
| Tumbling | `window: tumbling`, `window_size: <seconds>` | Emits when window closes (on watermark) |
| Count-based | `window: count`, `window_size: <n>` | Emits after every N records per key |

Output format: `{"value": <result>, "count": <n>}`

```yaml
operators:
  # Running total (emits on every record)
  - type: aggregate
    name: running-total
    function: sum
    field: "$.amount"

  # Count per key in 60-second tumbling windows
  - type: aggregate
    name: event-counter
    function: count
    window: tumbling
    window_size: 60

  # Average every 100 records per key
  - type: aggregate
    name: batch-avg
    function: avg
    field: "$.latency_ms"
    window: count
    window_size: 100
```

### `kv_lookup` — KV-Backed Enrichment & Filtering

Looks up keys in Flo KV storage to filter or enrich streaming records. The lookup key is constructed from a **template** that interpolates JSON fields from the record.

**Template syntax:** Mix literal text with `${<jsonpath>}` placeholders:

| Template | Resolved key (for `{"account_id":"alice"}`) |
|----------|----------------------------------------------|
| `"account:${$.account_id}"` | `account:alice` |
| `"${$.account_id}"` | `alice` |
| `"user.${$.org}.${$.user_id}"` | `user.acme.u1` |

**Modes:**

| Mode | Behavior |
|------|----------|
| `filter` (default) | Drop the record if the constructed key is **not found** in KV |
| `enrich` | Attach the KV value to the record as a JSON field; records with no match pass through unchanged |

```yaml
operators:
  - type: kv_lookup
    name: check-account
    lookup_key: "account:${$.account_id}"
    namespace: default
    mode: filter
```

Enrich example — adds a `"tier"` field to each record:

```yaml
operators:
  - type: kv_lookup
    name: enrich-user
    lookup_key: "user:${$.user_id}"
    namespace: default
    mode: enrich
    enrich_field: tier
```

### `classify` — Tag-Based Record Labeling

Evaluates rules against each record and sets tag bits for matching conditions. Records continue flowing — classify never drops or forks, it only labels. Downstream sinks filter by AND-matching their `tags` list against the record's tag bitfield.

Rules use the same condition expressions as `filter`.

```yaml
operators:
  - type: classify
    name: route-payments
    default_tag: unmatched           # optional: tag when no rules match
    rules:
      - condition: "json:type^=payment"
        tag: payments
      - condition: "json:type*=transfer"
        tag: transfers
      - condition: "json:amount>10000"
        tag: high-value
```

A single record can match multiple rules and carry multiple tags. This enables multi-way routing: a `payments` sink, a `high-value` sink, and a `high-value, payments` sink can all coexist.

Records that match no rules pass through untagged by default. Set `default_tag` to route unmatched records to a specific sink.

### `passthrough` — Identity / Debug Tap

Emits every record unchanged. Useful for testing and as a pipeline placeholder:

```yaml
operators:
  - type: passthrough
    name: debug-tap
```

### Chaining Operators

Operators execute in declaration order. Records flow through each operator sequentially:

```yaml
operators:
  - type: filter
    name: completed-only
    condition: "value_contains:completed"

  - type: map
    name: extract-fields
    order_id: "$.order.id"
    total: "$.order.total"

  - type: keyby
    name: by-customer
    key_expression: "$.customer_id"

  - type: aggregate
    name: daily-total
    function: sum
    field: "$.total"
    window: tumbling
    window_size: 86400
```

## Windowing

The processing engine supports event-time windowing for time-based aggregations.

### Window Types

| Type | Description |
|------|-------------|
| **Tumbling** | Fixed-size, non-overlapping time windows. E.g., every 60 seconds. |
| **Sliding** | Fixed-size windows that overlap by a slide interval. |
| **Count** | Windows defined by element count, not time. |
| **Session** | Dynamic, gap-based windows per key. A session extends as long as records arrive within the gap. |
| **Global** | Single window for all elements (useful with custom triggers). |

### Triggers

Triggers decide when a window fires (evaluates its function and emits results):

| Trigger | Fires when… |
|---------|-------------|
| **Event-time** (default) | Watermark passes the window end |
| **Processing-time** | Wall clock reaches the window end |
| **Count** | Element count reaches a threshold |
| **Continuous** | At regular intervals |

### Watermarks

Watermarks signal event-time progress through the pipeline. They propagate the guarantee that no record with an earlier timestamp will arrive. The engine tracks watermarks across multiple inputs and advances them based on the minimum across all sources.

### Late Data Handling

Records that arrive after the watermark has passed their window are classified as:

1. **On-time** — within the expected window
2. **Late** — past the watermark but within the allowed lateness (re-fires window)
3. **Dropped** — too late, beyond the allowed lateness threshold

Late records can be tagged (via a `classify` rule) and routed to a dedicated sink for monitoring or reprocessing.

## Keyed State

Stateful operators (like `aggregate`) access per-key state scoped to the job and operator instance. Three state primitives are available:

| Primitive | Description |
|-----------|-------------|
| **ValueState** | Single value per key |
| **ListState** | Append-only list per key |
| **MapState** | Sub-key → value map per key |

State is stored in the per-shard state backend with automatic key namespacing:

```
proc:{job_id}:{operator_id}:kv:{user_key}          — ValueState
proc:{job_id}:{operator_id}:list:{user_key}:{idx}  — ListState
proc:{job_id}:{operator_id}:map:{user_key}:{mk}    — MapState
```

No locks are needed — single-threaded shard execution guarantees isolation.

## Checkpoints and Savepoints

### Checkpoints

The engine implements Chandy-Lamport distributed snapshots for fault tolerance:

1. **Trigger** — coordinator assigns a new `checkpoint_id`
2. **Barrier injection** — `CheckpointBarrier` is injected into sources
3. **Source snapshot** — sources save their current offsets
4. **Operator snapshot** — each operator snapshots its state, forwards the barrier
5. **Sink acknowledgment** — sinks confirm receipt of the barrier
6. **Completion** — all acks received, checkpoint is marked complete

Checkpoint metadata is persisted internally under `_proc:` keys in KV storage.

### Savepoints

Savepoints are user-triggered snapshots of a job's state:

```bash
flo processing savepoint job-1 -n analytics
```

A savepoint captures:

- The job binding and configuration
- Creation timestamp
- `records_processed` at the savepoint time

You can restore a job from a savepoint:

```bash
flo processing restore job-1 sp-1 -n analytics
```

## Pipeline Patterns

### Stream to Stream (Passthrough)

The simplest pipeline — data flows unmodified from source to sink:

```yaml
kind: Processing
name: mirror
sources:
  - stream: { name: events }
sinks:
  - stream: { name: events-copy }
```

### Stream to Time-Series (Metrics Extraction)

Convert JSON event streams into queryable time-series data:

```yaml
kind: Processing
name: cpu-pipeline
namespace: metrics
sources:
  - stream: { name: cpu-json }
sinks:
  - ts:
      measurement: proc_cpu_metrics
      tags:
        host: hostname
      fields:
        cpu: cpu_percent
```

### Time-Series to Stream (Alerting Feed)

Poll TS measurements and produce JSON records for downstream consumers:

```yaml
kind: Processing
name: ts-to-alerts
namespace: metrics
sources:
  - ts:
      measurement: cpu_usage
      field: value
      tags:
        host: web-01
sinks:
  - stream: { name: cpu-alerts }
```

### Time-Series to Time-Series (Derived Metrics)

Build derived metrics from raw measurements:

```yaml
kind: Processing
name: derive-temperature
namespace: metrics
sources:
  - ts:
      measurement: raw_temperature
      field: value
sinks:
  - ts:
      measurement: derived_temp
      value_field: value
```

### KV-Enriched Pipeline

Filter or enrich events using data stored in Flo KV:

```yaml
kind: Processing
name: account-filter
namespace: production
sources:
  - stream: { name: transactions }
sinks:
  - stream: { name: valid-transactions }
operators:
  - type: kv_lookup
    name: check-account
    lookup_key: "account:${$.account_id}"
    namespace: production
    mode: filter
```

## Job Lifecycle

### Submitting a Job

```bash
flo processing submit pipeline.yaml -n analytics
# Output: Job submitted: job-1
```

On submission, the job enters the `RUNNING` state and begins polling its sources immediately.

### Checking Status

```bash
flo processing status job-1 -n analytics
```

Returns JSON:

```json
{
  "job_id": "job-1",
  "name": "order-analytics",
  "status": "RUNNING",
  "parallelism": 4,
  "batch_size": 200,
  "records_processed": 15420,
  "created_at_ms": 1700000000000
}
```

### Listing Jobs

```bash
flo processing list -n analytics
```

### Stopping a Job

Stops the job gracefully. The job can be restored later:

```bash
flo processing stop job-1 -n analytics
```

### Cancelling a Job

Cancels the job permanently:

```bash
flo processing cancel job-1 -n analytics
```

### Job States

| State | Description |
|-------|-------------|
| `RUNNING` | Actively processing records |
| `STOPPED` | Gracefully halted, can be restored |
| `CANCELLED` | Permanently terminated |
| `FAILED` | Terminated due to an error |
| `COMPLETED` | Finished (for bounded sources) |

### Savepoints

```bash
# Create a savepoint
flo processing savepoint job-1 -n analytics

# Restore from a savepoint
flo processing restore job-1 sp-1 -n analytics
```

### Rescaling

Change the parallelism of a running job:

```bash
flo processing rescale job-1 8 -n analytics
```

## Namespace Isolation

Jobs are scoped to namespaces, providing complete isolation:

- The same job name in different namespaces are **independent jobs**
- `list` returns only jobs in the specified namespace
- Pipeline data flows**only within** the namespace scope
- Source streams and sink targets are resolved within the job's namespace

```bash
# These are two separate, independent jobs
flo processing submit job.yaml -n production
flo processing submit job.yaml -n staging
```

## Persistence

Job state survives node restarts:

- Submitted jobs persist and resume on restart
- Stopped and cancelled job states are preserved
- Rescaled parallelism is remembered
- New job IDs don't collide with pre-restart IDs

All mutations (submit, stop, cancel, status updates) are persisted through Raft and replayed on startup.

## Processing Metrics

The engine collects per-operator and per-pipeline metrics:

| Metric | Description |
|--------|-------------|
| `records_in` | Records processed by each operator |
| `records_out` | Records emitted by each operator |
| `processing_time_ns` | Cumulative processing time |
| `errors` | Error count |
| `throughput` | Records per second (rolling) |
| `latency` | Processing latency histogram (buckets: <1ms, <5ms, <10ms, <50ms, <100ms, <500ms, 500ms+) |
| `backpressure` | Backpressure gauge (0.0–1.0) |

## Related Docs

- [Streams](/primitives/streams/) — source and sink behavior for stream-backed pipelines
- [Time-Series](/primitives/time-series/) — TS query and write semantics
- [KV](/primitives/kv/) — KV storage used by `kv_lookup` operator and KV sinks
- [Queues](/primitives/queues/) — queue sinks for task pipelines
- [Actions](/orchestration/actions/) — WASM action registration and invocation
- [Workflows](/orchestration/workflows/) — multi-step orchestration over actions

---

## Workers

Source path: src/content/docs/orchestration/workers.mdx
Canonical URL: https://docs.floruntime.io/orchestration/workers/

Workers are **long-running processes** that connect to Flo and execute tasks. There are two kinds:

- **Action workers** — pull action tasks from a queue (long-polling), execute a handler, and report results. Used for durable task processing with retries, timeouts, and dead-letter routing.
- **Stream workers** — consume records from a [stream](/primitives/streams/) via consumer groups, process each record, and auto-ack or nack. Used for continuous event processing.

Both worker types register themselves in the **worker registry**, send periodic heartbeats, report load metrics, and support graceful drain. The server tracks each worker's health and can mark stale workers as unhealthy after 90 seconds of silence.

## Worker Types

| Type | Purpose | Task Source | Completion |
|------|---------|-------------|------------|
| **Action** | Durable task execution | `action_await` long-poll | Explicit `complete` / `fail` |
| **Stream** | Continuous event processing | `group_read` on stream | Auto-ack on success, auto-nack on error |

Both types share the same registration, heartbeat, drain, and health-monitoring infrastructure.

## Lifecycle

```
Register ──▸ Heartbeat loop ──▸ Process tasks ──▸ Drain ──▸ Deregister
   │              │                   │              │           │
   │         every 30s           await/poll      sticky      cleanup
   │         reports load        execute         no new       remove
   │              │              complete/fail    tasks        record
   ▼              ▼                   ▼              ▼           ▼
 active        active            active/idle    draining    (removed)
```

### 1. Register

The worker announces itself to the server with:

| Field | Description |
|-------|-------------|
| **worker_id** | Unique identifier (auto-generated from hostname + random hex if not provided) |
| **worker_type** | `action` (0) or `stream` (1) |
| **max_concurrency** | Maximum parallel tasks (default: 10) |
| **processes** | List of action names or stream/group pairs this worker handles |
| **metadata** | Optional JSON string (labels, version, environment) |
| **machine_id** | Optional host identifier for grouping workers on the same machine |

Re-registering the same worker ID replaces the previous registration.

### 2. Heartbeat

Workers send a heartbeat every **30 seconds** (configurable). The heartbeat carries the worker's `current_load` (number of in-flight tasks). The server responds with the worker's current status — if the server returns `draining`, the SDK stops accepting new tasks.

If a worker misses heartbeats for **90 seconds**, the server marks it as `unhealthy`.

### 3. Process

**Action workers** long-poll with `action_await`, receive a `TaskAssignment` (task ID, action name, payload, attempt number), execute the registered handler, then call `complete` (with result bytes) or `fail` (with error message + optional retry flag).

**Stream workers** call `group_read` on a consumer group, receive a batch of records, process each one through the handler, and auto-ack on success or auto-nack on error.

### 4. Drain

Drain is a **graceful shutdown** mechanism. When a worker is drained:

- The server sets its status to `draining` (sticky — it never reverts to `active`)
- Subsequent heartbeats return `draining` so the SDK knows to stop polling
- In-flight tasks continue to completion
- No new tasks are dispatched to the worker
- Once all active tasks finish, the worker deregisters

Drain can be initiated by the worker itself or externally via CLI/API.

### 5. Deregister

Removes the worker from the registry entirely. SDKs call deregister automatically on shutdown (in `defer` / `finally` blocks).

## Worker Status

| Status | Value | Description |
|--------|-------|-------------|
| `active` | 0 | Healthy, processing or ready for tasks |
| `idle` | 1 | Connected, no current tasks |
| `draining` | 2 | Finishing current work, accepting nothing new |
| `unhealthy` | 3 | No heartbeat for 90+ seconds |

Status transitions:

```
                    ┌── heartbeat ──┐
                    ▼               │
  register ──▸ active ◀────────────┘
                 │
                 ├── drain ──▸ draining ──▸ deregister
                 │
                 └── 90s no heartbeat ──▸ unhealthy
                                              │
                                              └── heartbeat ──▸ active
```

## Action Workers

Action workers poll for tasks, execute handlers, and report outcomes. All four SDKs provide a high-level `ActionWorker` that handles registration, heartbeats, concurrency control, and drain automatically.

### Quick Start

```go
package main

import (
    "context"
    "fmt"
    "os/signal"
    "syscall"

    flo "github.com/razorbill/flo-go"
)

func main() {
    ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
    defer stop()

    client := flo.NewClient("localhost:9000", flo.WithNamespace("myapp"))
    client.Connect()
    defer client.Close()

    w, _ := client.NewActionWorker(flo.ActionWorkerOptions{
        Concurrency: 10,
    })
    defer w.Close()

    w.MustRegisterAction("process-order", func(actx *flo.ActionContext) ([]byte, error) {
        var order map[string]interface{}
        actx.Into(&order)
        // Process the order...
        return actx.Bytes(map[string]string{"status": "done"})
    })

    w.MustRegisterAction("send-email", func(actx *flo.ActionContext) ([]byte, error) {
        // Send the email...
        return nil, nil
    })

    // Blocks until context is cancelled or drain completes
    w.Start(ctx)
}
```
```python
import asyncio
import signal
from flo import FloClient, ActionContext

async def main():
    client = FloClient("localhost:9000", namespace="myapp")
    await client.connect()

    worker = client.new_action_worker(concurrency=5, action_timeout=300)

    # Register with function
    worker.register_action("process-order", process_order)

    # Register with decorator
    @worker.action("send-email")
    async def send_email(ctx: ActionContext) -> bytes:
        data = ctx.json()
        # Send the email...
        return ctx.to_bytes({"status": "sent"})

    # Graceful shutdown on signal
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, worker.stop)

    try:
        await worker.start()
    finally:
        await worker.close()
        await client.close()

async def process_order(ctx: ActionContext) -> bytes:
    order = ctx.json()
    # Process...
    return ctx.to_bytes({"status": "processed", "id": order["order_id"]})

asyncio.run(main())
```
```typescript
import { ActionWorker, ActionContext } from "@floruntime/node";

const worker = new ActionWorker({
  endpoint: "localhost:9000",
  namespace: "myapp",
  concurrency: 5,
  actionTimeoutMs: 300_000,
});

worker.action("process-order", async (ctx: ActionContext) => {
  const order = ctx.json<{ orderId: string; amount: number }>();
  // Process the order...
  return ctx.toBytes({ status: "done", orderId: order.orderId });
});

worker.action("send-email", async (ctx: ActionContext) => {
  const data = ctx.json<{ to: string; subject: string }>();
  // Send the email...
  return ctx.toBytes({ status: "sent" });
});

process.on("SIGINT", () => worker.stop());
process.on("SIGTERM", () => worker.stop());

await worker.start();
await worker.close();
```
```zig
const std = @import("std");
const flo = @import("flo");

fn processOrder(ctx: *flo.ActionContext) ![]const u8 {
    const parsed = try ctx.json(struct { order_id: []const u8, amount: f64 });
    defer parsed.deinit();
    // Process the order...
    return ctx.toBytes(.{ .status = "done", .order_id = parsed.value.order_id });
}

fn sendEmail(ctx: *flo.ActionContext) ![]const u8 {
    // Send the email...
    return ctx.toBytes(.{ .status = "sent" });
}

pub fn main() !void {
    var gpa: std.heap.GeneralPurposeAllocator(.{}) = .init;
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var worker = try flo.ActionWorker.init(allocator, .{
        .endpoint = "localhost:9000",
        .namespace = "myapp",
        .concurrency = 10,
    });
    defer worker.deinit();

    try worker.registerAction("process-order", processOrder);
    try worker.registerAction("send-email", sendEmail);

    try worker.start();
}
```

### ActionContext

Every action handler receives an `ActionContext` with helpers for parsing input and formatting output:

| Method | Description |
|--------|-------------|
| `json()` / `Into()` | Deserialise the input payload from JSON |
| `toBytes()` / `Bytes()` | Serialise a result value to JSON bytes |
| `touch(extendMs)` | Extend the task lease (prevents timeout during long work) |
| `taskId` / `task_id` | Unique task identifier |
| `actionName` / `action_name` | The action that was invoked |
| `attempt` | Attempt number (starts at 1, increments on retry) |
| `createdAt` / `created_at` | Timestamp when the task was created |

### Lease Extension

For long-running tasks, periodically call `touch()` to extend the lease and prevent the server from reassigning the task to another worker:

```go
w.MustRegisterAction("generate-report", func(actx *flo.ActionContext) ([]byte, error) {
    // For long tasks, extend the lease periodically
    for i := 0; i < totalSteps; i++ {
        processStep(i)
        if (i+1)%3 == 0 {
            actx.Touch(30000) // extend by 30s
        }
    }
    return actx.Bytes(result)
})
```
```python
async def generate_report(ctx: ActionContext) -> bytes:
    for step in range(total_steps):
        await process_step(step)
        if (step + 1) % 3 == 0:
            await ctx.touch(30000)  # extend by 30s
    return ctx.to_bytes(result)
```
```typescript
worker.action("generate-report", async (ctx) => {
  for (let i = 0; i < totalSteps; i++) {
    await processStep(i);
    if ((i + 1) % 3 === 0) {
      await ctx.touch(30000); // extend by 30s
    }
  }
  return ctx.toBytes(result);
});
```
```zig
fn generateReport(ctx: *flo.ActionContext) ![]const u8 {
    for (0..total_steps) |i| {
        processStep(i);
        if ((i + 1) % 3 == 0) {
            try ctx.touch(30000); // extend by 30s
        }
    }
    return ctx.toBytes(result);
}
```

### Error Handling and Retries

When a handler returns an error, the SDK automatically reports a failure with `retry: true`. The server re-queues the task for another attempt (up to the action's max retry count). Specific error types change the behaviour:

| Condition | Retry | Notes |
|-----------|-------|-------|
| Handler returns error | Yes | Auto-retry with exponential backoff |
| Handler panics / throws | Yes | SDK catches panics, reports failure |
| `NonRetryableError` / `NewNonRetryableErrorf` | **No** | Immediately failed — no retries, no DLQ |
| Context deadline exceeded | **No** | Task is permanently failed |
| Context cancelled (shutdown) | **No** | Task is permanently failed |
| Explicit `fail(..., retry: false)` | No | Moves to dead-letter queue |

### NonRetryableError

Use `NonRetryableError` when the task has definitively failed and retrying would be pointless (invalid input, business rule violations, permanent service rejections). The task is immediately marked `failed` — no retry delay, no backoff, no dead-letter queue.

```typescript
import { NonRetryableError } from "@floruntime/node";

worker.action("validate-order", async (ctx) => {
  const { orderId, amount } = ctx.json<{ orderId?: string; amount?: number }>();

  if (!orderId) {
    throw new NonRetryableError("missing orderId");
  }
  if ((amount ?? 0) > 2000) {
    throw new NonRetryableError(`order amount $${amount} exceeds $2000 limit`);
  }
  return ctx.toBytes({ valid: true, orderId });
});
```
```go
w.MustRegisterAction("validate-order", func(actx *flo.ActionContext) (interface{}, error) {
    var data struct {
        OrderID string  `json:"orderId"`
        Amount  float64 `json:"amount"`
    }
    actx.Into(&data)

    if data.OrderID == "" {
        return nil, flo.NewNonRetryableErrorf("missing orderId")
    }
    if data.Amount > 2000 {
        return nil, flo.NewNonRetryableErrorf("order amount $%.0f exceeds $2000 limit", data.Amount)
    }
    return map[string]interface{}{"valid": true, "orderId": data.OrderID}, nil
})
```
```python
from flo import NonRetryableError

@worker.action("validate-order")
async def validate_order(ctx: ActionContext) -> bytes:
    data = ctx.json()
    if not data.get("orderId"):
        raise NonRetryableError("missing orderId")
    if data.get("amount", 0) > 2000:
        raise NonRetryableError(f"order amount ${data['amount']} exceeds $2000 limit")
    return ctx.to_bytes({"valid": True, "orderId": data["orderId"]})
```

When a workflow step handler throws `NonRetryableError`, the workflow run is routed through the `failure` transition without waiting for retries.

### Named Outcomes

By default, a returning handler produces the `success` outcome. To route a workflow down a specific named transition branch, use `ctx.result(outcomeName, data)`. This is used for **outcome-based routing** — where the same step can branch to different next steps depending on the business decision.

```typescript
import { ActionResult } from "@floruntime/node";

worker.action("review-order", async (ctx): Promise<ActionResult> => {
  const { orderId, amount } = ctx.json<{ orderId: string; amount: number }>();

  if (amount < 100) {
    // Workflow follows "approved" transition
    return ctx.result("approved", { orderId, decision: "auto-approved" });
  } else if (amount >= 500) {
    // Workflow follows "rejected" transition
    return ctx.result("rejected", { orderId, reason: "amount too high" });
  } else {
    // Workflow follows "needs_review" transition
    return ctx.result("needs_review", { orderId, note: "manual review required" });
  }
});
```
```go
w.MustRegisterAction("review-order", func(actx *flo.ActionContext) (interface{}, error) {
    var data struct {
        OrderID string  `json:"orderId"`
        Amount  float64 `json:"amount"`
    }
    actx.Into(&data)

    if data.Amount < 100 {
        return actx.Result("approved", map[string]interface{}{
            "orderId": data.OrderID, "decision": "auto-approved",
        })
    } else if data.Amount >= 500 {
        return actx.Result("rejected", map[string]interface{}{
            "orderId": data.OrderID, "reason": "amount too high",
        })
    }
    return actx.Result("needs_review", map[string]interface{}{
        "orderId": data.OrderID, "note": "manual review required",
    })
})
```
```python
@worker.action("review-order")
async def review_order(ctx: ActionContext) -> bytes:
    data = ctx.json()
    amount = data.get("amount", 0)

    if amount < 100:
        return ctx.result("approved", {"orderId": data["orderId"], "decision": "auto-approved"})
    elif amount >= 500:
        return ctx.result("rejected", {"orderId": data["orderId"], "reason": "amount too high"})
    else:
        return ctx.result("needs_review", {"orderId": data["orderId"], "note": "manual review required"})
```

The workflow YAML declares the named outcome transitions:

```yaml
start:
  run: "@actions/review-order"
  transitions:
    approved: fulfill          # ctx.result("approved") → go to fulfill step
    rejected: notify_rejection # ctx.result("rejected") → go to notify_rejection
    needs_review: manual_review
    failure: flo.Failed
```

The `concurrency` setting controls how many tasks a worker processes in parallel:

| SDK | Mechanism | Default |
|-----|-----------|---------|
| **Go** | Goroutines behind a semaphore channel | 10 |
| **Python** | `asyncio` tasks with semaphore | 10 |
| **JavaScript** | `Promise` concurrency with semaphore | 10 |
| **Zig** | Sequential (single-threaded polling loop) | 10 |

The worker reports its `current_load` (number of in-flight tasks) in each heartbeat so the server can make load-aware routing decisions.

## Stream Workers

Stream workers consume records from a stream via **consumer groups**. They automatically join the group on start, poll for batches, execute the handler for each record, and ack/nack based on the outcome.

### Quick Start

```go
client := flo.NewClient("localhost:9000", flo.WithNamespace("myapp"))
client.Connect()
defer client.Close()

sw, _ := client.NewStreamWorker(flo.StreamWorkerOptions{
    Stream:      "events",
    Group:       "processors",
    Concurrency: 5,
    BatchSize:   10,
}, func(sctx *flo.StreamContext) error {
    var event map[string]interface{}
    sctx.Into(&event)
    fmt.Printf("Processing event: %v\n", event)
    return nil // auto-ack
})
defer sw.Close()

sw.Start(ctx) // blocks until context cancelled or drain
```
```python
client = FloClient("localhost:9000", namespace="myapp")
await client.connect()

worker = client.new_stream_worker(
    stream="events",
    group="processors",
    handler=process_event,
    concurrency=5,
    batch_size=10,
)

async def process_event(ctx: StreamContext) -> None:
    event = ctx.json()
    print(f"Processing: {event}")
    # Return normally to auto-ack
    # Raise an exception to auto-nack (redelivery)

await worker.start()
```
```typescript
const client = new FloClient("localhost:9000", { namespace: "myapp" });
await client.connect();

const worker = new StreamWorker(
  client,
  { stream: "events", group: "processors", concurrency: 5, batchSize: 10 },
  async (ctx: StreamContext) => {
    const event = ctx.json<UserEvent>();
    console.log(`Processing: ${event.type}`);
    // Return normally to auto-ack
    // Throw to auto-nack
  }
);

await worker.start();
```
```zig
var sw = try flo.StreamWorker.init(allocator, .{
    .endpoint = "localhost:9000",
    .namespace = "myapp",
    .stream = "events",
    .group = "my-group",
    .concurrency = 5,
    .batch_size = 10,
}, processRecord);
defer sw.deinit();

try sw.start();

fn processRecord(ctx: *flo.StreamContext) anyerror!void {
    const payload = ctx.payload();
    std.debug.print("Got: {s}\n", .{payload});
    // Return normally to auto-ack
    // Return error to auto-nack
}
```

### StreamContext

| Method | Description |
|--------|-------------|
| `json()` / `Into()` | Deserialise the record payload from JSON |
| `payload()` / `Payload()` | Raw record payload bytes |
| `streamId` / `StreamID()` | The record's stream ID (timestamp + sequence) |
| `headers()` / `Headers()` | Record headers (key-value map) |
| `stream` / `Stream()` | Stream name |
| `group` / `Group()` | Consumer group name |
| `consumer` / `Consumer()` | Consumer name within the group |
| `namespace` / `Namespace()` | Namespace |

### Ack / Nack Behaviour

| Handler Result | Record Action | Effect |
|---------------|---------------|--------|
| Returns normally | **Auto-ack** | Record is marked as consumed |
| Returns error / throws | **Auto-nack** | Record is redelivered to the group |
| Panics (Go) | **Auto-nack** | Panic is recovered, record is redelivered |

### Stream Worker Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `stream` | *(required)* | Stream to consume from |
| `group` | `"default"` | Consumer group name |
| `consumer` | *(auto: worker_id)* | Consumer name within the group |
| `worker_id` | *(auto: hostname-hex)* | Unique worker identifier |
| `concurrency` | 10 | Maximum parallel record handlers |
| `batch_size` | 10 | Records to read per poll |
| `block_ms` | 30,000 | Blocking read timeout (ms) |
| `message_timeout` | 5 minutes | Maximum time for a handler to process one record |
| `machine_id` | *(auto: hostname)* | Host identifier for dashboard grouping |
| `metadata` | — | Optional JSON metadata |

## Worker Registry

The worker registry is a **per-shard in-memory table** that tracks all connected workers. It is separate from the action dispatch system — its role is **observability and health monitoring**, not task routing.

### What the Registry Tracks

Each `WorkerRecord` stores:

| Field | Type | Description |
|-------|------|-------------|
| `worker_id` | string | Unique identifier |
| `worker_type` | `action` / `stream` | What kind of tasks this worker processes |
| `status` | enum | `active`, `idle`, `draining`, `unhealthy` |
| `namespace` | string | Namespace the worker belongs to |
| `max_concurrency` | u32 | Maximum parallel tasks |
| `current_load` | u32 | Current in-flight task count (from heartbeats) |
| `tasks_completed` | u64 | Lifetime completed count |
| `tasks_failed` | u64 | Lifetime failed count |
| `registered_at` | timestamp | When the worker first registered |
| `last_heartbeat` | timestamp | Last heartbeat received |
| `machine_id` | string? | Host identifier for grouping |
| `metadata` | JSON? | Arbitrary key-value data |
| `processes` | array | Per-action or per-stream tracking (see below) |

### Process Tracking

Each worker registers a list of **processes** — the specific actions or stream/group pairs it handles. The server tracks per-process metrics:

| Field | Description |
|-------|-------------|
| `name` | Action name (e.g. `"process-order"`) or stream/group (e.g. `"events/processors"`) |
| `kind` | `action` (0) or `stream_consumer` (1) |
| `run_count` | Successful executions |
| `fail_count` | Failed executions |
| `last_run_at` | Timestamp of last execution |

### Health Monitoring

The server runs a periodic health check (on each shard tick). Workers that haven't sent a heartbeat in **90 seconds** are marked `unhealthy`. Unhealthy workers are not removed — they can recover by sending a heartbeat, which resets their status to `active`.

### Limits

- Maximum **10,000 workers** per shard
- Heartbeat timeout: **90 seconds**
- Default heartbeat interval: **30 seconds** (SDK-side)

## Configuration Reference

### Action Worker Options

| Option | Go | Python | JS | Zig | Default |
|--------|----|---------|----|-----|---------|
| Worker ID | `WorkerID` | `worker_id` | `workerId` | `worker_id` | hostname-random |
| Machine ID | `MachineID` | `machine_id` | `machineId` | `machine_id` | hostname |
| Concurrency | `Concurrency` | `concurrency` | `concurrency` | `concurrency` | 10 |
| Action timeout | `ActionTimeout` | `action_timeout` | `actionTimeoutMs` | `action_timeout_ms` | 5 min |
| Block timeout | `BlockMS` | `block_ms` | `blockMs` | `block_ms` | 30,000 ms |

### Stream Worker Options

| Option | Go | Python | JS | Zig | Default |
|--------|----|---------|----|-----|---------|
| Stream | `Stream` | `stream` | `stream` | `stream` | *(required)* |
| Group | `Group` | `group` | `group` | `group` | `"default"` |
| Consumer | `Consumer` | `consumer` | `consumer` | `consumer` | worker_id |
| Worker ID | `WorkerID` | `worker_id` | `workerId` | `worker_id` | hostname-random |
| Concurrency | `Concurrency` | `concurrency` | `concurrency` | `concurrency` | 10 |
| Batch size | `BatchSize` | `batch_size` | `batchSize` | `batch_size` | 10 |
| Block timeout | `BlockMS` | `block_ms` | `blockMs` | `block_ms` | 30,000 ms |
| Message timeout | `MessageTimeout` | — | — | — | 5 min |

## Related

- [Actions](/orchestration/actions/) — Register and invoke durable task types
- [Streams](/primitives/streams/) — Append-only ordered log with consumer groups
- [Workflows](/orchestration/workflows/) — Multi-step orchestration using actions as steps
- [Stream Processing](/orchestration/processing/) — Declarative stream processing jobs

---

## Workflows

Source path: src/content/docs/orchestration/workflows.md
Canonical URL: https://docs.floruntime.io/orchestration/workflows/

Workflows are Flo's **durable orchestration layer**. They compose [Actions](/orchestration/actions/) into multi-step business processes defined in YAML, with built-in resilience: retries, circuit breakers, health-weighted routing, signal handling, timeouts, polling, cron scheduling, stream triggers, and idempotency.

A workflow definition is a directed graph of **steps**. Each step either runs a target (an action, an inline plan, or a child workflow) or waits for an external signal. Every step declares **transitions** that map outcomes to the next step or to a **terminal state**. The engine walks the graph from the start step until it reaches a terminal.

```
Client ──start──▸ validate ──success──▸ charge ──success──▸ ship ──success──▸ flo.Completed
                       │                    │                  │
                    failure              failure             failure
                       ▼                    ▼                  ▼
                  flo.Failed         PaymentFailed         flo.Failed
```

## Why Workflows?

| Concern | Without Flo Workflows | With Flo Workflows |
|---------|----------------------|-------------------|
| **State** | Your app manages a state machine in an external DB, guarding against crashes | Flo persists every state transition to the UAL. Recovery replays the log. |
| **Retries** | Hand-written retry loops with ad-hoc backoff | Declarative `retry:` block with exponential, linear, constant, or jittered backoff |
| **Failover** | If the orchestrating process dies, work stalls | Another node picks up from the last committed state |
| **Routing** | Manual circuit breaking, health scoring, fallback chains | Inline **plans** with health-weighted selection, circuit breakers, and fallback values |
| **Human-in-the-loop** | Polling, webhooks, custom queues | `waitForSignal` with typed signals, timeouts, and approval flows |
| **Scheduling** | External cron daemon | Embedded `schedule:` block with 5-field cron or interval |
| **Event-driven** | Wiring consumer groups to trigger logic | `trigger:` block listens on a stream and starts runs per event |

---

## Quick Start

**1. Define the workflow** in a YAML file:

```yaml
kind: Workflow
name: process-order
version: "1.0.0"
idempotency: required

start:
  run: "@actions/validate-order"
  transitions:
    success: charge
    failure: flo.Failed

steps:
  charge:
    run: "@actions/charge-payment"
    retry:
      max_attempts: 3
      backoff: exponential
      initial_delay_ms: 1000
      max_delay_ms: 30000
    transitions:
      success: ship
      failure: flo.Failed

  ship:
    run: "@actions/create-shipment"
    transitions:
      success: flo.Completed
      failure: flo.Failed
```

**2. Register the actions** the workflow calls:

```bash
flo action register validate-order --wasm ./validate.wasm
flo action register charge-payment --wasm ./charge.wasm
flo action register create-shipment --wasm ./ship.wasm
```

**3. Deploy the workflow:**

```bash
flo workflow create -f process-order.yaml
```

**4. Start a run:**

```bash
flo workflow start process-order '{"order_id": "ORD-123", "amount": 99.99}'
# → wfrun-1
```

**5. Check status:**

```bash
flo workflow status wfrun-1
# → {"run_id":"wfrun-1","workflow":"process-order","version":"1.0.0","status":"completed",...}
```

---

## Core Concepts

### Workflow Definition

Every workflow YAML file has this top-level structure:

| Field | Required | Description |
|-------|----------|-------------|
| `kind` | yes | Must be `Workflow` |
| `name` | yes | Unique workflow name |
| `version` | yes | Arbitrary version string (clients can request specific versions) |
| `idempotency` | no | `none` (default), `optional`, or `required` |
| `start` | yes | The entry-point step |
| `steps` | no | Named steps (map of step name → step definition) |
| `terminals` | no | Custom terminal states (map of name → `{status: ...}`) |
| `plans` | no | Inline plan definitions (map of plan name → plan config) |
| `schedule` | no | Cron or interval schedule for automatic runs |
| `trigger` | no | Stream trigger — starts a run per event |
| `searchAttributes` | no | Custom queryable fields extracted from input |

### Steps

A step is the smallest unit of work. There are two kinds:

#### Run Step

Executes a target and transitions based on the outcome:

```yaml
charge:
  run: "@actions/charge-payment"      # target
  inputMapping: '{"amount": "$.input.amount"}'  # optional JSONPath transform
  retry:                               # optional retry policy
    max_attempts: 3
    backoff: exponential
  poll:                                # optional pending-outcome polling
    maxAttempts: 10
    backoff: exponential
  transitions:
    success: ship
    failure: flo.Failed
    pending: check_status              # only if poll is configured
    target_not_found: flo.Failed       # execution-level outcome
```

Targets use a prefix to indicate what to invoke:

| Prefix | Invokes | Example |
|--------|---------|---------|
| `@actions/` | A registered action (WASM or user-hosted) | `@actions/charge-stripe` |
| `@plan/` | An inline plan defined in the same workflow | `@plan/payment` |
| `@workflow/` | A child workflow (starts a nested run) | `@workflow/fulfillment` |

#### Wait For Signal Step

Pauses the workflow until an external signal arrives or a timeout expires:

```yaml
await_approval:
  waitForSignal:
    type: approval                     # signal type to match
    timeoutMs: 3600000                 # 1 hour timeout (optional)
    onTimeout: flo.Failed              # transition on timeout (optional)
  transitions:
    success: fulfill                   # after signal received
```

When a signal of the matching type is delivered, the engine follows the `success` transition. If `timeoutMs` is configured and the timeout expires before a signal arrives, the engine either follows `onTimeout` (if set) or transitions the run to `timed_out`.

### Step Outcomes

Each step produces an **outcome** string that maps to a transition target.

**Business outcomes** (from your action's return value):

| Outcome | Meaning |
|---------|---------|
| `success` | Action completed successfully |
| `failure` | Action reported a failure |
| `timeout` | Action timed out |
| `pending` | Action is still running (async/polling) |

**Execution-level outcomes** (from the runtime, before your logic runs):

| Outcome | Meaning |
|---------|---------|
| `target_not_found` | The action or plan doesn't exist |
| `target_disabled` | The action is disabled |
| `execution_failure` | Internal error during dispatch |

Execution-level outcomes **cascade through a fallback chain**: the engine tries `target_not_found` → `execution_failure` → `failure` in order, using the first transition that matches. Business outcomes match exactly — no fallback.

### Transitions

Transitions map outcomes to the next step or to a terminal:

```yaml
transitions:
  success: next_step          # go to named step
  failure: flo.Failed         # go to built-in terminal
  timeout: PaymentFailed      # go to custom terminal
```

### Terminal States

Terminals end the workflow run. Four are built-in:

| Terminal | Status | Description |
|----------|--------|-------------|
| `flo.Completed` | `completed` | Workflow succeeded |
| `flo.Failed` | `failed` | Workflow failed |
| `flo.Cancelled` | `cancelled` | Cancelled by user |
| `flo.TimedOut` | `timed_out` | Signal timeout |

You can define **custom terminals** that map to a base status:

```yaml
terminals:
  PaymentFailed:
    status: failed
  FraudDetected:
    status: failed
  OrderCompleted:
    status: completed
```

Custom terminals appear in history events, giving you finer-grained tracking than the four base statuses.

### Run Lifecycle

A workflow run passes through these states:

```
pending → running ⇄ waiting → completed
                            → failed
                            → cancelled
                            → timed_out
```

| Status | Description |
|--------|-------------|
| `pending` | Created but not yet started |
| `running` | Actively executing steps |
| `waiting` | Blocked on a signal, async action, or poll timer |
| `completed` | Reached a terminal with `completed` status |
| `failed` | Reached a terminal with `failed` status |
| `cancelled` | Cancelled by a user via `flo workflow cancel` |
| `timed_out` | Signal wait timed out with no timeout target |

---

## Retries

Any run step can have a `retry:` block:

```yaml
start:
  run: "@actions/flaky-service"
  retry:
    max_attempts: 5                   # total attempts including first
    backoff: exponential_jitter       # constant | linear | exponential | exponential_jitter
    initial_delay_ms: 500             # delay before first retry
    max_delay_ms: 30000               # cap on backoff delay
    within_ms: 120000                 # total time budget (optional)
  transitions:
    success: flo.Completed
    failure: flo.Failed
```

When the step outcome is `failure` or `execution_failure` and retries remain, the engine re-executes the same step immediately (the retry counter increments). Retries reset when the step transitions to a different step.

### Backoff Strategies

| Strategy | Delay formula |
|----------|--------------|
| `constant` | `initial_delay_ms` always |
| `linear` | `initial_delay_ms × (attempt + 1)` |
| `exponential` | `initial_delay_ms × 2^attempt`, capped at `max_delay_ms` |
| `exponential_jitter` | Exponential + up to 25% random jitter |

---

## Inline Plans

Plans let you define **multiple executors** for the same logical step — a failover chain with smart routing. Plans are defined inline in the workflow YAML under the `plans:` key.

```yaml
plans:
  payment:
    selection: health-weighted
    
    executors:
      - name: stripe-primary
        action: "@actions/charge-stripe"
        priority: 100
        retry:
          max_attempts: 3
          backoff: exponential
          initial_delay_ms: 1000
          max_delay_ms: 30000
        breaker:
          failure_threshold: 5
          cooldown_ms: 30000
          half_open_max_calls: 3
        rate_limit:
          max_per_second: 100
          max_per_minute: 5000
        tracking:
          mode: async
          timeout_ms: 300000

      - name: adyen-fallback
        action: "@actions/charge-adyen"
        priority: 50
        retry:
          max_attempts: 2
          backoff: exponential_jitter
          initial_delay_ms: 500
          max_delay_ms: 10000

    health:
      window_ms: 300000
      decay: 0.9
      min_samples: 10

    cache:
      ttl_ms: 3600000
      key: "charge:{input.customer_id}:{input.idempotency_key}"
      invalidate_on: ["payment.refunded", "customer.deleted"]

    fallback:
      value: '{"status": "declined", "reason": "all_providers_unavailable"}'
      condition: exhausted

    errors:
      retryable: ["timeout", "rate_limited", "temporary_failure"]
      fatal: ["invalid_card", "fraud_detected", "insufficient_funds"]
```

Reference the plan from a step:

```yaml
start:
  run: "@plan/payment"
  transitions:
    success: notify
    failure: flo.Failed
```

### Selection Strategies

| Strategy | Behavior |
|----------|----------|
| `static-order` | Always try executors in priority order (highest first) |
| `round-robin` | Rotate the starting executor across requests |
| `random` | Random selection for even load distribution |
| `health-weighted` | Prefer executors with higher health scores; requires `health:` config |

### Circuit Breakers

Each executor can have an independent circuit breaker:

```yaml
breaker:
  failure_threshold: 5       # consecutive failures before opening
  cooldown_ms: 30000         # how long to stay open before half-open
  half_open_max_calls: 3     # probe requests allowed in half-open state
```

States:
- **Closed** — Normal operation, requests flow through
- **Open** — Executor is skipped (after `failure_threshold` consecutive failures)
- **Half-open** — After `cooldown_ms`, allows `half_open_max_calls` probe requests. If probes succeed → closed. If probes fail → open again.

```
closed ──(N consecutive failures)──▸ open ──(cooldown expires)──▸ half_open
  ▲                                                                 │
  └──────────(probe succeeds)───────────────────────────────────────┘
  open ◂──────────(probe fails)─────────────────────────────────────┘
```

When a circuit breaker is **open**, the engine emits a `plan_breaker_skip` history event and moves to the next executor without attempting the action. This means a failing executor is taken out of rotation within seconds rather than consuming retries on every request.

### Rate Limiting

```yaml
rate_limit:
  max_per_second: 100
  max_per_minute: 5000
  max_per_hour: 50000       # all three are optional
```

### Async Tracking

Some executors (e.g., user-hosted HTTP actions) report their outcome asynchronously via webhook:

```yaml
tracking:
  mode: async               # sync (default) | async
  timeout_ms: 300000        # timeout for async outcome
```

When `mode: async`, the workflow parks in `waiting` until the action result arrives or the timeout expires.

### Health Tracking

When `selection: health-weighted`, the engine tracks per-executor success rates and uses them to prefer healthier executors:

```yaml
health:
  window_ms: 300000         # rolling window for health calculation
  decay: 0.9                # exponential decay factor (0–1]
  min_samples: 10           # minimum samples before health-weighted kicks in
```

Until `min_samples` is reached, the engine falls back to priority-based ordering.

**Health Score** (0.0–1.0) is computed as:

```
score = (api_success_rate × 0.7) + (business_success_rate × 0.3)
```

With circuit breaker penalties:
- **Open breaker** → score × 0.1
- **Half-open breaker** → score × 0.5

At each plan invocation, executors are sorted by descending health score and tried in that order. A healthy executor with no failures scores 1.0; an executor with an open breaker scores ≤ 0.1.

#### Runtime Behavior

Health state is **in-memory only** — it resets to defaults on server restart. This is intentional:

- **Fast convergence**: With a `failure_threshold` of 5, the engine rediscovers a broken executor within a handful of requests.
- **No stale data**: An executor that was down before restart may have recovered. Starting from a clean slate avoids unnecessary penalization.
- **Restart = recovery**: Every executor gets a fresh chance. This matches how circuit breaker libraries like Hystrix, resilience4j, and Polly behave.

Health metrics are tracked per executor and updated on every action completion (synchronous or async). The engine emits history events for observability:

| Event | Meaning |
|-------|---------|
| `plan_executor_start` | Beginning an attempt on this executor |
| `plan_executor_success` | Executor returned success |
| `plan_executor_retry` | Retrying the same executor |
| `plan_executor_exhausted` | Executor's retries exhausted, moving to next |
| `plan_breaker_skip` | Skipped executor because circuit breaker is open |

### Result Caching

```yaml
cache:
  ttl_ms: 3600000           # cache TTL
  key: "charge:{input.customer_id}:{input.idempotency_key}"
  invalidate_on:
    - payment.refunded
    - customer.deleted
```

### Fallback Values

When all executors fail, the plan can return a static fallback:

```yaml
fallback:
  value: '{"status": "declined", "reason": "all_providers_unavailable"}'
  condition: exhausted       # exhausted (all executors failed) | any_error
```

### Error Classification

Classify error codes to control retry behavior:

```yaml
errors:
  retryable:
    - timeout
    - rate_limited
    - temporary_failure
  fatal:
    - invalid_card
    - fraud_detected
```

Retryable errors trigger the executor's retry policy. Fatal errors skip retries and immediately try the next executor (or return failure).

---

## Signals

Signals are typed external events delivered to a running workflow. They're used for human-in-the-loop approvals, webhooks, callbacks, or any scenario where the workflow must wait for an asynchronous external event.

### Defining a Signal Wait

```yaml
steps:
  await_approval:
    waitForSignal:
      type: manager_approval           # signal type to match
      timeoutMs: 86400000              # 24 hour timeout
      onTimeout: OrderRejected         # step or terminal on timeout
    transitions:
      success: fulfill_order           # after signal received
```

### Sending a Signal

```bash
flo workflow signal <run-id> --type manager_approval '{"decision": "approved"}'
```

When the signal arrives:
1. It's stored in the run's signal history
2. If the run is `waiting` for this signal type, the engine resumes and follows the `success` transition
3. If the run is not waiting, the signal is stored for future matching

### Signal Timeout Behavior

If `timeoutMs` is set and the timeout expires:
- If `onTimeout` is set → transition to that step or terminal
- If `onTimeout` is not set → the run transitions to `timed_out` status

The engine periodically checks waiting runs for timeouts and resumes them automatically.

---

## Polling

When an action returns a `pending` outcome (e.g., a payment that's still processing), you can configure the step to poll with backoff until a terminal outcome arrives:

```yaml
steps:
  check_status:
    run: "@actions/check-payment-status"
    poll:
      initialDelayMs: 2000            # wait before first poll
      maxAttempts: 30                  # max poll attempts
      backoff: exponential             # constant | linear | exponential | exponential_jitter
      baseDelayMs: 2000               # base delay between polls
      maxDelayMs: 30000               # cap on poll delay
    transitions:
      success: notify
      failure: payment_failed
      timeout: payment_timeout         # max attempts exceeded
```

Each poll re-executes the action. If the outcome is still `pending`, the engine parks the run and schedules the next poll. If the outcome becomes `success` or `failure`, the engine follows the corresponding transition.

---

## JSONPath Data Flow

Steps can transform their input using JSONPath expressions. This lets you wire data from the workflow input or from previous step outputs into the current step's input.

### Input Mapping

```yaml
steps:
  enrich:
    run: "@actions/enrich-customer"
    inputMapping: '{"customer_id": "$.input.customer_id", "domain": "$.input.company_domain"}'
    transitions:
      success: charge
      failure: flo.Failed

  charge:
    run: "@actions/charge-payment"
    inputMapping: '{"email": "$.steps.enrich.output.email", "amount": "$.input.amount"}'
    transitions:
      success: flo.Completed
      failure: flo.Failed
```

### Available Paths

| Path Pattern | Resolves To |
|-------------|-------------|
| `$.input` | The workflow run's input JSON |
| `$.input.field.subfield` | A nested field from the input |
| `$.steps.{name}.output` | The full output of a previously completed step |
| `$.steps.{name}.output.field` | A nested field from a step's output |
| `$.steps.{name}.outcome` | The outcome string of a step (`success`, `failure`, etc.) |
| `$.flo.run_id` | The current workflow run ID |
| `$.flo.timestamp` | Current epoch timestamp in milliseconds |

String values in the input mapping that start with `$.` are treated as path references and resolved at runtime. Non-path values are passed through as-is.

---

## Idempotency

Workflows support idempotency keys to prevent duplicate processing:

```yaml
kind: Workflow
name: process-order
version: "1.0.0"
idempotency: required            # none | optional | required
```

| Mode | Behavior |
|------|----------|
| `none` | No idempotency checking (default) |
| `optional` | Idempotency key accepted but not required |
| `required` | Every `workflow start` must include an idempotency key |

When an idempotency key is provided and a run with the same key already exists for this workflow, the existing run ID is returned instead of creating a new run.

```bash
flo workflow start process-order '{"order_id":"ORD-123"}' --idempotency-key order-123
# → wfrun-1

flo workflow start process-order '{"order_id":"ORD-123"}' --idempotency-key order-123
# → wfrun-1  (same run, no duplicate)
```

---

## Scheduling

Workflows can run on a recurring schedule using cron expressions or fixed intervals:

### Cron Schedule

```yaml
kind: Workflow
name: reconcile-accounts
version: "1.0.0"

schedule:
  cron: "0 */6 * * *"             # every 6 hours
  max_concurrent: 1               # at most 1 run at a time
  input: '{"mode": "full"}'       # input for scheduled runs

start:
  run: "@actions/reconcile"
  transitions:
    success: generate_report
    failure: flo.Failed

steps:
  generate_report:
    run: "@actions/reconcile-report"
    transitions:
      success: flo.Completed
      failure: flo.Failed
```

### Interval Schedule

```yaml
schedule:
  interval: 30000                  # every 30 seconds
  max_concurrent: 1
  input: '{"mode": "incremental"}'
```

### Cron Expression Syntax

Standard 5-field cron: `minute hour day-of-month month day-of-week`

| Field | Range | Special Characters |
|-------|-------|-------------------|
| Minute | 0–59 | `*` `,` `-` `/` |
| Hour | 0–23 | `*` `,` `-` `/` |
| Day of month | 1–31 | `*` `,` `-` `/` |
| Month | 1–12 | `*` `,` `-` `/` |
| Day of week | 0–7 (0 and 7 = Sunday) | `*` `,` `-` `/` |

Examples:

| Expression | Meaning |
|------------|---------|
| `*/5 * * * *` | Every 5 minutes |
| `0 */6 * * *` | Every 6 hours |
| `0 9 * * 1-5` | 9 AM weekdays |
| `0 0 1 * *` | Midnight on the 1st of each month |
| `30 2 * * 0` | 2:30 AM every Sunday |

### Schedule Options

| Field | Default | Description |
|-------|---------|-------------|
| `cron` | — | Cron expression (mutually exclusive with `interval`) |
| `interval` | — | Interval in milliseconds (mutually exclusive with `cron`) |
| `max_concurrent` | `1` | Maximum concurrent runs from this schedule |
| `input` | `"{}"` | Input JSON override for scheduled runs |
| `paused` | `false` | Whether the schedule starts paused |

Disabling a workflow (`flo workflow disable`) pauses the schedule. Re-enabling resumes it.

---

## Stream Triggers

Stream triggers start a workflow run for each event on a Flo stream. This turns a workflow into an event-driven processor.

```yaml
kind: Workflow
name: order-processor
version: "1.0.0"

trigger:
  stream: orders                     # source stream name
  namespace: prod                    # source namespace (optional)
  consumer_group: wf-orders          # consumer group (optional, auto-generated)
  mode: shared                       # shared | exclusive | key_shared
  batch_size: 1                      # events per run (1 = single, >1 = array)

start:
  run: "@actions/process-order"
  transitions:
    success: flo.Completed
    failure: flo.Failed
```

The event payload becomes `$.input` inside the workflow and is accessible via JSONPath.

| Field | Default | Description |
|-------|---------|-------------|
| `stream` | — | Source stream name (required) |
| `namespace` | workflow's namespace | Source stream namespace |
| `consumer_group` | `wf-{workflow_name}` | Consumer group name |
| `mode` | `shared` | `shared` (competing consumers), `exclusive` (single consumer), `key_shared` (partition-key affinity) |
| `batch_size` | `1` | Events per workflow run |

---

## Search Attributes

Search attributes let you extract queryable fields from workflow input for filtering and discovery:

```yaml
searchAttributes:
  - name: customer_id
    type: string
    from: input.customer_id
  - name: order_amount
    type: number
    from: input.amount
  - name: created_at
    type: timestamp
    from: input.timestamp
```

| Type | Description |
|------|-------------|
| `string` | Text value |
| `number` | Numeric value |
| `timestamp` | Epoch timestamp |

---

## Child Workflows

A step can start a child workflow using the `@workflow/` prefix:

```yaml
start:
  run: "@workflow/payment-flow"
  transitions:
    success: flo.Completed
    failure: flo.Failed
```

The parent workflow waits for the child to reach a terminal state, then follows the corresponding transition. The child's completion maps to `success`; the child's failure maps to `failure`.

You can also specify a version:

```yaml
start:
  run: "@workflow/payment-flow:2.0.0"
  transitions:
    success: flo.Completed
    failure: flo.Failed
```

---

## Disable / Enable

Workflows can be disabled at runtime to prevent new runs from starting:

```bash
flo workflow disable reconcile-accounts
```

When disabled:
- The cron schedule is paused
- Manual starts via `flo workflow start` are blocked
- **Existing running instances are not affected**

To re-enable:

```bash
flo workflow enable reconcile-accounts
```

---

## Validation

Workflow definitions are validated on create. The validator checks:

| Category | Checks |
|----------|--------|
| **Structure** | `kind`, `name`, `version`, and `start` are present |
| **References** | All `@actions/*`, `@plan/*`, and `@workflow/*` targets are well-formed |
| **Transitions** | Every transition target is a valid step name, custom terminal, or built-in terminal |
| **Reachability** | All steps are reachable from `start` (warnings for unreachable steps) |
| **Duplicates** | No duplicate step names, terminal names, or executor names within a plan |
| **Plans** | Each plan has at least one executor; executor configs are valid |
| **Health** | Decay in (0, 1], min\_samples > 0, window\_ms > 0 |
| **Signals** | `waitForSignal` steps warn if no timeout is configured |

Validation errors are reported with error codes (E1xx–E5xx) and human-readable messages.

---

## Execution Model

### How Steps Execute

1. The engine starts at the `start` step
2. For `run` steps:
   - If `inputMapping` is set, resolve JSONPath references against `$.input` and `$.steps.*`
   - Invoke the target (action, plan, or child workflow)
   - WASM actions complete synchronously; user-hosted actions may complete asynchronously
   - If the action returns `pending` and `poll:` is configured, schedule the next poll
   - On outcome, check retries (if `failure` and retries remain, re-execute)
   - Follow the matching transition to the next step or terminal
3. For `waitForSignal` steps:
   - Check if a matching signal was already received before parking
   - If yes, follow the `success` transition immediately
   - If no, set status to `waiting` and record the timeout deadline
4. Repeat until a terminal state is reached or `MAX_ADVANCE_STEPS` (256) is hit

### Async Action Handling

When a user-hosted action doesn't complete immediately, the workflow parks:

1. Run status → `waiting`
2. The action run ID and step name are stored
3. The engine periodically checks (`checkPendingActions`) for completed action results
4. When the action completes, the engine resumes the workflow from that step and continues advancing

### History Events

Every significant state change is recorded as a history event:

| Event Type | Detail |
|------------|--------|
| `workflow_started` | Input JSON |
| `step_started` | Step name |
| `step_completed` | Step name |
| `step_retry` | Step name |
| `waiting_for_signal` | Signal type |
| `signal_received` | Signal type |
| `signal_matched` | Signal type |
| `signal_timeout` | Timeout target |
| `action_not_found` | Action name |
| `action_disabled` | Action name |
| `awaiting_action` | Action name |
| `action_completed` | Outcome |
| `workflow_completed` | Terminal name |
| `workflow_failed` | Terminal name |
| `workflow_cancelled` | Reason |
| `workflow_timed_out` | Detail |

### Persistence

Workflow definitions and run state are persisted to the Unified Append Log (UAL). On node restart, the engine replays persisted entries to rebuild in-memory state:

- `workflow_create` entries restore the definition registry
- `workflow_start` entries restore the run registry

This ensures workflows survive node restarts without external databases.

---

## Complete Example: Payment Processing

This example demonstrates inline plans, health-weighted routing, circuit breakers, polling, and caching:

```yaml
kind: Workflow
name: payment-processing
version: "1.0.0"
idempotency: required

plans:
  charge-payment:
    selection: health-weighted
    executors:
      - name: stripe-primary
        action: "@actions/charge-stripe"
        priority: 100
        retry:
          max_attempts: 3
          backoff: exponential
          initial_delay_ms: 1000
          max_delay_ms: 30000
          within_ms: 120000
        breaker:
          failure_threshold: 5
          cooldown_ms: 30000
          half_open_max_calls: 3
        rate_limit:
          max_per_second: 100
        tracking:
          mode: async
          timeout_ms: 300000
      - name: adyen-fallback
        action: "@actions/charge-adyen"
        priority: 50
        retry:
          max_attempts: 2
          backoff: exponential_jitter
    health:
      window_ms: 300000
      decay: 0.9
      min_samples: 10
    cache:
      ttl_ms: 3600000
      key: "charge:{input.customer_id}:{input.idempotency_key}"
      invalidate_on: ["payment.refunded"]
    fallback:
      value: '{"status": "declined", "reason": "all_providers_unavailable"}'
      condition: exhausted
    errors:
      retryable: ["timeout", "rate_limited"]
      fatal: ["invalid_card", "fraud_detected"]

start:
  run: "@plan/charge-payment"
  inputMapping: '{"customer_id": "$.input.customer_id", "amount": "$.input.amount"}'
  transitions:
    success: notify_customer
    pending: check_payment_status
    failure: flo.Failed

steps:
  check_payment_status:
    run: "@actions/check-payment-status"
    inputMapping: '{"payment_id": "$.steps._start.output.payment_id"}'
    poll:
      initialDelayMs: 2000
      maxAttempts: 30
      backoff: exponential
      baseDelayMs: 2000
      maxDelayMs: 30000
    transitions:
      success: notify_customer
      failure: flo.Failed

  notify_customer:
    run: "@actions/send-notification"
    inputMapping: '{"customer_id": "$.input.customer_id", "template": "payment_success"}'
    transitions:
      success: flo.Completed
      failure: flo.Completed       # notification failure doesn't fail the workflow
```

---

## Complete Example: Order Processing with Signals

```yaml
kind: Workflow
name: order-processing
version: "1.0.0"
idempotency: required

terminals:
  OrderCompleted:
    status: completed
  OrderRejected:
    status: failed
  PaymentFailed:
    status: failed

start:
  run: "@actions/validate-order"
  transitions:
    success: process_payment
    failure: flo.Failed

steps:
  process_payment:
    run: "@actions/charge-payment"
    retry:
      max_attempts: 3
      backoff: exponential
      initial_delay_ms: 1000
    transitions:
      success: check_approval
      failure: PaymentFailed

  check_approval:
    run: "@actions/check-approval-needed"
    transitions:
      success: fulfill              # no approval needed
      failure: await_approval       # high-value order, needs approval

  await_approval:
    waitForSignal:
      type: approval
      timeoutMs: 3600000            # 1 hour
      onTimeout: OrderRejected
    transitions:
      success: fulfill

  fulfill:
    run: "@actions/ship-order"
    transitions:
      success: OrderCompleted
      failure: flo.Failed
```

Trigger the approval:

```bash
flo workflow signal wfrun-42 --type approval '{"decision": "approved", "approver": "manager@co.com"}'
```

---

## Related Docs

- [Actions](/orchestration/actions/) — Actions are the building blocks that workflows compose
- [Stream Processing](/orchestration/processing/) — For continuous, stateless data pipelines (filter/map/aggregate)
- [Streams](/primitives/streams/) — Source data for stream triggers
- [KV Store](/primitives/kv/) — Used by actions for state lookups

---

# Architecture

Threading, storage, and internal runtime design.

---

## Architecture Overview

Source path: src/content/docs/architecture/overview.md
Canonical URL: https://docs.floruntime.io/architecture/overview/

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

---

## Storage Internals

Source path: src/content/docs/architecture/storage.md
Canonical URL: https://docs.floruntime.io/architecture/storage/

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

---

# Deployment

Docker and clustering guidance for running Flo.

---

## Clustering

Source path: src/content/docs/deployment/clustering.md
Canonical URL: https://docs.floruntime.io/deployment/clustering/

## Overview

Flo clusters consist of multiple nodes that coordinate via:

- **SWIM gossip** — failure detection, membership protocol, metadata dissemination
- **Raft consensus** — per-partition replication with leader election
- **Controller Raft** — runs on Shard 0, manages the global partition table
- **Partition Table** — maps each partition to its owning node(s)

## Cluster Formation

### Seed Nodes

Each node needs at least one seed address to join the cluster:

```toml title="flo.toml"
[cluster]
seeds = ["10.0.1.10:9000", "10.0.1.11:9000", "10.0.1.12:9000"]
node_id = 1
```

Or via environment variables:

```bash
FLO_CLUSTER_SEEDS=10.0.1.10:9000,10.0.1.11:9000
FLO_NODE_ID=1
```

### Bootstrap

The first node in a cluster bootstraps automatically when no seeds respond. Subsequent nodes join by contacting any existing member.

```bash
# First node (bootstraps)
flo server start --node-id 1 --port 9000

# Second node (joins via seed)
flo server start --node-id 2 --port 9000 --seeds 10.0.1.10:9000

# Third node
flo server start --node-id 3 --port 9000 --seeds 10.0.1.10:9000,10.0.1.11:9000
```

## Partitioning

Data is distributed across nodes using hash-based partitioning:

```
hash(key) → partition_id (0..N)
partition_table[partition_id] → (leader_node, replica_nodes)
```

The default partition count is 64. Each partition is a Raft group with a configurable replication factor (default: 3).

### Partition Assignment

The Controller Raft on Shard 0 manages partition assignments:

| Event | Action |
|-------|--------|
| Node joins | Rebalance partitions to include new node |
| Node leaves (graceful) | Migrate partitions before shutdown |
| Node fails (detected by SWIM) | Raft elects new leader from remaining replicas |
| Manual rebalance | Trigger via REST API or CLI |

## Replication

Each partition is a Raft group. The leader handles all writes; followers replicate:

```
Client → Leader Node → Raft propose
  → Replicate to quorum (N/2+1 nodes)
  → Commit → Apply to UAL → Update Projections
  → Respond to client
```

### Replication Factor

```toml
[cluster]
replication_factor = 3  # 1 leader + 2 followers per partition
```

With `replication_factor = 3`, the cluster tolerates 1 node failure per partition without data loss. With `replication_factor = 5`, it tolerates 2.

## Failure Handling

### SWIM Protocol

SWIM (Scalable Weakly-consistent Infection-style Membership) detects failures in O(log N) time:

1. Each node periodically **pings** a random peer
2. If no response, requests **indirect pings** through other members
3. If still no response, marks the node as **suspect**
4. After a configurable timeout, marks as **failed**

Parameters:

| Setting | Default | Description |
|---------|---------|-------------|
| `gossip.interval_ms` | 1000 | Ping interval |
| `gossip.suspect_timeout_ms` | 5000 | Time before suspect → failed |
| `gossip.indirect_checks` | 3 | Number of indirect ping relays |

### Leader Election

When a Raft leader fails:

1. SWIM detects the failure
2. Followers notice missing heartbeats
3. A follower with the most up-to-date log starts a pre-vote
4. If pre-vote succeeds, starts an election
5. New leader elected and begins accepting writes

Typical failover time: **2-5 seconds** (SWIM detection + Raft election).

## Monitoring

### Cluster Status

```bash
flo cluster status
```

### Prometheus Metrics

Key cluster metrics on port 9001:

| Metric | Description |
|--------|-------------|
| `flo_cluster_nodes` | Number of nodes in the cluster |
| `flo_cluster_partitions` | Total partition count |
| `flo_raft_leader_elections_total` | Leader election count |
| `flo_raft_replication_lag` | Replication lag in entries |
| `flo_gossip_members` | Active SWIM members |

## Recommended Topologies

### Development

1 node, shard_count = 1, no replication.

### Small Production

3 nodes, replication_factor = 3. Tolerates 1 node failure.

### Large Production

5+ nodes, replication_factor = 3, 128+ partitions. Allows rolling upgrades with maintained quorum.

```toml
[cluster]
seeds = ["10.0.1.10:9000", "10.0.1.11:9000", "10.0.1.12:9000"]
replication_factor = 3
partition_count = 128

[node]
shard_count = 8  # Match CPU core count
```

---

## Docker Deployment

Source path: src/content/docs/deployment/docker.md
Canonical URL: https://docs.floruntime.io/deployment/docker/

## Docker Image

```bash
docker pull ghcr.io/floruntime/flo:latest
```

## Quick Start

```bash
docker run -d \
  --name flo \
  -p 9000:9000 \
  -p 9001:9001 \
  -p 9002:9002 \
  -v flo-data:/data \
  ghcr.io/floruntime/flo:latest
```

| Port | Purpose |
|------|---------|
| 9000 | Binary wire protocol (client traffic) |
| 9001 | Prometheus metrics |
| 9002 | Dashboard REST API |

## Docker Compose — Single Node

```yaml
version: "3.8"
services:
  flo:
    image: ghcr.io/floruntime/flo:latest
    ports:
      - "9000:9000"
      - "9001:9001"
      - "9002:9002"
    volumes:
      - flo-data:/data
    environment:
      - FLO_DATA_DIR=/data
      - FLO_PORT=9000
    restart: unless-stopped

volumes:
  flo-data:
```

## Docker Compose — 3-Node Cluster

```yaml
version: "3.8"
services:
  flo-1:
    image: ghcr.io/floruntime/flo:latest
    hostname: flo-1
    ports:
      - "9000:9000"
      - "9001:9001"
      - "9002:9002"
    environment:
      - FLO_DATA_DIR=/data
      - FLO_PORT=9000
      - FLO_CLUSTER_SEEDS=flo-2:9000,flo-3:9000
      - FLO_NODE_ID=1
    volumes:
      - flo-1-data:/data

  flo-2:
    image: ghcr.io/floruntime/flo:latest
    hostname: flo-2
    ports:
      - "9010:9000"
      - "9011:9001"
      - "9012:9002"
    environment:
      - FLO_DATA_DIR=/data
      - FLO_PORT=9000
      - FLO_CLUSTER_SEEDS=flo-1:9000,flo-3:9000
      - FLO_NODE_ID=2
    volumes:
      - flo-2-data:/data

  flo-3:
    image: ghcr.io/floruntime/flo:latest
    hostname: flo-3
    ports:
      - "9020:9000"
      - "9021:9001"
      - "9022:9002"
    environment:
      - FLO_DATA_DIR=/data
      - FLO_PORT=9000
      - FLO_CLUSTER_SEEDS=flo-1:9000,flo-2:9000
      - FLO_NODE_ID=3
    volumes:
      - flo-3-data:/data

volumes:
  flo-1-data:
  flo-2-data:
  flo-3-data:
```

## Environment Variables

All `flo.toml` settings can be overridden with `FLO_` prefixed environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `FLO_DATA_DIR` | `./data` | Data directory path |
| `FLO_PORT` | `9000` | Client protocol port |
| `FLO_METRICS_PORT` | `9001` | Prometheus metrics port |
| `FLO_DASHBOARD_PORT` | `9002` | Dashboard REST API port |
| `FLO_SHARD_COUNT` | CPU count | Number of shard threads |
| `FLO_NODE_ID` | auto | Unique node identifier |
| `FLO_CLUSTER_SEEDS` | — | Comma-separated seed node addresses |
| `FLO_LOG_LEVEL` | `info` | Logging level (debug, info, warn, err) |

## Health Check

```yaml
healthcheck:
  test: ["CMD", "flo", "server", "status"]
  interval: 10s
  timeout: 5s
  retries: 3
```

## Volumes and Data Persistence

Always mount a volume at `/data` to persist data across container restarts:

```bash
docker volume create flo-data
docker run -v flo-data:/data ghcr.io/floruntime/flo:latest
```

The data directory structure:

```
/data/
├── {shard_id}/
│   ├── uat/{partition_id}/      # UAL segments
│   ├── snapshots/{partition_id}/ # Projection snapshots
│   └── ts/{partition_id}/       # Time-series columnar files
└── flo.toml                     # Config (if not using env vars)
```

## Building the Image

```bash
cd flo
docker build -t flo:custom .
```

---

# Reference

CLI, REST, Redis compatibility, and wire protocol details.

---

## CLI Reference

Source path: src/content/docs/reference/cli.md
Canonical URL: https://docs.floruntime.io/reference/cli/

## Global Options

| Flag | Description |
|------|-------------|
| `--host <addr>` | Server address (default: `localhost:9000`) |
| `--namespace <name>` | Namespace for operations (default: `default`) |
| `--timeout <ms>` | Operation timeout in milliseconds |
| `--format <fmt>` | Output format: `text`, `json` |
| `--debug` | Enable debug output |

## Server

### `flo server start`

Start a Flo server.

```bash
flo server start [options]
```

| Flag | Description | Default |
|------|-------------|---------|
| `-c, --config <path>` | Config file path | `flo.toml` |
| `--port <port>` | Client protocol port | `9000` |
| `--data-dir <path>` | Data directory | `./data` |
| `--shard-count <n>` | Number of shard threads | CPU count |
| `--node-id <id>` | Unique node identifier | auto |
| `--seeds <addrs>` | Cluster seed addresses | — |

### `flo server status`

Show server status and health.

```bash
flo server status
```

## KV

### `flo kv set`

Set a key-value pair.

```bash
flo kv set <key> <value> [options]
```

| Flag | Description |
|------|-------------|
| `--ttl <seconds>` | Time-to-live |
| `--if-not-exists` | Only set if key doesn't exist |
| `--cas <version>` | Compare-and-swap version |

### `flo kv get`

Get a value by key.

```bash
flo kv get <key> [options]
```

| Flag | Description |
|------|-------------|
| `--block <ms>` | Block until key appears |

### `flo kv mget`

Get many keys in a single round trip. Keys may live on different shards — the server gathers results in parallel.

```bash
flo kv mget <key1> <key2> ... [options]
```

| Flag | Description |
|------|-------------|
| `--namespace <ns>` | Override default namespace |
| `--output <fmt>` | `text` (default), `json`, or `table` |

Maximum 256 keys per call. Missing keys are returned as `nil` entries (not errors).

### `flo kv delete`

Delete a key.

```bash
flo kv delete <key> [options]
```

| Flag | Description |
|------|-------------|
| `--cas <version>` | Only delete if the current version matches (race-free lock release) |
| `-r, --routing-key <key>` | Explicit shard routing key |
| `-t, --txn <id>` | Buffer inside a transaction |

### `flo kv list`

List keys by prefix.

```bash
flo kv list [prefix] [options]
```

| Flag | Description |
|------|-------------|
| `--limit <n>` | Maximum number of keys |
| `--keys-only` | Only return keys, not values |

### `flo kv history`

Show version history for a key.

```bash
flo kv history <key> [options]
```

| Flag | Description |
|------|-------------|
| `--limit <n>` | Maximum versions to return |

### `flo kv incr`

Atomically increment an `i64` counter.

```bash
flo kv incr <key> [--by <delta>]
```

| Flag | Description |
|------|-------------|
| `-b, --by <n>` | Signed delta (default `+1`) |

### `flo kv touch` / `flo kv persist`

Adjust the TTL on an existing key without rewriting the value.

```bash
flo kv touch <key> --ttl <seconds>   # update TTL (0 clears it)
flo kv persist <key>                  # clear TTL
```

| Flag | Description |
|------|-------------|
| `--cas <version>` | Only update if the current version matches (race-free lease renewal) |
| `-r, --routing-key <key>` | Explicit shard routing key |
| `-t, --txn <id>` | Buffer inside a transaction |

### `flo kv exists`

Existence check (no value transferred). Exits `0` when present, `1` when absent.

```bash
flo kv exists <key>
```

### `flo kv jget` / `jset` / `jdel`

JSON sub-field operations using a small JSONPath subset (`$`, `.field`, `[index]`).

```bash
flo kv jset <key> <path> <json>
flo kv jget <key> [path]
flo kv jdel <key> [path]
```

`jget` prints both the value and the document's current `version`; `jset` / `jdel` print the new version after the write.

### `flo kv begin` / `commit` / `rollback`

Per-shard transactions buffer multiple writes on a single pinned partition and commit them atomically as one Raft entry.

```bash
flo kv begin <routing-key>             # → prints txn_id and pinned_hash
flo kv commit <txn-id>                 # → prints commit_index and op_count
flo kv rollback <txn-id>               # discard buffered ops
```

Add `--txn <id>` to any of `set`, `get`, `delete`, `incr`, `touch`, `persist`, `exists` to run that operation inside the transaction:

```bash
TXN=$(flo kv begin user:42 --format json | jq -r .txn_id)
flo kv set  user:42:name "Jane" --txn "$TXN"
flo kv incr user:42:visits      --txn "$TXN"
flo kv commit "$TXN"
```

Every key inside a transaction must hash to the same partition as the routing key, otherwise the server returns `kv_txn_cross_shard`. `scan`, `mget`, `jget`, `jset`, `jdel`, and `history` are not supported inside transactions.

**Server caps**: 256 ops per transaction, 1 MiB total payload, 1024 open transactions per server. Transactions survive across stateless connections — they are owned by `txn_id`, not by the TCP connection.

## Streams

### `flo stream create`

Create a stream.

```bash
flo stream create <name> [options]
```

| Flag | Description |
|------|-------------|
| `--retention <duration>` | Retention period (e.g., `7d`, `24h`) |
| `--max-size <bytes>` | Maximum stream size |

### `flo stream append`

Append a record to a stream.

```bash
flo stream append <stream> <data>
```

### `flo stream read`

Read records from a stream.

```bash
flo stream read <stream> [options]
```

| Flag | Description |
|------|-------------|
| `--offset <n>` | Start offset |
| `--count <n>` | Number of records |
| `--follow` | Follow mode (block for new records) |

### `flo stream info`

Show stream metadata.

```bash
flo stream info <stream>
```

### `flo stream group`

Manage consumer groups.

```bash
flo stream group create <stream> <group>
flo stream group read <stream> <group> <consumer> [--count <n>]
flo stream group ack <stream> <group> <offsets...>
flo stream group status <stream> <group>
```

## Queues

### `flo queue enqueue`

Add a message to a queue.

```bash
flo queue enqueue <queue> <data> [options]
```

| Flag | Description |
|------|-------------|
| `--priority <n>` | Message priority (higher = sooner) |
| `--delay <ms>` | Delivery delay in milliseconds |
| `--dedup-key <key>` | Deduplication key |

### `flo queue dequeue`

Dequeue messages.

```bash
flo queue dequeue <queue> [options]
```

| Flag | Description |
|------|-------------|
| `--count <n>` | Number of messages (default: 1) |
| `--block <ms>` | Block until messages available |
| `--visibility <ms>` | Visibility timeout for leased messages |

### `flo queue ack`

Acknowledge processed messages.

```bash
flo queue ack <queue> <sequence...>
```

### `flo queue nack`

Negative acknowledge (requeue or send to DLQ).

```bash
flo queue nack <queue> <sequence...> [options]
```

| Flag | Description |
|------|-------------|
| `--dlq` | Send to dead-letter queue |

### `flo queue peek`

Peek at messages without leasing.

```bash
flo queue peek <queue> [--count <n>]
```

### `flo queue dlq`

Manage dead-letter queue.

```bash
flo queue dlq list <queue> [--count <n>]
flo queue dlq requeue <queue> <sequence...>
flo queue dlq purge <queue>
```

## Time-Series

### `flo ts write`

Write a data point using InfluxDB line protocol.

```bash
flo ts write <measurement> <tags> <fields>
```

Examples:

```bash
flo ts write cpu host=web-01 usage=82.5
flo ts write temperature region=us-east,sensor=a1 value=23.4
```

### `flo ts query`

Run a FloQL query.

```bash
flo ts query "<query>"
```

Examples:

```bash
flo ts query "cpu{host=web-01}[1h] | avg(5m)"
flo ts query "temperature{region=us-east}[24h] | max(1h)"
```

## Actions

### `flo action register`

Register an action type.

```bash
flo action register <name> [options]
```

| Flag | Description |
|------|-------------|
| `--timeout <ms>` | Execution timeout |
| `--max-retries <n>` | Maximum retry count |

### `flo action invoke`

Invoke an action.

```bash
flo action invoke <name> [data] [options]
```

| Flag | Description |
|------|-------------|
| `--idempotency-key <key>` | Dedup key for at-most-once |
| `--priority <n>` | Execution priority |
| `--wait` | Wait for completion |

### `flo action status`

Check action execution status.

```bash
flo action status <run-id>
```

## Workflows

### `flo workflow create`

Create a workflow from a YAML definition.

```bash
flo workflow create -f <file.yaml>
```

### `flo workflow start`

Start a workflow execution.

```bash
flo workflow start <name> [data]
```

### `flo workflow status`

Check workflow execution status.

```bash
flo workflow status <execution-id>
```

### `flo workflow signal`

Send a signal to a running workflow.

```bash
flo workflow signal <execution-id> <signal-name> [data]
```

## Processing

### `flo processing submit`

Submit a stream processing job.

```bash
flo processing submit -f <job.yaml>
```

### `flo processing status`

Check job status.

```bash
flo processing status <job-id>
```

### `flo processing stop`

Stop a running job.

```bash
flo processing stop <job-id>
```

## Cluster

### `flo cluster status`

Show cluster membership and partition distribution.

```bash
flo cluster status
```

### `flo cluster rebalance`

Trigger partition rebalancing.

```bash
flo cluster rebalance
```

---

## Redis Compatibility

Source path: src/content/docs/reference/redis.md
Canonical URL: https://docs.floruntime.io/reference/redis/

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

---

## REST API

Source path: src/content/docs/reference/rest-api.md
Canonical URL: https://docs.floruntime.io/reference/rest-api/

The Dashboard REST API runs on port **9002** (configurable via `dashboard_port` in `flo.toml`). It powers the web dashboard and can be used directly for monitoring, management, and ad-hoc operations.

## Base URL

```
http://localhost:9002/api/v1
```

## Authentication

When authentication is enabled, include a Bearer token:

```
Authorization: Bearer <token>
```

## Endpoints

### Server

#### `GET /api/v1/status`

Server health and version info.

```json
{
  "status": "healthy",
  "version": "0.12.0",
  "uptime_seconds": 3600,
  "shard_count": 8,
  "node_id": 1
}
```

#### `GET /api/v1/metrics`

Aggregated metrics (JSON format — Prometheus metrics are on port 9001).

```json
{
  "ops_total": 1234567,
  "ops_per_second": 45000,
  "connections_active": 12,
  "memory_used_bytes": 1073741824,
  "shards": [
    {
      "id": 0,
      "partitions": 8,
      "connections": 3,
      "ops_per_second": 5600
    }
  ]
}
```

### KV

#### `GET /api/v1/kv/:namespace/:key`

Get a value.

**Response** `200 OK`:

```json
{
  "key": "user:123",
  "value": "base64-encoded-data",
  "version": 5,
  "ttl_remaining": 3500
}
```

**Response** `404 Not Found`:

```json
{ "error": "not_found", "key": "user:123" }
```

#### `PUT /api/v1/kv/:namespace/:key`

Set a value.

**Request body**:

```json
{
  "value": "base64-encoded-data",
  "ttl_seconds": 3600,
  "if_not_exists": false,
  "cas_version": 4
}
```

**Response** `200 OK`:

```json
{ "key": "user:123", "version": 5 }
```

**Response** `409 Conflict` (CAS mismatch):

```json
{ "error": "conflict", "current_version": 6 }
```

#### `DELETE /api/v1/kv/:namespace/:key`

Delete a key.

#### `GET /api/v1/kv/:namespace?prefix=<prefix>&limit=<n>`

Scan keys by prefix.

### Queues

#### `POST /api/v1/queue/:namespace/:queue/enqueue`

Enqueue a message.

```json
{
  "payload": "base64-encoded-data",
  "priority": 10,
  "delay_ms": 0,
  "dedup_key": "optional-key"
}
```

#### `POST /api/v1/queue/:namespace/:queue/dequeue`

Dequeue messages.

```json
{ "count": 10, "visibility_timeout_ms": 60000 }
```

#### `POST /api/v1/queue/:namespace/:queue/ack`

Acknowledge messages.

```json
{ "sequences": [1, 2, 3] }
```

#### `GET /api/v1/queue/:namespace/:queue/stats`

Queue statistics.

```json
{
  "name": "tasks",
  "ready_count": 150,
  "leased_count": 12,
  "dlq_count": 3,
  "total_enqueued": 50000,
  "total_acked": 49835
}
```

### Streams

#### `POST /api/v1/stream/:namespace/:stream/append`

Append a record.

```json
{ "payload": "base64-encoded-data" }
```

#### `GET /api/v1/stream/:namespace/:stream?offset=<n>&count=<n>`

Read records from a stream.

#### `GET /api/v1/stream/:namespace/:stream/info`

Stream metadata.

```json
{
  "name": "events",
  "first_offset": 0,
  "last_offset": 99999,
  "record_count": 100000,
  "consumer_groups": ["processors", "analytics"]
}
```

### Time-Series

#### `POST /api/v1/ts/:namespace/write`

Write points (InfluxDB line protocol in body).

```
cpu,host=web-01 usage=82.5
memory,host=web-01 used=4096,total=8192
```

#### `POST /api/v1/ts/:namespace/query`

Execute a FloQL query.

```json
{ "query": "cpu{host=web-01}[1h] | avg(5m)" }
```

### Cluster

#### `GET /api/v1/cluster/status`

Cluster membership and health.

```json
{
  "nodes": [
    { "id": 1, "address": "10.0.1.10:9000", "status": "alive", "shards": 8 },
    { "id": 2, "address": "10.0.1.11:9000", "status": "alive", "shards": 8 },
    { "id": 3, "address": "10.0.1.12:9000", "status": "suspect", "shards": 8 }
  ],
  "partition_count": 64,
  "replication_factor": 3
}
```

#### `GET /api/v1/cluster/partitions`

Partition table — which node owns which partitions.

### Namespaces

#### `GET /api/v1/namespaces`

List all namespaces.

#### `POST /api/v1/namespaces`

Create a namespace.

```json
{ "name": "myapp" }
```

## Error Format

All errors follow a consistent format:

```json
{
  "error": "error_code",
  "message": "Human-readable description",
  "details": {}
}
```

| HTTP Status | Error Code | Meaning |
|-------------|-----------|---------|
| 400 | `bad_request` | Invalid request parameters |
| 401 | `unauthorized` | Missing or invalid auth token |
| 404 | `not_found` | Resource not found |
| 409 | `conflict` | CAS version conflict |
| 429 | `overloaded` | Server at capacity, retry later |
| 500 | `internal` | Server error |
| 503 | `unavailable` | Node not ready or shutting down |

---

## Wire Protocol

Source path: src/content/docs/reference/wire-protocol.md
Canonical URL: https://docs.floruntime.io/reference/wire-protocol/

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

---

# SDKs

Client library guidance for Go, JavaScript, Python, and Zig.

---

## Go SDK

Source path: src/content/docs/sdks/go.md
Canonical URL: https://docs.floruntime.io/sdks/go/

## Installation

```bash
go get github.com/floruntime/flo-go
```

## Quick Start

```go
package main

import (
    "fmt"
    "log"
    flo "github.com/floruntime/flo-go"
)

func main() {
    client := flo.NewClient("localhost:9000",
        flo.WithNamespace("myapp"),
    )
    if err := client.Connect(); err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    // KV
    client.KV.Put("user:123", []byte("John Doe"), nil)
    value, _ := client.KV.Get("user:123", nil)
    fmt.Printf("Got: %s\n", value)

    // Queue
    client.Queue.Enqueue("tasks", []byte(`{"task":"process"}`), nil)
    result, _ := client.Queue.Dequeue("tasks", 10, nil)
    for _, msg := range result.Messages {
        client.Queue.Ack("tasks", []uint64{msg.Seq}, nil)
    }

    // Stream
    client.Stream.Append("events", []byte(`{"event":"login"}`), nil)
    records, _ := client.Stream.Read("events", nil)
    for _, rec := range records.Records {
        fmt.Printf("Event: %s\n", rec.Payload)
    }
}
```

## Client Options

```go
client := flo.NewClient("localhost:9000",
    flo.WithNamespace("default"),     // Default namespace
    flo.WithTimeout(5 * time.Second), // Connection/operation timeout
    flo.WithDebug(true),              // Enable debug logging
)
```

## KV Operations

### Get

```go
// Returns *flo.GetResult (nil if not found) — carries both value and version
result, err := client.KV.Get("key", nil)
if result != nil {
    fmt.Printf("%s @ v%d\n", result.Value, result.Version)
}

// Blocking get (wait for key to appear)
blockMS := uint32(5000)
result, _ = client.KV.Get("key", &flo.GetOptions{BlockMS: &blockMS})
```

### Put

```go
// Simple put — returns flo.PutResult with the committed version
res, err := client.KV.Put("key", []byte("value"), nil)
fmt.Println("committed at version", res.Version)

// With TTL
ttl := uint64(3600)
res, _ = client.KV.Put("key", []byte("value"), &flo.PutOptions{TTLSeconds: &ttl})

// With CAS — use the version returned by Get or a previous Put
cur, _ := client.KV.Get("key", nil)
res, err = client.KV.Put("key", []byte("new"), &flo.PutOptions{CASVersion: &cur.Version})
if flo.IsConflict(err) {
    // Version mismatch — re-read and retry
}

// CAS create-if-absent (version 0 means "must not exist")
zero := uint64(0)
res, err = client.KV.Put("key", []byte("first"), &flo.PutOptions{CASVersion: &zero})

// Conditional
res, err = client.KV.Put("key", []byte("value"), &flo.PutOptions{IfNotExists: true})
```

### Delete

```go
err := client.KV.Delete("key", nil)
```

### Multi-key get

Fetch up to 256 keys in a single round trip — keys may live on different shards. Each entry has a `Found` flag.

```go
entries, err := client.KV.MGet([]string{"user:1", "user:2", "user:3"}, nil)
if err != nil { return err }
for _, e := range entries {
    if e.Found {
        fmt.Printf("%s = %s (v%d)\n", e.Key, e.Value, e.Version)
    } else {
        fmt.Printf("%s missing\n", e.Key)
    }
}
```

### Atomic counters

```go
n, err := client.KV.Incr("visits:home", nil)            // +1
n, err = client.KV.Incr("visits:home", &flo.KVIncrOptions{Delta: flo.Int64Ptr(10)})
```

### TTL lifecycle and existence

```go
client.KV.Touch("lock:resource", 60, nil)  // extend TTL
client.KV.Persist("lock:resource", nil)    // clear TTL
ok, _ := client.KV.Exists("lock:resource", nil)
```

### JSON paths

```go
// Whole-document set (creates the key)
client.KV.JsonSet("order:42", "$", []byte(`{"items":3,"status":"new"}`), nil)

// Atomic sub-field update — single Raft entry, returns new version
res, _ := client.KV.JsonSet("order:42", "$.status", []byte(`"shipped"`), nil)
fmt.Println("doc now at v", res.Version)

// Read a sub-field — returns *GetResult{Value, Version}
status, _ := client.KV.JsonGet("order:42", "$.status", nil)
fmt.Printf("%s @ v%d\n", status.Value, status.Version)

// Remove a sub-field
client.KV.JsonDel("order:42", "$.status", nil)
```

### Per-shard transactions

Buffer multiple writes on a single pinned partition and commit them atomically as one Raft entry. Every key touched inside the transaction must hash to the same partition as the routing key.

```go
txn, err := client.KV.Begin("user:42", nil)
if err != nil {
    return err
}

if _, err := txn.Put("user:42:name", []byte("Jane"), nil); err != nil {
    _ = txn.Rollback()
    return err
}
if _, err := txn.Incr("user:42:visits", 1); err != nil {
    _ = txn.Rollback()
    return err
}

result, err := txn.Commit()
if err != nil {
    _ = txn.Rollback() // idempotent
    return err
}
fmt.Printf("committed %d ops at index %d\n", result.OpCount, result.CommitIndex)
```

`scan`, `mget`, `JsonGet`, `JsonSet`, `JsonDel`, and `History` are not supported inside a transaction and return `ErrTxnUnsupportedOp`. Server caps: 256 ops per transaction, 1 MiB total payload.

### Scan

```go
result, _ := client.KV.Scan("user:", nil)
for _, entry := range result.Entries {
    fmt.Printf("%s = %s\n", entry.Key, entry.Value)
}

// Paginated
limit := uint32(100)
result, _ := client.KV.Scan("user:", &flo.ScanOptions{Limit: &limit})
for result.HasMore {
    result, _ = client.KV.Scan("user:", &flo.ScanOptions{Cursor: result.Cursor})
}
```

### History

```go
entries, _ := client.KV.History("key", nil)
for _, e := range entries {
    fmt.Printf("v%d at %d: %s\n", e.Version, e.Timestamp, e.Value)
}
```

## Queue Operations

### Enqueue

```go
seq, _ := client.Queue.Enqueue("tasks", payload, &flo.EnqueueOptions{
    Priority: 10,
    DedupKey: "task-123",
})
```

### Dequeue

```go
blockMS := uint32(30000)
result, _ := client.Queue.Dequeue("tasks", 10, &flo.DequeueOptions{
    BlockMS: &blockMS,
})
for _, msg := range result.Messages {
    fmt.Printf("seq=%d: %s\n", msg.Seq, msg.Payload)
}
```

### Ack / Nack

```go
client.Queue.Ack("tasks", []uint64{msg.Seq}, nil)
client.Queue.Nack("tasks", []uint64{msg.Seq}, &flo.NackOptions{ToDLQ: true})
```

### DLQ

```go
result, _ := client.Queue.DLQList("tasks", nil)
client.Queue.DLQRequeue("tasks", seqs, nil)
```

### Peek / Touch

```go
result, _ := client.Queue.Peek("tasks", 10, nil)       // No lease
client.Queue.Touch("tasks", []uint64{msg.Seq}, nil)     // Extend lease
```

## Stream Operations

```go
// Append
client.Stream.Append("events", []byte(`{"event":"click"}`), nil)

// Append with headers
client.Stream.Append("events", []byte(`{"event":"click"}`), &flo.StreamAppendOptions{
    Headers: map[string]string{"content-type": "application/json", "source": "web"},
})

// Read
records, _ := client.Stream.Read("events", nil)

// Access record fields
for _, rec := range records.Records {
    fmt.Println(rec.Stream)   // stream name (e.g. "events")
    fmt.Println(rec.Payload)  // raw bytes
    fmt.Println(rec.Headers)  // map[string]string or nil
    fmt.Println(rec.ID)       // StreamID{TimestampMS, Sequence}
}

// Consumer groups
count := uint32(10)
records, _ = client.Stream.GroupRead("events", "processors", "worker-1",
    &flo.StreamGroupReadOptions{Count: &count},
)
client.Stream.GroupAck("events", "processors", []flo.StreamID{
    {Sequence: 1, TimestampMS: 1700000000000},
}, nil)
```

## StreamWorker (high-level)

The recommended way to consume streams is the `StreamWorker`, created from a connected client. It handles consumer group join, polling, concurrency, ack/nack, and reconnection automatically:

```go
worker, _ := client.NewStreamWorker(flo.StreamWorkerOptions{
    Stream:      "events",
    Group:       "processors",
    Concurrency: 5,
    BatchSize:   10,
    BlockMS:     30000,
}, func(sctx *flo.StreamContext) error {
    var data map[string]interface{}
    sctx.Into(&data)
    fmt.Printf("Stream: %s, ID: %v\n", sctx.Stream(), sctx.StreamID())
    fmt.Printf("Headers: %v\n", sctx.Headers())
    return process(data)
})
defer worker.Close()

worker.Start(ctx)
```

### StreamWorkerOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `Stream` | `string` | | Single stream name (shorthand) |
| `Streams` | `[]string` | | Multiple streams (merged with Stream) |
| `Group` | `string` | `"default"` | Consumer group name |
| `Consumer` | `string` | auto | Consumer ID within the group |
| `Concurrency` | `int` | `10` | Max concurrent handlers |
| `BatchSize` | `uint32` | `10` | Records per poll |
| `BlockMS` | `uint32` | `30000` | Long-poll timeout (ms) |
| `MessageTimeout` | `time.Duration` | `5m` | Max handler duration |

### StreamContext

The handler receives a `*StreamContext` with convenience accessors:

```go
func handler(sctx *flo.StreamContext) error {
    sctx.Payload()    // []byte
    sctx.StreamID()   // StreamID
    sctx.Stream()     // stream name
    sctx.Headers()    // map[string]string
    sctx.Namespace()  // namespace
    sctx.Group()      // consumer group
    sctx.Consumer()   // consumer ID
    sctx.Record()     // full StreamRecord
    sctx.Into(&v)     // JSON unmarshal
    return nil
}
```

Records are **auto-acked** on handler success and **auto-nacked** on error. Connection errors trigger automatic reconnect and consumer group re-join.

## ActionWorker

```go
w, _ := client.NewActionWorker(flo.ActionWorkerOptions{Concurrency: 10})
defer w.Close()

w.MustRegisterAction("process-order", func(actx *flo.ActionContext) ([]byte, error) {
    var input map[string]interface{}
    actx.Into(&input)
    return actx.Bytes(map[string]string{"status": "done"})
})

w.Start(ctx)
```

## Workflow Operations

`client.Workflow` manages the full lifecycle of [workflow](/orchestration/workflows/) definitions and runs.

### Declarative Sync

Deploy or update a workflow definition safely — calling this on every app boot is idiomatic:

```go
r, err := client.Workflow.SyncBytes([]byte(yamlString), nil)
// r.Name, r.Version, r.Action → "created" | "updated" | "unchanged"
```

### Start and Monitor Runs

```go
import "encoding/json"

// Start a run
input, _ := json.Marshal(map[string]interface{}{
    "orderId": "ORD-123",
    "amount":  99.99,
})
runID, err := client.Workflow.Start("process-order", input, nil)

// Get status
s, err := client.Workflow.Status(runID, nil)
fmt.Println(s.RunID)        // string
fmt.Println(s.Workflow)     // workflow name
fmt.Println(s.Version)      // version string
fmt.Println(s.Status)       // "pending"|"running"|"waiting"|"completed"|"failed"|...
fmt.Println(s.CurrentStep)  // current or last step name
// s.Input        []byte  — raw input bytes
// s.CreatedAt    int64   — epoch ms
// s.StartedAt    *int64  — nil if not yet started
// s.CompletedAt  *int64  — nil if not yet completed
// s.WaitSignal   *string — signal type being waited for, or nil

// Cancel a run
err = client.Workflow.Cancel(runID, nil)
```

### Signals

Deliver external events to a waiting workflow:

```go
sigData, _ := json.Marshal(map[string]interface{}{
    "approved": true,
    "approver": "manager@corp.com",
})
err = client.Workflow.Signal(runID, "approval_decision", sigData, nil)
```

### History and Listings

`History`, `ListRuns`, and `ListDefinitions` return raw binary and are parsed with helper functions (see the full example for reference parsers):

```go
// Run event history (binary response)
data, err := client.Workflow.History(runID, nil)
events := parseHistory(data) // []HistoryEvent{Type, Detail, Timestamp}

// List runs for a workflow
limit := 50
data, err = client.Workflow.ListRuns("process-order", &flo.WorkflowListRunsOptions{Limit: limit})
runs := parseListRuns(data) // []RunEntry{RunID, Workflow, Status, CreatedAt}

// List all registered definitions
data, err = client.Workflow.ListDefinitions(nil)
defs := parseListDefinitions(data) // []DefinitionEntry{Name, Version, CreatedAt}

// Download a definition's YAML
yamlBytes, err := client.Workflow.GetDefinition("process-order", nil)
```

### Disable / Enable

```go
// Pause new runs (existing runs continue)
err = client.Workflow.Disable("process-order", nil)

// Resume
err = client.Workflow.Enable("process-order", nil)
```

### Full Example

See [examples/workflows/main.go](https://github.com/floruntime/flo-go/blob/master/examples/workflows/main.go) and [examples/action_worker/main.go](https://github.com/floruntime/flo-go/blob/master/examples/action_worker/main.go) for a complete walkthrough covering sync, signals, signal timeouts, outcome-based routing, history, and cancellation.

## Error Handling

```go
if flo.IsNotFound(err) { /* Key not found */ }
if flo.IsConflict(err) { /* CAS conflict */ }
if flo.IsBadRequest(err) { /* Invalid params */ }
if flo.IsOverloaded(err) { /* Retry later */ }
```

## Thread Safety

The Go client is thread-safe. Multiple goroutines can use the same client instance.

---

## JavaScript / TypeScript SDK

Source path: src/content/docs/sdks/javascript.md
Canonical URL: https://docs.floruntime.io/sdks/javascript/

The JavaScript SDK is a monorepo with three packages:

| Package | Environment | Transport |
|---------|-------------|-----------|
| `@floruntime/core` | Shared | Wire protocol, types |
| `@floruntime/node` | Node.js | TCP |
| `@floruntime/web` | Browser | WebSocket |

## Installation

### Node.js

```bash
npm install @floruntime/node
```

### Browser

```bash
npm install @floruntime/web
```

## Quick Start

### Node.js

```typescript
import { FloClient } from "@floruntime/node";

const client = new FloClient("localhost:9000", {
  namespace: "myapp",
  timeoutMs: 5000,
});
await client.connect();

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// KV
await client.kv.put("greeting", encoder.encode("Hello, Flo!"));
const value = await client.kv.get("greeting");
console.log(decoder.decode(value!));

// Queue
await client.queue.enqueue("tasks", encoder.encode('{"task":"process"}'));
const result = await client.queue.dequeue("tasks", 10);
for (const msg of result.messages) {
  await client.queue.ack("tasks", [msg.seq]);
}

await client.close();
```

### Browser

```typescript
import { FloClient } from "@floruntime/web";

const client = new FloClient("wss://flo.example.com/ws", {
  namespace: "myapp",
});
await client.connect();

// Read-only KV (config, feature flags)
const value = await client.kv.get("config:flags");

// Streams (subscribe + publish)
await client.streams.subscribe("chat:room-123", (record) => {
  console.log(new TextDecoder().decode(record.payload));
});

await client.close();
```

:::note
The web SDK is limited to **streams** and **KV read-only**. For full KV mutations (put, delete), queues, and actions, use `@floruntime/node` on the backend.
:::

## KV Operations

```typescript
// Get returns GetResult | null \u2014 carries both value and version
const r = await client.kv.get("key");
if (r) console.log(r.value, "@", r.version); // r.version is bigint

// Put returns PutResult { version: bigint }
const res = await client.kv.put("key", encode("value"), {
  ttlSeconds: 3600n,
  casVersion: r?.version,  // optimistic locking against the latest read
  ifNotExists: true,
});
console.log("committed at v", res.version);

// Delete
await client.kv.delete("key");

// Multi-key get (single round trip, up to 256 keys, may span shards)
const entries = await client.kv.mget(["user:1", "user:2", "user:3"]);
const decoder = new TextDecoder();
for (const e of entries) {
  if (e.found) {
    console.log(`${e.key} = ${decoder.decode(e.value)} (v${e.version})`);
  } else {
    console.log(`${e.key} missing`);
  }
}

// Scan
const result = await client.kv.scan("user:", { limit: 100 });

// History
const versions = await client.kv.history("key");

// Atomic counter
const n = await client.kv.incr("visits:home");        // +1
const m = await client.kv.incr("visits:home", { delta: 10n });

// TTL lifecycle and existence
await client.kv.touch("lock:resource", 60n);   // extend TTL
await client.kv.persist("lock:resource");      // clear TTL
const exists = await client.kv.exists("lock:resource");

// JSON paths
await client.kv.jsonSet("order:42", "$", encode('{"items":3,"status":"new"}'));
const setRes = await client.kv.jsonSet("order:42", "$.status", encode('"shipped"'));
console.log("doc now at v", setRes.version);
const status = await client.kv.jsonGet("order:42", "$.status"); // GetResult | null
if (status) console.log(`${decode(status.value)} @ v${status.version}`);
await client.kv.jsonDel("order:42", "$.status");

// Per-shard transaction — atomic multi-key writes on one partition
const txn = await client.kv.begin("user:42");
try {
  await txn.put("user:42:name", encode("Jane"));
  await txn.incr("user:42:visits", 1n);
  const result = await txn.commit();
  console.log(`committed ${result.opCount} ops at index ${result.commitIndex}`);
} catch (err) {
  await txn.rollback(); // idempotent
  throw err;
}
```

`scan`, `mget`, `jsonGet`, `jsonSet`, `jsonDel`, and `history` are not supported inside a transaction and throw `TxnUnsupportedOpError`. Server caps: 256 ops per transaction, 1 MiB total payload.

## Queue Operations

```typescript
// Enqueue
const seq = await client.queue.enqueue("tasks", payload, {
  priority: 10,
  delayMs: 60000n,
  dedupKey: "task-123",
});

// Dequeue with long polling
const result = await client.queue.dequeue("tasks", 10, {
  blockMs: 30000,
  visibilityTimeoutMs: 60000,
});

// Ack / Nack
await client.queue.ack("tasks", [msg.seq]);
await client.queue.nack("tasks", [msg.seq], { toDlq: true });

// DLQ
const dlq = await client.queue.dlqList("tasks");
await client.queue.dlqRequeue("tasks", seqs);
```

## Stream Operations

```typescript
// Append accepts string, plain object, or Uint8Array
const result = await client.stream.append("events", {
  event: "signup",
  userId: "user-123",
}, {
  partitionKey: "user-123",
});

await client.stream.append("events", "user signed in");

const encoder = new TextEncoder();
await client.stream.append("events", encoder.encode("raw-bytes-payload"));

// Read
const records = await client.stream.read("events", {
  offset: 0n,
  limit: 10,
});

// Access record fields
for (const rec of records.records) {
  console.log(rec.stream);   // stream name (e.g. "events")
  console.log(rec.payload);  // Uint8Array
  console.log(rec.headers);  // Record<string, string> | null
  console.log(rec.id);       // StreamID { timestampMs, sequence }
}

// Consumer groups
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

`append()` auto-encodes strings as UTF-8 and auto-serializes plain objects to JSON. Use `Uint8Array` only when you need exact raw bytes on the wire.

## StreamWorker (high-level)

The recommended way to consume streams is the `StreamWorker`, available in `@floruntime/node`. It handles consumer group join, polling, concurrency, ack/nack, and reconnection automatically:

```typescript
import { StreamWorker } from "@floruntime/node";

const worker = new StreamWorker("localhost:9000", {
  stream: "events",
  group: "processors",
  concurrency: 5,
  batchSize: 10,
  blockMs: 30000,
}, async (ctx) => {
  const data = ctx.json<{ event: string }>();
  console.log(`Stream: ${ctx.stream}, ID: ${ctx.streamId}`);
  console.log(`Headers:`, ctx.headers);
  await process(data);
});

await worker.start();
```

### StreamWorkerConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `stream` | `string` | *required* | Stream name to consume |
| `group` | `string` | `"default"` | Consumer group name |
| `consumer` | `string` | auto | Consumer ID within the group |
| `concurrency` | `number` | `10` | Max concurrent handlers |
| `batchSize` | `number` | `10` | Records per poll |
| `blockMs` | `number` | `30000` | Long-poll timeout (ms) |
| `messageTimeoutMs` | `number` | `300000` | Max handler duration (ms) |

### StreamContext

The handler receives a `StreamContext` with convenience accessors:

```typescript
async (ctx) => {
  ctx.payload;     // Uint8Array
  ctx.text();      // string (UTF-8 decoded)
  ctx.json<T>();   // parsed JSON
  ctx.streamId;    // StreamID
  ctx.stream;      // stream name
  ctx.headers;     // Record<string, string> (empty object if none)
  ctx.record;      // full StreamRecord
}
```

Records are **auto-acked** on handler success and **auto-nacked** on exception. Connection errors trigger automatic reconnect and consumer group re-join.

## Action & Worker Operations

```typescript
import { ActionType } from "@floruntime/node";

// Register and invoke
await client.action.register("process-image", ActionType.User, {
  timeoutMs: 60000, maxRetries: 3,
});
const result = await client.action.invoke("process-image", payload, {
  priority: 10, idempotencyKey: "order-123",
});
```

### ActionWorker (high-level)

The recommended approach for executing actions is the `ActionWorker` class, which handles connection management, concurrency, heartbeats, and graceful shutdown:

```typescript
import { ActionWorker } from "@floruntime/node";

const worker = new ActionWorker({
  endpoint: "localhost:9000",
  namespace: "myapp",
  concurrency: 10,
});

worker.action("process-image", async (ctx) => {
  const input = ctx.json<{ url: string }>();
  const output = await processImage(input.url);
  return ctx.toBytes({ status: "done", result: output });
});

await worker.start();
```
```

## Workflow Operations

`client.workflow` manages the full lifecycle of [workflow](/orchestration/workflows/) definitions and runs.

### Declarative Sync

Deploy or update a workflow definition safely — calling this on every app boot is idiomatic:

```typescript
// Sync from a YAML string
const result = await client.workflow.sync(yamlString);
console.log(`${result.name} v${result.version}: ${result.action}`);
// result.action → "created" | "updated" | "unchanged"

// Sync from raw bytes
const result2 = await client.workflow.syncBytes(
  new TextEncoder().encode(yamlString)
);
```

### Start and Monitor Runs

```typescript
// Start a run
const runId = await client.workflow.start(
  "process-order",
  JSON.stringify({ orderId: "ORD-123", amount: 99.99 })
);

// Poll status
const status = await client.workflow.status(runId);
console.log(status.run_id);        // string
console.log(status.workflow);      // workflow name
console.log(status.version);       // version string
console.log(status.status);        // "pending"|"running"|"waiting"|"completed"|"failed"|...
console.log(status.current_step);  // current or last step name
// status.input          → Uint8Array (raw input bytes)
// status.created_at     → bigint (epoch ms)
// status.started_at?    → bigint | undefined
// status.completed_at?  → bigint | undefined
// status.wait_signal?   → string | undefined (signal type being waited for)

// Cancel a run
await client.workflow.cancel(runId, "User requested cancellation");
```

### Signals

Deliver external events to a waiting workflow:

```typescript
// The workflow must have a waitForSignal step expecting "approval_decision"
await client.workflow.signal(
  runId,
  "approval_decision",
  JSON.stringify({ approved: true, approver: "manager@corp.com" })
);
```

### History and Listings

```typescript
// Run event history
const events = await client.workflow.history(runId, { limit: 20 });
for (const event of events) {
  console.log(`[${event.timestamp}] ${event.type}: ${event.detail}`);
}

// List runs for a workflow
const runs = await client.workflow.listRuns({
  workflowName: "process-order",
  limit: 50,
});
for (const run of runs) {
  console.log(`${run.run_id} — ${run.status} (${run.created_at})`);
}

// List all registered definitions
const defs = await client.workflow.listDefinitions();
for (const def of defs) {
  console.log(`${def.name} v${def.version}`);
}

// Download a definition's YAML
const yaml = await client.workflow.getDefinition("process-order");
// yaml → Uint8Array | null
```

### Disable / Enable

```typescript
// Pause new runs (existing runs continue)
await client.workflow.disable("process-order");

// Resume
await client.workflow.enable("process-order");
```

### Full Example

See [examples/workflow.ts](https://github.com/floruntime/flo-js/blob/dev/examples/workflow.ts) for a complete walkthrough covering sync, signals, signal timeouts, outcome-based routing, history, and cancellation.

---

## API Reference Tables

### KV Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `get` | `get(key, opts?) → Promise<Uint8Array \| null>` | Get value |
| `put` | `put(key, value, opts?) → Promise<void>` | Set value |
| `delete` | `delete(key, opts?) → Promise<void>` | Delete key |
| `scan` | `scan(prefix, opts?) → Promise<ScanResult>` | Prefix scan |
| `history` | `history(key, opts?) → Promise<VersionEntry[]>` | Version history |

### Queue Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `enqueue` | `enqueue(queue, payload, opts?) → Promise<bigint>` | Add message |
| `dequeue` | `dequeue(queue, count, opts?) → Promise<DequeueResult>` | Fetch messages |
| `ack` | `ack(queue, seqs, opts?) → Promise<void>` | Acknowledge |
| `nack` | `nack(queue, seqs, opts?) → Promise<void>` | Nack (retry/DLQ) |
| `dlqList` | `dlqList(queue, opts?) → Promise<DequeueResult>` | List DLQ |
| `dlqRequeue` | `dlqRequeue(queue, seqs, opts?) → Promise<void>` | Requeue DLQ |

### Stream Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `append` | `append(stream, payload, opts?) → Promise<AppendResult>` | Append record (with optional headers) |
| `read` | `read(stream, opts?) → Promise<ReadResult>` | Read records |
| `groupJoin` | `groupJoin(stream, group, consumer) → Promise<void>` | Join group |
| `groupRead` | `groupRead(stream, opts) → Promise<ReadResult>` | Group read |
| `groupAck` | `groupAck(stream, ids, opts) → Promise<void>` | Group ack |

### Workflow Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `sync` | `sync(yaml) → Promise<SyncResult>` | Deploy/update definition from YAML string |
| `syncBytes` | `syncBytes(bytes) → Promise<SyncResult>` | Deploy/update from raw bytes |
| `start` | `start(name, input?) → Promise<string>` | Start a run, returns run ID |
| `status` | `status(runId) → Promise<WorkflowStatusResult>` | Get run status |
| `signal` | `signal(runId, type, data?) → Promise<void>` | Deliver a signal to a waiting run |
| `cancel` | `cancel(runId, reason?) → Promise<void>` | Cancel a run |
| `history` | `history(runId, opts?) → Promise<HistoryEvent[]>` | Run event history |
| `listRuns` | `listRuns(opts?) → Promise<RunEntry[]>` | List runs for a workflow |
| `listDefinitions` | `listDefinitions() → Promise<DefinitionEntry[]>` | List registered definitions |
| `getDefinition` | `getDefinition(name) → Promise<Uint8Array \| null>` | Download definition YAML |
| `disable` | `disable(name) → Promise<void>` | Pause new runs |
| `enable` | `enable(name) → Promise<void>` | Resume new runs |

---

## SDK Overview

Source path: src/content/docs/sdks/overview.md
Canonical URL: https://docs.floruntime.io/sdks/overview/

Flo provides official SDKs for four languages. All SDKs use the same binary wire protocol and support the full feature set: KV, Streams, Queues, Time-Series, Actions, and Workers.

## Available SDKs

| Language | Package | Transport | Async |
|----------|---------|-----------|-------|
| **Go** | `go get github.com/floruntime/flo-go` | TCP | Goroutines |
| **Python** | `pip install flo` | TCP | asyncio |
| **JavaScript (Node.js)** | `npm install @floruntime/node` | TCP | Promise |
| **JavaScript (Browser)** | `npm install @floruntime/web` | WebSocket | Promise |
| **Zig** | `flo-zig` (build.zig.zon) | TCP | — |

## Feature Matrix

| Feature | Go | Python | JS/TS | Zig |
|---------|:---:|:------:|:-----:|:---:|
| KV (get/put/delete/scan/history) | ✓ | ✓ | ✓ | ✓ |
| Queues (enqueue/dequeue/ack/nack/DLQ) | ✓ | ✓ | ✓ | ✓ |
| Streams (append/read/consumer groups) | ✓ | ✓ | ✓ | ✓ |
| Actions (register/invoke/status) | ✓ | ✓ | ✓ | ✓ |
| Workers (register/await/complete/fail) | ✓ | ✓ | ✓ | ✓ |
| Blocking gets / long polling | ✓ | ✓ | ✓ | ✓ |
| CAS (optimistic locking) | ✓ | ✓ | ✓ | ✓ |
| Worker framework (high-level) | ✓ | ✓ | ✓ | ✓ |
| Stream worker framework | ✓ | ✓ | ✓ | ✓ |
| Browser support (WebSocket) | — | — | ✓ | — |

## Common Patterns

All SDKs follow the same pattern:

1. **Create a client** with host, optional namespace, and timeout
2. **Connect** to the server
3. **Use subsystem accessors** — `client.kv`, `client.queue`, `client.stream`, `client.action`, `client.worker`
4. **Close** when done

```
client = connect("localhost:9000", namespace="myapp")
client.kv.put("key", value)
client.queue.enqueue("tasks", payload)
client.stream.append("events", data)
client.close()
```

## Namespaces

All operations default to the namespace configured on the client. You can override per-operation:

```
# Python
await client.kv.put("key", b"value")                           # uses default namespace
await client.kv.put("key", b"value", PutOptions(namespace="other"))  # override
```

## Error Handling

All SDKs provide typed errors:

| Error | Meaning |
|-------|---------|
| `NotFound` | Key/queue/stream doesn't exist |
| `Conflict` | CAS version mismatch |
| `BadRequest` | Invalid parameters |
| `Unauthorized` | Authentication failed |
| `Overloaded` | Server at capacity, retry later |
| `Internal` | Server error |
| `NotConnected` | Client not connected |

---

## Python SDK

Source path: src/content/docs/sdks/python.md
Canonical URL: https://docs.floruntime.io/sdks/python/

## Installation

```bash
pip install flo
```

## Quick Start

```python
import asyncio
from flo import FloClient

async def main():
    async with FloClient("localhost:9000") as client:
        # KV
        await client.kv.put("user:123", b"John Doe")
        value = await client.kv.get("user:123")
        print(f"Got: {value.decode()}")

        # Queue
        seq = await client.queue.enqueue("tasks", b'{"task": "process"}')
        result = await client.queue.dequeue("tasks", 10)
        for msg in result.messages:
            await client.queue.ack("tasks", [msg.seq])

        # Stream
        await client.stream.append("events", b'{"event": "login"}')
        result = await client.stream.read("events")
        for rec in result.records:
            print(rec.payload)

asyncio.run(main())
```

## KV Operations

```python
from flo import GetOptions, PutOptions, ScanOptions, HistoryOptions

# Put returns PutResult with the new version
res = await client.kv.put("session:abc", b"data", PutOptions(ttl_seconds=3600))
print("committed at v", res.version)

# Get returns GetResult | None \u2014 carries both value and version
r = await client.kv.get("key")
if r is not None:
    print(r.value, "@", r.version)

# Blocking get
r = await client.kv.get("key", GetOptions(block_ms=5000))

# Put with CAS \u2014 use the version returned by Get/Put
r = await client.kv.get("counter")
await client.kv.put("counter", b"2", PutOptions(cas_version=r.version))

# Conditional writes
await client.kv.put("key", b"value", PutOptions(if_not_exists=True))

# Delete
await client.kv.delete("key")

# Multi-key get (single round trip, up to 256 keys, may span shards)
entries = await client.kv.mget(["user:1", "user:2", "user:3"])
for e in entries:
    if e.found:
        print(f"{e.key} = {e.value!r} (v{e.version})")
    else:
        print(f"{e.key} missing")

# Scan with pagination
result = await client.kv.scan("user:", ScanOptions(limit=100))
while result.has_more:
    result = await client.kv.scan("user:", ScanOptions(cursor=result.cursor))

# Version history
history = await client.kv.history("user:123", HistoryOptions(limit=10))

# Atomic counter
n = await client.kv.incr("visits:home")        # +1
n = await client.kv.incr("visits:home", KVIncrOptions(delta=10))

# TTL lifecycle and existence
await client.kv.touch("lock:resource", 60)     # extend TTL
await client.kv.persist("lock:resource")       # clear TTL
ok = await client.kv.exists("lock:resource")

# JSON paths
await client.kv.json_set("order:42", "$", b'{"items":3,"status":"new"}')
res = await client.kv.json_set("order:42", "$.status", b'"shipped"')  # atomic sub-field
print("doc now at v", res.version)
status = await client.kv.json_get("order:42", "$.status")             # GetResult | None
print(f"{status.value!r} @ v{status.version}")
await client.kv.json_del("order:42", "$.status")

# Per-shard transaction \u2014 atomic multi-key writes on one partition
txn = await client.kv.begin("user:42")
try:
    await txn.put("user:42:name", b"Jane")
    await txn.incr("user:42:visits")
    result = await txn.commit()
    print(f"committed {result.op_count} ops at index {result.commit_index}")
except Exception:
    await txn.rollback()  # idempotent
    raise

# Or use as an async context manager (auto-rollback on exception)
async with await client.kv.begin("user:42") as txn:
    await txn.put("user:42:last_seen", b"now")
    await txn.commit()
```

`scan`, `mget`, `json_get`, `json_set`, `json_del`, and `history` are not supported inside a transaction and raise `TxnUnsupportedOpError`. Server caps: 256 ops per transaction, 1 MiB total payload.

## Queue Operations

```python
from flo import EnqueueOptions, DequeueOptions, NackOptions

# Enqueue with priority and delay
seq = await client.queue.enqueue("tasks", payload,
    EnqueueOptions(priority=10, delay_ms=60000))

# Dequeue with long polling
result = await client.queue.dequeue("tasks", 10,
    DequeueOptions(block_ms=30000))

# Process and ack/nack
for msg in result.messages:
    try:
        process(msg.payload)
        await client.queue.ack("tasks", [msg.seq])
    except Exception:
        await client.queue.nack("tasks", [msg.seq], NackOptions(to_dlq=True))

# DLQ operations
result = await client.queue.dlq_list("tasks")
await client.queue.dlq_requeue("tasks", [msg.seq for msg in result.messages])

# Peek (no lease) and Touch (extend lease)
result = await client.queue.peek("tasks", 5)
await client.queue.touch("tasks", [msg.seq])
```

## Stream Operations

```python
from flo import StreamReadOptions, StreamAppendOptions, StreamID, StreamGroupReadOptions

# Append
result = await client.stream.append("events", b'{"event": "click"}')

# Append with headers
result = await client.stream.append("events", b'{"event": "click"}',
    StreamAppendOptions(headers={"content-type": "application/json", "source": "web"}))

# Read from a specific position
result = await client.stream.read("events",
    StreamReadOptions(start=StreamID(timestamp_ms=1700000000000, sequence=0), count=10))

# Read from tail (latest records)
result = await client.stream.read("events",
    StreamReadOptions(tail=True, count=10))

# Blocking read (long polling)
result = await client.stream.read("events",
    StreamReadOptions(tail=True, count=10, block_ms=30000))

# Access record fields
for rec in result.records:
    print(rec.stream)    # stream name (e.g. "events")
    print(rec.payload)   # raw bytes
    print(rec.headers)   # dict[str, str] or None
    print(rec.id)        # StreamID(timestamp_ms, sequence)

# Consumer groups
await client.stream.group_join("events", "processors", "worker-1")
result = await client.stream.group_read("events", "processors", "worker-1",
    StreamGroupReadOptions(count=10, block_ms=30000))
await client.stream.group_ack("events", "processors", [r.id for r in result.records])
```

## StreamWorker (high-level)

The recommended way to consume streams is the `StreamWorker`, created from a connected client. It handles consumer group join, polling, concurrency, ack/nack, and reconnection automatically:

```python
from flo import FloClient, StreamContext

async with FloClient("localhost:9000", namespace="myapp") as client:
    worker = client.new_stream_worker(
        stream="events",
        group="processors",
        handler=process_event,
        concurrency=5,
    )

    async def process_event(ctx: StreamContext) -> None:
        data = ctx.json()
        print(f"Stream: {ctx.stream}, ID: {ctx.stream_id}")
        print(f"Headers: {ctx.headers}")
        await handle(data)

    await worker.start()
```

### StreamWorker Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `stream` | `str` | *required* | Stream name to consume |
| `group` | `str` | `""` | Consumer group name |
| `consumer` | `str` | auto-generated | Consumer ID within the group |
| `handler` | `Callable` | *required* | Async function receiving `StreamContext` |
| `concurrency` | `int` | `10` | Max concurrent handler invocations |
| `batch_size` | `int` | `10` | Records per poll |
| `block_ms` | `int` | `30000` | Long-poll timeout (ms) |
| `message_timeout` | `float` | `300.0` | Max seconds per handler call |

### StreamContext

The handler receives a `StreamContext` with convenience accessors:

```python
async def process(ctx: StreamContext) -> None:
    ctx.payload              # raw bytes
    ctx.json()               # JSON-decoded payload
    ctx.into(MyModel)        # JSON-decoded into a class
    ctx.stream_id            # StreamID (timestamp_ms, sequence)
    ctx.stream               # stream name
    ctx.headers              # dict[str, str] (empty dict if no headers)
    ctx.record               # full StreamRecord
```

Records are **auto-acked** on handler success and **auto-nacked** on exception. Connection errors trigger automatic reconnect and consumer group re-join.

### Context Manager

```python
async with client.new_stream_worker(
    stream="events", group="processors", handler=process,
) as worker:
    await worker.start()
```

## Action & Worker Operations

```python
from flo import ActionType, ActionRegisterOptions, ActionInvokeOptions

# Register and invoke actions
await client.action.register("process-image", ActionType.USER,
    ActionRegisterOptions(timeout_ms=60000, max_retries=3))

result = await client.action.invoke("process-image", payload,
    ActionInvokeOptions(priority=10, idempotency_key="order-123"))

status = await client.action.status(result.run_id)
```

### ActionWorker (high-level)

The recommended way to execute actions is the `ActionWorker`, created from a connected client. It handles registration, polling, concurrency, and heartbeats automatically:

```python
from flo import FloClient, ActionContext

async with FloClient("localhost:9000", namespace="myapp") as client:
    worker = client.new_action_worker(concurrency=5)

    @worker.action("process-image")
    async def process_image(ctx: ActionContext) -> bytes:
        data = ctx.json()
        result = await do_processing(data)
        return ctx.to_bytes({"status": "done", "result": result})

    await worker.start()
```

## Features

- Native **asyncio** support
- Full **type annotations** for IDE support
- Context manager (`async with`) for automatic cleanup
- **StreamWorker** and **ActionWorker** for managed consumption
- **Headers** on stream records (read and write)
- All operations support namespace overrides

---

## Zig SDK

Source path: src/content/docs/sdks/zig.md
Canonical URL: https://docs.floruntime.io/sdks/zig/

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
    _ = try kv.put("key", "value", .{});
    if (try kv.get("key", .{})) |r_const| {
        var r = r_const;
        defer r.deinit(allocator);
        std.debug.print("Got: {s} @ v{d}\n", .{ r.value, r.version });
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

// Get returns ?GetResult — carries both value and version
if (try kv.get("key", .{})) |r_const| {
    var r = r_const;
    defer r.deinit(allocator);
    std.debug.print("{s} @ v{d}\n", .{ r.value, r.version });
}

// Blocking get
_ = try kv.get("key", .{ .block_ms = 5000 });

// Put returns PutResult { version: u64 }
const put_res = try kv.put("key", "value", .{
    .ttl_seconds = 3600,
    .if_not_exists = true,
    .namespace = "other-ns",
});

// CAS — use the version returned by Get/Put
if (try kv.get("key", .{})) |r_const| {
    var r = r_const;
    defer r.deinit(allocator);
    _ = try kv.put("key", "new", .{ .cas_version = r.version });
}

// Delete
try kv.delete("key", .{});

// Multi-key get (single round trip, up to 256 keys, may span shards)
var mget_res = try kv.mget(&.{ "user:1", "user:2", "user:3" }, .{});
defer mget_res.deinit();
for (mget_res.entries) |e| {
    if (e.found) {
        std.debug.print("{s} = {s} (v{d})\n", .{ e.key, e.value, e.version });
    } else {
        std.debug.print("{s} missing\n", .{e.key});
    }
}

// Scan
var result = try kv.scan("prefix:", .{ .limit = 100, .keys_only = true });
defer result.deinit();

// History
const versions = try kv.history("key", .{ .limit = 10 });

// Atomic counter
const n = try kv.incr("visits:home", .{});
const m = try kv.incr("visits:home", .{ .delta = 10 });

// TTL lifecycle and existence
try kv.touch("lock:resource", 60, .{});
try kv.persist("lock:resource", .{});
const exists = try kv.exists("lock:resource", .{});

// JSON paths
_ = try kv.jsonSet("order:42", "$", "{\"items\":3,\"status\":\"new\"}", .{});
const set_res = try kv.jsonSet("order:42", "$.status", "\"shipped\"", .{}); // atomic sub-field
std.debug.print("doc now at v{d}\n", .{set_res.version});
if (try kv.jsonGet("order:42", "$.status", .{})) |status_const| {
    var status = status_const;
    defer status.deinit(allocator);
    std.debug.print("{s} @ v{d}\n", .{ status.value, status.version });
}
_ = try kv.jsonDel("order:42", "$.status", .{});

// Per-shard transaction — atomic multi-key writes on one partition
var txn = try kv.begin("user:42", .{});
defer txn.deinit();
_ = try txn.put("user:42:name", "Jane", .{});
_ = try txn.incr("user:42:visits", 1);
const result = try txn.commit();
std.debug.print("committed {d} ops at index {d}\n", .{ result.op_count, result.commit_index });
// On error, call `txn.rollback()` instead — idempotent.
```

`scan`, `mget`, `jsonGet`, `jsonSet`, `jsonDel`, and `history` are not supported inside a transaction and return `FloError.TxnUnsupportedOp`. Server caps: 256 ops per transaction, 1 MiB total payload.

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

