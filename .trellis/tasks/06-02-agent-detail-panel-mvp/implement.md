# Agent Detail Panel MVP - Implementation Plan

## Review Gate

Do not start implementation until the user reviews/approves the planning artifacts. Product decision is resolved: the Agent detail panel belongs in the main content column below `LocationBoard` and above `EventTimeline`; agents are selected from accessible controls in `LocationBoard`.

## Ordered Checklist

### 1. Pre-development context

- [ ] Read `prd.md`, `design.md`, and this `implement.md`.
- [ ] Read frontend specs: realm interface, directory structure, component guidelines, state management, type safety, quality.
- [ ] Read backend simulation spec for agent/runtime state boundaries.
- [ ] Confirm scope remains frontend-only and reads existing `AdminStateResponse` data.

### 2. View-model helpers

- [ ] Inspect `src/app/shared/viewModels.ts` current helpers.
- [ ] Add selected-agent lookup helper.
- [ ] Add current-location lookup/formatting helper if needed.
- [ ] Add related-event filtering helper using actor/target matching.
- [ ] Reuse `TimelineItem` projection for related event display.
- [ ] Keep helpers pure; do not mutate snapshot data.

### 3. UI integration

- [ ] Add local `selectedAgentId` state in `RealmDashboard`.
- [ ] Pass `selectedAgentId` and `onSelectAgent` into `LocationBoard`.
- [ ] Make agent entries in `LocationBoard` selectable buttons or accessible controls.
- [ ] Render selected marker by text plus style, not color alone.
- [ ] Add `src/app/agents/AgentDetailPanel.tsx` for runtime detail display.
- [ ] Place the panel directly below `LocationBoard` and above `EventTimeline` in the main content column.
- [ ] Show a no-selection empty state.

### 4. Localization

- [ ] Add Chinese copy for agent detail labels and empty states.
- [ ] Add English copy for agent detail labels and empty states.
- [ ] Keep raw IDs visible where useful for debugging.

### 5. Tests

- [ ] Extend or add view-model tests for selected-agent lookup.
- [ ] Test related-event filtering by actor/target.
- [ ] Test empty/no-selection behavior.
- [ ] Test current location mapping.
- [ ] Ensure existing timeline/user-debug projection tests still pass.

### 6. Validation

Run, in order:

```bash
npm run typecheck
npm test
npm run build
python3 ./.trellis/scripts/task.py validate 06-02-agent-detail-panel-mvp
git diff --check
```

## Scope Guardrails

Do not add:

- backend API changes;
- persona fixture projection in `AdminStateResponse`;
- state mutation commands for agents;
- memory/reflection/conversation history systems;
- database/persistence;
- LLM/provider calls;
- URL routing;
- broad dashboard redesign.

## Risky Files / Rollback Points

Likely touched:

- `src/app/realm/RealmDashboard.tsx`
- `src/app/realm/LocationBoard.tsx`
- `src/app/agents/AgentDetailPanel.tsx`
- `src/app/shared/viewModels.ts`
- `src/app/shared/i18n.ts`
- `src/app/styles.css`
- `tests/adminViewModels.test.ts` and/or new frontend view-model tests
- task planning/context files

Rollback should be possible by removing the Agent detail panel, selected-agent local state, and related helpers/tests.

## Final Review Checklist

- [ ] Selection is local UI state only.
- [ ] Agent details render backend-owned runtime state without mutation.
- [ ] Runtime state is clearly labeled and not presented as configured persona canon.
- [ ] Related events reuse centralized `TimelineItem` projection.
- [ ] Components do not parse event payloads locally.
- [ ] Empty/no-selection states are explicit.
- [ ] Chinese/English labels exist.
- [ ] Quality gate passes.
