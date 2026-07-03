# Package Simulation Agent Framework Boundary - Implementation Plan

## Step 0 - Pre-Check

- Read parent scope PRD/design:
  - `.trellis/tasks/07-03-agent-framework-scope/prd.md`
  - `.trellis/tasks/07-03-agent-framework-scope/design.md`
- Read this task's `prd.md` and `design.md`.
- Run baseline checks:
  - `npm run typecheck`
  - `npm test`
- Confirm current imports:
  - `rg -n "agent-core|runCognitiveTick|runAgentCognitiveTickForEngine" src tests`

## Step 1 - Add Package Skeleton

- Create `packages/simulation-agent/package.json`.
- Create `packages/simulation-agent/tsconfig.json`.
- Create package source folders:
  - `src/loop`
  - `src/diagnostics`
  - `src/ports`
- Add explicit public entrypoint at `packages/simulation-agent/src/index.ts`.

Validation:

- `npm run typecheck` may not pass yet if imports have not moved; proceed to Step 2 before treating failures as final.

## Step 2 - Move Existing Agent-Core Source

- Move current files:
  - `src/agent-core/cognitiveLoop.ts` -> `packages/simulation-agent/src/loop/cognitiveLoop.ts`
  - `src/agent-core/diagnostics.ts` -> `packages/simulation-agent/src/diagnostics/diagnostics.ts`
  - `src/agent-core/ports.ts` -> `packages/simulation-agent/src/ports/ports.ts`
  - `src/agent-core/index.ts` -> `packages/simulation-agent/src/index.ts`
- Update internal imports to new relative paths.
- Delete now-empty `src/agent-core`.

Validation:

- Package source should not import from `src/server`, `src/shared`, or Elysian app modules.

## Step 3 - Wire npm Workspace and Build

- Add root `"workspaces": ["packages/*"]`.
- Add root dependency on `@elysian/simulation-agent` using the npm-supported workspace/local package syntax.
- Add or update build scripts so package compiles before root server tests:
  - likely add `build:packages`;
  - update `build:server` to run package build first.
- Run `npm install` to update lockfile/workspace links.

Validation:

- `npm run build:packages`.
- `npm run typecheck` after import updates in Step 4.

## Step 4 - Update Consumers and Tests

- Update `src/server/simulation/agentRuntimeAdapter.ts` to import framework APIs from `@elysian/simulation-agent`.
- Update `tests/agentCoreCognitiveLoop.test.ts` to import from `@elysian/simulation-agent`.
- Keep `tests/agentRuntimeAdapter.test.ts` importing adapter from Elysian app code, but type imports from framework package when needed.
- Search and remove stale `src/agent-core` imports.

Validation:

- `rg -n "src/agent-core|\\.\\./src/agent-core|\\.\\./\\.\\./agent-core" src tests packages`

## Step 5 - Boundary Scans

Run:

```bash
rg -n "src/server|src/shared|src/app|\\.\\./\\.\\./src" packages/simulation-agent/src
rg -n "packages/simulation-agent/src|@elysian/simulation-agent/src" src tests
rg -n "from \"\\.\\./src/agent-core|from \"\\.\\./\\.\\./agent-core|src/agent-core" src tests packages
```

Expected:

- no package imports of Elysian app/shared/server code;
- no Elysian deep imports into package internals;
- no stale `src/agent-core` imports.

## Step 6 - Quality Gate

- `npm run typecheck`
- `npm test`

If `npm test` fails only because of local HTTP listen permissions in a sandbox, rerun in an environment that permits local `127.0.0.1` listeners and document the reason.

## Step 7 - Review Diff

Check:

- package move is mechanical;
- no memory/reflection feature code was added;
- public exports are explicit;
- Elysian adapter remains the only Elysian-specific binding layer;
- package tests import from public entrypoint.

## Commit Boundary

Single commit for M1:

```text
feat: package simulation agent core
```

Do not include unrelated dirty files, old task archives, generated images, or knowledge-vault changes.
