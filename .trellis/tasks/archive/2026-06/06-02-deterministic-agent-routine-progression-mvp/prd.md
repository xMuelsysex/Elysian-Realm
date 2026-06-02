# Deterministic Agent Routine Progression MVP

## Goal

Make the deterministic simulation visibly progress after startup by advancing each pilot agent through configured persona routine periods over time, updating backend-owned runtime state, and emitting validated replayable events that the existing timeline, agent detail, topology, and 2D map can observe.

## User Value

The project now has a local debug/admin dashboard, an LLM boundary, and a 2D realm map. However, after startup the world mostly emits time advancement; agents do not continue changing location or action. This task should make the realm feel alive in an offline, deterministic, replayable way before adding conversation, memory storage, or LLM-driven action proposals.

## Confirmed Facts

- `src/server/simulation/engine.ts` owns the authoritative `WorldSnapshot` and applies queued inputs only inside `stepSimulationEngine`.
- Current step size is 5 simulated minutes.
- Startup emits:
  - `world.created`
  - `agent.spawned`
  - `world.timeAdvanced`
  - `agent.startedRoutine`
  - `memory.seeded`
- After startup, later steps currently emit `world.timeAdvanced` and queued input result events only.
- `AgentRuntimeState` already supports `status`, `locationId`, `currentPlanId?`, `currentAction?`, `inProgressOperationId?`, cooldowns, and relationships.
- `PlanAction` supports `kind`, `startsAt`, `endsAt`, `locationId`, `targetAgentId`, and `intent`.
- Pilot personas already define deterministic `routines` for `morning`, `day`, `evening`, and `night`, each with `label`, `locationId`, and `intent`.
- The deterministic seed sets each agent's initial `locationId` from `persona.routines.morning[0].locationId`.
- The current UI map derives agent markers from `snapshot.agents[].locationId` and pulses from timeline events.
- Frontend timeline/detail projection is centralized in `src/app/shared/viewModels.ts`; components must not parse raw payloads directly.
- Backend specs require the simulation engine to remain the single owner of active world state.
- Backend tests currently assert stable event order/IDs for startup and replay determinism.

## Requirements

1. Add deterministic routine progression inside `stepSimulationEngine`; no frontend, LLM, memory, or repository module may directly mutate runtime world state.
2. Progress each agent from configured persona routine periods using deterministic simulated time.
3. Update backend-owned agent runtime fields when the active routine changes:
   - `locationId`
   - `status`
   - `currentAction`
   - optional `currentPlanId`
4. Emit replayable events for non-trivial routine state changes after startup.
5. Preserve startup event order and deterministic IDs unless the task intentionally updates tests for a documented reason.
6. Add or update event validators for any new event kinds and payloads.
7. Add frontend timeline/detail projections for new event kinds in the centralized view-model layer.
8. Ensure 2D map pulses and movement/topology views can observe routine movements without component-level payload parsing.
9. Keep the first MVP deterministic and offline:
   - no real LLM calls;
   - no provider calls;
   - no database;
   - no random behavior;
   - no pathfinding.
10. Add tests proving deterministic routine progression, state updates, event validation, replay stability, and UI projection/map visibility.

## Proposed MVP Behavior

- Routine period selection is based on simulated UTC hour:
  - morning: `06:00 <= hour < 12:00`
  - day: `12:00 <= hour < 17:00`
  - evening: `17:00 <= hour < 22:00`
  - night: otherwise
- Each pilot persona uses the first configured routine item for the active period.
- When the active routine differs from an agent's current action or location, the engine updates that agent and emits events.
- Recommended status mapping:
  - `move` event if location changes: status can become `moving` for the event and then settle to `idle` or `waiting` in snapshot.
  - routine action: `currentAction.kind = "performActivity"`, status `idle` or `waiting` unless conversation/reflection is later implemented.
- Recommended new event kinds:
  - `agent.moved` for deterministic location changes;
  - `agent.continuedRoutine` or extend `agent.startedRoutine` for changed routine period.

## Acceptance Criteria

- [x] Multiple post-startup steps can change agent `locationId`/`currentAction` when simulated time reaches a new routine period.
- [x] Agent runtime changes happen only inside `stepSimulationEngine`.
- [x] Routine progression uses persona fixtures as configuration and does not write generated/runtime state into `PersonaSpec`.
- [x] New routine/movement events are included in `SIMULATION_EVENT_KINDS` and `validateSimulationEvent` checks required payload fields.
- [x] Running the same seed and same inputs twice produces the same final snapshot-relevant state and event timeline.
- [x] Existing invalid input tests still prove rejected inputs do not mutate state.
- [x] Timeline details and map pulses show new routine/movement events through centralized projections.
- [x] The 2D map reflects changed agent positions from backend snapshot, not local UI mutation.
- [x] `npm run typecheck` passes.
- [x] `npm test` passes.
- [x] `npm run build` passes.
- [x] `git diff --check` passes.
- [x] `python3 ./.trellis/scripts/task.py validate 06-02-deterministic-agent-routine-progression-mvp` passes.

## Out of Scope

- LLM-driven action proposals.
- Conversation lifecycle.
- MemoryRecord storage/retrieval/reflection.
- Persistence/database.
- Random movement or stochastic scheduling.
- Pathfinding, collision, animation engine, or frontend-owned movement.
- New persona roster/content migration.
- Official assets or dialogue.

## Product Decision

Manual `step` advances deterministic routines even when `snapshot.status` is `paused`.

Reason: the current debug/admin model already advances time from the initially paused seed when a developer explicitly steps. Keeping routine progression tied to explicit steps makes the local map/timeline demo useful while preserving deterministic replay. `pause` remains visible state; future auto-step behavior can decide whether to call `step`.

## Open Product Decision

None blocking. Implementation can start after user approval.
