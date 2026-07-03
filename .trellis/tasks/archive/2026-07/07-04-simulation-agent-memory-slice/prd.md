# Simulation agent memory slice

## Goal

Add deterministic simulation-memory primitives to `@elysian/simulation-agent` so the package can own generic memory records, append-only remembering, retrieval scoring, and retrieval diagnostics without importing Elysian app/server/shared modules.

This is M2 of the simulation-agent framework scope. M1 package boundary is already committed and archived; M2 should extend the package API while preserving offline deterministic tests and the host-owned world-state rule.

## Requirements

- Define package-owned generic memory contracts for records, writes, queries, retrieval hits, component scores, and retrieval diagnostics.
- Implement an append-only in-memory memory store.
- Preserve source/evidence traceability:
  - every stored memory has at least one `sourceId`;
  - `relatedMemoryIds` are explicit and never inferred silently.
- Support these MVP memory kinds:
  - `observation`
  - `action`
  - `conversation`
  - `relationship`
  - `plan`
  - `reflection`
  - `intervention`
- Use one bounded importance scale across the package. M2 uses `0..9`.
- Implement deterministic retrieval ranking that combines:
  - relevance;
  - recency;
  - importance.
- Expose host-configurable score weights with deterministic defaults.
- Expose retrieval diagnostics including query, candidate IDs, component scores, final score, selected IDs, and excluded invalid/foreign records where applicable.
- Keep relevance deterministic and dependency-free for M2, using text/tag/source matching rather than embeddings or live providers.
- Provide a `MemoryPort` adapter so `InMemoryMemoryStore` can be used by the existing cognitive loop.
- Export all public memory primitives only through `packages/simulation-agent/src/index.ts`.
- Keep package source free of Elysian imports and concrete Elysian domain types.

## Acceptance Criteria

- [x] `@elysian/simulation-agent` exports memory record/query/write/hit/diagnostic types from the package root.
- [x] `InMemoryMemoryStore` can append memories and retrieve records for one agent without mutating host world state.
- [x] Stored memories require non-empty source IDs.
- [x] Invalid writes fail visibly with structured validation errors; no fake memory is stored.
- [x] Same records + same query + same score weights produce identical ranking and component scores.
- [x] Retrieval tests cover recency-dominant, relevance-dominant, and importance-dominant ranking.
- [x] Retrieval diagnostics expose per-component scores and final score for candidates.
- [x] Retrieval only returns records owned by the requested agent unless a future API explicitly opts into shared visibility.
- [x] Existing cognitive loop tests remain green.
- [x] Package boundary scans still find no Elysian imports or deep imports.
- [x] `npm run build:packages`, `npm run typecheck`, and `npm test` pass.

## Definition of Done

- M2 code is committed separately from M1 and future M3 reflection work.
- Package public API is explicit and reviewable through `packages/simulation-agent/src/index.ts`.
- Tests remain offline and deterministic.
- No persistence, embeddings, vector search, or live LLM calls are introduced.
- Backend specs are updated if the memory package contract changes during implementation.

## Out of Scope

- Reflection trigger execution and reflection memory generation. That belongs to M3.
- Embeddings, vector databases, semantic provider calls, or production persistence.
- Memory eviction, capacity limits, garbage collection, or compaction.
- Elysian engine integration beyond preserving existing adapter behavior and tests.
- Host-specific memory metadata schemas.
- Rewriting persona fixtures, timeline events, or Elysian frontend memory projections.
- Multi-agent scheduling or cross-agent shared-memory semantics.

## Technical Notes

- Parent task: `.trellis/tasks/07-03-agent-framework-scope`.
- M1 package path: `packages/simulation-agent`.
- Current public loop contract: `MemoryPort<MemoryQuery, MemoryHit, MemoryWrite>`.
- Relevant specs:
  - `.trellis/spec/backend/persona-memory.md`
  - `.trellis/spec/backend/agent-simulation.md`
  - `.trellis/spec/backend/logging-guidelines.md`
  - `.trellis/spec/backend/quality-guidelines.md`
- Implementation should add package-owned tests without requiring network access or API keys.
