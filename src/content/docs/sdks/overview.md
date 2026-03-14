---
title: SDK Overview
description: Official client SDKs for Go, Python, JavaScript/TypeScript, and Zig.
---

Flo provides official SDKs for four languages. All SDKs use the same binary wire protocol and support the full feature set: KV, Streams, Queues, Actions, Workers, and Streams.

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
| Worker framework (high-level) | ✓ | — | — | — |
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
