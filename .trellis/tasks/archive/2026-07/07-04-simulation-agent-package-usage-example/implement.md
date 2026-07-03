# Simulation Agent Package Usage Example - Implementation Plan

## Step 0 - Pre-Check

- Read backend package specs:
  - `.trellis/spec/backend/agent-simulation.md`
  - `.trellis/spec/backend/persona-memory.md`
  - `.trellis/spec/backend/quality-guidelines.md`
- Read parent framework scope docs for documentation expectations.
- Baseline:
  - `npm run build:packages`
  - `npm run typecheck`
  - `npm test`

## Step 1 - Add Package README

- Create `packages/simulation-agent/README.md`.
- Document:
  - package purpose;
  - host/package boundary;
  - facade quick start;
  - explicit reflection;
  - primitives for advanced integrations;
  - offline deterministic testing expectations.

## Step 2 - Add Executable Usage Test

- Create `tests/simulationAgentPackageUsage.test.ts`.
- Import only from `@elysian/simulation-agent`.
- Compose runtime facade, memory store, deterministic planner, action sink, and reflection planner.
- Assert tick + memory + explicit reflection behavior through public API.

## Step 3 - Verify

Run:

```bash
npm run build:packages
npm run typecheck
npm test
rg -n "src/server|src/shared|src/app|\\.\\./\\.\\./src" packages/simulation-agent/src
rg -n "packages/simulation-agent/src|@elysian/simulation-agent/src" src tests
git diff --check
python3 ./.trellis/scripts/task.py validate 07-04-simulation-agent-package-usage-example
```

## Commit Boundary

Single work commit:

```text
docs: add simulation agent package usage example
```

Then archive the task, record journal, and push.
