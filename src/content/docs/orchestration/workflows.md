---
title: Workflows
description: Durable multi-step orchestration — compose actions via YAML, with signals, retries, inline plans, circuit breakers, health-weighted routing, cron schedules, stream triggers, JSONPath data flow, and idempotency.
---

Workflows are Flo's **durable orchestration layer**. They compose [Actions](/orchestration/actions/) into multi-step business processes defined in YAML, with built-in resilience: retries, circuit breakers, health-weighted routing, signal handling, timeouts, polling, cron scheduling, stream triggers, and idempotency.

A workflow definition is a directed graph of **steps**. Each step either runs a target (an action, an inline plan, or a child workflow) or waits for an external signal. Every step declares **transitions** that map outcomes to the next step or to a **terminal state**. The engine walks the graph from the start step until it reaches a terminal.

```
Client ──start──▸ validate ──success──▸ charge ──success──▸ ship ──success──▸ flo.Completed
                       │                    │                  │
                    failure              failure             failure
                       ▼                    ▼                  ▼
                  flo.Failed         PaymentFailed         flo.Failed
```

## Why Workflows?

| Concern | Without Flo Workflows | With Flo Workflows |
|---------|----------------------|-------------------|
| **State** | Your app manages a state machine in an external DB, guarding against crashes | Flo persists every state transition to the UAL. Recovery replays the log. |
| **Retries** | Hand-written retry loops with ad-hoc backoff | Declarative `retry:` block with exponential, linear, constant, or jittered backoff |
| **Failover** | If the orchestrating process dies, work stalls | Another node picks up from the last committed state |
| **Routing** | Manual circuit breaking, health scoring, fallback chains | Inline **plans** with health-weighted selection, circuit breakers, and fallback values |
| **Human-in-the-loop** | Polling, webhooks, custom queues | `waitForSignal` with typed signals, timeouts, and approval flows |
| **Scheduling** | External cron daemon | Embedded `schedule:` block with 5-field cron or interval |
| **Event-driven** | Wiring consumer groups to trigger logic | `trigger:` block listens on a stream and starts runs per event |

---

## Quick Start

**1. Define the workflow** in a YAML file:

```yaml
kind: Workflow
name: process-order
version: "1.0.0"
idempotency: required

start:
  run: "@actions/validate-order"
  transitions:
    success: charge
    failure: flo.Failed

steps:
  charge:
    run: "@actions/charge-payment"
    retry:
      max_attempts: 3
      backoff: exponential
      initial_delay_ms: 1000
      max_delay_ms: 30000
    transitions:
      success: ship
      failure: flo.Failed

  ship:
    run: "@actions/create-shipment"
    transitions:
      success: flo.Completed
      failure: flo.Failed
```

**2. Register the actions** the workflow calls:

```bash
flo action register validate-order --wasm ./validate.wasm
flo action register charge-payment --wasm ./charge.wasm
flo action register create-shipment --wasm ./ship.wasm
```

**3. Deploy the workflow:**

```bash
flo workflow create -f process-order.yaml
```

**4. Start a run:**

```bash
flo workflow start process-order '{"order_id": "ORD-123", "amount": 99.99}'
# → wfrun-1
```

**5. Check status:**

```bash
flo workflow status wfrun-1
# → {"run_id":"wfrun-1","workflow":"process-order","version":"1.0.0","status":"completed",...}
```

---

## Core Concepts

### Workflow Definition

Every workflow YAML file has this top-level structure:

| Field | Required | Description |
|-------|----------|-------------|
| `kind` | yes | Must be `Workflow` |
| `name` | yes | Unique workflow name |
| `version` | yes | Arbitrary version string (clients can request specific versions) |
| `idempotency` | no | `none` (default), `optional`, or `required` |
| `start` | yes | The entry-point step |
| `steps` | no | Named steps (map of step name → step definition) |
| `terminals` | no | Custom terminal states (map of name → `{status: ...}`) |
| `plans` | no | Inline plan definitions (map of plan name → plan config) |
| `schedule` | no | Cron or interval schedule for automatic runs |
| `trigger` | no | Stream trigger — starts a run per event |
| `searchAttributes` | no | Custom queryable fields extracted from input |

