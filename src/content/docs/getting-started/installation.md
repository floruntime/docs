---
title: Installation
description: How to install the Flo binary on macOS, Linux, and Docker.
---

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
