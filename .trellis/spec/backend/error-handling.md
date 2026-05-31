# Backend Error Handling

> Error handling rules for simulation, LLM operations, memory, persistence, and API boundaries.

## Core Principle

Failures in a multi-agent simulation are part of the observable system. They must be visible, diagnosable, and replay-safe. Do not convert errors into fake successful agent behavior.

## Error Categories

Use typed error categories at boundaries:

- `ValidationError`: invalid command, persona fixture, event payload, or model output.
- `NotFoundError`: missing world, agent, location, conversation, memory, or operation.
- `ConflictError`: invalid state transition such as duplicate active conversation membership.
- `ProviderError`: LLM or embedding provider failure, quota, rate limit, moderation rejection, timeout.
- `OperationError`: async operation failed validation or could not submit its result input.
- `PersistenceError`: transaction, migration, or repository failure.
- `ReplayError`: event log or snapshot cannot reconstruct expected state.

If the stack already provides standard error classes, map these categories onto that system rather than inventing duplicate hierarchies.

## Boundary Handling

### Command/API Boundary

- Validate raw input before it enters the simulation queue.
- Return structured errors with stable `code`, human-readable `message`, and optional `details`.
- Do not expose secrets, raw prompts, API keys, or full provider payloads to normal clients.
- Include request/input IDs so failures can be traced to logs.

### Simulation Engine

- Invalid inputs should emit a rejected input result and diagnostic event, not partially mutate state.
- Invariant failures should stop the affected step and preserve enough context for replay/debug.
- State transitions must be explicit: `running -> paused`, `invited -> participating`, etc.

### Agent Operations

- Failed LLM/embedding operations remain operation records with `failed`, `timedOut`, or `cancelled` status.
- Failed operations may set agent status to `error` or `waiting`, but must not create a normal action event.
- Retrying is allowed only if the retry is logged and idempotent.

### Memory and Reflection

- Invalid reflection JSON or malformed evidence IDs should fail the reflection operation.
- Do not create reflection memories without evidence links.
- Do not silently assign default importance when importance parsing fails unless the diagnostic records that fallback explicitly and the product accepts it.

## Structured Error Shape

Recommended shape for API-visible errors:

```json
{
  "code": "INVALID_SIMULATION_INPUT",
  "message": "The target agent is already in a conversation.",
  "details": {
    "worldId": "...",
    "inputId": "...",
    "agentId": "..."
  }
}
```

Internal diagnostics may include additional fields such as stack traces, raw model output, prompt schema version, and provider status code.

## Forbidden Patterns

- Broad `catch` blocks that return a generic agent action.
- Treating JSON parse failures as empty output.
- Swallowing rate-limit failures and continuing with a fabricated response.
- Writing partial memory/event records after a transaction failure.
- Returning raw provider errors with secrets or full prompt text to the frontend.

## Testing Requirements

Add tests when implementation exists for:

- invalid command rejected before state mutation;
- malformed LLM structured output produces failed operation diagnostics;
- provider timeout does not corrupt world state;
- failed conversation summary does not create fake memory;
- replay exposes missing/invalid event payloads clearly.
