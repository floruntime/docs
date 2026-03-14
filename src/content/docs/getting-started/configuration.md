---
title: Configuration
description: Configure Flo via flo.toml and environment variables.
---

Flo is configured via a `flo.toml` file and/or environment variables. Environment variables take precedence over the config file.

## Config File

By default, Flo looks for `flo.toml` in the current directory. Override with `--config`:

```bash
flo server start --config /etc/flo/flo.toml
```

### Full Reference

```toml
[server]
port = 9000               # Client API port
bind = "0.0.0.0"          # Bind address
data_dir = "/data/flo"    # Data directory for WAL, segments, snapshots
shards = 0                # Number of shards (0 = auto-detect CPU count)

[storage]
durability = "async_flush"           # sync_flush | async_flush | none
hot_buffer_capacity = 67108864       # Hot ring buffer size (64 MB default)

[logging]
level = "info"             # debug | info | warn | error
format = "text"            # text | json

[metrics]
enabled = true             # Enable Prometheus /metrics endpoint
port = 9001                # Metrics port

[dashboard]
enabled = true             # Enable web dashboard
bind = "0.0.0.0"          # Dashboard bind address
port = 9002                # Dashboard port
```

## Environment Variables

Environment variables override config values. All prefixed with `FLO_`:

| Variable | Default | Description |
|---|---|---|
| `FLO_DATA_DIR` | `/data/flo` | Data directory |
| `FLO_LISTEN_ADDR` | `0.0.0.0:9000` | Client API address |
| `FLO_METRICS_ADDR` | `0.0.0.0:9001` | Metrics endpoint |
| `FLO_DASHBOARD_ADDR` | `0.0.0.0:9002` | Dashboard endpoint |
| `FLO_NODE_ID` | _(generated)_ | Node ID (required for clustering) |
| `FLO_LOG_LEVEL` | `info` | Log level |
| `FLO_LOG_FORMAT` | `text` | Log format (`text` or `json`) |
| `FLO_SHARDS` | `0` | Number of shards (0 = auto) |

## CLI Overrides

Common options can be set directly on the command line:

```bash
flo server start \
  --port 4444 \
  --data-dir ./my-data \
  --log-level debug
```

CLI flags take the highest precedence: `CLI > ENV > flo.toml > defaults`.
