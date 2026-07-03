# Elysian simulation consumes runtime facade

## Goal

Make Elysian's simulation agent adapter consume the `SimulationAgentRuntime` facade from `@elysian/simulation-agent`, so the package is validated by the first real in-repo consumer instead of only package-level fake-host tests.

M1-M4 established the package boundary, memory primitives, reflection boundary, and runtime facade. M5 should prove the existing Elysian adapter can use the facade without changing authoritative engine behavior, replay-visible events, or deterministic offline tests.

## What I already know

- `src/server/simulation/agentRuntimeAdapter.ts` currently imports `runCognitiveTickSync` and `CognitiveLoopDeps` directly from `@elysian/simulation-agent`.
- The simulation engine step is synchronous, so the adapter must keep using a synchronous tick path.
- `SimulationAgentRuntime` currently exposes async `tick()` only; Elysian needs a `tickSync()` facade wrapper over `runCognitiveTickSync`.
- Existing adapter tests already assert no snapshot mutation, visible planner failure, async-planner misuse, and unchanged simulation-step diagnostics.
- M5 should not add real memory persistence, reflection scheduling, or live LLM calls.

## Requirements

- Add a synchronous facade method to `SimulationAgentRuntime`:
  - `tickSync(agentId, now)` delegates to `runCognitiveTickSync`;
  - it preserves the existing async-planner misuse diagnostic.
- Update `src/server/simulation/agentRuntimeAdapter.ts` to construct/use `SimulationAgentRuntime` instead of calling `runCognitiveTickSync` directly.
- Keep `runAgentCognitiveTickForEngine(...)` public behavior unchanged:
  - same proposal shape;
  - same phase diagnostics;
  - same active routine return behavior;
  - no mutation of `WorldSnapshot` / `AgentRuntimeState`.
- Keep the adapter's memory implementation a deterministic stub for this task.
- Keep reflection scheduling out of scope. The facade's `reflect()` should not be called by the Elysian adapter in M5.
- Keep Elysian app imports through `@elysian/simulation-agent` package root only; no package deep imports.
- Preserve all existing simulation replay/event tests.
- Add or update tests that prove the adapter is consuming the facade path.

## Acceptance Criteria

- [x] `SimulationAgentRuntime` exports `tickSync(...)`.
- [x] `tickSync(...)` has package tests covering deterministic success and async-planner misuse.
- [x] `agentRuntimeAdapter.ts` uses `SimulationAgentRuntime` for the engine tick path.
- [x] Existing adapter tests for routine proposal, no mutation, planner failure, in-flight skip, and async misuse remain green.
- [x] Simulation engine event/replay behavior remains unchanged.
- [x] No Elysian source file deep-imports `packages/simulation-agent/src/**` or `@elysian/simulation-agent/src/**`.
- [x] Package source still has no imports from Elysian `src/server/**`, `src/shared/**`, or `src/app/**`.
- [x] `npm run build:packages`, `npm run typecheck`, and `npm test` pass.

## Definition of Done

- M5 code is committed separately from M4.
- Specs are updated if `SimulationAgentRuntime.tickSync` changes the runtime facade contract.
- Tests remain offline and deterministic.
- The Elysian adapter is a real consumer of the facade while the engine remains the authoritative world-state owner.

## Out of Scope

- Automatic reflection trigger policy.
- Persisting simulation memories in Elysian runtime.
- Integrating `runReflection` into engine steps.
- Rewriting the simulation engine as async.
- Real LLM provider calls or provider configuration changes.
- Frontend/UI changes.

## Notes

- Relevant completed commit:
  - `1cf1d1e feat: add simulation agent runtime facade`
- Primary files likely impacted:
  - `packages/simulation-agent/src/runtime/simulationAgentRuntime.ts`
  - `tests/simulationAgentRuntime.test.ts`
  - `src/server/simulation/agentRuntimeAdapter.ts`
  - `tests/agentRuntimeAdapter.test.ts`
