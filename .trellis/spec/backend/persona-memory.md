# Persona and Memory Backend Spec

> Contracts for persona configuration, generated memories, retrieval, and reflection.

## Evidence Base

Reference patterns:

- `microsoft/TinyTroupe` uses detailed persona JSON with identity, style, personality, goals, routines, relationships, and background facts.
- `joonspk-research/generative_agents` uses a memory stream with events/thoughts, importance, reflection triggers, and relevance/recency/importance retrieval.
- `a16z-infra/ai-town` stores conversation, relationship, and reflection memories separately from active world state and vector-searches embeddings.

## Persona Spec Contract

Personas are configuration, not runtime state.

Required top-level fields:

- `id`: stable machine identifier.
- `displayName`: user-facing name.
- `aliases`: optional alternative names.
- `authorship`: `user-authored | placeholder | licensed | generated-draft`.
- `sourceNotes`: short note describing where the summary came from without storing copyrighted text.
- `profile`: archetype, values, long-term goals, constraints.
- `speech`: tone, cadence, preferred address forms, taboo phrases/topics.
- `personality`: traits, strengths, flaws, emotional triggers.
- `routines`: default morning/day/evening/night activities and special-day overrides.
- `preferences`: locations, activities, likes, dislikes.
- `relationships`: directed seeds for other agents.
- `contentBoundaries`: safety, canon-fidelity, and legal constraints.

Rules:

- Persona behavior should be strictly canon-aligned for temperament, relationship constraints, values, speech-style intent, and major boundaries.
- Do not embed official dialogue dumps, official story text, or extracted proprietary assets in persona files.
- Represent canon alignment through user-authored summaries, constraints, relationship notes, and boundary tags rather than copied source text.
- Keep base persona facts immutable during a simulation run.
- Store user edits as config changes with schema versioning.
- Store generated observations, memories, and reflections outside persona specs.

## Implemented Persona v1 Contract

### 1. Scope / Trigger

Slice 1 implemented the first executable persona contract. Any future persona, fixture, loader, migration, or editor UI must comply with this section because persona data crosses shared contracts, backend validation, tests, and future frontend profile rendering.

### 2. Signatures

Current source paths:

- `src/shared/contracts/persona.ts`
- `src/server/personas/validation.ts`
- `src/server/personas/fixtures/pilotPersonas.ts`
- `tests/personaValidation.test.ts`

Current exported API:

```ts
export const PERSONA_SCHEMA_VERSION = "persona.v1" as const;

export interface PersonaValidationContext {
  knownPersonaIds?: readonly PersonaId[];
}

export interface PersonaValidationResult {
  ok: boolean;
  errors: string[];
}

export function validatePersonaSpec(
  input: unknown,
  context?: PersonaValidationContext,
): PersonaValidationResult;

export function parsePersonaSpec(
  input: unknown,
  context?: PersonaValidationContext,
): PersonaSpec;

export function validatePersonaRoster(personas: readonly unknown[]): PersonaValidationResult;
```

### 3. Contracts

`PersonaSpec` is immutable configuration and must include:

- `schemaVersion: "persona.v1"`
- `id`, `displayName`, `aliases`, `authorship`, `sourceNotes`, `updatedAt`
- `profile`, `speech`, `personality`, `routines`, `preferences`, `relationships`, `contentBoundaries`
- optional `migrationNotes`

`validatePersonaRoster` derives known persona IDs from the supplied roster and validates each relationship against that roster. Use it for fixture sets such as the three pilot personas.

### 4. Validation & Error Matrix

- non-object input -> `persona must be an object`
- wrong `schemaVersion` -> `schemaVersion must be persona.v1`
- missing or blank string field -> `<path>.<field> must be a non-empty string`
- missing or empty string-array field -> `<path>.<field> must be a non-empty string array`
- missing or empty routine period -> `routines.<period> must be a non-empty array`
- missing relationship array -> `relationships must be a non-empty array`
- relationship score outside `0..10` -> `<path>.<field> must be a number from 0 to 10`
- unknown relationship target when `knownPersonaIds` is supplied -> `targetPersonaId must reference a known persona id`
- forbidden generated/runtime fields anywhere in the object tree -> `<path> is generated/runtime state and is not allowed in immutable persona fixtures`

Forbidden generated/runtime fields currently include `memories`, `memoryStream`, `generatedMemories`, `reflections`, `generatedReflections`, `runtimeState`, `currentPlan`, `currentAction`, and `inProgressOperationId`.

### 5. Good/Base/Bad Cases

Good:

```ts
validatePersonaRoster(pilotPersonas); // { ok: true, errors: [] }
```

Base:

```ts
parsePersonaSpec(pilotPersonas[0], { knownPersonaIds: pilotPersonaIds });
```

Bad:

```ts
validatePersonaSpec({ ...pilotPersonas[0], generatedMemories: [] });
validatePersonaSpec({ ...pilotPersonas[0], relationships: [{ targetPersonaId: "unknown" }] }, { knownPersonaIds: pilotPersonaIds });
```

### 6. Tests Required

Persona validation tests must cover:

