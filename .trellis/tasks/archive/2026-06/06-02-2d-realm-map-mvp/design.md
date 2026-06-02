# 2D Realm Map MVP Design

## Architecture Summary

Add a presentational 2D semantic map to the existing local admin dashboard. The map renders backend-owned `WorldSnapshot` and centralized `TimelineItem` projections through a new typed view model. It does not introduce a game loop, local simulation rules, or direct state mutations.

```text
AdminStateResponse.snapshot + TimelineItem[] + selected UI state
  -> createRealmMapViewModel(...)
  -> RealmMapPanel
  -> onSelectAgent(agentId) / onSelectLocation(locationId)
  -> existing AgentDetailPanel / TimelineFilters.targetId
```

## Component Placement

`RealmDashboard` should render the new map near the top of the main column, before the existing text-heavy location views:

```text
WorldHeader
Dashboard Main:
  RealmMapPanel        # new visual overview
  LocationTopology     # existing semantic topology/debug view
  LocationBoard        # existing accessible/text location board
  AgentDetailPanel
  EventTimeline
  ...
```

This keeps text-first/debug panels available and treats the map as an enhancement, not a replacement.

## New / Changed Files

Likely implementation files:

```text
src/app/realm/RealmMapPanel.tsx
src/app/shared/viewModels.ts       # add map view-model types + createRealmMapViewModel
src/app/realm/RealmDashboard.tsx   # local selectedLocationId state and panel placement
src/app/styles.css                 # map visuals/responsive styles
tests/adminViewModels.test.ts      # focused view-model coverage
```

Optional if the component grows too large:

```text
src/app/realm/RealmMapNode.tsx
src/app/realm/AgentMarker.tsx
```

Keep one component file for MVP unless readability suffers.

## View Model Contract

Add UI-only map view-model types next to existing view-model helpers:

```ts
export interface RealmMapViewModel {
  locations: RealmMapLocationNode[];
  agents: RealmMapAgentMarker[];
  links: RealmMapLink[];
  pulses: RealmMapEventPulse[];
  selectedAgentId?: string;
  selectedLocationId?: string;
  summary: string;
}

export interface RealmMapLocationNode {
  id: string;
  displayName: string;
  description: string;
  x: number;
  y: number;
  selected: boolean;
  agentCount: number;
  recentEventCount: number;
}

export interface RealmMapAgentMarker {
  id: string;
  displayName: string;
  status: string;
  locationId: string;
  xOffset: number;
  yOffset: number;
  selected: boolean;
  currentIntent?: string;
}

export interface RealmMapLink {
  fromLocationId: string;
  toLocationId: string;
}

export interface RealmMapEventPulse {
  id: string;
  locationId: string;
  source: EventSource;
  tone: "system" | "user" | "agent" | "llm" | "test" | "error" | "neutral";
  label: string;
  summary: string;
  time: string;
}
```

## Layout Rules

Use a static layout map for visual coordinates only:

```ts
const REALM_MAP_LAYOUT: Record<string, { x: number; y: number }> = {
  atrium: { x: 50, y: 42 },
  garden: { x: 24, y: 28 },
  lounge: { x: 72, y: 30 },
  archives: { x: 22, y: 66 },
  "training-hall": { x: 78, y: 66 },
  overlook: { x: 54, y: 76 },
  quarters: { x: 50, y: 18 },
};
```

Unknown future locations should still render through a deterministic fallback grid layout rather than disappear.

Agent marker offsets are purely visual and can be computed from an agent's index inside its location group. They must not imply authoritative positions.

## Event Pulse Rules

Pulses should be derived from `TimelineItem` and already-centralized event projections.

MVP mapping:

- `agent.spawned`, `agent.startedRoutine`: use event actor location or payload-projected location via existing topology/movement path if available.
- `realm.interventionSubmitted`: use the first target id that is a known location/world/agent; if agent target, map to that agent's current location.
- `simulation.inputRejected`: display an error pulse on the selected location if present, otherwise the world/atrium fallback.
- `memory.seeded` and `world.created`: display low-intensity system pulse on the atrium/world origin.

To avoid component payload parsing, `createRealmMapViewModel` owns this derivation and should reuse existing helpers where possible. The component receives typed pulse records only.

## Interaction Rules

### Agent selection

`RealmMapPanel` receives `onSelectAgent(agentId)` and calls the existing `setSelectedAgentId`. This must not submit backend commands.

### Location selection

`RealmDashboard` owns local `selectedLocationId` state. When a location is selected:

1. set `selectedLocationId`;
2. merge `targetId: locationId` into `timelineFilters`.

Existing timeline controls continue to own other filters and can clear the target filter.

### No direct simulation mutation

The map must not:

- mutate `state.snapshot`;
- change `agent.locationId` locally;
- submit movement commands;
- call LLM/provider code;
- invent conversations or memories.

## Accessibility

- The map panel is a `section` with a stable heading.
- Location nodes are `<button>` elements with `aria-pressed` for selected state.
- Agent markers are `<button>` elements with accessible labels.
- Visual-only links/pulses should use `aria-hidden` where appropriate.
- A textual summary should describe current occupancy and recent pulses.
- Existing `LocationBoard` remains as a text fallback.

## Styling Direction

User-selected first style: **pixel/chibi board**.

MVP traits:

- board-like 2D map container with tiled/grid texture made in CSS;
- location nodes rendered as room tiles/cards rather than freeform illustrated rooms;
- agent markers rendered by default as original chibi-like badges using initials, colors, simple CSS shapes, or emoji-like silhouettes;
- optional asset slots may be present; committed assets must be original or explicitly licensed for redistribution, and placeholders must remain the default;
- event pulses rendered as pixel/chip highlights or small speech bubbles;
- selected agent/location states shown with both border/highlight and visible text;
- responsive fallback to stacked location cards on narrow screens.

Asset policy:

- Committed visual assets are allowed only when they are original project-created assets, third-party assets with explicit compatible redistribution permission such as CC0/CC-BY/MIT, or official publicly released assets whose accompanying terms/media kit/fan-content policy explicitly allow this repository's non-commercial redistribution/use.
- Any committed third-party or official public asset must include source URL, access date, license/terms summary, and attribution in repository documentation or a nearby asset manifest.
- Do not commit extracted/datamined assets, proprietary assets without explicit reuse terms, or web-sourced files where public visibility is not accompanied by clear redistribution/use permission.
- Local asset overrides may live outside committed source or in a gitignored path and must have graceful placeholder fallback.
- Tests and builds must pass without any local-only asset files.

Constraints:

- Do not add Canvas/WebGL/Pixi/Phaser or a game loop in this MVP.
- Do not allow drag-and-drop movement or frontend-owned pathfinding.

## Compatibility / Migration

No backend, API, shared contract, or database migration is required.

The map is a frontend enhancement over existing `AdminStateResponse` and `TimelineItem` data. Removing it should leave existing dashboard functionality intact.

## Validation Plan

1. Add/update `tests/adminViewModels.test.ts` for map view-model derivation.
2. `npm run typecheck`.
3. `npm test`.
4. `npm run build`.
5. `git diff --check`.
6. Trellis task validation.
