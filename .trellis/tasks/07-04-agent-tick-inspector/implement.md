# Agent Tick Inspector - Implementation Plan

## Step 0 - Pre-Check

- Read backend and frontend specs.
- Baseline:
  - `npm run build:packages`
  - `npm run typecheck`
  - `npm test`

## Step 1 - Backend Projection

- Extend `AdminStateResponse`.
- Preserve latest `agentTickDiagnostics` in `createAdminController`.
- Update `createAdminStateResponse` to accept diagnostics.
- Add/update controller tests.

## Step 2 - View Model

- Add `AgentTickInspectorViewModel` helpers in `src/app/shared/viewModels.ts`.
- Cover empty, phase/proposal, and same-step event association tests.

## Step 3 - UI Panel

- Add read-only panel in `ObservabilityPanels.tsx`.
- Mount in `RealmDashboard.tsx`.
- Add i18n copy if needed.

## Step 4 - Verify

Run:

```bash
npm run build:packages
npm run typecheck
npm test
rg -n "src/server|src/shared|src/app|\\.\\./\\.\\./src" packages/simulation-agent/src
rg -n "packages/simulation-agent/src|@elysian/simulation-agent/src" src tests
git diff --check
python3 ./.trellis/scripts/task.py validate 07-04-agent-tick-inspector
```

## Commit Boundary

Single work commit:

```text
feat: expose agent tick inspector
```

Then archive, journal, and push.
