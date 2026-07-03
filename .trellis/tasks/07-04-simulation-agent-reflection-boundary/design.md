# Simulation Agent Reflection Boundary - Design

## 1. Boundary Objective

M3 adds reflection primitives that compose with the M2 memory store while staying provider-agnostic.

The package owns:

- reflection trigger/input contracts;
- reflection structured output contracts;
- validation for evidence-linked reflection outputs;
- diagnostics for success/failure;
- conversion from valid output to `MemoryWrite`.

The host owns:

- when reflection is triggered;
- which memories are passed as evidence;
- real provider implementation and configuration;
- retries, budgets, secrets, and cancellation policy;
- storage/persistence beyond `InMemoryMemoryStore`.

## 2. Package Layout

Target package additions:

```text
packages/simulation-agent/src/
  reflection/
    reflectionRecords.ts
    reflectionPlanner.ts
    reflectionValidation.ts
```

The public entrypoint remains:

```text
packages/simulation-agent/src/index.ts
```

Tests should import only from `@elysian/simulation-agent`.

## 3. Public Contracts

### Reflection Trigger

```ts
export type ReflectionTriggerKind =
  | "importance-threshold"
  | "scheduled"
  | "conversation-ended"
  | "user-requested";

export interface ReflectionTrigger {
  kind: ReflectionTriggerKind;
  reason: string;
  now: string;
  sourceIds: readonly string[];
}
```

### Reflection Input

```ts
export interface ReflectionInput<Metadata = Record<string, unknown>> {
  agentId: string;
  trigger: ReflectionTrigger;
  evidence: readonly MemoryRecord<Metadata>[];
  maxInsights?: number;
}
```

### Reflection Output

```ts
export interface ReflectionInsightOutput {
  content: string;
  evidenceMemoryIds: readonly string[];
  importance: number; // 0..9
  tags?: readonly string[];
  metadata?: Record<string, unknown>;
}

export interface ReflectionPlannerOutput {
  source: "deterministic" | "llm";
  insights: readonly ReflectionInsightOutput[];
  reason: string;
}
```

### Reflection Planner

```ts
export interface ReflectionPlanner<Metadata = Record<string, unknown>> {
  reflect(
    input: ReflectionInput<Metadata>,
    options?: LlmRequestOptionsLike,
  ): Promise<ReflectionPlannerOutput> | ReflectionPlannerOutput;
}
```

The planner can wrap an `LlmPort`, but the reflection primitive depends only on `ReflectionPlanner`.

### Reflection Result

```ts
export type ReflectionStatus = "completed" | "failed" | "skipped";

export interface ReflectionResult<Metadata = Record<string, unknown>> {
  status: ReflectionStatus;
  memoryWrites: readonly MemoryWrite<Metadata>[];
  diagnostics: readonly ReflectionDiagnostic[];
}
```

## 4. Execution Shape

Add a primitive such as:

```ts
export async function runReflection<Metadata>(
  input: ReflectionInput<Metadata>,
  planner: ReflectionPlanner<Metadata>,
  options?: LlmRequestOptionsLike,
): Promise<ReflectionResult<Metadata>>;
```

Behavior:

1. Validate input.
2. Call injected planner.
3. Validate planner output.
4. Convert each valid insight to a `MemoryWrite` with:
   - `kind: "reflection"`;
   - `createdAt: input.trigger.now`;
   - `sourceIds: input.trigger.sourceIds`;
   - `relatedMemoryIds: insight.evidenceMemoryIds`;
   - `importance: insight.importance`;
   - `content: insight.content`;
   - `tags` and `metadata` copied defensively.
5. Return `completed` with writes, or `failed` with diagnostics and no writes.

M3 should not directly write into a store unless a helper is intentionally tiny and still returns visible diagnostics. The core primitive should return writes so hosts decide where to store them.

## 5. Validation Rules

Input validation rejects:

- blank `agentId`;
- invalid trigger `kind`;
- blank trigger `reason`;
- invalid trigger `now`;
- empty trigger `sourceIds`;
- empty evidence;
- evidence not owned by `input.agentId`;
- invalid `maxInsights`.

Output validation rejects:

- planner output missing a valid `source`;
- empty `insights`;
- blank insight `content`;
- empty `evidenceMemoryIds`;
- evidence IDs not present in `input.evidence`;
- `importance` outside `0..9`;
- blank tags.

Planner thrown/rejected errors produce a failed result with diagnostics and no writes.

## 6. Diagnostics

Diagnostics should include:

- status;
- phase: `input`, `planner`, or `output`;
- message;
- evidence memory IDs when relevant;
- source: planner output source when available.

Do not include provider secrets, raw prompts, or full private user text in diagnostics.

## 7. Testing Strategy

Required tests:

- valid fake planner creates evidence-linked reflection writes;
- malformed output creates a failed result and no writes;
- unknown evidence memory IDs fail visibly;
- planner thrown/rejected errors fail visibly;
- input validation rejects empty evidence/source IDs;
- reflection output defensively copies tags/metadata-related arrays;
- no package deep imports in tests.

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

- Built-in provider adapters.
- Live LLM calls.
- Reflection scheduling.
- Automatic cognitive-loop reflect phase wiring.
- Persistence or embeddings.
