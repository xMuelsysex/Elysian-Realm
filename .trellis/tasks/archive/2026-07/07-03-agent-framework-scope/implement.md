# Agent Framework Scope - Implementation Roadmap

This planning task does not implement framework code directly. It defines the milestone split and review gates for the follow-up implementation tasks.

## Commit / Task Strategy

Use separate Trellis implementation tasks and separate commits for each milestone:

1. **M1 Package Boundary**
2. **M2 Working Memory Slice**
3. **M3 Reflection Boundary**

Do not merge M1/M2/M3 into one implementation task. Each milestone must pass typecheck/tests independently before moving on.

## M1 - Package Boundary

### Goal

Move the existing `src/agent-core/**` seed into an in-repo npm workspace package named `@elysian/simulation-agent`, then update Elysian to consume it only through the package public entrypoint.

### Planned Changes

- Add `packages/simulation-agent/package.json`.
- Add `packages/simulation-agent/tsconfig.json`.
- Move current agent-core source into `packages/simulation-agent/src/**`.
- Create `packages/simulation-agent/src/index.ts` as the explicit public entrypoint.
- Move or adapt `tests/agentCoreCognitiveLoop.test.ts` so package-owned tests import from `@elysian/simulation-agent`.
- Update `src/server/simulation/agentRuntimeAdapter.ts` to import from `@elysian/simulation-agent`.
- Add root npm workspace configuration.
- Update build/test scripts only as needed to compile the package before root server tests.

### Verification

- `npm install` after workspace changes.
- `npm run typecheck`.
- `npm test`.
- Import boundary scan:
  - package source has no `src/server`, `src/shared`, or Elysian app imports;
  - Elysian code imports framework only from `@elysian/simulation-agent`;
  - no deep imports into `packages/simulation-agent/src/**`.

### Rollback Point

If workspace wiring creates build instability, revert M1 as a mechanical package move and keep current `src/agent-core/**` until package mechanics are resolved.

## M2 - Working Memory Slice

### Goal

Add deterministic simulation-memory primitives to `@elysian/simulation-agent`.

### Planned Changes

- Define generic `MemoryRecord` contract.
- Implement append-only `InMemoryMemoryStore`.
- Add `remember` and `retrieve` primitives.
- Add deterministic retrieval scoring:
  - recency;
  - relevance;
  - importance.
- Add host-configurable score weights with deterministic defaults.
- Add retrieval diagnostics that expose component scores and final rank.
- Add tests that prove deterministic ranking for identical inputs.

### Verification

- Package memory tests pass.
- `npm run typecheck`.
- `npm test`.
- Determinism test: same records + same query + same weights produce identical ranking and scores.
- Boundary scan still passes.

### Rollback Point

If scoring API is unclear, keep memory contracts and in-memory append-only store, but defer ranking composition to a smaller follow-up task.

## M3 - Reflection Boundary

### Goal

Add LLM-backed reflection support through injected host provider/planner contracts without bundling a provider adapter or requiring live LLM calls in tests.

### Planned Changes

- Define reflection trigger input contract.
- Define reflection structured output contract.
- Define reflection diagnostics and failure states.
- Add validation for evidence memory IDs.
- Add reflection memory creation rules.
- Consume injected `LlmPort`/reflection planner only; no OpenAI adapter in core.
- Add fake-provider tests:
  - valid reflection creates evidence-linked output;
  - malformed output fails visibly;
  - failed reflection creates no fake insight memory.

### Verification

- Reflection tests use fake provider only.
- `npm run typecheck`.
- `npm test`.
- No provider secrets/config/env reads in package source.
- Boundary scan still passes.

### Rollback Point

If LLM reflection contracts are too broad, keep trigger/output contracts and validation, but defer provider-backed execution to a follow-up task.

## Cross-Milestone Guardrails

- Framework package must not own host world state.
- Framework package must not import Elysian app modules.
- Elysian adapter remains in `src/server/simulation/agentRuntimeAdapter.ts`.
- Public API changes go through `packages/simulation-agent/src/index.ts`.
- Core tests must remain offline and deterministic.
- Live LLM calls are allowed only in host/runtime wiring, not in package tests.

## Suggested Follow-Up Task Creation

Create implementation tasks in order:

```bash
python3 ./.trellis/scripts/task.py create "Package simulation agent framework boundary" --slug simulation-agent-package-boundary
python3 ./.trellis/scripts/task.py create "Simulation agent memory slice" --slug simulation-agent-memory-slice
python3 ./.trellis/scripts/task.py create "Simulation agent reflection boundary" --slug simulation-agent-reflection-boundary
```

Only start M2 after M1 is merged/committed and green. Only start M3 after M2 is green.
