# Backend Logging and Observability

> Logging requirements for an inspectable, replayable multi-agent simulation.

## Core Principle

Observability is a product feature. Users and developers must be able to answer why an agent acted, what memory influenced it, which model call ran, and how to replay the result.

## Structured Logging

Prefer structured logs/events over prose-only logs.

Common fields:

- `worldId`
- `stepId`
- `simulationTime`
- `inputId?`
- `eventId?`
- `agentId?`
- `conversationId?`
- `operationId?`
- `memoryId?`
- `durationMs?`
- `status`
- `errorCode?`

## What to Capture

### Simulation

- step start/end, simulated time range, duration, and event count;
- queued inputs processed and rejected;
- deterministic state transitions such as pause/resume/archive;
- replay snapshot creation and replay errors.

### Agent Runtime

- eligible agent ticks;
- cognitive phase: perceive, retrieve, plan, act, remember, reflect;
- selected action proposal and validation result;
- in-flight operation creation/completion/failure;
- cooldown decisions that suppress repeated conversations.

### Memory and Reflection

- memory writes with type, source event IDs, importance, visibility;
- retrieval query/focal event and top-k candidate scores;
- reflection trigger reason and evidence memory IDs;
- embedding cache hit/miss and provider/model/dimension.

### LLM Operations

- operation kind, prompt schema version, provider, model;
- token counts, cost estimate, latency;
- structured-output validation status;
- provider error category and retry count.

### Conversations

- invite/accept/reject/join/end transitions;
- participant IDs and lifecycle state;
- message count and summary operation status;
- per-participant memory creation after end.

## Log Levels

- `debug`: retrieval scores, prompt schema versions, detailed decision traces.
- `info`: simulation step summary, operation completion, conversation lifecycle transitions.
- `warn`: recoverable validation failures, throttling, skipped reflection, retryable provider errors.
- `error`: failed operations, invariant failures, persistence failures, replay failures.

## Sensitive Data Rules

Do not log:

- API keys, tokens, credentials, or provider secrets;
- full user private content in normal production logs;
- full prompts or transcripts unless debug mode explicitly enables secured diagnostic capture;
- copyrighted official dialogue or extracted assets.

If raw prompts/responses are persisted for debugging, gate them behind explicit debug configuration and redact secrets.

## Diagnostics vs User Timeline

Separate developer diagnostics from user-facing timeline events.

- Timeline events show story-relevant outcomes and user-visible failures.
- Diagnostics explain engine/model/memory internals.
- Both should link through stable IDs.

## Verification

When implementation exists, tests or smoke checks should verify:

- failed model output has an operation diagnostic;
- memory retrieval exposes component scores;
- event log entries include source and caused-by IDs;
- no secret-like environment values appear in logs.
