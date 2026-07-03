# Simulation Agent Testing Helpers - Design

## 1. Boundary Objective

M7 adds small deterministic test utilities for package consumers. The helpers reduce repeated fake-port boilerplate while preserving the package's core boundary: helpers do not own host world state, provider behavior, persistence, or scheduling.

## 2. Public API Shape

Target file:

```text
packages/simulation-agent/src/testing/testPorts.ts
```

Proposed helpers:

```ts
export function createStaticPerceptionPort<P>(
  perception: P | ((agentId: string, now: string) => P),
): PerceptionPort<P>;

export function createStaticPlanningPort<P, MH, A>(
  plan: PlanResult<A> | ((input: PlanInput<P, MH>) => PlanResult<A>),
): PlanningPort<P, MH, A>;

export function createMemoryPortStub<MQ, MH, MW>(
  options?: MemoryPortStubOptions<MQ, MH, MW>,
): MemoryPortStub<MQ, MH, MW>;

export function createActionCollector<A>(): ActionCollector<A>;
```

The memory stub should expose copied call records:

- `retrievals()`;
- `writes()`;
- `setHits(...)`;
- `clear()`;
- `port`.

The action collector should expose:

- `actionSink`;
- `records()`;
- `proposals()`;
- `clear()`.

Returned arrays must be copied so tests cannot mutate helper internals. Generic proposal/write values themselves are not deep-cloned because the helper cannot know host object semantics.

## 3. Testing Strategy

Add `tests/simulationAgentTestingHelpers.test.ts`.

Tests should:

- compose helpers with `runCognitiveTickSync` through the package root;
- prove proposal submission is collected;
- prove memory retrieval and remember calls are recorded;
- prove skipped planning leaves action collector empty;
- prove `clear()` resets helper state.

## 4. Spec Sync

Update `.trellis/spec/backend/agent-simulation.md` to list the testing helpers under the package public API and to state that helpers are deterministic test-only ports, not runtime policy.

## 5. Non-Goals

- No fake reflection planner in M7.
- No fake provider or model response framework.
- No runtime facade test harness class.
- No host-specific types.
