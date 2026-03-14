---
title: Workers
description: Distributed task execution with lease management and heartbeats.
---

Workers are long-running processes that pull tasks from [Actions](/orchestration/actions/) and execute them. Flo handles lease management, heartbeats, retries, and dead-letter routing.

## Worker Lifecycle

1. **Register** — Worker announces itself and the task types it handles
2. **Await** — Worker blocks waiting for a task (long polling)
3. **Process** — Worker executes the task, optionally extending the lease
4. **Complete / Fail** — Worker reports the outcome

## SDK Examples

import { Tabs, TabItem } from '@astrojs/starlight/components';

<Tabs>
<TabItem label="Go">
```go
client := flo.NewClient("localhost:9000", flo.WithNamespace("myapp"))
client.Connect()
defer client.Close()

// Create a worker with concurrency
w, _ := client.NewWorker(flo.WorkerOptions{Concurrency: 10})
defer w.Close()

// Register handlers
w.MustRegisterAction("process-order", func(actx *flo.ActionContext) ([]byte, error) {
    var input map[string]interface{}
    actx.Into(&input)

    // Do work...
    return actx.Bytes(map[string]string{"status": "done"})
})

w.MustRegisterAction("send-email", func(actx *flo.ActionContext) ([]byte, error) {
    // Send email...
    return nil, nil
})

// Start worker (blocks until context is cancelled)
w.Start(ctx)
```
</TabItem>
<TabItem label="Python">
```python
async with FloClient("localhost:9000") as client:
    # Register worker
    await client.worker.register("worker-1",
        ["process-image", "send-email"])

    # Worker loop
    while True:
        result = await client.worker.await_task(
            "worker-1",
            ["process-image", "send-email"],
            WorkerAwaitOptions(block_ms=30000)
        )

        if result.task:
            task = result.task
            try:
                output = process(task.input)
                await client.worker.complete(
                    "worker-1", task.task_id, output)
            except Exception as e:
                await client.worker.fail(
                    "worker-1", task.task_id, str(e), retry=True)
```
</TabItem>
<TabItem label="JavaScript">
```typescript
const client = new FloClient("localhost:9000");
await client.connect();

const workerId = "worker-1";
const taskTypes = ["process-image"];

await client.worker.register(workerId, taskTypes);

// Worker loop
while (true) {
  const result = await client.worker.awaitTask(workerId, taskTypes, {
    blockMs: 30000,
  });

  if (!result.task) continue;
  const task = result.task;

  try {
    const output = await processImage(task.payload);
    await client.worker.complete(workerId, task.taskId, output);
  } catch (err) {
    await client.worker.fail(workerId, task.taskId, String(err), {
      retry: true,
    });
  }
}
```
</TabItem>
<TabItem label="Zig">
```zig
var client = flo.Client.init(allocator, "localhost:9000", .{});
defer client.deinit();
try client.connect();
var worker = flo.Worker.init(&client);

// Register
try worker.register("worker-1", &[_][]const u8{"send-email"}, .{});

// Worker loop
while (true) {
    if (try worker.awaitTask("worker-1", &[_][]const u8{"send-email"}, .{
        .block_ms = 0,  // Block forever until task arrives
    })) |*task| {
        defer task.deinit();

        const result = processTask(task.payload);
        if (result.success) {
            try worker.complete("worker-1", task.task_id, result.output, .{});
        } else {
            try worker.fail("worker-1", task.task_id, result.error_msg, .{
                .retry = true,
            });
        }
    }
}
```
</TabItem>
</Tabs>

## Lease Extension

For long-running tasks, extend the lease to prevent the server from reassigning the task:

```go
// Go — extend lease every 10 seconds during processing
go func() {
    for {
        time.Sleep(10 * time.Second)
        client.Worker.Touch(workerId, task.TaskID, nil)
    }
}()
```

```python
# Python — extend lease
await client.worker.touch("worker-1", task.task_id, extend_ms=30000)
```

## Concurrency

Workers can process multiple tasks in parallel. Set the concurrency in your worker configuration:

- **Go SDK** — `flo.WorkerOptions{Concurrency: 10}` uses goroutines
- **Python SDK** — Use `asyncio.gather()` or task groups
- **JS SDK** — Use `Promise.all()` patterns
- **Zig SDK** — Use thread pool or event-driven patterns
