---
title: Go SDK
description: Go client SDK for Flo — KV, Streams, Queues, Actions, and Workers.
---

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
// Simple get
value, err := client.KV.Get("key", nil)

// Blocking get (wait for key to appear)
blockMS := uint32(5000)
value, err := client.KV.Get("key", &flo.GetOptions{BlockMS: &blockMS})
```

### Put

```go
// Simple put
err := client.KV.Put("key", []byte("value"), nil)

// With TTL
ttl := uint64(3600)
err := client.KV.Put("key", []byte("value"), &flo.PutOptions{TTLSeconds: &ttl})

// With CAS
version := uint64(1)
err := client.KV.Put("key", []byte("new"), &flo.PutOptions{CASVersion: &version})
if flo.IsConflict(err) {
    // Version mismatch
}

// Conditional
err := client.KV.Put("key", []byte("value"), &flo.PutOptions{IfNotExists: true})
```

### Delete

```go
err := client.KV.Delete("key", nil)
```

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