- all pilot fixtures validate as a roster;
- `parsePersonaSpec` returns typed valid input and throws `PersonaValidationError` for invalid input;
- missing identity, speech, routine, relationship, and boundary fields are rejected;
- generated/runtime fields are rejected at both top level and nested locations;
- relationships to unknown persona IDs are rejected when context is supplied.

Current command:

```bash
npm test
```

### 7. Wrong vs Correct

#### Wrong

```ts
const persona = rawPersona as PersonaSpec;
persona.generatedMemories = ["..."];
```

#### Correct

```ts
const persona = parsePersonaSpec(rawPersona, { knownPersonaIds });
// Generated memories are stored as MemoryRecord values, never on PersonaSpec.
```

## Persona Versioning

Every persona file must include:

- `schemaVersion`
- `updatedAt` or content hash
- optional `migrationNotes`

When changing the schema:

1. Add a migration or fixture update.
2. Update validators.
3. Update at least one valid and one invalid fixture test.
4. Do not silently coerce missing required fields into defaults.

## Memory Record Contract

A memory is an append-only record owned by one agent's perspective.

Required fields:

- `id`
- `worldId`
- `agentId`
- `type`: `observation | action | conversation | relationship | plan | reflection | intervention`
- `content`: concise natural-language summary or structured summary.
- `createdAt`
- `lastAccessedAt`
- `importance`: numeric poignancy/importance score.
- `embeddingRef?`: reference to embedding vector/cache entry.
- `sourceEventIds`: events that produced this memory.
- `relatedMemoryIds`: evidence or linked memories.
- `visibility`: `private | shared | system | user-authored`.
- `metadata`: type-specific validated payload.

Forbidden patterns:

- Treating chat transcript messages as memories without summarization.
- Using one shared conversation summary for every participant.
- Mixing generated reflections into the base persona spec.
- Creating memories without source event IDs.

## Memory Types

### Observation

Created when an agent notices an event, location change, user intervention, or another agent's action.

Metadata should include observed actor/target IDs and event kind.

### Action

Created when an agent performs a meaningful action.

Metadata should include action kind, location, and plan/action ID.

### Conversation

Created after a conversation ends.

Rules:

- One summary memory per participant.
- Use first-person perspective for the participant receiving the memory.
- Include whether the interaction changed affinity, trust, curiosity, tension, or future plans when relevant.

### Relationship

Created or updated when repeated interactions change one agent's directed view of another.

Rules:

- Relationship memory is directed: `A's view of B` is not `B's view of A`.
- Relationship scores are derived from memories/events; do not make them the only record of why a relationship changed.

### Plan

Created when an agent forms a daily plan or revises a meaningful plan.

Rules:

- Plans should expire or be superseded.
- Keep a link to plan-generating context and retrieved memories.

### Reflection

Created by synthesizing lower-level memories.

Rules:

- Reflection memories must include evidence memory IDs.
- Reflection should be triggered by accumulated importance or schedule, not every tick.
- Reflection output must be validated and parseable.

### Intervention

Created when the user changes the realm or talks to an agent.

MVP intervention kinds:

- observer command: pause/resume/step/speed/debug/reflection requests;
- realm event: gatherings, location events, schedule nudges, anomalies, invitations, or environmental prompts;
- direct private message: a typed user message to one agent.

Rules:

- Preserve intervention source as user-authored.
- Store direct private messages as user-sourced events/memories; do not let them bypass simulation inputs.
- Agents may interpret interventions differently; each interpretation should be stored as that agent's memory, not as global fact.

## Retrieval Contract

Retrieval must combine three base signals:

```text
overallScore = relevanceWeight * normalizedSemanticRelevance
             + recencyWeight * normalizedRecency
             + importanceWeight * normalizedImportance
             + optionalContextBoost
```

Required diagnostics per retrieval:

- query/focal event
- candidate memory IDs
- relevance score
- recency score
- importance score
- final score
- selected top-k

Rules:

- Normalize component scores before combining.
- Update `lastAccessedAt` only for selected memories and throttle repeated touch updates.
- Over-fetch by relevance before final ranking when vector search is used.
- Retrieval code must be deterministic in tests with fake embeddings.

## Importance and Reflection Triggers

Importance may be produced by a model or deterministic rubric, but it must be numeric and bounded.

Recommended MVP scale: `0..9` or `1..10`. Pick one scale and use it everywhere.

Reflection trigger options:

- accumulated importance since last reflection exceeds threshold
- scheduled daily/nightly reflection
- conversation end with high emotional importance
- explicit user debug command

Do not run reflection on every memory write.

## Embedding Cache

If embeddings are used:

- Cache by hash of normalized text plus provider/model/dimension.
- Store vector dimensions with the embedding model configuration.
- Changing embedding model or dimensions requires re-indexing or a separate index namespace.
- Tests must use fake embeddings and must not require network access.

## Validation Checklist

- Persona fixtures validate against schema.
- Generated memories cannot be stored inside persona fixtures.
- Memory retrieval ranking is covered by deterministic tests.
- Reflection memories reference evidence memories.
- Conversation summaries are perspective-specific.
- Model/provider failures are visible and do not create fake successful memories.
