# Agent Detail Panel MVP

## Goal

Add an MVP Agent detail panel to the local admin dashboard so users can select a character agent and inspect its current runtime state, location, relationship references, operation pointer, current action, and recent related timeline events without opening raw JSON.

## User Value

The dashboard currently shows agents inside location cards, but there is no focused way to inspect one agent. A detail panel will make the realm easier to debug and understand by answering: where is this agent, what is it doing, who is it related to, and what recently happened to or around it?

## Confirmed Facts

- The local admin dashboard is implemented under `src/app/**` and reads `AdminStateResponse` from the local admin API.
- `AdminStateResponse.snapshot.agents` contains `AgentRuntimeState[]` with:
  - `id`
  - `personaId`
  - `displayName`
  - `status`
  - `locationId`
  - `currentPlanId?`
  - `currentAction?`
  - `inProgressOperationId?`
  - `cooldowns`
  - `relationshipRefs`
- `AdminStateResponse.snapshot.locations` contains location ids, names, and descriptions.
- `AdminStateResponse.events` and `timeline` already feed centralized event projection through `createTimelineItems()`.
- `LocationBoard` currently renders all agents grouped by location, but agent cards are not selectable.
- Full configured persona facts exist in `src/server/personas/fixtures/pilotPersonas.ts`, but they are not currently exposed through `AdminStateResponse`.
- Frontend specs require components to render backend-owned projections and not mutate simulation state.

## Requirements

1. Add local UI state for a selected agent id; selecting an agent must not mutate backend simulation state.
2. Make agents in `LocationBoard` selectable through accessible controls.
3. Add an Agent detail panel that renders the selected agent's runtime state from `WorldSnapshot`.
4. Show at least:
   - display name;
   - agent id;
   - persona id;
   - status;
   - current location name/id;
   - relationship references;
   - current action if present;
   - current plan id if present;
   - in-progress operation id if present;
   - cooldown keys/count or empty state.
5. Show recent related events for the selected agent using the existing centralized timeline item projection.
6. Preserve Chinese default UI and English toggle behavior.
7. Clearly label runtime state separately from configured persona facts; do not imply generated/runtime data is base canon.
8. Add focused view-model tests for selected-agent lookup, related-event filtering, and empty/no-selection states.
9. Do not add new backend persistence, persona API surface, LLM calls, memory store, or conversation system in this task.

## Acceptance Criteria

- [ ] A user can select an agent from the location board.
- [ ] The selected agent is visibly highlighted or marked as selected.
- [ ] The Agent detail panel shows runtime agent identity/status/location/action/operation/relationship/cooldown information.
- [ ] If no agent is selected, the panel shows a clear empty state prompting selection.
- [ ] Related events include events where the selected agent is actor or target.
- [ ] Related event rows use existing centralized timeline projection, not local payload parsing.
- [ ] Chinese and English labels are available for the new panel.
- [ ] The implementation does not mutate `WorldSnapshot` or backend-owned state.
- [ ] Existing admin controller, route, simulation, event timeline, and UI tests still pass.
- [ ] `npm run typecheck`, `npm test`, `npm run build`, `python3 ./.trellis/scripts/task.py validate 06-02-agent-detail-panel-mvp`, and `git diff --check` pass.

## Out of Scope

- Exposing full persona fixture/configuration through the admin API.
- Editing persona facts or runtime agent state.
- Memory/reflection/conversation history panels.
- New simulation event kinds or engine behavior.
- Backend database/persistence.
- URL routing for selected agent.
- 2D map or animation.
- Official story/dialogue/assets.

## Product Decision

- Place the Agent detail panel in the main content column directly below `LocationBoard` and above the event timeline.
- Select an agent by clicking an accessible control in `LocationBoard`.
- Keep the right sidebar focused on controls/interventions and diagnostics.
