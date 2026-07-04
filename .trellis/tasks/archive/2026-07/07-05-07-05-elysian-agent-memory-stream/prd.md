# Elysian engine agent memory stream

## Goal

Wire the existing `@elysian/simulation-agent` memory primitives into Elysian's real simulation engine so each agent has a deterministic, append-only runtime memory stream. The stream should be inspectable through Admin API/UI and should feed future ticks through retrieval, without becoming a second source of truth for world state.

## What I Already Know

- The package already exports `MemoryRecord`, `MemoryWrite`, `MemoryRetrievalQuery`, `MemoryRetrievalHit`, and `InMemoryMemoryStore`.
- `SimulationAgentRuntime.tickSync(...)` can already call `deps.memory.retrieve(...)` and `deps.memory.remember(...)` if the adapter supplies real ports and `buildMemoryWrite`.
- Elysian's `agentRuntimeAdapter.ts` currently uses a memory stub, so real engine ticks do not persist package memories.
- Admin UI currently shows latest agent tick diagnostics but no memory stream.
- Existing `memory.seeded` is replay event-only and must not be confused with stored `MemoryRecord` values.

## Requirements

- Add engine-owned runtime memory storage to `SimulationEngineState` using package memory records.
- Keep the simulation engine as authoritative owner of world state; memory records are non-authoritative diagnostics/context.
- Seed or initialize deterministic per-agent memories without changing existing replay-visible startup event order.
- Make agent ticks retrieve from the engine memory stream and write a plan/action memory when a proposal is produced.
- Expose memory records through `AdminStateResponse` and read-only Admin UI/view models.
- Keep memory records separate from `events`, `timeline`, and `replay`.
- Preserve package boundary scans and deterministic offline tests.

## Acceptance Criteria

- [x] `SimulationEngineState` carries per-agent runtime memory records or a package-backed memory state.
- [x] Post-startup agent ticks retrieve from stored records instead of the stub memory port.
- [x] Proposal-producing ticks append deterministic memory records with source IDs and metadata.
- [x] Admin API exposes cloned read-only memory records.
- [x] Admin UI/view model renders per-agent memory stream with provenance/kind/importance/source IDs.
- [x] `events`, `timeline`, and `replay` do not contain stored memory records.
- [x] `npm run build:packages`, `npm run typecheck`, `npm test`, `npm run build:ui`, boundary scans, `git diff --check`, and Trellis validate pass.

## Definition of Done

- Work is committed separately.
- Task is archived and journaled.
- Branch is pushed before the next child task starts.

## Out of Scope

- Reflection trigger/scheduling policy.
- LLM planner integration.
- Production persistence, embeddings, vector search, or eviction.
- Adding new replay-visible event kinds for each memory write.
- Treating memories as authoritative world state.

## Technical Notes

- Likely backend files:
  - `src/server/simulation/engine.ts`
  - `src/server/simulation/agentRuntimeAdapter.ts`
  - `src/server/admin/adminContracts.ts`
  - `src/server/admin/adminController.ts`
- Likely frontend files:
  - `src/app/shared/viewModels.ts`
  - `src/app/realm/ObservabilityPanels.tsx`
  - `src/app/realm/RealmDashboard.tsx`
- Likely tests:
  - `tests/simulationEngine.test.ts`
  - `tests/agentRuntimeAdapter.test.ts`
  - `tests/adminController.test.ts`
  - `tests/adminViewModels.test.ts`