### Steps

A step is the smallest unit of work. There are two kinds:

#### Run Step

Executes a target and transitions based on the outcome:

```yaml
charge:
  run: "@actions/charge-payment"      # target
  inputMapping: '{"amount": "$.input.amount"}'  # optional JSONPath transform
  retry:                               # optional retry policy
    max_attempts: 3
    backoff: exponential
  poll:                                # optional pending-outcome polling
    maxAttempts: 10
    backoff: exponential
  transitions:
    success: ship
    failure: flo.Failed
    pending: check_status              # only if poll is configured
    target_not_found: flo.Failed       # execution-level outcome
```

Targets use a prefix to indicate what to invoke:

| Prefix | Invokes | Example |
|--------|---------|---------|
| `@actions/` | A registered action (WASM or user-hosted) | `@actions/charge-stripe` |
| `@plan/` | An inline plan defined in the same workflow | `@plan/payment` |
| `@workflow/` | A child workflow (starts a nested run) | `@workflow/fulfillment` |

#### Wait For Signal Step

Pauses the workflow until an external signal arrives or a timeout expires:

```yaml
await_approval:
  waitForSignal:
    type: approval                     # signal type to match
    timeoutMs: 3600000                 # 1 hour timeout (optional)
    onTimeout: flo.Failed              # transition on timeout (optional)
  transitions:
    success: fulfill                   # after signal received
```

When a signal of the matching type is delivered, the engine follows the `success` transition. If `timeoutMs` is configured and the timeout expires before a signal arrives, the engine either follows `onTimeout` (if set) or transitions the run to `timed_out`.

### Step Outcomes

Each step produces an **outcome** string that maps to a transition target.

