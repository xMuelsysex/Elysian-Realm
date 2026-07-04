# Observable Simulation Agent Demo - Implementation Plan

## Step 0 - Pre-Check

- Read:
  - `.trellis/spec/backend/agent-simulation.md`
  - `.trellis/spec/backend/persona-memory.md`
  - `.trellis/spec/backend/quality-guidelines.md`
- Baseline:
  - `npm run build:packages`
  - `npm run typecheck`
  - `npm test`

## Step 1 - Add Demo Module

- Create `src/server/demo/simulationAgentDemo.ts`.
- Export:
  - `runSimulationAgentDemo()`;
  - `formatSimulationAgentDemo(result)`;
  - relevant result interfaces.
- Print formatted output when the module is run directly.

## Step 2 - Add Test

- Create `tests/simulationAgentDemo.test.ts`.
- Validate structured result:
  - completed proposal;
  - phase order;
  - plan memory;
  - persisted reflection memory.
- Validate formatted output contains key sections.

## Step 3 - Add npm Script

- Add `demo:simulation-agent` to `package.json`.

## Step 4 - Verify

Run:

```bash
npm run demo:simulation-agent
npm run build:packages
npm run typecheck
npm test
rg -n "src/server|src/shared|src/app|\\.\\./\\.\\./src" packages/simulation-agent/src
rg -n "packages/simulation-agent/src|@elysian/simulation-agent/src" src tests
git diff --check
python3 ./.trellis/scripts/task.py validate 07-04-observable-simulation-agent-demo
```

## Commit Boundary

Single work commit:

```text
feat: add observable simulation agent demo
```

Then archive, journal, and push.
