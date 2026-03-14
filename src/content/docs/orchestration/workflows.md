---
title: Workflows
description: Multi-step orchestration with YAML definitions, signals, timers, and circuit breakers.
---

Workflows orchestrate multi-step business processes by composing [Actions](/orchestration/actions/) with built-in resilience patterns: circuit breakers, health-weighted routing, retries, signals, and timers.

## Defining a Workflow

Workflows are defined in YAML:

```yaml
kind: Workflow
name: process-order
version: "1.0.0"

plans:
  payment:
    selection: health-weighted
    executors:
      - name: stripe
        run: "@actions/charge-stripe"
        priority: 100
        breaker: { failureThreshold: 5, cooldownMs: 60000 }
      - name: braintree
        run: "@actions/charge-braintree"
        priority: 90

start:
  run: "@actions/validate-order"
  transitions:
    success: charge
    failure: flo.Failed

steps:
  charge:
    run: "@plan/payment"
    transitions:
      success: ship
      exhausted: manual_review

  ship:
    run: "@actions/create-shipment"
    transitions:
      success: flo.Completed

  manual_review:
    run: flo.WaitForSignal
    signal: manager_approval
    timeout: 24h
    transitions:
      approved: charge
      rejected: flo.Failed
      timeout: flo.Failed
```

## Concepts

### Steps

Each step executes an action and transitions based on the result. Built-in terminal states:
- `flo.Completed` — Workflow succeeded
- `flo.Failed` — Workflow failed

### Plans

Plans provide intelligent routing between multiple executors for the same logical step. Selection strategies:
- **`health-weighted`** — Routes based on executor health scores and circuit breaker state
- **`priority`** — Tries executors in priority order
- **`round-robin`** — Distributes evenly

### Circuit Breakers

Each executor in a plan can have a circuit breaker:

```yaml
breaker:
  failureThreshold: 5      # Open after 5 consecutive failures
  cooldownMs: 60000         # Stay open for 60 seconds before half-open
```

### Signals

Steps can wait for external signals:

```yaml
manual_review:
  run: flo.WaitForSignal
  signal: manager_approval
  timeout: 24h
```

Send a signal via CLI:

```bash
flo workflow signal <run-id> manager_approval '{"decision": "approved"}'
```

### Timers

Steps can include timeouts that trigger automatic transitions.

## CLI Usage

```bash
# Create a workflow from YAML
flo workflow create --file order-workflow.yaml

# Start an instance
flo workflow start process-order '{"order_id": "ORD-123", "amount": 99.99}'

# Send a signal
flo workflow signal <run-id> manager_approval '{"decision": "approved"}'

# Check status
flo workflow status <run-id>

# List workflows
flo workflow list
```

## Execution Model

1. Workflow starts at the `start` step
2. Each step invokes an action (or plan)
3. The action result determines which transition to follow
4. The workflow continues until reaching a terminal state (`flo.Completed` or `flo.Failed`)
5. All state transitions are Raft-replicated for durability
6. If a node fails mid-workflow, another node picks up from the last committed state
