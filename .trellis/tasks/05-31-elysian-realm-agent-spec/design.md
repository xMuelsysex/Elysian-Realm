# Design: Elysian Realm Multi-Agent Daily-Life Simulation

## Status

Planning baseline. No application source code exists yet, so this design defines the initial architecture and contracts future implementation should follow.

## Product Shape

The product is a living realm simulation inspired by the Elysian Realm concept: a bounded space where thirteen persona agents continue daily life, interact with each other, remember events, and respond to user interventions.

The user chose the first playable experience to feel like observing a real running realm, not primarily like direct chat companionship. The recommended first implementation is therefore an observation-terminal / text-timeline UI with lightweight locations, agent statuses, conversations, replay, and interventions. A 2D map can be added later once simulation contracts are stable.

## Reference-Derived Principles

1. **Generative Agents**: use memory stream, perception, retrieval, planning, reflection, and action as distinct cognitive modules.
2. **AI Town**: separate server-side world logic, engine loop, agent async operations, memory tables, and client UI; mutate state through inputs.
3. **TinyTroupe**: keep personas as detailed structured specs and treat simulation as experiment/replay/validation work.
4. **AgentSociety/CAMEL**: keep environment modules, model providers, tools, memory, and benchmarks swappable.

## Architecture Overview

```text
User / UI
  |
  | typed commands, interventions, replay requests
  v
Backend API / Command Boundary
  |
  | validates input contracts
  v
Simulation Engine
  |-- World state owner
  |-- Event queue processor
  |-- Time/tick/step scheduler
  |-- Conversation lifecycle owner
  |
  +--> Agent Runtime
  |      |-- Perception
  |      |-- Retrieval
  |      |-- Planning
  |      |-- Action selection
  |      |-- Reflection trigger
  |      +-- Async LLM operations
  |
  +--> Memory Store
  |      |-- Typed memories
  |      |-- Embeddings / retrieval scores
  |      |-- Reflections
  |
  +--> Event Log / Replay Store
         |-- Step snapshots
         |-- Commands and outcomes
         |-- Agent decisions and diagnostics
```

## Recommended Module Boundaries

The chosen primary stack is TypeScript full-stack. Use this shape as the implementation baseline:

```text
src/
├── server/
│   ├── simulation/      # deterministic world loop, inputs, event log, replay
│   ├── agents/          # cognitive loop, planner, perception, prompt orchestration
│   ├── memory/          # memory schema, retrieval scoring, reflection, embeddings
│   ├── personas/        # character spec schemas and loaders
│   ├── conversations/   # invite/join/message/summary lifecycle
│   ├── llm/             # provider abstraction, fake provider, cost logging
│   └── observability/   # structured logs, traces, metrics
├── shared/
│   ├── contracts/       # shared DTOs, event kinds, validators
│   └── domain/          # pure shared types with no UI or DB dependency
└── app/ or client/
    ├── realm/           # world timeline, replay, agent status
    ├── agents/          # profiles, memories, relationships
    └── conversations/   # active and archived conversations
```

Python may be added later only as an offline experiment harness for prompt/persona evaluation or retrieval tuning. Do not let Python mutate production world state, own replay, or become a second simulation authority.

## Core Domain Objects

### World

A world is the active realm instance.

Required fields:

- `id`
- `status`: `running | paused | stopped | archived`
- `currentTime`
- `timeScale`
- `locations`
- `agents`
- `activeConversations`
- `queuedInputs`
- `lastStepId`

Rules:

- Only the simulation engine mutates authoritative world state.
- External callers submit commands/inputs; they do not patch world fields directly.
- Active world state should stay small. Historical data belongs in event, memory, and archive stores.

### Agent

An agent is a simulated Flame-Chaser persona plus runtime state.

Required fields:

- `id`
- `personaId`
- `displayName`
- `status`: `idle | planning | moving | conversing | reflecting | waiting | error`
- `locationId`
- `currentPlanId`
- `currentAction`
- `inProgressOperationId?`
- `cooldowns`
- `relationshipRefs`

Rules:

- Runtime state is separate from base persona specs.
- One agent should have at most one in-flight reasoning operation in the MVP.
- Agent decisions become simulation inputs, not direct state writes.

### Persona Spec

A persona spec is structured configuration.

Required sections:

- identity and aliases
- source and authorship metadata
- speech style
- personality and values
- long-term goals
- routine preferences
- location/activity preferences
- relationship seeds
- content boundaries

Rules:

- Configured persona facts are immutable during a simulation run unless a user explicitly edits configuration.
- Generated memories and reflections are stored separately and must be labeled as generated.
- Canon-inspired facts must be user-authored summaries, not extracted official text.

### Event

An event is the append-only source of what happened.

Required fields:

- `id`
- `worldId`
- `stepId`
- `time`
- `kind`
- `actorId?`
- `targetIds`
- `payload`
- `source`: `system | user | agent | llm | test`
- `causedByInputId?`

Rules:

- UI reads projections of events; it does not infer hidden state.
- Derived state should point back to event IDs.
- Event payloads must have one shared decoder/validator per `kind`.

### Memory

Required fields:

- `id`
- `worldId`
- `agentId`
- `type`: `observation | action | conversation | relationship | plan | reflection | intervention`
- `content`
- `createdAt`
- `lastAccessedAt`
- `importance`
- `embeddingRef?`
- `sourceEventIds`
- `relatedMemoryIds`
- `visibility`: `private | shared | system | user-authored`

Retrieval score:

