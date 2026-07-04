# Elysian Agent Memory Stream - Implementation Plan

## Step 0 - Pre-Check

- Read backend/frontend specs via `trellis-before-dev`.
- Baseline:
  - `npm run build:packages`
  - `npm run typecheck`
  - `npm test`

## Step 1 - Package Memory Store Rehydration

- Add a generic way to initialize `InMemoryMemoryStore` from existing records.
- Preserve duplicate ID checks and defensive copies.
- Add package tests for constructor/import behavior if needed.

## Step 2 - Engine Memory State

- Extend `SimulationEngineState` with `agentMemories`.
- Initialize deterministic seed memories in `createSimulationEngine`.
- Carry cloned records through `queueSimulationInput` and `stepSimulationEngine`.
- Preserve existing replay event order.

## Step 3 - Adapter Memory Port

- Replace the engine adapter's memory stub with a real package memory port supplied by the engine.
- Build deterministic retrieval queries from perception.
- Build plan memory writes when proposals exist.
- Include step/source metadata.

## Step 4 - Admin Projection

- Extend `AdminStateResponse` with cloned memory records.
- Add tests proving response cloning and separation from events/timeline/replay.

## Step 5 - View Model + UI

- Add memory stream view model.
- Add read-only Admin UI panel.
- Mount in a relevant existing dashboard page.
- Add view-model tests.

## Step 6 - Verify

Run:

```bash
npm run build:packages
npm run typecheck
npm test
npm run build:ui
rg -n "src/server|src/shared|src/app|\\.\\./\\.\\./src" packages/simulation-agent/src
rg -n "packages/simulation-agent/src|@elysian/simulation-agent/src" src tests
git diff --check
python3 ./.trellis/scripts/task.py validate 07-05-07-05-elysian-agent-memory-stream
```

## Commit Boundary

Single work commit:

```text
feat: persist engine agent memory stream
```

Then archive, journal, and push.
