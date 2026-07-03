# Simulation Agent Memory Slice - Design

## 1. Boundary Objective

M2 gives `@elysian/simulation-agent` its first real memory primitive layer while keeping the host application responsible for world state, persistence, and provider configuration.

The package owns:

- generic memory record contracts;
- append-only in-memory storage;
- deterministic retrieval scoring;
- retrieval diagnostics;
- a `MemoryPort` adapter for the cognitive loop.

The package does not own:

- Elysian `WorldSnapshot`, `SimulationEvent`, or `PlanAction` types;
- production persistence;
- embeddings or provider adapters;
- reflection generation.

## 2. Package Layout

Target package additions:

```text
packages/simulation-agent/src/
  memory/
    memoryRecords.ts
    inMemoryMemoryStore.ts
    retrieval.ts
    validation.ts
```

The public entrypoint remains:

```text
packages/simulation-agent/src/index.ts
```

Tests can remain under root `tests/` for the existing runner, but they must import from `@elysian/simulation-agent`.

## 3. Public Contracts

### Memory Kinds

```ts
export type MemoryKind =
  | "observation"
  | "action"
  | "conversation"
  | "relationship"
  | "plan"
  | "reflection"
  | "intervention";
```

### Memory Record

```ts
export interface MemoryRecord<Metadata = Record<string, unknown>> {
  id: string;
  agentId: string;
  kind: MemoryKind;
  content: string;
  createdAt: string;
  lastAccessedAt: string;
  importance: number; // bounded 0..9
  sourceIds: readonly string[];
  relatedMemoryIds: readonly string[];
  visibility: MemoryVisibility;
  tags: readonly string[];
  metadata: Metadata;
}
```

M2 intentionally uses `sourceIds` instead of Elysian-specific `sourceEventIds` so non-event host contexts can also use the package. Elysian can pass event IDs as source IDs.

### Memory Write

```ts
export interface MemoryWrite<Metadata = Record<string, unknown>> {
  id?: string;
  kind: MemoryKind;
  content: string;
  createdAt: string;
  importance: number;
  sourceIds: readonly string[];
  relatedMemoryIds?: readonly string[];
  visibility?: MemoryVisibility;
  tags?: readonly string[];
  metadata?: Metadata;
}
```

The store assigns an ID only when the caller omits one. Generated IDs must be deterministic per store instance, not random.

### Retrieval Query

```ts
export interface MemoryRetrievalQuery {
  text: string;
  now: string;
  topK?: number;
  tags?: readonly string[];
  sourceIds?: readonly string[];
  weights?: Partial<MemoryRetrievalWeights>;
}
```

### Retrieval Result

```ts
export interface MemoryRetrievalHit<Metadata = Record<string, unknown>> {
  record: MemoryRecord<Metadata>;
  score: MemoryScoreBreakdown;
}

export interface MemoryRetrievalResult<Metadata = Record<string, unknown>> {
  hits: readonly MemoryRetrievalHit<Metadata>[];
  diagnostics: MemoryRetrievalDiagnostic;
}
```

## 4. Store Behavior

`InMemoryMemoryStore` should expose package-owned methods:

```ts
remember(agentId: string, write: MemoryWrite): MemoryRecord;
retrieve(agentId: string, query: MemoryRetrievalQuery): MemoryRetrievalResult;
list(agentId: string): readonly MemoryRecord[];
```

It should also provide a loop adapter:

```ts
toPort(): MemoryPort<MemoryRetrievalQuery, MemoryRetrievalHit, MemoryWrite>;
```

Rules:

- Append-only: `remember` creates a new record and does not update existing content.
- Defensive copies: returned records/results must not expose mutable internal arrays.
- Agent isolation: `retrieve` and `list` are scoped by `agentId`.
- Access touch: selected records get `lastAccessedAt = query.now`; non-selected candidates do not.
- Validation failures throw a package-owned error with diagnostics.

## 5. Retrieval Scoring

Default weights:

```ts
relevance: 0.5
recency: 0.3
importance: 0.2
```

Each component is normalized to `0..1` before combining.

```text
finalScore = relevanceWeight * relevance
           + recencyWeight * recency
           + importanceWeight * importance
```

Tie-breakers must be stable:

1. higher final score;
2. newer `createdAt`;
3. lexicographic `id`.

M2 relevance is deterministic:

- tokenize query text and memory content/tags case-insensitively;
- exact token overlap contributes to relevance;
- matching query tags and source IDs boost relevance within the normalized component.

Recency is deterministic from `query.now` and `record.createdAt`.

Importance uses `importance / 9`.

## 6. Validation and Errors

Validation should reject:

- blank `agentId`;
- blank `content`;
- blank or unknown `kind`;
- invalid ISO date strings for `createdAt` or `now`;
- importance outside `0..9`;
- empty or blank `sourceIds`;
- duplicate memory IDs for the same store;
- invalid `topK` values;
- weight sets whose sum is not positive.

Failures should be visible. Do not silently coerce invalid writes into defaults except for explicitly optional fields:

- `relatedMemoryIds` defaults to `[]`;
- `visibility` defaults to `"private"`;
- `tags` defaults to `[]`;
- `metadata` defaults to `{}`;
- `topK` defaults to a small deterministic value, likely `5`.

## 7. Testing Strategy

Add package-level root tests that import from the package root.

Required tests:

- valid writes append records with defaults and defensive copies;
- invalid writes throw and do not store records;
- duplicate IDs throw visibly;
- retrieval is agent-scoped;
- retrieval ranking is deterministic for identical inputs;
- relevance-dominant, recency-dominant, and importance-dominant scenarios rank as expected when weights change;
- diagnostics include candidate IDs, component scores, final scores, selected IDs, and query summary;
- `toPort()` satisfies the cognitive loop `MemoryPort` shape.

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

## 8. Non-Goals

- Reflection execution.
- Embedding/vector relevance.
- Persistence adapters.
- Host application wiring.
- Shared cross-agent memory.
