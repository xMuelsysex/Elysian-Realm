# Elysian Runtime Facade Consumer - Implementation Plan

## Step 0 - Pre-Check

- Read applicable specs:
  - `.trellis/spec/backend/agent-simulation.md`
  - `.trellis/spec/backend/persona-memory.md`
  - `.trellis/spec/backend/error-handling.md`
  - `.trellis/spec/backend/quality-guidelines.md`
- Read completed M4 artifact:
  - `.trellis/tasks/archive/2026-07/07-04-simulation-agent-runtime-facade/prd.md`
  - `.trellis/tasks/archive/2026-07/07-04-simulation-agent-runtime-facade/design.md`
- Baseline checks:
  - `npm run build:packages`
  - `npm run typecheck`
  - `npm test`

## Step 1 - Add `tickSync` to Runtime Facade

- Update `packages/simulation-agent/src/runtime/simulationAgentRuntime.ts`.
- Import and delegate to `runCognitiveTickSync`.
- Keep `tick()` unchanged.

Validation:

- `npm run build:packages`.

## Step 2 - Add Package Runtime Tests

- Update `tests/simulationAgentRuntime.test.ts`.
- Cover deterministic `tickSync` success.
- Cover async planner misuse failure through `tickSync`.

Validation:

- `npm run typecheck`.
- `npm test`.

## Step 3 - Update Elysian Adapter Consumer

- Update `src/server/simulation/agentRuntimeAdapter.ts`.
- Replace direct primitive invocation with `new SimulationAgentRuntime(deps).tickSync(...)`.
- Keep deterministic memory stub, perception projection, planner, and action sink behavior unchanged.

Validation:

- Existing `tests/agentRuntimeAdapter.test.ts` remains green.
- `tests/simulationEngine.test.ts` remains green.

## Step 4 - Boundary and Spec Checks

Run:

```bash
rg -n "src/server|src/shared|src/app|\\.\\./\\.\\./src" packages/simulation-agent/src
rg -n "packages/simulation-agent/src|@elysian/simulation-agent/src" src tests
npm run build:packages
npm run typecheck
npm test
git diff --check
python3 ./.trellis/scripts/task.py validate 07-04-elysian-runtime-facade-consumer
```

Update `.trellis/spec/backend/agent-simulation.md` if `tickSync` changes the runtime facade contract.

## Commit Boundary

Single work commit:

```text
feat: consume simulation agent runtime facade
```

Do not include unrelated dirty files, generated images, old `06-20` task deletions, or knowledge-vault files.
