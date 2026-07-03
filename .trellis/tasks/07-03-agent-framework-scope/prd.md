# brainstorm: agent framework scope

## Goal

Define the overall scope for turning the existing `src/agent-core/**` cognitive-loop slice into an agent framework, without prematurely locking Elysian Realm-specific simulation assumptions into the framework API.

The desired outcome is a clear MVP boundary: what the framework should own, what should remain application-owned, what existing resources should be reused, and what should stay out of scope until the API is proven by a second consumer.

## What I already know

- The user wants to build an agent framework and is deciding the overall scope first.
- The existing `src/agent-core/**` has useful reusable pieces: port interfaces, phase diagnostics, `runCognitiveTick`, `runCognitiveTickSync`, visible failure handling, and fake-port tests.
- The existing `agentRuntimeAdapter` is Elysian-specific and should remain an adapter/example, not become framework API.
- The archived `06-30-agent-cognitive-loop-core` task explicitly planned: Phase A = in-repo port-converged module; Phase B = complete Remember/Reflect/memory store and validate with a second scenario; Phase C = extract to standalone package/repo.
- Current `agent-core` has no concrete Elysian imports; only comments mention Elysian.

## Assumptions (temporary)

- The framework should target TypeScript first because the current slice and tests are TypeScript.
- The first external shape should be a package boundary, not a published stable npm library.
- The framework should help build persistent/simulation-style agents, not just chat wrappers.
- The Elysian app should stay as the first adapter/consumer and regression suite.

## Open Questions

- Final confirmation: proceed by creating milestone-specific implementation tasks for M1 package boundary, M2 memory slice, and M3 reflection boundary.

## Requirements (evolving)

- Target simulation-style agents first: agents live inside an application-owned world/state model, perceive context, retrieve memory, plan, propose actions, remember observations, and optionally reflect.
- Reuse the existing `agent-core` invariants and test coverage as the seed.
- Keep framework-owned code free of Elysian domain types, world snapshots, routines, and `PlanAction`.
- Preserve visible diagnostics for phase outcomes and failures.
- Preserve the rule that the framework proposes actions; application adapters own authoritative state mutation.
- Include a real simulation-memory MVP in the framework scope: memory records, append-only remember, retrieval scoring, and reflection trigger support.
- Extract through an in-repo package first: `packages/simulation-agent` becomes the framework boundary, and Elysian remains the first consumer/example.
- First implementation milestone should include both the package move and a working deterministic in-memory memory slice.
- Reflection should support real LLM-backed generation through an injected planner/provider boundary, while core tests remain fake-provider and offline deterministic.
- The framework should define only the LLM provider port; host applications must supply real provider implementations and configuration.
- The package should expose both low-level primitives and a thin `SimulationAgentRuntime`-style facade; primitives remain the source of truth.
- Use `@elysian/simulation-agent` as the in-repo package/API name for the first framework boundary.
- Treat `@elysian` as a temporary in-repo scope; standalone extraction should revisit a neutral package scope.
- Define MVP framework scope before moving files or changing package structure.

## Acceptance Criteria

- [ ] MVP scope states what the framework owns and what applications own.
- [ ] MVP scope identifies reusable current resources and Elysian-specific resources to exclude.
- [ ] Out-of-scope list prevents premature generalization and premature publishing.
- [ ] One preferred extraction path is chosen: keep in repo, internal package, or standalone repo/package.
- [ ] Follow-up implementation can be split into small tasks without re-opening core scope.
- [ ] Milestones distinguish package boundary, memory slice, and reflection support.
- [ ] Package boundary requires public-entrypoint consumption and forbids deep imports from Elysian.
- [ ] Retrieval determinism is testable: same records + same query + same scoring config produce the same ranking and component scores.

## Definition of Done (team quality bar)

- Requirements are agreed before implementation.
- Design/implementation tasks are created only after scope is accepted.
- Tests remain offline and deterministic.
- Typecheck and tests remain green after any future code movement.
- Specs are updated if package/API contracts change.

## Out of Scope (explicit, temporary)

