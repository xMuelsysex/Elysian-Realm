# Event Detail Projection Optimization

## Goal

Make the admin event timeline easier to read by replacing generic payload key/value summaries with centralized, event-kind-specific detail projections, using a default user-friendly mode plus an explicit debug mode for key facts and raw JSON access.

## User Value

The current local admin UI is functional, but timeline entries still feel like raw debug data. A readable event detail layer will let the user understand simulation steps, interventions, and validation failures quickly. Default mode should feel like natural event narration; debug mode should reveal exact IDs/facts and raw JSON when deeper inspection is needed.

## Confirmed Facts

- The local admin dashboard is implemented under `src/app/**` with Chinese as the default UI language and an English toggle.
- `AdminStateResponse` includes `events: SimulationEvent[]` and `timeline: TimelineEntry[]`.
- Backend event kinds are centrally owned by `SIMULATION_EVENT_KINDS` in `src/server/simulation/events.ts`:
  - `world.created`
  - `agent.spawned`
  - `world.timeAdvanced`
  - `agent.startedRoutine`
  - `realm.interventionSubmitted`
  - `simulation.inputRejected`
  - `memory.seeded`
- Current frontend event display is centralized in `src/app/shared/viewModels.ts` through `createTimelineItems()` and `formatPayloadSummary()`.
- `EventTimeline.tsx` renders `TimelineItem.title`, `TimelineItem.detail`, event metadata, and expandable raw payload JSON.
- Specs require that components do not parse raw event payloads independently; event payload projection should have one owner and tests.

## Requirements

1. Replace generic payload summary text with event-kind-specific readable detail text for all currently implemented MVP event kinds.
2. Keep projection centralized outside React components, preferably in `src/app/shared/viewModels.ts` or a closely scoped helper imported by it.
3. Add a local debug-mode switch for event details:
   - default user mode shows pure natural sentences;
   - debug mode shows sentence plus key facts such as IDs, command kind, counts, status, time scale, and batch id.
4. Preserve the raw payload JSON inspector in debug mode.
5. Preserve bilingual behavior:
   - Chinese details when the UI language is Chinese.
   - English details when the UI language is English.
6. Avoid simulation-core changes unless a missing contract makes frontend-safe projection impossible.
7. Avoid local `event.payload as any` casts in components.
8. Add tests for each MVP event kind projection, language switch behavior, and user/debug mode behavior.
9. Unknown or future event kinds must remain visible with a safe fallback instead of crashing the admin UI.

## Acceptance Criteria

- [ ] Default user mode shows pure natural sentence details, without debug-style key/value lists.
- [ ] Debug mode shows sentence + key facts for each event where useful.
- [ ] `world.created` user detail reads as a natural world-start summary; debug detail includes seed, persona count, location count, and initial status.
- [ ] `agent.spawned` user detail naturally says a role/persona appeared; debug detail includes persona, location, and status.
- [ ] `world.timeAdvanced` user detail naturally says time advanced; debug detail includes from/to time and time scale.
- [ ] `agent.startedRoutine` user detail naturally says the agent started a routine; debug detail includes routine, location, and configured intent.
- [ ] `realm.interventionSubmitted` user detail naturally says the user intervention was accepted; debug detail includes command kind, input id, and accepted summary.
- [ ] `simulation.inputRejected` user detail naturally says the input was rejected with the rejection message; debug detail includes input id and rejection message.
- [ ] `memory.seeded` user detail naturally states memory seeding is deferred/event-only; debug detail includes the batch id.
- [ ] Timeline raw payload JSON remains available when debug mode is enabled.
- [ ] Existing admin controller, route, simulation, and UI tests still pass.
- [ ] `npm run typecheck`, `npm test`, `npm run build`, and `git diff --check` pass.

## Out of Scope

- New simulation event kinds.
- Backend persistence, database, replay storage, or LLM calls.
- Agent profile, conversation, or memory detail panels.
- UI filtering/search/sorting.
- Replacing event IDs or raw JSON debug details when debug mode is enabled.
- Official story/dialogue/assets.

## Product Decision

- Use two display modes:
  - user mode: pure natural sentence details;
  - debug mode: sentence + key facts, plus raw JSON/debug inspection.
