# Simulation Agent Memory Slice - Implementation Plan

## Step 0 - Pre-Check

- Read parent scope artifacts:
  - `.trellis/tasks/07-03-agent-framework-scope/prd.md`
  - `.trellis/tasks/07-03-agent-framework-scope/design.md`
  - `.trellis/tasks/07-03-agent-framework-scope/implement.md`
- Read this task's `prd.md` and `design.md`.
- Read applicable specs:
  - `.trellis/spec/backend/persona-memory.md`
  - `.trellis/spec/backend/agent-simulation.md`
  - `.trellis/spec/backend/logging-guidelines.md`
  - `.trellis/spec/backend/quality-guidelines.md`
- Baseline checks:
  - `npm run build:packages`
  - `npm run typecheck`
  - `npm test`

## Step 1 - Add Memory Contracts

- Add `packages/simulation-agent/src/memory/memoryRecords.ts`.
- Define:
  - `MemoryKind`
  - `MemoryVisibility`
  - `MemoryRecord`
  - `MemoryWrite`
  - `MemoryRetrievalQuery`
  - `MemoryRetrievalWeights`
  - `MemoryScoreBreakdown`
  - `MemoryRetrievalHit`
  - `MemoryRetrievalDiagnostic`
  - `MemoryRetrievalResult`
- Export contracts from `packages/simulation-agent/src/index.ts`.

Validation:

- Typecheck after contracts compile.

## Step 2 - Add Validation Helpers

- Add `packages/simulation-agent/src/memory/validation.ts`.
- Implement a package-owned `MemoryValidationError`.
- Validate writes and retrieval queries.
- Normalize optional fields:
  - `relatedMemoryIds`
  - `visibility`
  - `tags`
  - `metadata`
  - `topK`
  - weights
- Do not silently coerce invalid required fields.

Validation:

- Add tests for valid defaults and invalid write/query failures.

## Step 3 - Add Deterministic Retrieval

- Add `packages/simulation-agent/src/memory/retrieval.ts`.
- Implement deterministic scoring:
  - token/tag/source relevance;
  - recency normalized from `query.now`;
  - importance normalized by `0..9`;
  - configurable weights.
- Implement stable tie-breakers.
- Return diagnostics for candidates and selected hits.

Validation:

- Add tests for:
  - deterministic identical rankings;
  - relevance-dominant ranking;
  - recency-dominant ranking;
  - importance-dominant ranking;
  - diagnostics content.

## Step 4 - Add In-Memory Store

- Add `packages/simulation-agent/src/memory/inMemoryMemoryStore.ts`.
- Implement:
  - `remember(agentId, write)`
  - `retrieve(agentId, query)`
  - `list(agentId)`
  - `toPort()`
- Ensure records/results are defensively copied.
- Ensure agent isolation.
- Ensure selected retrieval hits update `lastAccessedAt` and non-selected records do not.
- Use deterministic generated IDs when `write.id` is omitted.

Validation:

- Add tests for append-only behavior, duplicate IDs, agent scoping, defensive copies, and `toPort()`.

## Step 5 - Public Export and Existing Loop Compatibility

- Export memory module from package root.
- Keep existing cognitive loop imports green.
- Do not modify Elysian adapter behavior unless a compile-only type import adjustment is required.

Validation:

- `npm run build:packages`
- `npm run typecheck`

## Step 6 - Boundary and Quality Checks

Run:

```bash
rg -n "src/server|src/shared|src/app|\\.\\./\\.\\./src" packages/simulation-agent/src
rg -n "packages/simulation-agent/src|@elysian/simulation-agent/src" src tests
npm run build:packages
npm run typecheck
npm test
```

Expected:

- no package imports of Elysian app/shared/server code;
- no Elysian deep imports into package internals;
- all tests pass offline.

## Step 7 - Spec Review

Update `.trellis/spec/backend/agent-simulation.md` and/or `.trellis/spec/backend/persona-memory.md` if implementation establishes concrete package memory signatures that future sessions must preserve.

## Commit Boundary

Single work commit for M2:

```text
feat: add simulation agent memory primitives
```

Do not include unrelated dirty files, generated images, old `06-20` task deletions, or knowledge-vault files.