- Publishing a stable public npm package.
- Moving directly to a standalone repo before the API is proven inside this repository.
- Rewriting Elysian simulation around a new framework API before the package boundary is proven.
- Adding real vector databases, production persistence, or hosted infrastructure as part of the scope definition.
- Treating Elysian routines, world state, or `PlanAction` as generic framework concepts.
- Optimizing first for workflow/task agents or chat/product assistants. Those may become later adapters if the simulation-agent core proves reusable.
- Shipping Memory/Reflect as a single large implementation task; this scope should be decomposed into smaller implementation tasks.
- Making live LLM calls mandatory for core tests or deterministic simulation replay.
- Bundling an OpenAI-compatible provider implementation in the core package's first milestone.
- Multi-agent scheduling/concurrency orchestration beyond a single agent tick.
- Memory eviction, garbage collection, and capacity management in the first package/memory milestones.
- Host-specific reflection scheduling policy. The framework may expose trigger contracts, but the host decides when to invoke reflection.

## Decision Log

### Primary Target: Simulation Agents

**Context**: The framework could target simulation agents, workflow/task agents, chat/product assistants, or a minimal shared core.

**Decision**: Target simulation-style agents first.

**Consequences**:

- The core API should optimize for world-state projections, memory, planning, action proposals, diagnostics, and replay-safe behavior.
- The framework must not own authoritative world state; host applications remain responsible for applying actions.
- Chat/task-agent concerns can inform naming, but should not drive MVP API shape.

### Memory / Reflection Depth: Simulation Memory MVP

**Context**: Memory/Reflect could stay as interfaces only, use an in-memory stub, or become a real simulation-memory slice.

**Decision**: Include a real simulation-memory MVP.

**Consequences**:

- The framework should define generic `MemoryRecord` concepts: owner agent, type, content/summary, created/accessed time, importance, source IDs, related memory IDs, visibility, and metadata.
- The first store can be in-memory and deterministic, but its API should not assume a specific database or vector provider.
- Retrieval should expose diagnostics and component scores for at least recency, relevance, and importance, even if relevance starts as deterministic text/tag matching.
- Reflection should have explicit trigger inputs and output records with evidence links; malformed reflection output must fail visibly and must not create fake insight memories.
- This scope is large enough to split into separate implementation tasks after planning.

### Extraction Path: In-Repo Package First

**Context**: The framework can remain in `src/agent-core`, move directly to a standalone repo, or become an in-repo package first.

**Decision**: Move to an in-repo package first: `packages/simulation-agent`.

**Consequences**:

- The package boundary becomes enforceable before public release.
- Elysian can consume the package locally and continue serving as the regression suite.
- Package exports, build output, and tests must be explicit enough that later standalone extraction is mostly mechanical.
- Standalone repo / npm publishing remains out of scope until a second scenario validates the API.

### First Implementation Milestone: Package + Working Memory Slice

**Context**: The first milestone could move files only, add contracts only, or ship a working in-memory memory slice.

**Decision**: Split the first framework delivery path into explicit milestones:

- **M1 Package boundary**: move existing primitives into an in-repo package and make Elysian consume only the package public entrypoint.
- **M2 Working memory slice**: add deterministic in-memory memory records, append-only remember, retrieval scoring, and retrieval diagnostics.
- **M3 Reflection boundary**: add reflection trigger/output contracts, LLM-backed reflection through injected provider/planner, structured-output validation, and evidence-link memory creation.

**Consequences**:

- The full first framework scope is larger than a mechanical package move and should be planned as a complex task with `design.md`; implementation should then proceed milestone-by-milestone.
- The memory implementation should stay deterministic and offline-testable: append-only records, in-memory repository, retrieve scoring, and diagnostics.
- Persistence, embeddings, production vector search, and external services remain out of scope.
- Reflection is in first framework scope but not in the same implementation milestone as the mechanical package move.
- Elysian should consume the package through its adapter without adopting framework-owned world state.

### Reflection Depth: LLM-Backed Through Injected Provider

**Context**: Reflection could stop at contracts, use a deterministic stub, or support real LLM-backed insight generation.

**Decision**: Support real LLM-backed reflection in the first framework scope, but only behind injected provider/planner ports.

**Consequences**:

- The framework should define reflection input/output contracts, validation, diagnostics, and evidence-link rules.
- Live provider calls are allowed in application/runtime wiring, not in core deterministic tests.
- Tests must use fake providers and assert malformed LLM output fails visibly without creating fake reflection memories.
- Reflection output must preserve evidence memory IDs and source metadata so insights remain explainable.
- Provider secrets, model configuration, budget limits, timeout/cancellation, and retry policy must remain explicit at the boundary.

