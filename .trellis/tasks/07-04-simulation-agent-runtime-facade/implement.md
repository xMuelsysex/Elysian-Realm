# Simulation Agent Runtime Facade - Implementation Plan

## Step 0 - Pre-Check

- Read completed milestone artifacts:
  - `.trellis/tasks/archive/2026-07/07-03-simulation-agent-package-boundary/prd.md`
  - `.trellis/tasks/archive/2026-07/07-04-simulation-agent-memory-slice/prd.md`
  - `.trellis/tasks/archive/2026-07/07-04-simulation-agent-reflection-boundary/prd.md`
  - `.trellis/tasks/archive/2026-07/07-04-simulation-agent-reflection-boundary/design.md`
- Read applicable specs:
  - `.trellis/spec/backend/persona-memory.md`
  - `.trellis/spec/backend/agent-simulation.md`
  - `.trellis/spec/backend/llm-orchestration.md`
  - `.trellis/spec/backend/error-handling.md`
  - `.trellis/spec/backend/quality-guidelines.md`
- Baseline checks:
  - `npm run build:packages`
  - `npm run typecheck`
  - `npm test`

## Step 1 - Add Runtime Facade Contracts

- Add `packages/simulation-agent/src/runtime/simulationAgentRuntime.ts`.
- Define runtime deps/options/result contracts.
- Export from `packages/simulation-agent/src/index.ts`.

Validation:

- `npm run build:packages`.

## Step 2 - Implement `tick`

- Store the configured `CognitiveLoopDeps`.
- Delegate to `runCognitiveTick`.
- Do not duplicate loop logic.
- Do not change reflect phase behavior in this task.

Validation:

- Test fake host action proposal and diagnostics.
- Test memory write through existing `buildMemoryWrite` hook.

## Step 3 - Implement Explicit `reflect`

- Delegate to `runReflection`.
- Support dry-run default with no persistence.
- Support optional persistence through the configured memory port/store.
- Keep planner/provider failures visible.

Validation:

- Test dry-run returns writes without store mutation.
- Test persistence writes `kind: "reflection"` records with evidence IDs.
- Test malformed planner output and thrown planner errors do not persist records.

## Step 4 - Public Export and Boundary Checks

- Export facade primitives through package root.
- Do not import Elysian modules.
- Do not add provider adapter/env reads/network calls.

Validation:

```bash
rg -n "src/server|src/shared|src/app|\\.\\./\\.\\./src" packages/simulation-agent/src
rg -n "packages/simulation-agent/src|@elysian/simulation-agent/src" src tests
npm run build:packages
npm run typecheck
npm test
```

## Step 5 - Spec Review

Update `.trellis/spec/backend/persona-memory.md` and/or `.trellis/spec/backend/agent-simulation.md` if the runtime facade establishes a concrete contract not already captured in M1/M2/M3 specs.

## Commit Boundary

Single work commit for M4:

```text
feat: add simulation agent runtime facade
```

Do not include unrelated dirty files, generated images, old `06-20` task deletions, or knowledge-vault files.
