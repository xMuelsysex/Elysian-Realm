# Frontend Dashboard Tab Pages MVP Design

## Approach

Add local tab state to `RealmDashboard` and render page groups instead of the previous always-visible `dashboard-main` + `dashboard-side` layout.

No router is introduced. The selected tab is local UI state and does not affect backend simulation state.

## Proposed Tabs

- Overview: world header already above tabs, then world inspector, state diff, receipt, diagnostics summary.
- Map: 2D map, topology, locations board.
- Agents: agent detail, relationship network, plans, memory/message/persona panels.
- Events: event timeline and replay controls.
- Control: intervention controls and runtime LLM config.
- Debug: debug export and raw debug panel.

## Component Structure

Keep `RealmDashboard` as the container that computes existing view models once. Extract tab metadata/helper types inside the same file for the MVP to avoid broad refactor.

CSS changes:

- replace two-column always-on grid with tab navigation and active page grid;
- keep responsive behavior simple;
- reuse `.panel` and existing component styles.

## Testing

Prefer a pure exported helper for tab definitions so tests can assert tab order/default without needing a DOM renderer. Existing view-model tests continue to cover projections.
