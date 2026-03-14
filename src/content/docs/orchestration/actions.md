---
title: Actions
description: Durable execution of business logic with retries, timeouts, and dead-letter handling.
---

Actions are registered task types that can be invoked on-demand and executed by [Workers](/orchestration/workers/). Flo manages dispatch, retries, timeouts, and dead-letter handling — you just write the handler.

## Concepts

- **Action** — A named task type (e.g., `send-email`, `process-image`)
- **Invocation** — A single run of an action, identified by a run ID
- **Worker** — A process that pulls and executes action tasks
- **Run** — The lifecycle of an invocation: `pending → running → completed | failed | dead-lettered`

## CLI Usage

### Register an Action

```bash
flo action register send-email
flo action register process-image --timeout 60000 --max-retries 3
```

### Invoke an Action

```bash
flo action invoke send-email '{"to": "alice@example.com", "subject": "Welcome!"}'
```

### Check Status

```bash
# List runs for an action
flo action runs send-email

# Get specific run status
flo action status <run-id>
```

### List and Delete Actions

```bash
flo action list
flo action delete process-image
```

## SDK Examples

import { Tabs, TabItem } from '@astrojs/starlight/components';

<Tabs>
<TabItem label="Go">
```go
client := flo.NewClient("localhost:9000")
client.Connect()
defer client.Close()

// Register action
client.Action.Register("process-image", flo.ActionTypeUser, &flo.ActionRegisterOptions{
    TimeoutMS:  60000,
    MaxRetries: 3,
})

// Invoke
result, _ := client.Action.Invoke("process-image",
    []byte(`{"url":"https://example.com/img.jpg"}`), &flo.ActionInvokeOptions{
    Priority:       10,
    IdempotencyKey: "order-123-image",
})
fmt.Println("Run ID:", result.RunID)

// Check status
status, _ := client.Action.Status(result.RunID)
fmt.Println("Status:", status.Status)
```
</TabItem>
<TabItem label="Python">
```python
async with FloClient("localhost:9000") as client:
    # Register
    await client.action.register("process-image", ActionType.USER,
        ActionRegisterOptions(timeout_ms=60000, max_retries=3))

    # Invoke
    result = await client.action.invoke("process-image",
        b'{"url":"https://example.com/img.jpg"}',
        ActionInvokeOptions(priority=10, idempotency_key="order-123"))
    print(f"Run ID: {result.run_id}")

    # Check status
    status = await client.action.status(result.run_id)
    print(f"Status: {status.status}")
```
</TabItem>
<TabItem label="JavaScript">
```typescript
const client = new FloClient("localhost:9000");
await client.connect();

// Register
await client.action.register("process-image", ActionType.User, {
  timeoutMs: 60000,
  maxRetries: 3,
});

// Invoke
const result = await client.action.invoke("process-image",
  encode('{"url":"https://example.com/img.jpg"}'),
  { priority: 10, idempotencyKey: "order-123" }
);

// Check status
const status = await client.action.status(result.runId);
```
</TabItem>
</Tabs>

## Idempotency

Use `idempotency_key` to prevent duplicate invocations. If you invoke an action with the same key twice, the second call returns the existing run ID instead of creating a new run.

## Retry Behavior

When a worker fails to complete a task:

1. The task is returned to the queue after a backoff period
2. After `max_retries` failures, the task is moved to the dead letter queue
3. DLQ tasks can be inspected and re-queued manually

## Next Steps

- [Workers](/orchestration/workers/) — How to build worker processes that execute actions
- [Workflows](/orchestration/workflows/) — Compose actions into multi-step orchestrations
