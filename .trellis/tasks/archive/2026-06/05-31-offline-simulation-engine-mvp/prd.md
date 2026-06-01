# Offline Simulation Engine MVP

## Goal

Implement the first deterministic, no-network simulation engine slice for the Elysian Realm observation-terminal project.

The MVP should turn the existing shared simulation contracts and persona seeds into a runnable world that advances through explicit engine steps, emits a stable event log, and can be replayed or inspected by tests without live LLM calls, frontend code, or persistence infrastructure.

## User Value

- Make the current persona/contracts baseline executable instead of only schema-level.
- Establish one authoritative simulation core before adding UI, LLM orchestration, memory retrieval, conversations, or storage.
- Give future slices a deterministic event/snapshot foundation that can be tested offline.

## Confirmed Facts From Repository Inspection

- Project is a TypeScript ESM package with `npm run build`, `npm run typecheck`, and `npm test`.
- Existing shared contracts already define `WorldSnapshot`, `AgentRuntimeState`, `SimulationEvent`, `SimulationInput`, `MemoryRecord`, `ConversationRecord`, `PlanRecord`, and LLM operation metadata in `src/shared/contracts/simulation.ts`.
- Existing domain enums include world/agent/conversation statuses, memory types, intervention kinds, operation kinds/statuses, and plan item kinds in `src/shared/domain/simulation.ts`.
- Existing persona implementation validates immutable `PersonaSpec` fixtures and rejects generated/runtime state fields.
- Current executable persona fixtures are `elysia`, `kevin`, and `eden` in `src/server/personas/fixtures/pilotPersonas.ts`.
- Existing research handoff recommends Slice 2 as a deterministic simulation engine using `world_elysian_observation_mvp`, six locations, stable event IDs, and explicit startup events.
- Research seed documents recommend the MVP trio `elysia`, `pardofelis`, and `hua`, while current code still uses `elysia`, `kevin`, and `eden`.
- Backend simulation spec requires the simulation engine to own active world state, apply inputs only during steps, emit replayable events, and avoid hidden fallbacks.

## MVP Requirements

1. Add a server-side simulation module, expected under `src/server/simulation/**`, that owns world creation, step advancement, event emission, and replay helpers.
2. Provide a deterministic world seed for the first observation MVP.
3. Keep the simulation offline and deterministic; no live LLM provider, network access, database, or frontend dependency is required.
4. Advance world state only through an explicit step function.
5. Emit stable `SimulationEvent` records for the startup/first-step sequence.
6. Maintain a `WorldSnapshot` projection with locations, agents, queued inputs, active conversations, and `lastStepId`.
7. Apply `SimulationInput` values only inside the step loop; callers must not patch snapshot state directly.
8. Use explicit event kinds and payload validators/projection helpers for the event kinds introduced in this slice.
9. Add tests proving deterministic event order, startup world shape, input application through step, and replay behavior.
10. Preserve persona/memory boundaries: do not store generated memories, plans, reflections, or runtime state inside `PersonaSpec` fixtures.

## Candidate Event Kinds For MVP

The final implementation may use a smaller subset if needed, but the seed should start from these planning-backed kinds:

- `world.created`
- `world.timeAdvanced`
- `agent.spawned`
- `agent.startedRoutine`
- `memory.seeded` or `memory.created` if seeded memories are included in this slice
- `realm.interventionSubmitted` for typed observer/realm/direct-message inputs if input tests need a visible event

## Acceptance Criteria

- [x] A deterministic seed creates one `WorldSnapshot` with stable `worldId`, status, time, locations, agents, empty active conversations, and empty queued inputs.
- [x] Running the same seed and same step inputs twice produces the same event kind/order and snapshot-relevant output.
- [x] The first step emits startup/time/routine events in a stable order with stable IDs or deterministic ID generation.
- [x] A typed input can be queued/submitted and is applied only during an engine step, producing a user/system event rather than direct state patching.
- [x] Replay or reconstruction from the deterministic event log reproduces the expected timeline assertions without calling an LLM.
- [x] Tests cover invalid input/event payload rejection or explicit diagnostic failure for at least the event/input validators introduced in this slice.
- [x] Existing persona validation tests still pass.
- [x] `npm run typecheck`, `npm test`, and `npm run build` pass.

## Out of Scope

- Live LLM calls or provider integration.
- Full agent cognitive loop beyond deterministic startup/routine behavior.
- Full memory retrieval, embeddings, reflection scoring, or vector search.
- Full conversation transcript generation or conversation lifecycle implementation beyond placeholders required by the snapshot contract.
- Frontend observation-terminal UI.
- Database, migration, or durable persistence layer.
- 13-agent roster expansion.
- Official dialogue, story dumps, transcripts, lyrics, images, audio, or extracted assets.

## Decisions

1. Roster for this engine MVP: keep the current executable `elysia` / `kevin` / `eden` fixtures and adapt the deterministic world seed to the current fixture location vocabulary.
2. Defer migration to the research-backed `elysia` / `pardofelis` / `hua` trio to a separate content task.
3. Memory scope for this engine MVP: emit memory-related events/diagnostics only; do not create or store `MemoryRecord` values in this task.

Reason: this task should focus on simulation engine mechanics instead of mixing engine architecture with persona/content or memory-store implementation. The trade-off is that the first engine smoke test temporarily diverges from the research-recommended MVP trio and will not yet expose actual memory retrieval/state.

## Open Product / Scope Decision

None blocking planning.
