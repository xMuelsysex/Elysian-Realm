# 2D Realm Map MVP Implementation Plan

## Implementation Checklist

1. Planning / context
   - [x] Read frontend specs for realm interface, component rules, state management, type safety, and quality.
   - [x] Inspect existing dashboard, location board, topology panel, view models, i18n, styles, and tests.
   - [x] Confirm map MVP is frontend-only and must not mutate simulation state.

2. View model
   - [x] Add `RealmMapViewModel` and related types to `src/app/shared/viewModels.ts`.
   - [x] Add static visual layout coordinates plus deterministic fallback layout.
   - [x] Add `createRealmMapViewModel(snapshot, timelineItems, selectedAgentId, selectedLocationId, language)`.
   - [x] Derive location nodes, agent markers, links, recent event pulses, and summary text from existing snapshot/timeline data.

3. Tests
   - [x] Add focused tests in `tests/adminViewModels.test.ts` for:
     - all locations become map nodes;
     - agents map to their backend `locationId`;
     - selected agent/location state is represented;
     - unknown locations get fallback coordinates;
     - pulses are derived without component-level payload parsing;
     - selecting location can be represented through existing `TimelineFilters.targetId` behavior.

4. Component
   - [x] Add `src/app/realm/RealmMapPanel.tsx`.
   - [x] Render map panel with accessible heading, location buttons, agent marker buttons, links, pulses, and text summary.
   - [x] Ensure no raw event payload parsing in the component.

5. Dashboard integration
   - [x] Add `selectedLocationId` state to `RealmDashboard`.
   - [x] Create map view model via `useMemo`.
   - [x] Add location-select handler that sets `selectedLocationId` and merges `targetId` into `timelineFilters`.
   - [x] Render `RealmMapPanel` above existing topology/location text views.

6. Styles
   - [x] Add responsive CSS for map shell, nodes, links, agent markers, selected states, and event pulses.
   - [x] Preserve keyboard focus visibility and text labels.

7. Verification
   - [x] `npm run typecheck`
   - [x] `npm test`
   - [x] `npm run build`
   - [x] `git diff --check`
   - [x] `python3 ./.trellis/scripts/task.py validate 06-02-2d-realm-map-mvp`

## Validation Commands

```bash
npm run typecheck
npm test
npm run build
git diff --check
python3 ./.trellis/scripts/task.py validate 06-02-2d-realm-map-mvp
```

## Risky Files / Boundaries

- `src/app/shared/viewModels.ts`: keep event/payload derivation centralized and tested.
- `src/app/realm/RealmDashboard.tsx`: local map selection must not replace existing timeline filter behavior.
- `src/app/realm/RealmMapPanel.tsx`: presentational only; no simulation rules or raw payload parsing.
- `src/app/styles.css`: avoid breaking existing responsive dashboard layout.

## Rollback Plan

Remove `RealmMapPanel`, map view-model additions, associated tests/styles, and the map import/render in `RealmDashboard`. Existing `LocationTopology`, `LocationBoard`, `AgentDetailPanel`, and `EventTimeline` should continue to work independently.
