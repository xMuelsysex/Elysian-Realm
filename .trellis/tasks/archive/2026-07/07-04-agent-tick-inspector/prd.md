# Agent tick inspector for real engine diagnostics

## Goal

Expose and visualize the real simulation engine's per-step agent tick diagnostics in the Admin UI. The engine already returns `SimulationStepResult.agentTickDiagnostics`, but the admin controller currently drops it. This task should surface that real data as a read-only inspector and pair each proposal with same-step agent events, without mixing in CLI demo data or polluting replay events.

## Review Input

Claude review via CodeG recommended adjusting the prior M9/M10 route:

- Do not move the CLI demo's canned data into the browser first.
- Do a smaller M10-lite + M11 slice instead.
- Preserve diagnostics as a separate response field; never append diagnostics to `events`.
- Use existing real engine data before inventing memory/reflection UI surfaces that do not exist in the engine yet.

## Requirements

- Extend the admin response with latest step `agentTickDiagnostics`.
- Preserve diagnostics separately from replay-visible `events`, `timeline`, and `replay`.
- Keep the inspector read-only.
- Add a frontend view model that pairs each agent tick diagnostic with same-step agent events for that agent.
- Add an Admin UI panel that renders:
  - agent id/name when available;
  - tick phase statuses/details;
  - optional proposal;
  - same-step related agent events.
- Reuse existing dashboard/view-model/component patterns.
- Add backend/view-model tests proving diagnostics are exposed and not replay events.

## Acceptance Criteria

- [x] `AdminStateResponse` exposes latest `agentTickDiagnostics`.
- [x] `step()` and valid `submitInput()` responses include latest tick diagnostics when the engine ran agent ticks.
- [x] Initial/reset responses expose an empty diagnostics list.
- [x] `events`, `timeline`, and `replay` do not contain agent tick diagnostics.
- [x] UI/view model renders phase diagnostics, proposal, and same-step related agent events read-only.
- [x] Existing replay/event tests remain green.
- [x] `npm run build:packages`, `npm run typecheck`, and `npm test` pass.
- [x] Boundary scans pass.

## Definition of Done

- Work is committed separately.
- Task is archived and journaled after verification.
- Branch is pushed after commits.

## Out of Scope

- CLI demo data in the browser.
- Persisted per-agent memory stream.
- Engine reflection trigger policy.
- Real LLM planner integration.
- Diagnostics history across many steps.
- Any world-state mutation path changes.

## Technical Notes

- Backend files:
  - `src/server/admin/adminContracts.ts`
  - `src/server/admin/adminController.ts`
  - `src/server/simulation/engine.ts` as read-only reference
- Frontend files:
  - `src/app/shared/viewModels.ts`
  - `src/app/realm/ObservabilityPanels.tsx`
  - `src/app/realm/RealmDashboard.tsx`
  - `src/app/shared/i18n.ts`
- Tests:
  - `tests/adminController.test.ts`
  - `tests/adminViewModels.test.ts`
