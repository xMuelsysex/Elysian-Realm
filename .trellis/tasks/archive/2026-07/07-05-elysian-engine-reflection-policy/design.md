# Elysian Engine Reflection Policy - Design

## 1. Boundary Objective

M13 makes reflection an engine-owned policy over the runtime memory stream. The engine decides when reflection is eligible and which memories are evidence. The package owns reflection validation and planner execution. Reflections remain non-authoritative generated memory records.

## 2. Sync Package Entry Point

The current engine is synchronous, while `SimulationAgentRuntime.reflect(...)` returns a Promise. Add deterministic sync companions:

- `runReflectionSync(input, planner, options?)`
- `SimulationAgentRuntime.reflectSync(input, planner, options?)`

The sync path should share the same validation and persistence semantics as the async path, but fail visibly if `planner.reflect(...)` returns a Promise:

```text
sync reflection received an async planner result; use runReflection for async planners
```

This mirrors the existing `runCognitiveTickSync(...)` contract and keeps M14 free to introduce async operation plumbing deliberately.

## 3. Engine Policy

Run reflection after `progressAgentRoutines(...)` writes plan memories for the current step.

Eligibility:

- agent has at least one current-step engine plan memory;
- no reflection memory already exists for that agent and current step;
- selected evidence is non-empty after excluding existing reflection memories.

Evidence selection:

- include current-step plan memories first;
- add newest/highest-importance non-reflection records up to a small constant (`REFLECTION_EVIDENCE_LIMIT`, likely 3);
- never include reflection records as evidence in this first policy to avoid self-trigger loops.

Reflection input:

- `trigger.kind`: `importance-threshold`
- `trigger.sourceIds`: current step ID plus current-step plan source IDs, de-duplicated
- `maxInsights`: 1

Planner:

- deterministic engine-local planner;
- creates one concise insight linked to all evidence IDs;
- metadata uses `EngineMemoryMetadata` with `source: "engine"`, `stepId`, `period`, `locationId`, `triggerKind`, and `evidenceMemoryIds`.

Persistence:

- call `SimulationAgentRuntime.reflectSync(...)` in dry-run mode;
- persist returned writes through the engine memory store with deterministic IDs:
  - `memory_<stepId>_<agentId>_reflection`
- clone final memory records back into `SimulationEngineState.agentMemories`.

## 4. Diagnostics

Add `EngineReflectionDiagnostic`:

```ts
interface EngineReflectionDiagnostic {
  agentId: AgentId;
  status: "completed" | "skipped" | "failed";
  trigger?: ReflectionTrigger;
  evidenceMemoryIds: string[];
  persistedMemoryIds: string[];
  diagnostics: ReflectionDiagnostic[];
  reason?: string;
}
```

Expose latest diagnostics in:

- `SimulationStepResult.reflectionDiagnostics`
- Admin controller latest response field
- Admin UI read-only panel

Diagnostics must not be appended to `events`, `timeline`, or `replay`.

## 5. Tests

Package:

- `runReflectionSync` creates the same write shape for sync planners.
- `SimulationAgentRuntime.reflectSync` can persist writes when configured.
- async planner misuse fails visibly and persists nothing.

Engine/Admin/UI:

- no reflection on startup or unchanged routine steps;
- noon routine transition persists one reflection per agent;
- reflection records link to plan/seed evidence and have deterministic IDs;
- later steps do not create duplicate reflections for the same current-step evidence;
- Admin response clones reflection diagnostics;
- UI view model groups diagnostics per agent.

## 6. Non-Goals

- LLM reflection planner.
- Async operation queue.
- Replay-visible reflection events.
- Reflection recursion over previous reflection records.
