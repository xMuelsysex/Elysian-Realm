# Observable Simulation Agent Demo - Design

## 1. Boundary Objective

M8 exposes an observable local demo without changing simulation behavior. It is a read/demo surface over the existing package primitives and runtime facade.

The demo owns:

- deterministic fake host perception/planning/reflection inputs;
- formatted CLI output;
- structured demo result for tests.

The package owns:

- runtime facade behavior;
- memory store/retrieval behavior;
- reflection validation and persistence through `SimulationAgentRuntime.reflect`.

The Elysian engine remains authoritative and is not mutated by this demo.

## 2. File Shape

Add:

```text
src/server/demo/simulationAgentDemo.ts
tests/simulationAgentDemo.test.ts
```

Update:

```text
package.json
```

The npm script should build first:

```json
"demo:simulation-agent": "npm run build:server && node dist/src/server/demo/simulationAgentDemo.js"
```

## 3. Demo Flow

1. Create an `InMemoryMemoryStore`.
2. Seed two memories for `agent_demo`.
3. Configure `SimulationAgentRuntime` with:
   - deterministic perception;
   - `store.toPort()`;
   - deterministic planner;
   - action sink collector;
   - memory write builder for a `kind: "plan"` memory;
   - `reflectionMemory: store`;
   - `persistReflectionWrites: true`.
4. Run `runtime.tickSync(agentId, now)`.
5. Retrieve evidence from the store.
6. Run `runtime.reflect(...)` explicitly with a deterministic reflection planner.
7. Return structured result and formatted text.

## 4. Output Shape

Keep CLI text stable and compact:

```text
Simulation Agent Demo
Agent: agent_demo
Observation: ...

Tick phases:
- perceive: ran ...

Proposal:
- ...

Memories:
- ...

Reflection:
- ...
```

## 5. Verification

Run:

```bash
npm run demo:simulation-agent
npm run build:packages
npm run typecheck
npm test
rg -n "src/server|src/shared|src/app|\\.\\./\\.\\./src" packages/simulation-agent/src
rg -n "packages/simulation-agent/src|@elysian/simulation-agent/src" src tests
git diff --check
python3 ./.trellis/scripts/task.py validate 07-04-observable-simulation-agent-demo
```
