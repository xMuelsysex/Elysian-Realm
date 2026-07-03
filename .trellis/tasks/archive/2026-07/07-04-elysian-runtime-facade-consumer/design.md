# Elysian Runtime Facade Consumer - Design

## 1. Boundary Objective

M5 validates `SimulationAgentRuntime` with Elysian as the first real consumer while preserving the existing synchronous simulation engine contract.

The package owns:

- `SimulationAgentRuntime.tickSync(...)` as a thin wrapper over `runCognitiveTickSync`;
- the existing runtime facade contracts and visible diagnostics.

Elysian owns:

- `WorldSnapshot` and `AgentRuntimeState` projection;
- deterministic routine planner fallback;
- action proposal application in the engine;
- replay-visible events and diagnostics placement.

## 2. Current Shape

`src/server/simulation/agentRuntimeAdapter.ts` currently builds `CognitiveLoopDeps` inline and calls:

```ts
const result = runCognitiveTickSync(agent.id, snapshot.currentTime, deps);
```

This is still package-root consumption, but it does not validate the M4 facade as a real app integration point.

## 3. Target Shape

Add `tickSync` to the runtime facade:

```ts
class SimulationAgentRuntime<...> {
  tick(agentId: string, now: string): Promise<CognitiveTickResult<A>>;
  tickSync(agentId: string, now: string): CognitiveTickResult<A>;
}
```

Then the adapter should construct a runtime from the same deps:

```ts
const runtime = new SimulationAgentRuntime(deps);
const result = runtime.tickSync(agent.id, snapshot.currentTime);
```

This keeps the adapter synchronous and avoids changing `stepSimulationEngine`.

## 4. Runtime Behavior

`tickSync` must delegate to `runCognitiveTickSync` and preserve:

- six-phase diagnostics;
- planner output validation;
- visible async-planner misuse failure;
- action sink proposal submission;
- optional remember hook behavior.

No reflection policy should be added. `tickSync` should behave like the existing primitive loop, including the visible skipped reflect phase.

## 5. Adapter Behavior

`runAgentCognitiveTickForEngine(...)` should keep the same output contract:

- returns `agentId`, `phases`, optional `proposal`, and optional `activeRoutine`;
- does not mutate input snapshot/agent values;
- submits proposals only to the local action sink; the engine applies them later;
- uses deterministic memory stub for now.

## 6. Testing Strategy

Package runtime tests:

- `runtime.tickSync(...)` succeeds for deterministic fake host and records memory like async `tick`;
- `runtime.tickSync(...)` fails visibly for Promise-returning planner.

Adapter tests:

- existing adapter tests should remain green;
- add a targeted assertion if useful that the sync misuse message still flows through the runtime facade path.

Root checks:

```bash
npm run build:packages
npm run typecheck
npm test
```

Boundary scans:

```bash
rg -n "src/server|src/shared|src/app|\\.\\./\\.\\./src" packages/simulation-agent/src
rg -n "packages/simulation-agent/src|@elysian/simulation-agent/src" src tests
```

## 7. Non-Goals

- Async engine rewrite.
- Reflection scheduling.
- Real memory persistence in Elysian.
- Provider adapter integration.
- UI changes.
