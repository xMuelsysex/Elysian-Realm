# Deterministic Agent Routine Progression MVP Design

## Architecture Summary

Extend the authoritative simulation engine so it can deterministically advance agent routine state after startup. The engine remains the only owner of active world state.

```text
stepSimulationEngine(state)
  -> advance time
  -> emit startup/time events
  -> validate/apply queued inputs
  -> resolve active routine period from simulated time
  -> update agent runtime state when routine changes
  -> emit movement/routine events
  -> return next snapshot + events
```

No frontend component, LLM provider, memory store, or admin controller directly changes agent locations/actions.

## Source of Routine Truth

Use current immutable persona fixtures as routine configuration:

```text
pilotPersonas[].routines.{morning,day,evening,night}[0]
```

The deterministic seed already creates agents from `pilotPersonas` and initializes each agent's `locationId` from `morning[0].locationId`. This task should reuse that relationship rather than introducing a second routine source.

## Routine Period Mapping

Recommended first mapping by simulated UTC hour:

- morning: `06:00 <= hour < 12:00`
- day: `12:00 <= hour < 17:00`
- evening: `17:00 <= hour < 22:00`
- night: otherwise

Each period uses the first routine activity for that period. If a persona is missing the period activity, the agent keeps its current action and no new event is emitted. Persona validation already requires non-empty period arrays, so this is defensive only.

## Proposed Event Model

Add new event kinds to `src/server/simulation/events.ts`:

```ts
"agent.moved"
"agent.continuedRoutine"
```

### `agent.moved`

Emitted when a routine period selects a location different from the agent's previous `locationId`.

Payload:

```ts
interface AgentMovedPayload {
  fromLocationId: LocationId;
  toLocationId: LocationId;
  reason: "routine";
  routineId: string;
  intent: string;
}
```

Targets: `[toLocationId]`; actor: agent id; source: `system`.

### `agent.continuedRoutine`

Emitted when the selected routine differs from the current `currentAction.id` or when a new period starts. It records the action the agent is now performing.

Payload:

```ts
interface AgentContinuedRoutinePayload {
  routineId: string;
  locationId: LocationId;
  intent: string;
  period: "morning" | "day" | "evening" | "night";
  provenance: "configured";
}
```

Targets: `[locationId]`; actor: agent id; source: `system`.

Rationale: keep startup `agent.startedRoutine` stable while giving post-startup progression its own event kind. Existing map/timeline can add projections for the new event kinds without changing startup assertions unnecessarily.

## Agent Runtime State Update

When a selected routine changes:

- `locationId`: routine location.
- `currentAction`:
  - `id`: `${personaId}.${period}.0`
  - `kind`: `performActivity`
  - `locationId`: routine location
  - `intent`: routine intent
  - optional `startsAt`: current step time
- `currentPlanId`: optional stable id such as `${personaId}.${period}` if useful for UI.
- `status`: recommended `idle` for snapshot after applying routine, because movement is event-level in this MVP; future richer engine can add transient `moving` status or action duration.

If location changes, emit `agent.moved` before `agent.continuedRoutine` for that agent. This lets map pulses show movement then routine.

## Paused vs Running Behavior

Recommended product behavior: **manual stepping progresses deterministic routines even when the world status is `paused`**.

Reason: the current admin/debug model already advances time on every step even from an initial paused seed. Preserving that behavior avoids surprising tests and keeps the debug UI useful. `pause` remains an observable status and future auto-step controls may choose whether to call `step`, but a manual step is an explicit developer action.

Alternative: only progress routines when `snapshot.status === "running"`. This is stricter semantically but would mean the initial world remains static until a resume command, making local map demos less useful.

## Frontend Projection Updates

Update `src/app/shared/viewModels.ts` centralized event projection:

- `projectKnownEvent` handles `agent.moved` and `agent.continuedRoutine`.
- `createTopologyViewModel` movement paths include `agent.moved`.
- `createRealmMapViewModel` pulses include new event kinds.

Do not parse new payloads in React components.

## Tests

Backend tests should cover:

- routine period selection across morning/day/evening/night boundaries;
- agent movement and action update after time reaches day/evening/night;
- `agent.moved` and `agent.continuedRoutine` payload validation;
- deterministic replay summary for same seed/inputs;
- invalid inputs still do not apply command effects;
- startup event order remains stable unless explicitly updated.

Frontend/view-model tests should cover:

- timeline detail projection for new event kinds;
- topology movement path from `agent.moved`;
- 2D map pulse for movement/routine events.

## Compatibility / Migration

No database or persistence migration.

This changes deterministic event logs after post-startup steps. Existing tests that assert exact event timelines for later steps may need updates to account for new routine events. Startup tests should remain stable where possible.

## Rollback Plan

Revert additions in:

- `src/server/simulation/engine.ts`
- `src/server/simulation/events.ts`
- `src/app/shared/viewModels.ts`
- tests updated for routine progression

No persistent data rollback is required.