### LLM Boundary: Host-Provided Provider

**Context**: Real reflection needs an LLM boundary. The framework could ship provider adapters, reuse Elysian's provider, or only define a generic provider port.

**Decision**: The framework defines provider contracts only. Host applications provide real LLM implementations.

**Consequences**:

- `packages/simulation-agent` stays provider-agnostic and should not import Elysian's `src/server/llm/**`.
- OpenAI-compatible adapters may be examples or separate optional packages later, not part of core MVP.
- Secret handling, environment loading, provider retries, quotas, and model selection stay host-owned.
- Framework reflection code consumes an injected `LlmPort`/planner and validates structured outputs before writing memories.

### Public API Shape: Primitives + Thin Facade

**Context**: The first package API could expose only low-level ports/functions, only a high-level runtime facade, or both.

**Decision**: Expose both low-level primitives and a thin facade.

**Consequences**:

- Low-level primitives (`runCognitiveTick`, ports, memory store, retrieval/reflection helpers) remain the canonical behavior and primary test target.
- The facade should be a small composition layer, not a second implementation.
- `SimulationAgentRuntime` may own wiring/configuration for ports but must not own host world state, provider secrets, persistence, or hidden retries.
- Documentation should show the facade for quick start and primitives for advanced integration.

### Package Name: `@elysian/simulation-agent`

**Context**: The package name should communicate the first target clearly without pretending to be a universal agent framework.

**Decision**: Use `@elysian/simulation-agent` for the in-repo package boundary.

**Consequences**:

- The package name clearly targets simulation agents rather than workflow agents or chat assistants.
- It keeps the first package aligned with the Elysian repository while still allowing later extraction or renaming if the framework proves useful beyond this project.
- The `@elysian` scope is a temporary in-repo namespace; standalone extraction should revisit a neutral package scope.
- Public docs should call it a simulation-agent framework, not a general autonomous-agent platform.

## Package Boundary Requirements

- Elysian must consume the framework through the package public entrypoint, not deep imports into package internals.
- The package must have an explicit public export surface; internal modules stay unexported unless intentionally promoted.
- The package must not import from `src/server/**`, `src/shared/**`, or Elysian app-specific modules.
- Package extraction should remain mechanically checkable: no repo-root relative imports inside the package, no Elysian concrete types in public APIs, explicit package exports, and tests that pass through the public entrypoint.
- Retrieval score composition and weights must be host-configurable or injected; the framework may ship a deterministic default but must not hard-code Elysian tuning assumptions.

## Candidate Scope Model

### Framework owns

- Agent lifecycle phase orchestration: perceive, retrieve, plan, act, remember, reflect.
- Generic ports and typed phase diagnostics.
- Generic memory record contracts, deterministic in-memory store, append-only remember, retrieval scoring, retrieval diagnostics, and reflection trigger/output contracts.
- LLM-backed reflection port contracts and validation, with fake-provider test harnesses.
- Planner result validation and visible failure handling.
- Thin runtime facade that composes framework primitives without duplicating behavior.
- Test harness utilities for fake ports and deterministic runs.
- Optional package-level examples that show how to write an adapter.

### Application owns

- Domain state and state mutation.
- Perception projection shape.
- Production memory storage backend, persistence, embedding provider, and domain-specific memory metadata.
- Action proposal schema and execution/approval semantics.
- LLM provider configuration, budget policy, and tool permissions.

### Elysian remains a consumer/example

- `src/server/simulation/agentRuntimeAdapter.ts` stays app-owned.
- Simulation replay event sequence remains app-owned.
- Routine fallback remains an Elysian adapter behavior.

## Notes

- Existing reusable code: `src/agent-core/ports.ts`, `src/agent-core/cognitiveLoop.ts`, `src/agent-core/diagnostics.ts`, `tests/agentCoreCognitiveLoop.test.ts`.
- Existing app adapter: `src/server/simulation/agentRuntimeAdapter.ts`.
- Existing spec: `.trellis/spec/backend/agent-simulation.md`, section "Implemented Agent Core Plan Slice Contract".
- This is a scope/planning task only until the user confirms the target and extraction path.
