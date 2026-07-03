# Simulation Agent Testing Helpers - Implementation Plan

## Step 0 - Pre-Check

- Read applicable specs:
  - `.trellis/spec/backend/agent-simulation.md`
  - `.trellis/spec/backend/quality-guidelines.md`
- Baseline:
  - `npm run build:packages`
  - `npm run typecheck`
  - `npm test`

## Step 1 - Add Testing Helpers

- Add `packages/simulation-agent/src/testing/testPorts.ts`.
- Implement:
  - `createStaticPerceptionPort`;
  - `createStaticPlanningPort`;
  - `createMemoryPortStub`;
  - `createActionCollector`.
- Export from `packages/simulation-agent/src/index.ts`.

## Step 2 - Add Tests

- Add `tests/simulationAgentTestingHelpers.test.ts`.
- Verify helpers compose with `runCognitiveTickSync`.
- Verify call recording, submission capture, skipped plans, and clearing state.

## Step 3 - Update Spec

- Update `.trellis/spec/backend/agent-simulation.md` with testing helper public API and constraints.

## Step 4 - Verify

Run:

```bash
npm run build:packages
npm run typecheck
npm test
rg -n "src/server|src/shared|src/app|\\.\\./\\.\\./src" packages/simulation-agent/src
rg -n "packages/simulation-agent/src|@elysian/simulation-agent/src" src tests
git diff --check
python3 ./.trellis/scripts/task.py validate 07-04-simulation-agent-testing-helpers
```

## Commit Boundary

Single work commit:

```text
feat: add simulation agent testing helpers
```

Then archive the task, record journal, and push.
