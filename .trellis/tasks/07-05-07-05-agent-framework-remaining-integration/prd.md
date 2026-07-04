# Complete remaining simulation-agent integration tasks

## Goal

Finish the remaining practical integration slices after M1-M8 and the Agent Tick Inspector. The package primitives exist and the Admin UI can inspect latest tick diagnostics, but Elysian still does not persist real per-agent memory records in the engine, does not run a host-owned reflection policy, and does not offer an LLM-backed planner path for real engine ticks.

## What I Already Know

- M1-M8 are archived: package boundary, memory, reflection boundary, runtime facade, Elysian facade consumer, usage example, testing helpers, and CLI demo.
- `07-04-agent-tick-inspector` is archived and exposes latest real engine tick diagnostics in Admin UI.
- The remaining work called out by prior task non-goals is:
  - persisted per-agent memory stream in Elysian;
  - host-owned reflection trigger/scheduling policy;
  - real LLM planner integration;
  - optional diagnostics history beyond latest tick.
- The framework boundary rule still applies: `packages/simulation-agent` must not import Elysian app code, and Elysian owns world-state mutation.

## Task Queue

1. **M12 - Elysian engine agent memory stream**: persist package `MemoryRecord` values per agent in the simulation engine, expose read-only Admin/API/UI projections, and let runtime ticks retrieve/write real deterministic memories.
2. **M13 - Engine reflection trigger policy**: add a host-owned, bounded reflection policy that selects evidence memories and explicitly calls `SimulationAgentRuntime.reflect(...)` without hidden unbounded loops.
3. **M14 - LLM planner integration path**: add an opt-in async/operation path for LLM action proposals while preserving deterministic replay defaults and fake-provider tests.
4. **M15 - Diagnostics history**: promote latest tick diagnostics into a bounded debug history if it is still useful after M12-M14.

## Requirements

- Execute each deliverable as its own Trellis child task, commit, archive, journal, and push before starting the next.
- Keep tests offline and deterministic unless a task explicitly introduces an optional runtime-provider path with fake-provider tests.
- Preserve replay-visible event semantics. New diagnostics or memories must not be appended to `events` unless the child task explicitly adds a central event kind and validator.
- Preserve package boundary scans.
- Keep production persistence, embeddings/vector DBs, and standalone package publishing out of this parent scope.

## Acceptance Criteria

- [x] M12 completed, committed, archived, journaled, and pushed.
- [ ] M13 completed, committed, archived, journaled, and pushed.
- [ ] M14 completed, committed, archived, journaled, and pushed.
- [ ] M15 either completed or explicitly deferred with rationale in this PRD.
- [ ] Final quality gate passes after the last child task.

## Definition of Done

- All completed child tasks are archived.
- Parent task records the final status of each child.
- Branch is pushed.

## Out of Scope

- Stable public npm publishing.
- Standalone repository extraction.
- Production database/vector persistence.
- Replacing Elysian's authoritative simulation state model.
- Making live LLM calls mandatory for core tests or local default runs.

## Technical Notes

- Derived from archived task non-goals under `.trellis/tasks/archive/2026-07`.
- Parent task is a queue/coordination task. Implementation happens in child tasks only.
