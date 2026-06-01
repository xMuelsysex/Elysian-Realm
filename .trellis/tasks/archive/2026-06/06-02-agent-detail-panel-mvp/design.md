# Agent Detail Panel MVP - Design

## Scope

Add a frontend-only Agent detail panel to the local admin dashboard. The panel reads existing backend-owned `WorldSnapshot` and event/timeline data from `AdminStateResponse` and presents a selected agent's runtime state plus recent related events.

No backend API, simulation engine, persistence, LLM, memory, or conversation behavior changes are planned.

## Current Data Flow

```text
AdminStateResponse.snapshot.locations + snapshot.agents -> groupAgentsByLocation() -> LocationBoard
AdminStateResponse.events + timeline -> createTimelineItems() -> EventTimeline
```

## Proposed Data Flow

```text
LocationBoard agent button click -> RealmDashboard selectedAgentId local state
AdminStateResponse.snapshot + selectedAgentId -> selected agent detail view model -> AgentDetailPanel
AdminStateResponse.events + timeline + selectedAgentId -> related TimelineItem[] -> AgentDetailPanel recent events
```

The panel is placed in the main content column directly below `LocationBoard` and above `EventTimeline`. The right sidebar remains reserved for controls/interventions and diagnostics.

## Ownership and Boundaries

- Backend `WorldSnapshot` remains authoritative for runtime agent state.
- `RealmDashboard` owns only UI state: `selectedAgentId`.
- `LocationBoard` renders selectable agent controls and selected styling; it does not mutate agent data.
- New `src/app/agents/AgentDetailPanel.tsx` owns presentation of selected-agent runtime details and is rendered between `LocationBoard` and `EventTimeline`.
- View-model helpers should live in `src/app/shared/viewModels.ts` unless the implementation grows enough to justify a focused `src/app/agents/viewModels.ts`.
- Event rows in the detail panel must reuse existing `TimelineItem` projections; no component-level raw payload parsing.

## Data Available for MVP

From `AgentRuntimeState`:

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

From `WorldSnapshot.locations`:

- location id/name/description for current location display.

From existing timeline projection:

- title/detail/source/time/id/target metadata for related events.

## Related Event Rule

An event is related to a selected agent if:

- `event.actorId === selectedAgentId`, or
- `event.targetIds.includes(selectedAgentId)`.

The MVP should show the newest related events first and cap the count to a small number, e.g. 5, to avoid overwhelming the panel.

## Runtime State vs Configured Facts

The panel must clearly label the main details as runtime state. Full persona configured facts are out of scope because the admin response does not currently expose persona fixtures. If persona id and relationship refs are shown, they should be labeled as identifiers/references, not expanded configured facts.

## Localization

Add Chinese and English copy for:

- panel title and empty state;
- selected/runtime labels;
- current location;
- relationship refs;
- current action;
- plan/operation/cooldown states;
- recent related events.

## Accessibility

- Agent selections in `LocationBoard` should be buttons with accessible labels.
- Selected agent state should be visible by text, not only color.
- The no-selection Agent detail panel should remain visible in the main content flow so users know they can select an agent.
- Detail panel should have a heading and empty state.
- Related event rows should remain readable and keyboard navigable through normal document flow.

## Compatibility

No server DTO changes. Existing dashboard and timeline behavior should remain compatible. The only local UI state addition is `selectedAgentId`.

## Risks

- Accidentally presenting runtime data as configured persona facts. Mitigation: label the panel as runtime/debug view.
- Duplicating event filtering or parsing. Mitigation: centralize related-event filtering in view-model helpers and reuse `TimelineItem` projection.
- Making `LocationBoard` too stateful. Mitigation: pass `selectedAgentId` and `onSelectAgent` props; keep it presentational.
