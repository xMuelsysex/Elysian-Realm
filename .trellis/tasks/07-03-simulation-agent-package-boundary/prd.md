# Package simulation agent framework boundary

## Goal

Move the existing `src/agent-core/**` seed into an in-repo npm workspace package named `@elysian/simulation-agent`, then update Elysian to consume it only through the package public entrypoint.

This is M1 of the simulation-agent framework plan. It is a mechanical package-boundary task, not a memory/reflection feature task.

## Requirements

- Create `packages/simulation-agent` as the package directory.
- Package name is `@elysian/simulation-agent`.
- Move current framework seed source from `src/agent-core/**` into the package.
- Keep package code free of Elysian app imports:
  - no `src/server/**`;
  - no `src/shared/**`;
  - no `src/app/**`;
  - no Elysian concrete domain types in public API.
- Expose framework primitives only through the package public entrypoint.
- Update Elysian adapter imports to use `@elysian/simulation-agent`.
- Preserve current cognitive loop behavior and diagnostics.
- Preserve current Elysian simulation replay/event behavior.
- Keep tests offline and deterministic.

## Acceptance Criteria

- [x] `packages/simulation-agent/package.json` exists with package name `@elysian/simulation-agent`.
- [x] Package has an explicit public entrypoint and package `exports`.
- [x] Elysian app code imports framework APIs only from `@elysian/simulation-agent`.
- [x] No Elysian code deep-imports package internals such as `packages/simulation-agent/src/**` or `@elysian/simulation-agent/src/**`.
- [x] Package source has no imports from `src/server/**`, `src/shared/**`, or Elysian app modules.
- [x] Existing agent-core tests are preserved or moved and import through the package public entrypoint.
- [x] `src/server/simulation/agentRuntimeAdapter.ts` remains Elysian-owned and continues to map Elysian types to framework ports.
- [x] `npm run typecheck` passes.
- [x] `npm test` passes.

## Definition of Done

- Package boundary is committed separately from memory/reflection work.
- Public API surface is explicit and reviewable.
- Import boundary scans are documented in the final report.
- No memory store, retrieval scoring, or reflection implementation is added in this task.

## Out of Scope

- M2 working memory slice.
- M3 LLM-backed reflection boundary.
- Publishing to npm.
- Standalone repository extraction.
- Renaming away from temporary `@elysian` scope.
- Adding production persistence, vector stores, embeddings, or provider adapters.

## Technical Notes

- Parent scope task: `.trellis/tasks/07-03-agent-framework-scope`.
- Parent design: `.trellis/tasks/07-03-agent-framework-scope/design.md`.
- Existing source seed:
  - `src/agent-core/ports.ts`
  - `src/agent-core/cognitiveLoop.ts`
  - `src/agent-core/diagnostics.ts`
  - `src/agent-core/index.ts`
- Existing app adapter:
  - `src/server/simulation/agentRuntimeAdapter.ts`
- Existing tests:
  - `tests/agentCoreCognitiveLoop.test.ts`
  - `tests/agentRuntimeAdapter.test.ts`
