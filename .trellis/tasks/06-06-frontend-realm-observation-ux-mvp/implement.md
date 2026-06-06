# Frontend Realm Observation UX MVP Implementation Plan

## Pre-implementation Gate

- [ ] Read the task PRD and design.
- [ ] Load frontend specs before editing:
  - `.trellis/spec/frontend/index.md`
  - `.trellis/spec/frontend/realm-interface.md`
  - `.trellis/spec/frontend/state-management.md`
  - `.trellis/spec/frontend/type-safety.md`
  - `.trellis/spec/frontend/quality-guidelines.md`
- [ ] Confirm the implementation still targets frontend-only changes unless a typed shared contract issue is discovered.
- [ ] Do not start implementation until the user asks to proceed from planning.

## Ordered Work

1. Baseline and affected file review
   - Inspect `RealmDashboard`, `RealmMapPanel`, `ObservabilityPanels`, `AgentDetailPanel`, `LlmRuntimeConfigPanel`, `actionProposalDraft`, `viewModels`, styles, and existing frontend tests.
   - Record any discovered scope adjustment in `prd.md` before coding.

2. Map atmosphere slice
   - Extend map-related view models with display-only fields for activity/speech bubbles or agent-card metadata when needed.
   - Update `RealmMapPanel` to show stronger location clusters, occupancy cues, and readable agent chips/cards.
   - Update CSS without introducing a new rendering engine.
   - Add or update tests for new map-derived view-model behavior.

3. Replay controls slice
   - Extend replay UI with play/pause, speed selection, progress/cursor display, and jump-to-event behavior.
   - Keep replay timer state local to UI and separate from live simulation stepping.
   - Add or update tests around replay cursor normalization / display view model if derived behavior changes.

4. Agent dossier slice
   - Reorganize `AgentDetailPanel` to emphasize current action, location, relationships, recent events, and provenance sections.
   - Keep configured persona facts and runtime/generated/user/system content visibly separate.
   - Add/update view-model tests if helper output changes.

5. Structured LLM proposal review slice
   - Add a structured review/apply form for validated proposals and draft fields.
   - Keep raw JSON as advanced/debug, not the normal path.
   - Preserve audit metadata and submit via `SubmitAdminInputRequest` through `onSubmitInput`.
   - Extend `tests/llmActionProposalDraft.test.ts` or add focused tests for form/draft mapping helpers.

6. Integration polish
   - Check bilingual copy and empty/loading/error states.
   - Ensure timeline filters, selected agent/location/event state, and dashboard tabs still work.
   - Confirm no component mutates `WorldSnapshot` or duplicates backend simulation rules.

## Validation Commands

Run from repository root:

```bash
npm run typecheck
npm test
```

If implementation touches UI build assumptions, also run:

```bash
npm run build
```

## Review Checklist

- [ ] Diff is frontend-focused and does not add backend state mutation paths.
- [ ] New derived data lives in shared helpers instead of repeated component parsing.
- [ ] LLM proposal failures and invalid drafts remain visible errors.
- [ ] JSON/debug affordances do not become the primary user flow.
- [ ] No secrets or API keys are copied into proposal draft metadata.
- [ ] Accessibility labels remain present for controls and map interactions.
- [ ] Tests cover the changed helper behavior.

## Risk and Rollback Points

- Map/replay/agent dossier changes should be independently revertible if the UI becomes noisy.
- Proposal form changes are the highest-risk frontend slice because they affect state-changing submissions; keep helper tests tight and preserve the current raw JSON parsing fallback as an advanced path during MVP.
- Do not remove existing diagnostics before the new observation UX proves equivalent visibility for failures.