**Business outcomes** (from your action's return value):

| Outcome | Meaning |
|---------|---------|
| `success` | Action completed successfully |
| `failure` | Action reported a failure |
| `timeout` | Action timed out |
| `pending` | Action is still running (async/polling) |

**Execution-level outcomes** (from the runtime, before your logic runs):

| Outcome | Meaning |
|---------|---------|
| `target_not_found` | The action or plan doesn't exist |
| `target_disabled` | The action is disabled |
| `execution_failure` | Internal error during dispatch |

Execution-level outcomes **cascade through a fallback chain**: the engine tries `target_not_found` → `execution_failure` → `failure` in order, using the first transition that matches. Business outcomes match exactly — no fallback.

### Transitions

Transitions map outcomes to the next step or to a terminal:

```yaml
transitions:
  success: next_step          # go to named step
  failure: flo.Failed         # go to built-in terminal
  timeout: PaymentFailed      # go to custom terminal
```

### Terminal States

Terminals end the workflow run. Four are built-in:

| Terminal | Status | Description |
|----------|--------|-------------|
| `flo.Completed` | `completed` | Workflow succeeded |
| `flo.Failed` | `failed` | Workflow failed |
| `flo.Cancelled` | `cancelled` | Cancelled by user |
| `flo.TimedOut` | `timed_out` | Signal timeout |

You can define **custom terminals** that map to a base status:

```yaml
terminals:
  PaymentFailed:
    status: failed
  FraudDetected:
    status: failed
  OrderCompleted:
    status: completed
```

Custom terminals appear in history events, giving you finer-grained tracking than the four base statuses.

### Run Lifecycle

A workflow run passes through these states:

```
pending → running ⇄ waiting → completed
                            → failed
                            → cancelled
                            → timed_out
```

| Status | Description |
|--------|-------------|
| `pending` | Created but not yet started |
| `running` | Actively executing steps |
| `waiting` | Blocked on a signal, async action, or poll timer |
| `completed` | Reached a terminal with `completed` status |
| `failed` | Reached a terminal with `failed` status |
| `cancelled` | Cancelled by a user via `flo workflow cancel` |
| `timed_out` | Signal wait timed out with no timeout target |

---

## Retries

Any run step can have a `retry:` block:

```yaml
start:
  run: "@actions/flaky-service"
  retry:
    max_attempts: 5                   # total attempts including first
    backoff: exponential_jitter       # constant | linear | exponential | exponential_jitter
    initial_delay_ms: 500             # delay before first retry
    max_delay_ms: 30000               # cap on backoff delay
    within_ms: 120000                 # total time budget (optional)
  transitions:
    success: flo.Completed
    failure: flo.Failed
```

When the step outcome is `failure` or `execution_failure` and retries remain, the engine re-executes the same step immediately (the retry counter increments). Retries reset when the step transitions to a different step.

### Backoff Strategies

| Strategy | Delay formula |
|----------|--------------|
| `constant` | `initial_delay_ms` always |
| `linear` | `initial_delay_ms × (attempt + 1)` |
| `exponential` | `initial_delay_ms × 2^attempt`, capped at `max_delay_ms` |
| `exponential_jitter` | Exponential + up to 25% random jitter |

---

## Inline Plans

Plans let you define **multiple executors** for the same logical step — a failover chain with smart routing. Plans are defined inline in the workflow YAML under the `plans:` key.

```yaml
plans:
  payment:
    selection: health-weighted
    
    executors:
      - name: stripe-primary
        action: "@actions/charge-stripe"
        priority: 100
        retry:
          max_attempts: 3
          backoff: exponential
          initial_delay_ms: 1000
          max_delay_ms: 30000
        breaker:
          failure_threshold: 5
          cooldown_ms: 30000
          half_open_max_calls: 3
        rate_limit:
          max_per_second: 100
          max_per_minute: 5000
        tracking:
          mode: async
          timeout_ms: 300000

      - name: adyen-fallback
        action: "@actions/charge-adyen"
        priority: 50
        retry:
          max_attempts: 2
          backoff: exponential_jitter
          initial_delay_ms: 500
          max_delay_ms: 10000

    health:
      window_ms: 300000
      decay: 0.9
      min_samples: 10

    cache:
      ttl_ms: 3600000
      key: "charge:{input.customer_id}:{input.idempotency_key}"
      invalidate_on: ["payment.refunded", "customer.deleted"]

    fallback:
      value: '{"status": "declined", "reason": "all_providers_unavailable"}'
      condition: exhausted

    errors:
      retryable: ["timeout", "rate_limited", "temporary_failure"]
      fatal: ["invalid_card", "fraud_detected", "insufficient_funds"]
```

Reference the plan from a step:

```yaml
start:
  run: "@plan/payment"
  transitions:
    success: notify
    failure: flo.Failed
```

### Selection Strategies

| Strategy | Behavior |
|----------|----------|
| `static-order` | Always try executors in priority order (highest first) |
| `round-robin` | Rotate the starting executor across requests |
| `random` | Random selection for even load distribution |
| `health-weighted` | Prefer executors with higher health scores; requires `health:` config |

### Circuit Breakers

Each executor can have an independent circuit breaker:

```yaml
breaker:
  failure_threshold: 5       # consecutive failures before opening
  cooldown_ms: 30000         # how long to stay open before half-open
  half_open_max_calls: 3     # probe requests allowed in half-open state
```

States:
- **Closed** — Normal operation, requests flow through
- **Open** — Executor is skipped (after `failure_threshold` consecutive failures)
- **Half-open** — After `cooldown_ms`, allows `half_open_max_calls` probe requests. If probes succeed → closed. If probes fail → open again.

### Rate Limiting

```yaml
rate_limit:
  max_per_second: 100
  max_per_minute: 5000
  max_per_hour: 50000       # all three are optional
```

### Async Tracking

Some executors (e.g., user-hosted HTTP actions) report their outcome asynchronously via webhook:

```yaml
tracking:
  mode: async               # sync (default) | async
  timeout_ms: 300000        # timeout for async outcome
```

When `mode: async`, the workflow parks in `waiting` until the action result arrives or the timeout expires.

### Health Tracking

When `selection: health-weighted`, the engine tracks per-executor success rates:

```yaml
health:
  window_ms: 300000         # rolling window for health calculation
  decay: 0.9                # exponential decay factor (0–1]
  min_samples: 10           # minimum samples before health-weighted kicks in
```

Until `min_samples` is reached, the engine falls back to priority-based ordering.

### Result Caching

```yaml
cache:
  ttl_ms: 3600000           # cache TTL
  key: "charge:{input.customer_id}:{input.idempotency_key}"
  invalidate_on:
    - payment.refunded
    - customer.deleted
```

### Fallback Values

When all executors fail, the plan can return a static fallback:

```yaml
fallback:
  value: '{"status": "declined", "reason": "all_providers_unavailable"}'
  condition: exhausted       # exhausted (all executors failed) | any_error
```

### Error Classification

Classify error codes to control retry behavior:

```yaml
errors:
  retryable:
    - timeout
    - rate_limited
    - temporary_failure
  fatal:
    - invalid_card
    - fraud_detected
```

Retryable errors trigger the executor's retry policy. Fatal errors skip retries and immediately try the next executor (or return failure).

---

## Signals

Signals are typed external events delivered to a running workflow. They're used for human-in-the-loop approvals, webhooks, callbacks, or any scenario where the workflow must wait for an asynchronous external event.

### Defining a Signal Wait

```yaml
steps:
  await_approval:
    waitForSignal:
      type: manager_approval           # signal type to match
      timeoutMs: 86400000              # 24 hour timeout
      onTimeout: OrderRejected         # step or terminal on timeout
    transitions:
      success: fulfill_order           # after signal received
```

### Sending a Signal

```bash
flo workflow signal <run-id> --type manager_approval '{"decision": "approved"}'
```

When the signal arrives:
1. It's stored in the run's signal history
2. If the run is `waiting` for this signal type, the engine resumes and follows the `success` transition
3. If the run is not waiting, the signal is stored for future matching

### Signal Timeout Behavior

If `timeoutMs` is set and the timeout expires:
- If `onTimeout` is set → transition to that step or terminal
- If `onTimeout` is not set → the run transitions to `timed_out` status

The engine periodically checks waiting runs for timeouts and resumes them automatically.

---

## Polling

When an action returns a `pending` outcome (e.g., a payment that's still processing), you can configure the step to poll with backoff until a terminal outcome arrives:

```yaml
steps:
  check_status:
    run: "@actions/check-payment-status"
    poll:
      initialDelayMs: 2000            # wait before first poll
      maxAttempts: 30                  # max poll attempts
      backoff: exponential             # constant | linear | exponential | exponential_jitter
      baseDelayMs: 2000               # base delay between polls
      maxDelayMs: 30000               # cap on poll delay
    transitions:
      success: notify
      failure: payment_failed
      timeout: payment_timeout         # max attempts exceeded
```

Each poll re-executes the action. If the outcome is still `pending`, the engine parks the run and schedules the next poll. If the outcome becomes `success` or `failure`, the engine follows the corresponding transition.

---

## JSONPath Data Flow

Steps can transform their input using JSONPath expressions. This lets you wire data from the workflow input or from previous step outputs into the current step's input.

### Input Mapping

```yaml
steps:
  enrich:
    run: "@actions/enrich-customer"
    inputMapping: '{"customer_id": "$.input.customer_id", "domain": "$.input.company_domain"}'
    transitions:
      success: charge
      failure: flo.Failed

  charge:
    run: "@actions/charge-payment"
    inputMapping: '{"email": "$.steps.enrich.output.email", "amount": "$.input.amount"}'
    transitions:
      success: flo.Completed
      failure: flo.Failed
```

### Available Paths

| Path Pattern | Resolves To |
|-------------|-------------|
| `$.input` | The workflow run's input JSON |
| `$.input.field.subfield` | A nested field from the input |
| `$.steps.{name}.output` | The full output of a previously completed step |
| `$.steps.{name}.output.field` | A nested field from a step's output |
| `$.steps.{name}.outcome` | The outcome string of a step (`success`, `failure`, etc.) |
| `$.flo.run_id` | The current workflow run ID |
| `$.flo.timestamp` | Current epoch timestamp in milliseconds |

String values in the input mapping that start with `$.` are treated as path references and resolved at runtime. Non-path values are passed through as-is.

---

## Idempotency

Workflows support idempotency keys to prevent duplicate processing:

```yaml
kind: Workflow
name: process-order
version: "1.0.0"
idempotency: required            # none | optional | required
```

| Mode | Behavior |
|------|----------|
| `none` | No idempotency checking (default) |
| `optional` | Idempotency key accepted but not required |
| `required` | Every `workflow start` must include an idempotency key |

When an idempotency key is provided and a run with the same key already exists for this workflow, the existing run ID is returned instead of creating a new run.

```bash
flo workflow start process-order '{"order_id":"ORD-123"}' --idempotency-key order-123
# → wfrun-1

flo workflow start process-order '{"order_id":"ORD-123"}' --idempotency-key order-123
# → wfrun-1  (same run, no duplicate)
```

---

## Scheduling

Workflows can run on a recurring schedule using cron expressions or fixed intervals:

### Cron Schedule

```yaml
kind: Workflow
name: reconcile-accounts
version: "1.0.0"

schedule:
  cron: "0 */6 * * *"             # every 6 hours
  max_concurrent: 1               # at most 1 run at a time
  input: '{"mode": "full"}'       # input for scheduled runs

start:
  run: "@actions/reconcile"
  transitions:
    success: generate_report
    failure: flo.Failed

steps:
  generate_report:
    run: "@actions/reconcile-report"
    transitions:
      success: flo.Completed
      failure: flo.Failed
```

### Interval Schedule

```yaml
schedule:
  interval: 30000                  # every 30 seconds
  max_concurrent: 1
  input: '{"mode": "incremental"}'
```

### Cron Expression Syntax

Standard 5-field cron: `minute hour day-of-month month day-of-week`

| Field | Range | Special Characters |
|-------|-------|-------------------|
| Minute | 0–59 | `*` `,` `-` `/` |
| Hour | 0–23 | `*` `,` `-` `/` |
| Day of month | 1–31 | `*` `,` `-` `/` |
| Month | 1–12 | `*` `,` `-` `/` |
| Day of week | 0–7 (0 and 7 = Sunday) | `*` `,` `-` `/` |

Examples:

| Expression | Meaning |
|------------|---------|
| `*/5 * * * *` | Every 5 minutes |
| `0 */6 * * *` | Every 6 hours |
| `0 9 * * 1-5` | 9 AM weekdays |
| `0 0 1 * *` | Midnight on the 1st of each month |
| `30 2 * * 0` | 2:30 AM every Sunday |

### Schedule Options

| Field | Default | Description |
|-------|---------|-------------|
| `cron` | — | Cron expression (mutually exclusive with `interval`) |
| `interval` | — | Interval in milliseconds (mutually exclusive with `cron`) |
| `max_concurrent` | `1` | Maximum concurrent runs from this schedule |
| `input` | `"{}"` | Input JSON override for scheduled runs |
| `paused` | `false` | Whether the schedule starts paused |

Disabling a workflow (`flo workflow disable`) pauses the schedule. Re-enabling resumes it.

---

## Stream Triggers

Stream triggers start a workflow run for each event on a Flo stream. This turns a workflow into an event-driven processor.

```yaml
kind: Workflow
name: order-processor
version: "1.0.0"

trigger:
  stream: orders                     # source stream name
  namespace: prod                    # source namespace (optional)
  consumer_group: wf-orders          # consumer group (optional, auto-generated)
  mode: shared                       # shared | exclusive | key_shared
  batch_size: 1                      # events per run (1 = single, >1 = array)

start:
  run: "@actions/process-order"
  transitions:
    success: flo.Completed
    failure: flo.Failed
```

The event payload becomes `$.input` inside the workflow and is accessible via JSONPath.

| Field | Default | Description |
|-------|---------|-------------|
| `stream` | — | Source stream name (required) |
| `namespace` | workflow's namespace | Source stream namespace |
| `consumer_group` | `wf-{workflow_name}` | Consumer group name |
| `mode` | `shared` | `shared` (competing consumers), `exclusive` (single consumer), `key_shared` (partition-key affinity) |
| `batch_size` | `1` | Events per workflow run |

---

## Search Attributes

Search attributes let you extract queryable fields from workflow input for filtering and discovery:

```yaml
searchAttributes:
  - name: customer_id
    type: string
    from: input.customer_id
  - name: order_amount
    type: number
    from: input.amount
  - name: created_at
    type: timestamp
    from: input.timestamp
```

| Type | Description |
|------|-------------|
| `string` | Text value |
| `number` | Numeric value |
| `timestamp` | Epoch timestamp |

---

## Child Workflows

A step can start a child workflow using the `@workflow/` prefix:

```yaml
start:
  run: "@workflow/payment-flow"
  transitions:
    success: flo.Completed
    failure: flo.Failed
```

The parent workflow waits for the child to reach a terminal state, then follows the corresponding transition. The child's completion maps to `success`; the child's failure maps to `failure`.

You can also specify a version:

```yaml
start:
  run: "@workflow/payment-flow:2.0.0"
  transitions:
    success: flo.Completed
    failure: flo.Failed
```

---

## Disable / Enable

Workflows can be disabled at runtime to prevent new runs from starting:

```bash
flo workflow disable reconcile-accounts
```

When disabled:
- The cron schedule is paused
- Manual starts via `flo workflow start` are blocked
- **Existing running instances are not affected**

To re-enable:

```bash
flo workflow enable reconcile-accounts
```

---

## Validation

Workflow definitions are validated on create. The validator checks:

| Category | Checks |
|----------|--------|
| **Structure** | `kind`, `name`, `version`, and `start` are present |
| **References** | All `@actions/*`, `@plan/*`, and `@workflow/*` targets are well-formed |
| **Transitions** | Every transition target is a valid step name, custom terminal, or built-in terminal |
| **Reachability** | All steps are reachable from `start` (warnings for unreachable steps) |
| **Duplicates** | No duplicate step names, terminal names, or executor names within a plan |
| **Plans** | Each plan has at least one executor; executor configs are valid |
| **Health** | Decay in (0, 1], min\_samples > 0, window\_ms > 0 |
| **Signals** | `waitForSignal` steps warn if no timeout is configured |

Validation errors are reported with error codes (E1xx–E5xx) and human-readable messages.

---

## Execution Model

### How Steps Execute

1. The engine starts at the `start` step
2. For `run` steps:
   - If `inputMapping` is set, resolve JSONPath references against `$.input` and `$.steps.*`
   - Invoke the target (action, plan, or child workflow)
   - WASM actions complete synchronously; user-hosted actions may complete asynchronously
   - If the action returns `pending` and `poll:` is configured, schedule the next poll
   - On outcome, check retries (if `failure` and retries remain, re-execute)
   - Follow the matching transition to the next step or terminal
3. For `waitForSignal` steps:
   - Check if a matching signal was already received before parking
   - If yes, follow the `success` transition immediately
   - If no, set status to `waiting` and record the timeout deadline
4. Repeat until a terminal state is reached or `MAX_ADVANCE_STEPS` (256) is hit

### Async Action Handling

When a user-hosted action doesn't complete immediately, the workflow parks:

1. Run status → `waiting`
2. The action run ID and step name are stored
3. The engine periodically checks (`checkPendingActions`) for completed action results
4. When the action completes, the engine resumes the workflow from that step and continues advancing

### History Events

Every significant state change is recorded as a history event:

| Event Type | Detail |
|------------|--------|
| `workflow_started` | Input JSON |
| `step_started` | Step name |
| `step_completed` | Step name |
| `step_retry` | Step name |
| `waiting_for_signal` | Signal type |
| `signal_received` | Signal type |
| `signal_matched` | Signal type |
| `signal_timeout` | Timeout target |
| `action_not_found` | Action name |
| `action_disabled` | Action name |
| `awaiting_action` | Action name |
| `action_completed` | Outcome |
| `workflow_completed` | Terminal name |
| `workflow_failed` | Terminal name |
| `workflow_cancelled` | Reason |
| `workflow_timed_out` | Detail |

### Persistence

Workflow definitions and run state are persisted to the Unified Append Log (UAL). On node restart, the engine replays persisted entries to rebuild in-memory state:

- `workflow_create` entries restore the definition registry
- `workflow_start` entries restore the run registry

This ensures workflows survive node restarts without external databases.

---

## Complete Example: Payment Processing

This example demonstrates inline plans, health-weighted routing, circuit breakers, polling, and caching:

```yaml
kind: Workflow
name: payment-processing
version: "1.0.0"
idempotency: required

plans:
  charge-payment:
    selection: health-weighted
    executors:
      - name: stripe-primary
        action: "@actions/charge-stripe"
        priority: 100
        retry:
          max_attempts: 3
          backoff: exponential
          initial_delay_ms: 1000
          max_delay_ms: 30000
          within_ms: 120000
        breaker:
          failure_threshold: 5
          cooldown_ms: 30000
          half_open_max_calls: 3
        rate_limit:
          max_per_second: 100
        tracking:
          mode: async
          timeout_ms: 300000
      - name: adyen-fallback
        action: "@actions/charge-adyen"
        priority: 50
        retry:
          max_attempts: 2
          backoff: exponential_jitter
    health:
      window_ms: 300000
      decay: 0.9
      min_samples: 10
    cache:
      ttl_ms: 3600000
      key: "charge:{input.customer_id}:{input.idempotency_key}"
      invalidate_on: ["payment.refunded"]
    fallback:
      value: '{"status": "declined", "reason": "all_providers_unavailable"}'
      condition: exhausted
    errors:
      retryable: ["timeout", "rate_limited"]
      fatal: ["invalid_card", "fraud_detected"]

start:
  run: "@plan/charge-payment"
  inputMapping: '{"customer_id": "$.input.customer_id", "amount": "$.input.amount"}'
  transitions:
    success: notify_customer
    pending: check_payment_status
    failure: flo.Failed

steps:
  check_payment_status:
    run: "@actions/check-payment-status"
    inputMapping: '{"payment_id": "$.steps._start.output.payment_id"}'
    poll:
      initialDelayMs: 2000
      maxAttempts: 30
      backoff: exponential
      baseDelayMs: 2000
      maxDelayMs: 30000
    transitions:
      success: notify_customer
      failure: flo.Failed

  notify_customer:
    run: "@actions/send-notification"
    inputMapping: '{"customer_id": "$.input.customer_id", "template": "payment_success"}'
    transitions:
      success: flo.Completed
      failure: flo.Completed       # notification failure doesn't fail the workflow
```

---

## Complete Example: Order Processing with Signals

```yaml
kind: Workflow
name: order-processing
version: "1.0.0"
idempotency: required

terminals:
  OrderCompleted:
    status: completed
  OrderRejected:
    status: failed
  PaymentFailed:
    status: failed

start:
  run: "@actions/validate-order"
  transitions:
    success: process_payment
    failure: flo.Failed

steps:
  process_payment:
    run: "@actions/charge-payment"
    retry:
      max_attempts: 3
      backoff: exponential
      initial_delay_ms: 1000
    transitions:
      success: check_approval
      failure: PaymentFailed

  check_approval:
    run: "@actions/check-approval-needed"
    transitions:
      success: fulfill              # no approval needed
      failure: await_approval       # high-value order, needs approval

  await_approval:
    waitForSignal:
      type: approval
      timeoutMs: 3600000            # 1 hour
      onTimeout: OrderRejected
    transitions:
      success: fulfill

  fulfill:
    run: "@actions/ship-order"
    transitions:
      success: OrderCompleted
      failure: flo.Failed
```

Trigger the approval:

```bash
flo workflow signal wfrun-42 --type approval '{"decision": "approved", "approver": "manager@co.com"}'
```

---

## Related Docs

- [Actions](/orchestration/actions/) — Actions are the building blocks that workflows compose
- [Stream Processing](/orchestration/processing/) — For continuous, stateless data pipelines (filter/map/aggregate)
- [Streams](/data/streams/) — Source data for stream triggers
- [KV Store](/data/kv/) — Used by actions for state lookups
