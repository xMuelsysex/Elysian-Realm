# Simulation Agent Runtime Facade - Design

## 1. Boundary Objective

M4 adds a thin runtime facade that makes the package easier to consume after M1/M2/M3 without moving host policy into the framework.

The facade owns:

- composing existing primitives behind a package-owned convenience API;
- carrying configured ports/store references;
- returning visible diagnostics from loop and reflection calls;
- optional persistence of valid reflection memory writes.

The host owns:

- perception projection shape;
- planning implementation and provider configuration;
- action application and authoritative world state;
- reflection trigger policy and evidence selection policy;
- production persistence and retry/budget/secret handling.

## 2. Package Layout

Target package additions:

```text
packages/simulation-agent/src/
  runtime/
    simulationAgentRuntime.ts
```

The public entrypoint remains:

```text
packages/simulation-agent/src/index.ts
```

Tests should import only from `@elysian/simulation-agent`.

## 3. Public API Shape

The facade should be generic over host perception, query, memory hit/write, and action proposal types. It should not define Elysian-specific world, action, or persona types.

Proposed shape:

```ts
export interface SimulationAgentRuntimeOptions {
  persistReflectionWrites?: boolean;
}

export interface ReflectionMemoryWriter<ReflectionMetadata = Record<string, unknown>> {
  remember(
    agentId: string,
    write: MemoryWrite<ReflectionMetadata>,
  ): MemoryRecord<ReflectionMetadata> | void;
}

export interface RuntimeReflectionOptions {
  request?: LlmRequestOptionsLike;
  persistWrites?: boolean;
}

export interface RuntimeReflectionResult<ReflectionMetadata> extends ReflectionResult<ReflectionMetadata> {
  persistedRecords: readonly MemoryRecord<ReflectionMetadata>[];
}

export type SimulationAgentRuntimeDeps<P, MQ, MH, MW, A, ReflectionMetadata = Record<string, unknown>> =
  CognitiveLoopDeps<P, MQ, MH, MW, A> & {
    reflectionMemory?: ReflectionMemoryWriter<ReflectionMetadata>;
  };

export class SimulationAgentRuntime<P, MQ, MH, MW, A, ReflectionMetadata = Record<string, unknown>> {
  constructor(
    deps: SimulationAgentRuntimeDeps<P, MQ, MH, MW, A, ReflectionMetadata>,
    options?: SimulationAgentRuntimeOptions,
  );

  tick(agentId: string, now: string): Promise<CognitiveTickResult<A>>;

  reflect<EvidenceMetadata>(
    input: ReflectionInput<EvidenceMetadata>,
    planner: ReflectionPlanner<EvidenceMetadata, ReflectionMetadata>,
    options?: RuntimeReflectionOptions,
  ): Promise<RuntimeReflectionResult<ReflectionMetadata>>;
}
```

Reflection persistence uses a dedicated `reflectionMemory` writer slot instead of the generic loop `memory` port. This keeps host-specific loop memory write types separate from `MemoryWrite<ReflectionMetadata>`.

## 4. Runtime Behavior

### `tick`

`tick` should call `runCognitiveTick` with the configured deps. It should not rewrite phase semantics or special-case reflection.

Expected behavior:

- failures are exactly as visible as the primitive loop;
- action proposals still flow through the configured action sink;
- optional memory writes still flow through `buildMemoryWrite`;
- reflect phase may remain skipped until a later task wires an automatic policy.

### `reflect`

`reflect` should call `runReflection` with the supplied input and planner.

If `persistReflectionWrites` is false or omitted:

- return the reflection result and candidate writes;
- do not call `memory.remember`.

If `persistReflectionWrites` is true:

- call `reflectionMemory.remember(input.agentId, write)` for each valid reflection write;
- return persisted `MemoryRecord` values when the writer returns them, or `persistedRecords: []` for fire-and-forget writers;
- if persistence fails, return a visible failed result and do not claim completion.

## 5. Key Tradeoff

Do not auto-trigger reflection inside `tick()` for M4. That looks convenient, but it hides scheduling policy and risks unbounded reflection loops. The facade should make explicit reflection easy first; automatic policy can be a later task once trigger rules are designed.

## 6. Testing Strategy

Add `tests/simulationAgentRuntime.test.ts`:

- fake host runs `runtime.tick(...)` and receives action proposal diagnostics;
- `runtime.tick(...)` records a memory through an `InMemoryMemoryStore`-backed port;
- dry-run `runtime.reflect(...)` returns candidate reflection writes without increasing store size;
- persisting `runtime.reflect(...)` writes a `kind: "reflection"` record with evidence links;
- malformed planner output and thrown planner errors return failed diagnostics and no persisted record;
- tests import only from `@elysian/simulation-agent`.

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

- Provider adapters.
- Live model calls.
- Automatic reflection scheduling.
- Elysian adapter migration.
- Runtime-owned world state or persistence backend.
