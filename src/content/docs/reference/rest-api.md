---
title: REST API
description: Dashboard HTTP API reference — all endpoints served on port 9002.
---

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
