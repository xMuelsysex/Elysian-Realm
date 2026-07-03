# Simulation agent testing helpers

## Goal

Add a small public testing helper surface to `@elysian/simulation-agent` so host applications and package examples can build deterministic fake ports without rewriting boilerplate action collectors, static perception ports, memory stubs, and deterministic planners.

M1-M6 established primitives, memory, reflection, runtime facade, Elysian consumption, and usage documentation. The parent package design reserved `src/testing/` for fake/testing helpers, but the package does not expose any testing helpers yet.

## Requirements

- Add package-owned testing helpers under `packages/simulation-agent/src/testing/`.
- Export helpers through the package root only.
- Helpers must be generic and must not import Elysian `src/**` modules or concrete Elysian domain types.
- Helpers should support deterministic offline tests:
  - static/factory-backed `PerceptionPort`;
  - static/factory-backed `PlanningPort`;
  - memory port stub that records retrieval calls and remember calls;
  - action collector that exposes submitted proposals without handing out mutable internal arrays.
- Add package-level tests that import only from `@elysian/simulation-agent`.
- Keep helpers small and explicit; do not add a fake runtime, fake provider, scheduling policy, or hidden success fallback.

## Acceptance Criteria

- [x] Package root exports testing helper types/functions.
- [x] A static perception helper can feed the cognitive loop/runtime.
- [x] A deterministic planning helper can emit a proposal or skipped plan.
- [x] A memory port stub records retrieve/remember calls.
- [x] An action collector captures submitted proposals and can be cleared.
- [x] Tests import helpers only from `@elysian/simulation-agent`.
- [x] Backend package spec documents the testing helper surface.
- [x] Boundary scans still pass.
- [x] `npm run build:packages`, `npm run typecheck`, and `npm test` pass.

## Definition of Done

- M7 is committed separately from M6.
- The task is archived and journaled after verification.
- The branch is pushed after the task commits.

## Out of Scope

- Real LLM/fake provider adapters.
- Fake `SimulationAgentRuntime` wrappers.
- Reflection planner fixtures.
- Host-specific world state or action schemas.
- Async operation scheduling.
- Frontend changes.

## Technical Notes

- Primary package file: `packages/simulation-agent/src/testing/testPorts.ts`.
- Public export file: `packages/simulation-agent/src/index.ts`.
- Primary test file: `tests/simulationAgentTestingHelpers.test.ts`.
- Relevant spec: `.trellis/spec/backend/agent-simulation.md`.
