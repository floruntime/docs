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

// Read
records, _ := client.Stream.Read("events", nil)

// Consumer groups
records, _ = client.Stream.GroupRead("events", &flo.GroupReadOptions{
    Group: "processors", Consumer: "worker-1", Count: 10,
})
client.Stream.GroupAck("events", "processors", offsets)
```

## Worker Pattern

```go
w, _ := client.NewWorker(flo.WorkerOptions{Concurrency: 10})
defer w.Close()

w.MustRegisterAction("process-order", func(actx *flo.ActionContext) ([]byte, error) {
    var input map[string]interface{}
    actx.Into(&input)
    return actx.Bytes(map[string]string{"status": "done"})
})

w.Start(ctx)
```

## Error Handling

```go
if flo.IsNotFound(err) { /* Key not found */ }
if flo.IsConflict(err) { /* CAS conflict */ }
if flo.IsBadRequest(err) { /* Invalid params */ }
if flo.IsOverloaded(err) { /* Retry later */ }
```

## Thread Safety

The Go client is thread-safe. Multiple goroutines can use the same client instance.
