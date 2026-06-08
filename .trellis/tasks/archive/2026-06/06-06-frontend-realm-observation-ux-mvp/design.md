# Frontend Realm Observation UX MVP Design

## Design Intent

This is a frontend-productization slice over the existing local admin dashboard. The MVP borrows atmosphere and interaction patterns from AI Town, ALICE_PROJECT, and OpenStory while keeping the current Elysian Realm architecture: React renders backend-owned projections and state changes go through typed admin input/API boundaries.

## Architecture Boundaries

### Keep

- `AdminStateResponse` remains the frontend data source.
- `WorldSnapshot` remains backend-owned and read-only in the UI.
- Existing view-model helpers in `src/app/shared/viewModels.ts` remain the place for reusable derived display state.
- Existing API functions in `src/app/adminApi.ts` remain the boundary for stepping, resetting, submitting input, testing LLM config, and proposing LLM actions.
- Runtime LLM configuration remains session-only and local to the panel.

### Do not introduce

- Pixi/Phaser/Canvas/WebGL rendering for this MVP.
- A frontend simulation loop or local copy of authoritative world state.
- A second proposal application path that bypasses `SubmitAdminInputRequest`.
- Hidden fallbacks that convert failed provider/proposal operations into successful UI states.

## Proposed UI Shape

```text
Dashboard shell
├── Map / Observation page
│   ├── Atmospheric realm map card
│   ├── Location clusters with occupancy counts
│   ├── Agent chips/cards with status, selected state, and current intent
│   └── Activity/speech-like bubbles from timeline/view-model data
├── Replay / Events page
│   ├── Play / pause local replay
│   ├── Previous / next event
│   ├── Speed selector
│   ├── Progress/cursor display and event jump
│   └── Selected event preview with IDs and time
├── Agent dossier
│   ├── Current status/action/location hero
│   ├── Configured persona facts with configured provenance
│   ├── Relationship refs and related recent events
│   └── Runtime memory indicators with provenance badges
└── LLM proposal review
    ├── Sandbox proposal preview
    ├── Structured review/apply form for supported fields
    ├── Advanced JSON details/draft escape hatch
    └── Submit through existing typed input boundary
```

## Component and Data Flow

### Map Atmosphere

- Candidate files:
  - `src/app/realm/RealmMapPanel.tsx`
  - `src/app/shared/viewModels.ts`
  - `src/app/styles.css`
- Extend `RealmMapViewModel` only for display fields such as recent activity text, bubble tone, role/status labels, and compact agent-card metadata.
- Derive all new map display values from `WorldSnapshot`, timeline items, and existing i18n helpers.
- Selection stays local UI state in `RealmDashboard`.

### Replay Controls

- Candidate files:
  - `src/app/realm/ObservabilityPanels.tsx`
  - `src/app/realm/RealmDashboard.tsx`
  - `src/app/shared/viewModels.ts`
  - `src/app/styles.css`
- Add local replay playback state such as `playing` and `speed` in `RealmDashboard` or a small replay-specific component.
- Use timers only to advance the local `replayCursor` over already available timeline items.
- Keep live simulation stepping (`onStep`) separate from replay cursor playback unless the UI labels explicitly say it is stepping the live simulation.

### Agent Dossier

- Candidate files:
  - `src/app/agents/AgentDetailPanel.tsx`
  - `src/app/shared/viewModels.ts`
  - `src/app/styles.css`
- Preserve configured-vs-runtime separation.
- Improve hierarchy and scanning: hero/current action, relationship chips, recent event cards, memory/provenance sections.
- Do not derive new relationship strength or memory importance in the browser.

### Structured LLM Proposal Review

- Candidate files:
  - `src/app/llm/LlmRuntimeConfigPanel.tsx`
  - `src/app/llm/actionProposalDraft.ts`
  - `tests/llmActionProposalDraft.test.ts`
  - `src/app/styles.css`
- Use existing `LlmActionProposalResponse` and `createLlmProposalInterventionDraft` as the source for an editable structured form.
- Form fields should map to the currently supported draft/request shape; unsupported raw metadata remains preserved by helper code or shown in advanced/debug JSON.
- Submitting the form must still produce a `SubmitAdminInputRequest` and call `onSubmitInput`.
- API keys must never be copied into draft/proposal metadata.

## Accessibility and UX Rules

- Buttons and inputs need accessible labels, not color-only state.
- Map text fallback should remain available or improve, not regress.
- Auto-updating replay controls must not steal focus.
- Errors and rejected operations stay visible.
- Chinese/English copy should remain consistent with the existing `AppLanguage` pattern.

## Compatibility and Migration

- No backend schema change is required for this MVP.
- No new dependency is required unless implementation discovers a strong reason; default is CSS/React only.
- Existing tests should continue to run offline.
- Existing debug panels may remain, but the primary path should feel more like an observation terminal than a raw JSON dashboard.

## Trade-offs

- CSS-based map polish is less visually rich than Pixi/Phaser but keeps the MVP small and preserves current architecture.
- Structured proposal forms may initially support only existing action proposal fields; keeping advanced JSON avoids blocking unusual debug cases.
- Replay playback over existing events improves exploration without adding persistent run storage yet.

## Rollback Shape

If the UX slice becomes unstable, revert the frontend component/view-model/style changes and any related tests. No data migration or backend rollback should be required.
