# Event Detail Projection Optimization - Implementation Plan

## Review Gate

Do not start implementation until the user reviews/approves the planning artifacts. Product decision is resolved: default user mode uses pure natural sentences; debug mode uses sentence + key facts and exposes raw payload JSON.

## Ordered Checklist

### 1. Pre-development context

- [ ] Read `prd.md`, `design.md`, and this `implement.md`.
- [ ] Read frontend specs: realm interface, type safety, component guidelines, quality.
- [ ] Read backend simulation spec for event kinds/payload contracts.
- [ ] Confirm scope remains frontend projection only unless a compile/test issue requires a contract correction.

### 2. Projection implementation

- [ ] Inspect current `src/app/shared/viewModels.ts` and `src/app/shared/i18n.ts`.
- [ ] Add or refactor a central event-detail projector for known MVP event kinds.
- [ ] Introduce a local UI-only timeline detail mode, e.g. `"user" | "debug"`.
- [ ] In user mode, project pure natural sentence details.
- [ ] In debug mode, project sentence + key facts such as IDs, counts, time scale, status, command kind, and batch id.
- [ ] Use small runtime readers for payload values; do not cast raw payloads in components.
- [ ] Keep fallback generic payload summary for unknown/future event kinds or malformed payloads.
- [ ] Preserve `TimelineItem` shape unless a clear UI need appears.

### 3. Localization

- [ ] Add Chinese detail phrasing for every MVP event kind.
- [ ] Add English detail phrasing for every MVP event kind.
- [ ] Keep raw IDs/kinds in debug details where useful for debugging.
- [ ] Avoid debug-style key/value lists in default user mode.

### 4. UI integration

- [ ] Add a visible debug-mode toggle near the timeline or dashboard controls.
- [ ] Ensure `EventTimeline.tsx` renders `TimelineItem.detail` in both modes.
- [ ] Show raw payload `JsonDetails` only when debug mode is enabled.
- [ ] Avoid adding component-level payload parsing.
- [ ] Avoid layout-heavy changes unless needed for readability.

### 5. Tests

- [ ] Extend `tests/adminViewModels.test.ts` to cover each known MVP event kind detail projection.
- [ ] Assert Chinese default and English projection behavior.
- [ ] Assert user-mode pure natural sentence behavior.
- [ ] Assert debug-mode key fact behavior.
- [ ] Assert unknown/fallback projection remains visible without throwing.

### 6. Validation

Run, in order:

```bash
npm run typecheck
npm test
npm run build
python3 ./.trellis/scripts/task.py validate 06-02-event-detail-projection-optimization
git diff --check
```

## Scope Guardrails

Do not add:

- new event kinds;
- backend persistence or replay storage;
- LLM/provider calls;
- agent profile/conversation/memory panels;
- filtering/search controls;
- a second event parsing implementation in React components;
- broad visual redesign.

## Risky Files / Rollback Points

Likely touched:

- `src/app/shared/viewModels.ts`
- `src/app/shared/i18n.ts`
- `tests/adminViewModels.test.ts`
- task planning/context files

Rollback should be possible by reverting those files to generic payload summaries.

## Final Review Checklist

- [ ] Each MVP event kind has readable Chinese and English details.
- [ ] Default user mode uses natural sentences.
- [ ] Debug mode includes key facts.
- [ ] Raw JSON remains available in debug mode.
- [ ] Unknown/future events still show a safe fallback.
- [ ] Components do not inspect `event.payload`.
- [ ] Tests cover projection behavior.
- [ ] Quality gate passes.
