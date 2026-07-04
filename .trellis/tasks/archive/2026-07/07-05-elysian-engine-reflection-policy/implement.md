# Elysian Engine Reflection Policy - Implementation Plan

## Step 0 - Pre-Check

- Read backend/frontend specs via `trellis-before-dev`.
- Baseline:
  - `npm run build:packages`
  - `npm run typecheck`
  - `npm test`

## Step 1 - Package Sync Reflection

- Add `runReflectionSync(...)` to the package reflection planner.
- Add `SimulationAgentRuntime.reflectSync(...)`.
- Share persistence code between async and sync runtime reflection paths.
- Add package tests for sync success, persistence, and async-planner misuse.

## Step 2 - Engine Reflection Types

- Extend engine adapter metadata with reflection fields.
- Add `EngineReflectionDiagnostic`.
- Export the type through `src/server/simulation/index.ts`.

## Step 3 - Engine Policy

- Run policy after agent tick memory writes in `stepSimulationEngine`.
- Select bounded non-reflection evidence.
- Call `SimulationAgentRuntime.reflectSync(...)`.
- Persist deterministic reflection memory IDs through the engine memory store.
- Return updated `agentMemories` and latest reflection diagnostics.

## Step 4 - Admin Projection

- Extend `AdminStateResponse` with latest reflection diagnostics.
- Clone diagnostics and nested arrays/metadata.
- Add tests proving diagnostics stay outside replay-visible projections.

## Step 5 - View Model + UI

- Add a reflection diagnostics view model.
- Add a read-only Admin UI panel.
- Mount in overview/debug near the tick inspector and memory stream.

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
python3 ./.trellis/scripts/task.py validate 07-05-elysian-engine-reflection-policy
```

## Commit Boundary

Single work commit:

```text
feat: add engine reflection policy
```

Then archive, journal, and push.
