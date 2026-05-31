# Backend Persistence Guidelines

> Persistence boundaries for world state, event logs, conversations, memories, embeddings, and persona configuration.

## Status

No database stack has been selected yet. These rules define persistence contracts that should hold for SQLite, Postgres, Convex, document stores, or local JSONL prototypes.

## Persistence Boundaries

Keep these data categories separate:

- **Active world state**: small snapshot loaded and saved by the simulation engine.
- **Event log**: append-only record of simulation inputs, state changes, and diagnostics references.
- **Conversation messages**: high-volume transcripts separate from active world state.
- **Memory records**: typed per-agent records with source events and retrieval metadata.
- **Embeddings/cache**: vector data and embedding text hashes separated from memory summaries.
- **Persona configuration**: immutable base character specs with schema versions.
- **Replay snapshots**: optional compressed snapshots or diffs for inspection and replay.

Do not store every transcript line, embedding vector, or archived conversation directly inside the active world snapshot.

## Active World State

Active state should include only what the engine needs every step:

- world status and current time;
- active agents and lightweight runtime state;
- current locations and active conversations;
- queued inputs or input cursors;
- current plan/action references;
- cooldowns and in-flight operation references.

Historical details belong in append-only logs or archive tables.

## Event Log

Events are the source of what happened.

Required event fields:

- `id`, `worldId`, `stepId`, `time`, `kind`;
- `actorId?`, `targetIds`, `payload`, `source`;
- `causedByInputId?` and optional `diagnosticRef`.

Rules:

- Events are append-only except for administrative migrations.
- Event payloads must be validated by shared decoders.
- Derived projections should point back to event IDs.
- Replay must not require live LLM or embedding calls.

## Persona Storage

Persona specs are configuration files or configuration rows.

Rules:

- Include `schemaVersion` and authorship/source metadata.
- Do not store official game text, official dialogue dumps, or extracted assets.
- Do not write generated memories or reflections back into persona configuration.
- Changing persona schema requires fixture updates and validation tests.

## Memory and Embedding Storage

Memory tables/collections should separate semantic content from vector storage when possible:

```text
memories
  id, worldId, agentId, type, content, importance, timestamps, sourceEventIds, relatedMemoryIds, visibility, metadata, embeddingRef?

memoryEmbeddings
  id, agentId, provider, model, dimension, textHash, vector
```

Rules:

- Cache embeddings by normalized text hash plus provider/model/dimension.
- Changing embedding dimensions requires re-indexing or a separate namespace.
- Store retrieval diagnostics for debugging important decisions.

## Conversation Storage

Keep conversation messages separate from active world state.

Suggested categories:

- active conversation metadata in the world snapshot;
- messages/transcripts in a message table/log;
- archived conversation summary after end;
- per-participant conversation memory records.

Rules:

- Conversation completion must create perspective-specific memories.
- A participant cannot be in two active conversations in MVP.
- Archive enough metadata for profile UI and replay: participants, start/end time, location, message count, last message/summary.

## Transactions and Consistency

Use transactions or equivalent atomic operations around:

- applying a simulation input and appending resulting events;
- ending a conversation and archiving metadata;
- writing a memory and its embedding reference;
- recording operation completion and enqueuing its typed simulation input.

Do not partially mark an LLM operation successful if its memory/event writes failed.

## Migration Rules

Any schema migration must account for:

- event schema version;
- persona schema version;
- memory metadata version;
- prompt output schema version;
- embedding provider/model/dimension.

Provide fixture migrations before changing production-like data.

## Common Mistakes

- Treating active world state as a dumping ground for logs and transcripts.
- Storing generated content without provenance.
- Losing source event IDs when summarizing conversations.
- Recomputing embeddings repeatedly instead of using a cache.
- Changing event payload shape without updating frontend projections and replay tests.
