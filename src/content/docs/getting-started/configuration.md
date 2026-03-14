---
title: Configuration
description: Configure Flo via flo.toml and CLI flags.
---

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
