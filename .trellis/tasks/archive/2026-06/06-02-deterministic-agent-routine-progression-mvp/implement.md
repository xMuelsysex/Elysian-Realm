# Deterministic Agent Routine Progression MVP Implementation Plan

## Implementation Checklist

1. Planning / context
   - [x] Read backend specs for simulation ownership, persona/routine boundaries, and quality.
   - [x] Inspect current simulation engine, events, inputs, seed, persona fixtures, map view models, and tests.
   - [x] Confirm routine progression should be deterministic/offline and owned by `stepSimulationEngine`.

2. Backend event contracts
   - [x] Add `agent.moved` and `agent.continuedRoutine` to `SIMULATION_EVENT_KINDS`.
   - [x] Add payload interfaces and validator rules for new event kinds.
   - [x] Ensure `projectTimelineEntry` accepts the new event kinds.

3. Routine progression engine
   - [x] Add routine period resolver by simulated UTC hour.
   - [x] Add agent routine resolver from `pilotPersonas` by `agent.personaId`.
   - [x] Add deterministic agent update logic inside `stepSimulationEngine` after inputs are applied.
   - [x] Emit `agent.moved` when location changes.
   - [x] Emit `agent.continuedRoutine` when active routine changes.
   - [x] Preserve cloned immutable snapshot semantics.

4. Backend tests
   - [x] Assert post-startup steps eventually move Elysia/Kevin/Eden according to day/evening/night routines.
   - [x] Assert state updates happen only after `stepSimulationEngine`.
   - [x] Assert new event payloads pass `validateSimulationEvent`.
   - [x] Assert deterministic replay for same seed/input sequence.
   - [x] Assert existing input rejection behavior remains intact.

5. Frontend projections
   - [x] Add centralized timeline detail projection for `agent.moved`.
   - [x] Add centralized timeline detail projection for `agent.continuedRoutine`.
   - [x] Include new event kinds in topology movement paths and realm map pulses.

6. Frontend/view-model tests
   - [x] Add projection tests for new event kinds.
   - [x] Add map/topology tests proving movement events are visible without component payload parsing.

7. Verification
   - [x] `npm run typecheck`
   - [x] `npm test`
   - [x] `npm run build`
   - [x] `git diff --check`
   - [x] `python3 ./.trellis/scripts/task.py validate 06-02-deterministic-agent-routine-progression-mvp`

## Validation Commands

```bash
npm run typecheck
npm test
npm run build
git diff --check
python3 ./.trellis/scripts/task.py validate 06-02-deterministic-agent-routine-progression-mvp
```

## Risky Files / Boundaries

- `src/server/simulation/engine.ts`: must remain the single authoritative state owner.
- `src/server/simulation/events.ts`: event kind additions require validators and frontend projections.
- `src/server/personas/fixtures/pilotPersonas.ts`: read-only configuration source; do not add runtime fields.
- `src/app/shared/viewModels.ts`: add projections centrally; do not push payload parsing into components.
- `tests/simulationEngine.test.ts`: exact event order assertions may need carefully scoped updates.

## Rollback Plan

Remove the new event kinds, routine progression logic, related frontend projections, and test updates. No persisted data migration exists.
