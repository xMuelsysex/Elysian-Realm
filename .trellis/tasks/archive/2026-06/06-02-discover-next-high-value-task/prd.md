# Discover Next High Value Task

## Goal

Identify the next high-value development task for Elysian Realm based on repository evidence, completed Trellis history, and current frontend/backend specs.

## User Value

The project has a working deterministic simulation core and a local observability/admin dashboard. The next task should move the project from an inspectable debug MVP toward a more living, replayable realm while preserving the offline, typed, backend-authoritative architecture.

## Confirmed Facts

- The repository is a TypeScript ESM project with React + Vite local UI and Node built-in `http` admin API.
- `README.md` defines the current product as a local-only debug/admin interface for a deterministic offline simulation.
- Current scripts include `npm run dev`, `npm run typecheck`, `npm test`, `npm run build:server`, and `npm run build:ui`.
- Existing source areas:
  - `src/server/simulation/**`: deterministic world seed, step engine, input validation, event validation, replay summary.
  - `src/server/admin/**`: in-memory admin controller/API and structured error responses.
  - `src/app/**`: local dashboard with world header, location board, agent detail, timeline, interventions, replay/debug, diagnostics, diff/export, memory/message placeholder views.
  - `src/server/personas/**`: immutable pilot persona fixtures and validation.
- Current tests cover persona validation, simulation engine behavior, admin controller/server behavior, and frontend view-model projections.
- Completed recent tasks include:
  - offline simulation engine MVP;
  - debug admin interface MVP;
  - event detail projection optimization;
  - agent detail panel MVP;
  - observability UI feature suite.
- Current engine startup emits stable first-step events (`world.created`, `agent.spawned`, `world.timeAdvanced`, `agent.startedRoutine`, `memory.seeded`). Later steps primarily advance time unless inputs are submitted.
- Current `memory.seeded` is explicitly event-only; no `MemoryRecord` storage exists yet.
- Current active conversations are present in the snapshot contract but are seeded empty and have no implemented lifecycle.
- Specs recommend the frontend priority order: world clock/timeline, agent cards/profile panels, active/archived conversation view, intervention form, replay controls, debug diagnostics.
- Specs require the backend simulation engine to remain the single authority for active world state; UI, LLM operations, memory, and persistence must not directly patch runtime state.

## Candidate Next Tasks

### 1. Deterministic Agent Routine Progression MVP — Recommended

Add a backend-owned deterministic agent tick that advances pilot agents through configured routine activities over time, updates runtime `currentAction`/location/status through the engine, and emits validated action/movement/routine events that the existing dashboard can already inspect.

Why this is high-value:

- It makes the realm visibly alive without adding LLM, database, auth, or provider secrets.
- It uses existing persona routines, simulation step loop, timeline, topology, agent plan, state diff, and replay UI.
- It creates richer event data needed before memory, conversations, and LLM operations become meaningful.
- It keeps risk controlled because behavior can be deterministic and fully tested offline.

Likely acceptance shape:

- Multiple simulation steps produce deterministic agent routine/action changes, not only `world.timeAdvanced`.
- Agent runtime state changes only inside `stepSimulationEngine`.
- New/updated event kinds have centralized payload validators and frontend projections.
- Replay summary remains deterministic for the same seed and inputs.
- Existing admin dashboard panels show meaningful movement/action paths without UI-owned simulation rules.
- `npm run typecheck`, `npm test`, and `npm run build` pass.

Trade-off:

- This improves ambient simulation depth, but it does not yet add user-facing conversation transcripts, durable memory, or real LLM reasoning.

### 2. Active Conversation Lifecycle MVP

Implement deterministic active/archived conversation metadata and message-like events for direct messages or realm event invitations.

Why it is valuable:

- Frontend specs list active/archived conversation view as the next UX priority after timeline and agent profiles.
- Existing UI already has a message stream panel, but current backend events do not create real conversation lifecycles.

Trade-off:

- Conversations without agent routine progression or memory may feel shallow unless scoped carefully to deterministic transcripts/metadata.

### 3. MemoryRecord Store MVP

Implement append-only per-agent `MemoryRecord` storage for user interventions, observations, and event-derived memories, while keeping persona fixtures immutable.

Why it is valuable:

- Current memory is explicitly deferred/event-only.
- Memory records are required for later retrieval, reflection, conversation summaries, and generated content provenance.

Trade-off:

- Introducing memory storage before richer events/conversations may create infrastructure with limited visible behavior.

### 4. Fake LLM Operation Boundary MVP

Add provider-agnostic operation records, fake provider tests, structured output validation, and diagnostics without calling live network providers.

Why it is valuable:

- It establishes the safe boundary needed for future LLM-driven action proposals, conversations, and reflections.

Trade-off:

- It is architecture-heavy and less visibly useful until agent actions/conversations consume operation outputs.

### 5. Persona Roster / Content Expansion

Migrate or expand the pilot roster/content toward research-backed persona choices and richer routine facts.

Why it is valuable:

- Content quality affects believability.

Trade-off:

- It is less foundational than improving the engine loop, and official/source-content boundaries must stay strict.

## Recommendation

Initial repository-evidence recommendation was **Deterministic Agent Routine Progression MVP** because it makes the existing observability UI immediately show richer world changes without new external dependencies.

User preference after review: prioritize **LLM Integration / Operation Boundary MVP** first.

Adjusted recommendation: implement LLM integration as a safe backend boundary rather than direct engine/provider coupling:

- provider-agnostic interface, OpenAI-compatible by default;
- deterministic fake provider for all tests;
- environment-variable configuration for real provider/base URL/model/API key;
- no hard-coded secrets or provider-specific logic in the simulation engine;
- operation records/diagnostics for prompts, status, latency/token/cost metadata when available;
- structured output validation before any result can affect world state;
- live network calls optional for local development and never required by `npm test`.

Rationale: this satisfies the user's desire to connect a large model while preserving the existing backend-authoritative, offline-testable architecture. It also prevents secrets, flaky network calls, or invalid model output from becoming hidden simulation state.

## Out of Scope For This Discovery Task

- Implementing any feature code.
- Selecting a database or persistence layer.
- Adding live LLM/provider calls.
- Editing persona canon/content beyond identifying candidate work.
- Creating production deployment/auth scope.

## Acceptance Criteria

- [x] Repository evidence is inspected before asking product-direction questions.
- [x] Completed Trellis tasks and current specs are considered.
- [x] Candidate next tasks are listed with value and trade-offs.
- [x] A recommended next task is identified.
- [x] The user chooses or adjusts the next task direction.

## User Direction

Proceed toward LLM integration first, with final scope still to be confirmed.

## Decision

The next implementation direction is **OpenAI-compatible LLM Boundary MVP**.

Scope preference:

- Use an OpenAI-compatible HTTP/provider boundary, not a single hard-coded vendor SDK.
- Support configuration by environment variables such as base URL, model, and API key.
- Keep fake provider as the default for tests and deterministic development checks.
- Do not require live network/model calls for `npm test` or core simulation tests.
- Do not store secrets in source, fixtures, Trellis files, or committed config.

## Open Question

None for discovery. The next step is to create a separate implementation task for the OpenAI-compatible LLM boundary.
