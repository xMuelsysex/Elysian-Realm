# Simulation Agent Package Usage Example - Design

## 1. Boundary Objective

M6 makes the package understandable as a framework surface without adding behavior. The deliverable is documentation plus an executable example that validates the public entrypoint.

The package owns:

- public API documentation;
- a quick-start facade integration example;
- guidance on primitive versus facade usage.

The host owns:

- world state and state mutation;
- perception projection;
- action proposal schema;
- provider configuration and planner policy;
- reflection trigger and evidence selection policy.

## 2. Documentation Shape

Create `packages/simulation-agent/README.md` with:

- package purpose;
- ownership boundaries;
- install/import note for the in-repo package;
- quick-start example using `SimulationAgentRuntime`;
- explicit reflection example;
- primitive API guidance;
- testing and boundary expectations.

The README should avoid Elysian-specific concrete types so it remains extraction-friendly.

## 3. Executable Example Shape

Add `tests/simulationAgentPackageUsage.test.ts`.

The test should:

- import only from `@elysian/simulation-agent`;
- build a small fake host perception, memory store, planner, action sink, and reflection planner;
- call `runtime.tickSync(...)`;
- assert a proposal is submitted and a memory write is recorded;
- call `runtime.reflect(...)` explicitly with evidence from the store;
- assert a persisted `kind: "reflection"` memory is created when configured.

This duplicates some runtime-test coverage intentionally at a higher documentation boundary: it protects package usage examples rather than runtime internals.

## 4. Non-Goals

- No new exported API.
- No provider adapter.
- No README-driven test extraction or markdown code execution.
- No frontend or Elysian adapter changes.

## 5. Verification

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
