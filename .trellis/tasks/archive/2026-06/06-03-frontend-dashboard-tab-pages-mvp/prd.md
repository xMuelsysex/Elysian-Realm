# Frontend Dashboard Tab Pages MVP

## Goal

Split the admin dashboard's long single-page layout into top-level tab pages so the interface is easier to scan and does not place every panel on one screen.

## Requirements

1. Use top tab navigation inside `RealmDashboard`; do not introduce a routing library for this MVP.
2. Keep backend projections as the source of truth; tabs are local UI state only.
3. Preserve existing panels and functionality.
4. Group panels into clear subpages:
   - Overview
   - Map
   - Agents
   - Events
   - Debug / LLM
5. Keep side controls available without overwhelming every page.
6. Preserve selection/filter/replay state while switching tabs.
7. Add targeted tests for the tab view-model/configuration if practical.
8. Run typecheck, tests, build, diff check, and Trellis validation.

## Acceptance Criteria

- [x] Dashboard renders a top tab navigation.
- [x] Only the active tab page's primary panels are displayed.
- [x] The initial tab is Overview.
- [x] Controls/intervention and LLM runtime config are accessible from a dedicated page/section instead of always crowding the UI.
- [x] Existing map, timeline, agent detail, debug/export, and LLM panels remain usable.
- [x] Tab state is frontend-only and does not mutate simulation state.
- [x] `npm run typecheck` passes.
- [x] `npm test` passes.
- [x] `npm run build` passes.
- [x] `git diff --check` passes.
- [x] `python3 ./.trellis/scripts/task.py validate 06-03-frontend-dashboard-tab-pages-mvp` passes.
