# Engine reflection trigger policy

## Goal

Add a host-owned, bounded reflection trigger policy to Elysian's real simulation engine. The policy should select evidence from the engine-owned memory stream, explicitly invoke the `@elysian/simulation-agent` reflection API, persist deterministic reflection memories, and expose read-only diagnostics without turning reflection into an unbounded background loop or replay-visible event stream.

## What I Already Know

- M12 added `SimulationEngineState.agentMemories`, deterministic seed/plan memory records, Admin exposure, and a memory stream UI.
- The package already supports `ReflectionInput`, `ReflectionPlanner`, `runReflection(...)`, and `SimulationAgentRuntime.reflect(...)`.
- The Elysian engine step contract is currently synchronous; M14 is the planned async/LLM planner path.
- Reflection records must remain generated/runtime memory records, not persona fixture facts or authoritative world state.

## Requirements

- Add a deterministic host policy that runs during engine steps after agent tick memory writes.
- Bound the policy so it can produce at most one reflection per eligible agent per step and only for explicit evidence selected by the engine.
- Trigger only from meaningful memory evidence, initially current-step plan memories plus a small bounded evidence window from that agent's memory stream.
- Persist reflection outputs as package `MemoryRecord` values in `agentMemories` with source IDs, related evidence IDs, tags, importance, and metadata.
- Surface latest reflection diagnostics through Admin API/view models/UI separately from `events`, `timeline`, and `replay`.
- Preserve the synchronous engine API; if package support is needed, add a deterministic sync reflection entrypoint that fails visibly when given async planners.
- Keep default tests offline and deterministic. Do not add live LLM calls, embeddings, production persistence, or reflection events.

## Acceptance Criteria

- [x] Package reflection has a sync deterministic entrypoint used by the engine, with tests for successful reflection and async-planner misuse.
- [x] Engine reflection policy persists deterministic reflection records after proposal-producing steps.
- [x] Reflection records link to selected evidence memory IDs and do not re-trigger endlessly on their own output.
- [x] Reflection diagnostics report completed/skipped/failed status per agent and are cloned through Admin responses.
- [x] Admin UI/view model renders reflection policy diagnostics and persisted reflection records remain visible in the memory stream.
- [x] `events`, `timeline`, and `replay` do not contain reflection memory records or reflection diagnostics.
- [x] `npm run build:packages`, `npm run typecheck`, `npm test`, `npm run build:ui`, boundary scans, `git diff --check`, and Trellis validate pass.

## Definition of Done

- Work is committed separately.
- Task is archived and journaled.
- Branch is pushed before M14 starts.

## Out of Scope

- LLM-backed reflection planning.
- Async operation queue or provider calls.
- New replay-visible reflection event kinds.
- Production persistence, embeddings, vector search, or eviction.
- Updating immutable persona fixtures from reflection output.
