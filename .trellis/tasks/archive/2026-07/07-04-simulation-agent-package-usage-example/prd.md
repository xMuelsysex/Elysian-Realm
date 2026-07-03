# Simulation agent package usage example

## Goal

Document and verify how a host application should consume `@elysian/simulation-agent` after M1-M5. The package now has loop, memory, reflection, runtime facade, and an Elysian consumer, but it does not yet have a concise package-level usage guide or executable example that proves the public API can be understood outside the current app adapter.

## What I Already Know

- M1 created the package boundary and public entrypoint.
- M2 added deterministic memory primitives.
- M3 added provider-agnostic reflection primitives.
- M4 added `SimulationAgentRuntime`.
- M5 made Elysian's synchronous adapter consume `SimulationAgentRuntime.tickSync`.
- The parent scope explicitly called for documentation that shows the facade for quick start and primitives for advanced integration.
- The package has no `README.md` or package-level usage example today.

## Requirements

- Add a package-level usage guide for `@elysian/simulation-agent`.
- Show the recommended host integration shape:
  - host-owned perception projection;
  - host-owned planning/provider policy;
  - package-owned runtime facade and primitives;
  - host-owned action application and world state;
  - explicit reflection invocation, not automatic reflection scheduling.
- Include a compact quick-start example that composes:
  - `SimulationAgentRuntime`;
  - `InMemoryMemoryStore`;
  - a deterministic planner;
  - an explicit reflection call.
- Add an executable usage test that imports only from `@elysian/simulation-agent` and validates the documented integration shape.
- Keep examples offline and deterministic.
- Do not add new package runtime behavior, provider adapters, persistence backends, or reflection scheduling.

## Acceptance Criteria

- [x] `packages/simulation-agent/README.md` explains package ownership boundaries and host responsibilities.
- [x] README includes a concise quick-start path through `SimulationAgentRuntime`.
- [x] README explains when to use low-level primitives versus the facade.
- [x] A usage/example test imports only from `@elysian/simulation-agent`.
- [x] The executable example proves tick + memory + explicit reflection compose through the public API.
- [x] Boundary scans still show no package imports from Elysian app code and no host deep imports into package source.
- [x] `npm run build:packages`, `npm run typecheck`, and `npm test` pass.

## Definition of Done

- M6 is committed separately from M5.
- The task is archived and journaled after verification.
- The branch is pushed after the task commits.

## Out of Scope

- New runtime facade behavior.
- Automatic reflection trigger policy.
- Real LLM provider integration.
- Embeddings, vector search, or production persistence.
- Publishing or extracting the package to a standalone repository.
- Frontend changes.

## Technical Notes

- Primary documentation target: `packages/simulation-agent/README.md`.
- Primary executable example target: `tests/simulationAgentPackageUsage.test.ts`.
- Relevant specs:
  - `.trellis/spec/backend/agent-simulation.md`
  - `.trellis/spec/backend/persona-memory.md`
  - `.trellis/spec/backend/quality-guidelines.md`
- Relevant archived planning:
  - `.trellis/tasks/archive/2026-07/07-03-agent-framework-scope/prd.md`
  - `.trellis/tasks/archive/2026-07/07-03-agent-framework-scope/design.md`