```text
overall = relevanceWeight * semanticRelevance
        + recencyWeight * recencyScore
        + importanceWeight * normalizedImportance
        + optionalContextBoosts
```

Rules:

- Store raw conversation messages separately from summarized memory records.
- Each participant receives its own perspective-specific conversation memory.
- Reflection memories must reference evidence memories.

### Conversation

Required fields:

- `id`
- `worldId`
- `participants`
- `state`: `invited | walkingOver | participating | ending | ended`
- `locationId`
- `startedAt`
- `endedAt?`
- `lastMessageAt?`
- `messageCount`

Rules:

- A participant can only be in one active conversation in the MVP.
- Conversations should have cooldowns to prevent immediate repeated chat loops.
- Conversation completion triggers per-participant summary memories.

## Simulation Step Flow

```text
1. Load active world snapshot.
2. Advance simulation time to target step.
3. Read queued commands/inputs.
4. Validate and apply deterministic inputs.
5. Process deterministic world systems: timers, cooldowns, conversation lifecycle.
6. For each eligible agent:
   a. perceive nearby or relevant events
   b. retrieve memories for focused events/current plan
   c. decide whether to continue action, replan, talk, wait, or reflect
   d. start async LLM operation when needed
7. Apply completed operation results as typed inputs.
8. Append events and diagnostics.
9. Save world diff/snapshot and schedule next step.
```

## LLM Operation Flow

```text
AgentRuntime requests operation
  -> Prompt builder receives persona + current state + retrieved memories
  -> LLM provider returns structured output
  -> Output validator parses and rejects invalid shape
  -> Operation result is saved with diagnostics
  -> Simulation receives typed input such as `agentProposedAction`
```

Rules:

- Prompt builders must be pure functions over typed input.
- Provider errors, JSON parse errors, and policy rejections must remain visible.
- Tests should use fake providers with deterministic responses.
- Never let an LLM response directly patch world, memory, or conversation tables.

## Frontend Data Flow

```text
Backend projection -> query/subscription -> UI component -> typed command -> backend command boundary
```

Frontend responsibilities:

- Render world state, timeline, active conversations, agent profiles, memories, and replay.
- Submit typed user interventions.
- Distinguish configured facts, generated content, and user-authored interventions.
- Provide debug panels for memory retrieval scores and decision traces.

Frontend non-responsibilities:

- No simulation rule ownership.
- No inline parsing of untyped event payloads.
- No direct mutation of agent status, current plan, memories, or relationship scores.

## Persistence Strategy

The implementation can use a relational DB, document DB, or local file store initially, but contracts should separate:

- active world state
- event log
- conversation messages
- memory records
- embedding vectors/cache
- persona configuration
- replay snapshots

For local-first MVP, JSONL/event logs plus SQLite are acceptable. For a live web app, a database with typed schema validation and vector search support is preferred.

## Observability

Every simulation run should capture:

- world step ID, time, duration
- input IDs and outcomes
- agent operation IDs and status
- LLM provider/model/token/cost metadata
- prompt schema version
- memory retrieval candidates and scores
- memory writes and reflection evidence
- conversation starts/ends/summaries
- errors with actionable context

## Legal and Content Safeguards

- Store only user-authored or licensed persona summaries and assets.
- Do not include official dialogue dumps, official art, official music, or proprietary story text.
- Generated dialogue should be original and labeled generated.
- Product copy should state this is a fan/experimental simulation, not an official product.

## Major Trade-Offs

### Observation terminal vs 2D map-first

Decision: observation-terminal / text-timeline first. It validates simulation, memory, plans, conversations, replay, and persona contracts before investing in map/rendering complexity. It should still include named locations and current agent statuses so the realm feels alive rather than like a flat chat log.

### TypeScript vs Python

Decision: TypeScript full-stack is the primary implementation path.

- TypeScript owns the web-first observation terminal, backend simulation authority, shared contracts, and future real-time/2D UI path.
- Python is useful for future offline notebooks or batch experiments, but not for authoritative world mutation in the MVP.
- Hybrid work is deferred until the TypeScript simulation contracts are stable, and any Python component must remain a client/harness rather than a second core.

### High fidelity vs creative daily-life interpretation

Decision: personas should be strictly canon-aligned in temperament, relationship constraints, values, speech-style intent, and major behavioral boundaries.

Implementation boundary: strict canon alignment does not permit copying official dialogue, story dumps, art, music, voice, or proprietary assets into the repository. Persona files should store user-authored summaries/placeholders and content-boundary notes; generated daily-life behavior must be original and labeled as generated.

## Review Gate Before Implementation

Before `task.py start`, the user should review the planning baseline and explicitly approve implementation start.

Resolved decisions:

- MVP presentation mode: observation-terminal / text-timeline first, with lightweight locations and agent statuses.
- Primary stack: TypeScript full-stack, with one backend simulation authority and shared frontend/backend contracts. Python is optional later for offline experimentation only.
- Initial MVP roster: 3 pilot agents first, with schemas and contracts designed to scale to all 13.
- Persona fidelity and asset policy: strictly canon-aligned character behavior using user-authored summaries/placeholders only; no copied official text, dialogue dumps, art, music, voice, or proprietary assets.
- Model strategy: provider-agnostic OpenAI-compatible interface, deterministic FakeProvider required for tests, configurable low-cost cloud or local models for development, and built-in token/cost counters, budget limits, embedding cache, and reflection/conversation throttling.
- User intervention model: mixed intervention, with observer commands and realm events as the primary way to influence the running world, plus optional direct private messages as typed commands.
