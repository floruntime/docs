---
title: Web Console
description: The built-in web dashboard — a read-and-act UI for every Flo primitive, served on port 9002.
---

Flo ships an embedded **web console**: a single-page UI for inspecting and operating a running cluster. It is served by the same dashboard HTTP server as the [REST API](/reference/rest-api/) — no separate process to deploy.

## Opening the console

Start a node, then open the dashboard in a browser:

```bash
flo server start --port 9000 --data-dir /tmp/flo
# Dashboard (web console + REST API) → http://localhost:9002
```

The dashboard listens on **`listen_port + 2`** (so `9000` → `9002`). Override it with `--dashboard-port`, or disable the dashboard entirely with `--no-dashboard`. The port is also configurable via `dashboard_port` in `flo.toml`.

```
http://localhost:9002
```

## Authentication

The console follows the same auth model as the REST API:

- **No bootstrap (dev):** if no key store exists, the dashboard is open — no login required.
- **After `flo server bootstrap`:** the console prompts for an API key (`flo_sk_…`), exchanges it for a session token (`POST /api/v1/auth/session`), and sends it as a Bearer token on every request.

`GET /health` is always public. See [Authentication](/reference/rest-api/#authentication) for details.

## Namespace switcher

Every screen is scoped to the **active namespace**, chosen from the switcher in the header. The namespace list is loaded live from `GET /api/v1/namespaces`. Switching namespaces re-scopes streams, queues, KV, time-series, actions, workers, processing jobs, and workflows.

## Screens

| Screen | What it shows |
|--------|---------------|
| **Overview** | Cluster summary (throughput, commands, shards, connections), a live command-rate sparkline, traffic/primitive counts, and the shard registry with per-shard health. |
| **KV** | Browse keys by prefix, inspect a value with its MVCC version + TTL, view per-key version history, and write/delete keys. |
| **Streams** | Per-stream record activity (a time-bucketed tape), partitions, consumer groups with their cursor positions and lag, and a message inspector with real payloads. |
| **Queues** | Per-queue ready / in-flight / dead-letter counts, priority-ordered message inspection, dead-letter triage (requeue), and an enqueue helper. |
| **Time Series** | Namespace-scoped measurements, per-field point charts pulled from the raw write buffers, a FloQL console, and a line-protocol ingest helper. |
| **Actions** | Registered action types with run counts and error rates, a run history with real input/output/error payloads, the workers handling each action, and an invoke modal. |
| **Workers** | Registered workers (action and stream), their status / load / heartbeat, throughput, per-process run and failure tallies, and the registry record. |
| **Processing** | Stream-processing jobs with status and records-processed, the pipeline DAG parsed from the submitted YAML, savepoints, and lifecycle controls (submit / stop / cancel). |
| **Workflows** | Workflow definitions with per-workflow run counts, run detail with per-step results and a live event-history timeline, and lifecycle controls (start / cancel / enable / disable). |

## Reads vs. writes

The dashboard thread has **read-only** access to the projections, so read endpoints serve data directly. Mutations (KV writes, queue requeue, action invoke, processing submit/stop/cancel, workflow start/cancel/enable/disable) are proposed through the node's normal write path, so they are durably replicated just like a CLI or SDK call.

A few operations are intentionally CLI-only and surfaced in the console as a copyable command rather than a button — for example registering an action or creating a workflow definition. See the [CLI reference](/reference/cli/).

## Programmatic access

Everything the console renders is available over the [REST API](/reference/rest-api/) at `http://localhost:9002/api/v1/*`, so you can script monitoring and operations directly.
