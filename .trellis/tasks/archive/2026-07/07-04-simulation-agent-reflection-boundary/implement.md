# Simulation Agent Reflection Boundary - Implementation Plan

## Step 0 - Pre-Check

- Read parent scope artifacts:
  - `.trellis/tasks/07-03-agent-framework-scope/prd.md`
  - `.trellis/tasks/07-03-agent-framework-scope/design.md`
  - `.trellis/tasks/07-03-agent-framework-scope/implement.md`
- Read this task's `prd.md` and `design.md`.
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

## Step 1 - Add Reflection Contracts

- Add `packages/simulation-agent/src/reflection/reflectionRecords.ts`.
- Define trigger/input/output/result/diagnostic types.
- Export from `packages/simulation-agent/src/index.ts`.

Validation:

- `npm run build:packages`.

## Step 2 - Add Validation

- Add `packages/simulation-agent/src/reflection/reflectionValidation.ts`.
- Implement package-owned visible validation errors or diagnostic builder.
- Validate reflection input and planner output against evidence memory IDs.
- Reuse M2 importance scale `0..9`.

Validation:

- Tests for empty evidence, empty source IDs, unknown evidence IDs, invalid importance, blank content.

## Step 3 - Add Reflection Runner

- Add `packages/simulation-agent/src/reflection/reflectionPlanner.ts`.
- Define `ReflectionPlanner`.
- Implement `runReflection`.
- Convert valid insights to `MemoryWrite` values with `kind: "reflection"` and evidence IDs in `relatedMemoryIds`.
- Catch planner thrown/rejected errors and return failed diagnostics with no writes.

Validation:

- Tests for valid fake planner, malformed output, planner failure.

## Step 4 - Public Export and Boundary Checks

- Export reflection primitives through package root.
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

Update `.trellis/spec/backend/persona-memory.md` and/or `.trellis/spec/backend/agent-simulation.md` with concrete reflection package contract if implementation differs from this plan.

## Commit Boundary

Single work commit for M3:

```text
feat: add simulation agent reflection boundary
```

Do not include unrelated dirty files, generated images, old `06-20` task deletions, or knowledge-vault files.
