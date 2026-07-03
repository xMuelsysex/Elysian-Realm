# Agent Framework Scope - Design

## 1. Purpose

Create an in-repo simulation-agent framework package from the existing `src/agent-core/**` seed without turning Elysian Realm's world model into framework API.

The design keeps three boundaries explicit:

1. Framework primitives own agent-loop orchestration, generic memory, retrieval diagnostics, reflection contracts, and visible failure handling.
2. Host applications own authoritative world state, action application, persistence, provider configuration, and scheduling policy.
3. Elysian remains the first consumer/example and must consume the framework only through the package public entrypoint.

## 2. Package Mechanics

Use an npm workspace because the repository already uses npm and `package-lock.json`.

Planned package:

```text
packages/simulation-agent/
  package.json              # name: @elysian/simulation-agent
  tsconfig.json             # package-local build config
  src/
    index.ts                # explicit public entrypoint
    loop/
    memory/
    reflection/
    runtime/
    testing/
  tests/
```

Root package changes in implementation:

- Add `"workspaces": ["packages/*"]` to root `package.json`.
- Add root dependency `"@elysian/simulation-agent": "workspace:*"` if npm accepts it in this repo setup; otherwise use the npm-supported local workspace dependency shape validated by `npm install`.
- Keep root project `type: "module"` and NodeNext-compatible imports.
- Build package TypeScript before or with the server build.

Package output shape:

- ESM-first.
- Explicit `exports` in package `package.json`.
- Public entrypoint import only:

```ts
import { runCognitiveTick } from "@elysian/simulation-agent";
```

Forbidden in Elysian:

```ts
import { runCognitiveTick } from "../../packages/simulation-agent/src/loop/cognitiveLoop.js";
import { runCognitiveTick } from "@elysian/simulation-agent/src/loop/cognitiveLoop.js";
```

## 3. Public API Boundary

The package exposes two layers:

### Primitives

Primitives are canonical behavior and the primary test target:

- `runCognitiveTick`
- `runCognitiveTickSync`
- port interfaces
- phase diagnostics helpers
- memory record contracts
- in-memory memory store
- retrieval scoring helpers
- reflection input/output validation helpers
- fake/testing helpers

### Thin Facade

`SimulationAgentRuntime` is a composition helper over primitives.

It may:

- hold references to configured ports;
- call the primitive loop;
- expose a `tick(agentId, now)` convenience method;
- collect diagnostics from primitives.

It must not:

- own or mutate host world state;
- hide provider configuration, retries, or secrets;
- duplicate loop, memory, or reflection behavior;
- introduce scheduling policy beyond a single tick call.

## 4. Milestones

### M1 - Package Boundary

Goal: move the existing framework seed into `packages/simulation-agent` and update Elysian to consume it through `@elysian/simulation-agent`.

In scope:

- Move existing `src/agent-core/**` to package source.
- Move or duplicate package-owned loop tests so they import through the public entrypoint.
- Update Elysian adapter imports.
- Add package exports and workspace wiring.
- Add boundary checks for no Elysian imports inside the package and no Elysian deep imports into package internals.

Acceptance:

- `npm run typecheck` passes.
- `npm test` passes.
- Elysian imports only from `@elysian/simulation-agent`.
- Package source has no imports from `src/server/**`, `src/shared/**`, or Elysian app-specific modules.

### M2 - Working Memory Slice

Goal: add deterministic simulation-memory primitives.

In scope:

- Generic `MemoryRecord` contract.
- Append-only in-memory store.
- `remember` API that records source/evidence IDs.
- `retrieve` API with deterministic ranking.
- Component scores for recency, relevance, and importance.
- Retrieval diagnostics that explain ranking.
- Host-configurable or injected score composition weights; package may provide a deterministic default.

Out of scope:

- Persistence.
- Vector databases.
- Embeddings.
- Capacity limits, eviction, or garbage collection.

Acceptance:

- Same records + same query + same scoring config produce the same ranking and component scores.
- Retrieval diagnostics expose per-component scores.
- Memory store does not mutate records in-place in ways that break replay expectations.

### M3 - Reflection Boundary

Goal: support LLM-backed reflection through injected host provider/planner contracts.

In scope:

- Reflection trigger input/output contracts.
- LLM/provider port consumed by reflection planner.
- Structured reflection output validation.
- Evidence memory ID validation.
- Reflection memory creation rules.
- Fake-provider tests for success and malformed output.

Out of scope:

- Core package OpenAI adapter.
- Required live LLM calls in tests.
- Host-specific reflection scheduling policy.
- Provider retry/budget/secret handling.

Acceptance:

- Malformed reflection output fails visibly and creates no fake insight memory.
- Reflection output preserves evidence memory IDs.
- Core tests remain offline and deterministic.

## 5. Host/Application Ownership

The host application owns:

- world state and state mutation;
- perception projection shape;
- action proposal schema and application;
- production persistence and embedding providers;
- LLM provider implementation, secrets, budget, timeout, retries;
- reflection scheduling policy;
- multi-agent scheduling beyond calling one tick per agent.

The framework owns contracts and deterministic primitives, not the host simulation.

## 6. Elysian Adapter Shape

Elysian keeps `src/server/simulation/agentRuntimeAdapter.ts` as an app adapter.

It maps:

- Elysian snapshot/agent state -> framework perception projection;
- Elysian routine fallback -> framework planning port;
- framework proposal -> engine-owned state application in `engine.ts`;
- framework phase diagnostics -> `SimulationStepResult.agentTickDiagnostics`.

The adapter must not move into the framework package.

## 7. Review Notes Incorporated

Claude review found three pre-design blockers:

- `first scope` and `first milestone` were mixed.
- package move mechanics were undefined.
- `@elysian` scope could look like brand lock-in.

This design resolves them by:

- splitting M1/M2/M3;
- defining npm workspace and public-entrypoint consumption as the package mechanism;
- treating `@elysian` as a temporary in-repo namespace.

## 8. Implementation Planning Rule

Do not produce one monolithic implementation plan for all framework work.

After this design is accepted, create milestone-specific implementation plans:

1. M1 package boundary.
2. M2 working memory slice.
3. M3 reflection boundary.

Each milestone should have its own tests and commit boundary.
