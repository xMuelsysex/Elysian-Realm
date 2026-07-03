# Simulation agent runtime facade

## Goal

Add a thin `SimulationAgentRuntime` facade to `@elysian/simulation-agent` so host applications can compose the existing M1 package boundary, M2 memory primitives, and M3 reflection boundary through one package-owned convenience API without duplicating the core loop, owning host world state, or hiding provider/runtime policy.

The facade should make the current end-to-end shape easy to consume:

```text
host perception -> runCognitiveTick -> memory remember/retrieve -> explicit reflection -> memory writes
```

It must remain a composition helper over existing primitives, not a second cognitive-loop implementation.

## What I already know

- M1 created `@elysian/simulation-agent` as the package boundary and Elysian consumes it through the public entrypoint.
- M2 added deterministic `InMemoryMemoryStore`, append-only `remember`, retrieval scoring, and diagnostics.
- M3 added provider-agnostic reflection contracts, validation, diagnostics, and `runReflection`.
- A manual demo can already combine M1/M2/M3, but callers must wire the composition themselves.
- `runCognitiveTick` still marks `reflect` skipped; automatic reflection scheduling remains out of scope until runtime policy is explicit.

## Requirements

- Add a public facade type/class/function under `packages/simulation-agent/src/runtime/`.
- Export the facade only through `packages/simulation-agent/src/index.ts`.
- The facade must use existing primitives:
  - `runCognitiveTick` or `runCognitiveTickSync`;
  - `MemoryPort` / `InMemoryMemoryStore` compatible memory access;
  - `runReflection`.
- Provide a `tick(...)` convenience method that:
  - accepts host-provided perception/planning/action dependencies;
  - retrieves memory through the configured memory port/store;
  - optionally records a memory write through the existing loop hook;
  - returns the same visible phase diagnostics as the underlying loop.
- Provide an explicit `reflect(...)` convenience method that:
  - accepts a reflection trigger and evidence selection input;
  - calls an injected `ReflectionPlanner`;
  - returns visible diagnostics;
  - persists valid reflection writes only when the configured facade option says to do so.
- Keep reflection scheduling host-owned. Do not automatically trigger reflection from `tick()` in this task.
- Keep provider configuration, secrets, retries, budgets, timeouts, and cancellation host-owned.
- Keep authoritative world state and action application host-owned.
- Tests must use deterministic fake planners/providers only and import from `@elysian/simulation-agent`.
- Avoid a second source of truth for memory, plan, world state, or reflection results.

## Acceptance Criteria

- [x] Package root exports `SimulationAgentRuntime` facade contracts.
- [x] A fake host can run `runtime.tick(...)` and receive a typed action proposal plus loop diagnostics.
- [x] `runtime.tick(...)` can write a deterministic memory through the existing M2 memory store path.
- [x] `runtime.reflect(...)` can retrieve/provide evidence, call a fake reflection planner, and persist a `kind: "reflection"` memory when configured to persist.
- [x] `runtime.reflect(...)` can run in dry-run mode and return writes without persisting them.
- [x] Reflection planner failures and malformed output remain visible failures with no fake memory writes.
- [x] Tests prove the facade uses public package imports only and no Elysian deep imports.
- [x] Existing cognitive-loop, memory, and reflection tests remain green.
- [x] `npm run build:packages`, `npm run typecheck`, and `npm test` pass.

## Definition of Done

- M4 code is committed separately from M1/M2/M3 work.
- Runtime facade API is explicit and reviewable through `packages/simulation-agent/src/index.ts`.
- Tests demonstrate the combined M1+M2+M3 path through the facade.
- Specs are updated if the facade establishes new executable runtime contracts.

## Out of Scope

- Automatic reflection scheduling or trigger policy inside `tick()`.
- Real OpenAI/local-model provider implementation inside the package.
- Live LLM calls in tests.
- Host world state ownership, action application, persistence backend, embeddings, vector search, or multi-agent scheduling.
- Rewriting Elysian's `agentRuntimeAdapter` around the facade in this task.
- Publishing the package or moving it to a standalone repository.

## Notes

- Relevant completed milestones:
  - `c938fca feat: add simulation agent reflection boundary`
  - `95300be feat: add simulation agent memory primitives`
  - `843d4a3 feat: package simulation agent core`
- Relevant archived task directories:
  - `.trellis/tasks/archive/2026-07/07-03-simulation-agent-package-boundary`
  - `.trellis/tasks/archive/2026-07/07-04-simulation-agent-memory-slice`
  - `.trellis/tasks/archive/2026-07/07-04-simulation-agent-reflection-boundary`
