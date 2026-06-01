# Offline Simulation Engine MVP - Implementation Plan

## Review Gate

Do not start code changes until the user explicitly approves implementation after reviewing `prd.md` and `design.md`.

## Ordered Checklist

### 1. Pre-development context

- [ ] Read the active task artifacts: `prd.md`, `design.md`, and this `implement.md`.
- [ ] Read backend simulation, directory, persona-memory, error-handling, and quality specs.
- [ ] Confirm no new persona/content migration is included in this task.
- [ ] Confirm no actual `MemoryRecord` store is included in this task.

### 2. Inspect current code before editing

- [ ] Inspect current shared simulation contracts and domain enums.
- [ ] Inspect current persona fixture roster and routine location IDs.
- [ ] Inspect current test style in `tests/personaValidation.test.ts`.
- [ ] Search for existing simulation module names before creating new files.

### 3. Add simulation module skeleton

- [ ] Create `src/server/simulation/index.ts` for public exports.
- [ ] Add a small set of focused modules under `src/server/simulation/**`:
  - engine state and step loop;
  - event kind constants and validators/projections;
  - input validation helpers;
  - deterministic seed fixture;
  - replay/timeline helper.
- [ ] Keep modules dependency-light and deterministic.

### 4. Implement deterministic seed

- [ ] Seed `world_elysian_observation_mvp` using current `elysia` / `kevin` / `eden` fixtures.
- [ ] Derive or explicitly define stable runtime agent IDs: `agent_elysia`, `agent_kevin`, `agent_eden`.
- [ ] Include all location IDs referenced by current fixtures:
  - `atrium`
  - `garden`
  - `lounge`
  - `archives`
  - `training-hall`
  - `overlook`
  - `quarters`
- [ ] Start tests from paused status and fixed time `2026-05-31T06:00:00.000Z`.

### 5. Implement explicit step loop

- [ ] Provide a function that advances exactly one deterministic step.
- [ ] Update `currentTime`, `lastStepId`, and consumed `queuedInputs` only inside the step function.
- [ ] Emit stable event IDs in deterministic order.
- [ ] Emit startup/time/routine events required by the PRD.
- [ ] Emit memory-related event/diagnostic only; do not create `MemoryRecord` values.

### 6. Implement input handling

- [ ] Provide a way to queue or submit `SimulationInput` values without mutating state immediately.
- [ ] Validate supported MVP intervention commands.
- [ ] Apply valid inputs during the next step and emit `realm.interventionSubmitted` or equivalent event.
- [ ] Reject invalid inputs without partial state mutation and preserve diagnostics.

### 7. Implement replay/timeline helper

- [ ] Add helper(s) to extract replayable event timelines from deterministic runs.
- [ ] Assert same seed + inputs produce same timeline.
- [ ] Do not implement full persistence or full event-sourced reconstruction in this task.

### 8. Add tests

- [ ] Add `tests/simulationEngine.test.ts`.
- [ ] Test seed world shape: world ID, status, time, locations, agents, active conversations, queued inputs.
- [ ] Test first-step event order and stable event kinds.
- [ ] Test queued input applies only during a step.
- [ ] Test invalid input rejection does not mutate snapshot state.
- [ ] Test deterministic replay/timeline equality across two identical runs.
- [ ] Ensure existing persona tests still pass.

### 9. Validation

Run, in order:

```bash
npm run typecheck
npm test
npm run build
python3 ./.trellis/scripts/task.py validate 05-31-offline-simulation-engine-mvp
git diff --check
```

If validation fails, fix root cause. Do not hide failures with fallback behavior or weakened tests.

## Risky Files / Rollback Points

Potentially touched files:

- `src/server/simulation/**` new files.
- `tests/simulationEngine.test.ts` new test file.
- Optional export barrel if needed.

Rollback should remove the new simulation module and tests. Avoid broad changes to existing shared contracts unless a testable contract gap is discovered.

## Scope Guardrails

Do not add:

- live LLM provider integration;
- embeddings or memory retrieval;
- actual `MemoryRecord` persistence;
- database adapters or migrations;
- frontend UI;
- conversation transcripts;
- persona fixture migration to `pardofelis` / `hua`;
- official dialogue/story/assets.

## Final Review Checklist

- [ ] One authoritative simulation owner exists for active world state.
- [ ] State-changing behavior enters through typed inputs and step execution.
- [ ] Introduced event/input payloads are validated or rejected in one place.
- [ ] Deterministic tests do not depend on wall-clock time, random UUIDs, network, or live providers.
- [ ] Failures remain visible and diagnosable.
- [ ] Memory events are not mistaken for stored memories.
