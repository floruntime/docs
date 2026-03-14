---
title: Docker Deployment
description: Run Flo with Docker and Docker Compose.
---

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
