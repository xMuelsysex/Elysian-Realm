# Offline Simulation Engine MVP - Technical Design

## Scope

Build the first deterministic, no-network simulation engine slice. This task creates engine mechanics and replayable startup/input events only.

Confirmed scope decisions:

- Use the current executable persona roster: `elysia`, `kevin`, `eden`.
- Defer the research-backed `elysia` / `pardofelis` / `hua` migration to a separate content task.
- Emit memory-related events/diagnostics only; do not create or persist `MemoryRecord` values in this task.
- Do not add live LLM calls, database persistence, frontend UI, or conversation transcript generation.

## Architecture

### Authoritative owner

`src/server/simulation/**` becomes the only backend module that owns active `WorldSnapshot` mutation for this slice.

External callers interact with the engine through typed functions such as:

- create deterministic seed world;
- queue/submit a `SimulationInput`;
- run one explicit step;
- inspect resulting snapshot and event log;
- replay or assert event timelines from deterministic logs.

No UI, persona fixture, memory module, or future LLM operation may directly patch active world state.

### Expected module boundaries

Planned source layout:

```text
src/server/simulation/
├── engine.ts                  # create engine state, queue input, step world
├── events.ts                  # event kind constants and payload validators/projections
├── inputs.ts                  # input command validators for supported MVP commands
├── replay.ts                  # deterministic timeline/replay assertion helpers
├── seeds/
│   └── observationMvpSeed.ts  # current-roster seed using existing persona fixtures
└── index.ts                   # public simulation exports
```

Tests:

```text
tests/simulationEngine.test.ts
```

If implementation shows a smaller file split is clearer, keep the same boundaries but avoid a generic `utils/` module for simulation rules.

## Data Flow

```text
persona fixtures + seed config
  -> create initial WorldSnapshot
  -> emit deterministic startup events
  -> submit/queue typed SimulationInput
  -> step engine
  -> validate and apply queued inputs
  -> emit events and diagnostics
  -> update WorldSnapshot.lastStepId/currentTime/queuedInputs
  -> replay/assert timeline without LLM calls
```

State-changing flow must remain:

```text
raw caller intent -> validate command -> SimulationInput -> engine step -> SimulationEvent + WorldSnapshot update
```

## Seed Design

### Roster

Use current fixtures from `src/server/personas/fixtures/pilotPersonas.ts`:

- persona `elysia` -> runtime `agent_elysia`
- persona `kevin` -> runtime `agent_kevin`
- persona `eden` -> runtime `agent_eden`

### Location vocabulary

Use the current fixture location IDs so this task avoids persona migration:

- `atrium`
- `garden`
- `lounge`
- `archives`
- `training-hall`
- `overlook`
- `quarters`

The seed should include a stable `LocationRef` for each location referenced by the current persona routines/preferences. A later content task can migrate these to the research MVP location vocabulary.

### Initial world

Recommended deterministic test defaults:

- `worldId`: `world_elysian_observation_mvp`
- `status`: `paused`
- `currentTime`: `2026-05-31T06:00:00.000Z`
- `timeScale`: `60`
- `lastStepId`: `step_0600_000`
- `queuedInputs`: empty
- `activeConversations`: empty

### Initial agents

Each runtime agent starts `idle`, uses the first matching morning routine location when available, and derives `relationshipRefs` from the persona relationship seed target IDs.

## Event Contract

`SimulationEvent.kind` is currently a string. This slice should centralize introduced event kinds as constants or literal unions in one module, and provide one validator/projection entry point rather than local payload casts.

MVP event kinds:

- `world.created`
- `agent.spawned`
- `world.timeAdvanced`
- `agent.startedRoutine`
- `realm.interventionSubmitted`
- `simulation.inputRejected`
- `memory.seeded`

`memory.seeded` is event-only in this task. It records that future memory seeding is requested/diagnosed, but does not create `MemoryRecord` state.

Required event fields use the existing `SimulationEvent` shape:

- stable `id`
- `worldId`
- `stepId`
- `time`
- `kind`
- optional `actorId`
- `targetIds`
- `payload`
- `source`
- optional `causedByInputId`

## Input Contract

Use the existing `SimulationInput` / `InterventionCommand` shape. Supported command subset for this task:

- `observerCommand` with actions such as `step`, `pause`, `resume`, or `setTimeScale` if implemented.
- `realmEvent` as a generic validated event submission only if needed for tests.
- `directPrivateMessage` should validate and emit an intervention event if implemented, but should not enter prompts or memories yet.

Invalid inputs must not partially mutate the snapshot. They should emit a rejected-input diagnostic event or return a typed validation failure that tests can assert.

## Replay / Determinism

The engine must be deterministic under the same seed and input sequence.

Replay scope for this task is timeline-level, not full event-sourcing reconstruction:

- Given the same seed and same step/input sequence, event kind/order and snapshot-visible fields match.
- Helper(s) can extract a replayable timeline from events for assertions.
- No LLM, network, system clock dependency, or random source is allowed unless seeded and injected.

Use explicit deterministic step IDs and event IDs. Avoid `Date.now()`, `Math.random()`, or generated UUIDs in tests.

## Error Handling

- Validation failures should preserve the input ID, world ID, command kind, and message.
- Invariant failures should stop the affected step rather than creating fake success events.
- Do not catch broad errors and continue with fabricated agent behavior.
- Avoid exposing secrets or raw provider payloads; provider integration is out of scope.

## Compatibility Notes

- Existing shared contracts should be reused as-is where possible.
- If a contract change is unavoidable, it must remain backward-compatible with existing persona tests and be covered by tests.
- Generated `dist/` remains build output and must not be committed.

## Trade-Offs

### Keep current roster now

Benefit: isolates engine architecture from persona/content migration.

Cost: the first engine seed temporarily differs from research documents that recommend `elysia` / `pardofelis` / `hua`.

### Emit memory events only

Benefit: avoids creating a second source of truth before the memory-store slice exists.

Cost: no real memory retrieval or `MemoryRecord` assertions yet.

### Timeline replay first

Benefit: enough to verify deterministic startup and step behavior with small scope.

Cost: full event-sourced reconstruction can come later after more event kinds exist.

## Rollback Shape

This task should be easy to rollback by removing:

- `src/server/simulation/**`
- `tests/simulationEngine.test.ts`
- any new exports added only for the simulation module

Shared contract changes should be minimized to avoid rollback complexity.
