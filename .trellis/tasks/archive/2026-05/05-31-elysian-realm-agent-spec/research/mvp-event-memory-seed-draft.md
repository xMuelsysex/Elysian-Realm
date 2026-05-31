# MVP Event and Memory Seed Draft

## Purpose

Turn the observation-terminal MVP planning notes into an implementation-ready event and memory seed draft for the first `elysia` / `pardofelis` / `hua` vertical slice.

This document is planning-only. It defines seed IDs, event order, payload expectations, memory effects, validation gates, and replay expectations for future code work. It does not authorize application-code changes and must not copy official dialogue, story text, subtitles, transcripts, lyrics, images, audio, animation frames, or extracted game assets.

## Inputs

| Source | Use |
|---|---|
| `mvp-world-seed-blueprint.md` | World ID, location vocabulary, startup sequence, UI projection, deterministic smoke storyboard. |
| `mvp-pilot-persona-seeds.md` | Per-agent daily routine seeds, directed relationship seeds, safe event ideas. |
| `persona-spec-source-mapping.md` | Current `PersonaSpec v1` constraints and fixture boundary. |
| `story-event-taxonomy.md` | Provenance labels, lore-to-simulation event categories, safe memory mappings. |
| `implementation-research-handoff.md` | Slice ownership, validation gates, risk controls. |
| `src/shared/contracts/simulation.ts` | Current `WorldSnapshot`, `SimulationEvent`, `MemoryRecord`, `ConversationRecord`, and `SimulationInput` shapes. |
| `.trellis/spec/backend/agent-simulation.md` | Engine authority, typed input, event log, replay, and diagnostics rules. |
| `.trellis/spec/backend/persona-memory.md` | Persona/memory separation, source event IDs, retrieval, reflection, and conversation summary rules. |
| `.trellis/spec/frontend/realm-interface.md` | Observation UI projections, provenance badges, intervention, replay, and debug requirements. |

## Seed Scope

### Included in first executable seed

- One deterministic world seed: `world_elysian_observation_mvp`.
- Three runtime agents:
  - `agent_elysia` / persona `elysia`;
  - `agent_pardofelis` / persona `pardofelis`;
  - `agent_hua` / persona `hua`.
- Six locations:
  - `central_hall`;
  - `garden_courtyard`;
  - `pardo_shop`;
  - `training_court`;
  - `archive_room`;
  - `quiet_room`.
- Startup, first-routine, first-perception, first-plan, optional first-conversation, and seed-memory events.
- Sparse memory seeds created through explicit events.
- Fake-provider / deterministic-operation expectations only.

### Excluded from first executable seed

- Live LLM calls.
- Full memory retrieval implementation beyond seed shape and diagnostics placeholders.
- Full conversation transcript generation.
- Frontend component implementation.
- 13-agent expansion.
- Official story recreation, copied dialogue, copied event text, copied assets, or transcript-like fixtures.

## ID Conventions

Use stable, readable IDs in fixtures and tests until a later persistence layer introduces generated IDs.

| Record type | Pattern | Example |
|---|---|---|
| World | `world_<scope>` | `world_elysian_observation_mvp` |
| Step | `step_<yyyymmddhhmm>_<n>` or deterministic counter | `step_0600_001` |
| Event | `evt_<step>_<order>_<summary>` | `evt_0600_001_world_created` |
| Memory | `mem_<agent>_<summary>` | `mem_hua_memory_uncertainty` |
| Conversation | `conv_<participants>_<n>` | `conv_elysia_pardofelis_001` |
| Operation | `op_<agent>_<kind>_<n>` | `op_elysia_actionProposal_001` |
| Plan | `plan_<agent>_<time>_<n>` | `plan_pardofelis_0600_001` |
| Input | `input_<source>_<n>` | `input_user_step_001` |

Rules:

- Event IDs must be stable in deterministic fixtures so replay tests can compare event order.
- Memory IDs should be stable only for seeded memories. Runtime-generated memories can later use generated IDs.
- Seed IDs are implementation aids, not official lore identifiers.

## World Startup Seed

### Initial snapshot target

| Field | Value |
|---|---|
| `WorldSnapshot.id` | `world_elysian_observation_mvp` |
| `status` | `paused` in tests; `running` only for manual demo seed. |
| `currentTime` | `2026-05-31T06:00:00.000Z` |
| `timeScale` | `60` for demo; tests may override. |
| `lastStepId` | `step_0600_000` before first step. |
| `queuedInputs` | Empty before explicit test input. |
| `activeConversations` | Empty. |

### Initial agents

| Agent ID | Persona ID | Display | Status | Location | Relationship refs |
|---|---|---|---|---|---|
| `agent_elysia` | `elysia` | `Elysia` | `idle` | `garden_courtyard` | `pardofelis`, `hua` |
| `agent_pardofelis` | `pardofelis` | `Pardofelis` | `idle` | `pardo_shop` | `elysia`, `hua` |
| `agent_hua` | `hua` | `Hua` | `idle` | `training_court` | `elysia`, `pardofelis` |

### Initial cooldowns

| Agent | Cooldown key | Initial value | Reason |
|---|---|---|---|
| all | `conversation:any` | unset | First organic conversation is allowed. |
| all | `reflection:scheduled` | next simulated night or omitted until scheduler exists | Prevent startup reflection spam. |
| `agent_elysia` | `conversation:initiate` | unset | Elysia may initiate one low-pressure social scene after perception. |
| `agent_pardofelis` | `shop:discovery` | unset until first shop event completes | Prevent repeated object-find loops. |
| `agent_hua` | `training:interruptible` | after first training event | Avoid immediate interruption every tick. |

## Startup Event Sequence

The first deterministic engine smoke test should create these events in order. `payload` keys are intentionally narrow so a future validator can be written per event kind.

| Order | Event ID | Kind | Source | Actor | Targets | Required payload keys | Memory effect | UI/debug expectation |
|---:|---|---|---|---|---|---|---|---|
| 1 | `evt_0600_001_world_created` | `world.created` | `system` | none | world | `seedId`, `personaIds`, `locationIds`, `initialStatus` | none | Timeline shows seed created with configured/system badge. |
| 2 | `evt_0600_002_agent_elysia_spawned` | `agent.spawned` | `system` | `agent_elysia` | `garden_courtyard` | `personaId`, `locationId`, `status` | none | Agent appears on location board. |
| 3 | `evt_0600_003_agent_pardofelis_spawned` | `agent.spawned` | `system` | `agent_pardofelis` | `pardo_shop` | `personaId`, `locationId`, `status` | none | Agent appears on location board. |
| 4 | `evt_0600_004_agent_hua_spawned` | `agent.spawned` | `system` | `agent_hua` | `training_court` | `personaId`, `locationId`, `status` | none | Agent appears on location board. |
| 5 | `evt_0600_005_time_advanced` | `world.timeAdvanced` | `system` | none | world | `from`, `to`, `timeScale`, `stepId` | none | Header clock updates; replay records first step. |
| 6 | `evt_0600_006_elysia_started_routine` | `agent.startedRoutine` | `system` or `agent` | `agent_elysia` | `garden_courtyard` | `routineId`, `locationId`, `intent`, `provenance` | action memory candidate | Elysia card shows morning social-check route. |
| 7 | `evt_0600_007_pardofelis_started_routine` | `agent.startedRoutine` | `system` or `agent` | `agent_pardofelis` | `pardo_shop` | `routineId`, `locationId`, `intent`, `provenance` | action memory candidate | Pardo card shows shop-opening route. |
| 8 | `evt_0600_008_hua_started_routine` | `agent.startedRoutine` | `system` or `agent` | `agent_hua` | `training_court` | `routineId`, `locationId`, `intent`, `provenance` | action memory candidate | Hua card shows training route. |
| 9 | `evt_0600_009_seed_memories_requested` | `memory.seeded` | `system` | none | seeded memory owners | `seedBatchId`, `memoryIds`, `provenance`, `sourceLocatorRefs` | creates sparse memories | Debug panel shows seeded memory provenance without copied source text. |

Notes:

- `memory.seeded` is a recommended event kind even though the current shared contract only types `SimulationEvent.kind` as `string`. A future implementation should centralize a validator before use.
- Startup routine events may be `source: system` while deterministic fixture generation is owned by the engine. Once agent decisions become LLM/rule outputs, use `source: agent` or `source: llm` only after typed operation results are applied by the engine.
- Do not include raw generated dialogue in any startup event.

## Seeded Memory Draft

All seeded memories are sparse, project-authored, and evidence-linked. They must be stored as `MemoryRecord` values, not inside `PersonaSpec`.

| Memory ID | Agent | Type | Visibility | Importance | Source event IDs | Related memories | Content summary rule | Metadata keys |
|---|---|---|---|---:|---|---|---|---|
| `mem_elysia_relationship_index_hint` | `agent_elysia` | `observation` | `private` | 5 | `evt_0600_009_seed_memories_requested` | none | Short project-authored note that relationship-map/source clues can guide later invitations; no copied graph text or image. | `provenance`, `sourceLocators`, `confidence`, `seedKind` |
| `mem_pardofelis_shop_opening_plan` | `agent_pardofelis` | `plan` | `private` | 4 | `evt_0600_007_pardofelis_started_routine`, `evt_0600_009_seed_memories_requested` | none | Original note that opening shop and checking safe routes is today's first low-risk anchor. | `routineId`, `locationId`, `provenance`, `seedKind` |
| `mem_hua_memory_uncertainty` | `agent_hua` | `observation` | `private` | 6 | `evt_0600_009_seed_memories_requested` | none | Project-authored note that memory fragments require evidence and should not be silently treated as complete fact. | `provenance`, `sourceLocators`, `uncertainty`, `seedKind` |
| `mem_elysia_archive_context` | `agent_elysia` | `observation` | `private` | 3 | `evt_0600_009_seed_memories_requested` | `mem_elysia_relationship_index_hint` | Elysia's perspective on the archive as a place for gentle relationship exploration. | `locationId`, `provenance`, `seedKind` |
| `mem_pardofelis_archive_context` | `agent_pardofelis` | `observation` | `private` | 3 | `evt_0600_009_seed_memories_requested` | none | Pardo's perspective that archive objects can become useful, harmless leads if handled carefully. | `locationId`, `provenance`, `seedKind` |
| `mem_hua_archive_context` | `agent_hua` | `observation` | `private` | 3 | `evt_0600_009_seed_memories_requested` | `mem_hua_memory_uncertainty` | Hua's perspective that archive context is evidence to review, not a complete answer. | `locationId`, `provenance`, `seedKind` |

Recommended metadata values:

```text
provenance: ["project-authored", "fan-navigation", "wiki-summary", "official-url"]
sourceLocators: [doc names, URLs, BV IDs, part numbers]
confidence: "secondary" | "project-authored" | "official-url-anchor"
seedKind: "mvp-startup" | "routine" | "archive-context" | "relationship-context"
```

Rules:

- `content` must be concise project-authored summary text only.
- `sourceLocators` may contain URLs, BV IDs, part numbers, and research document filenames.
- `sourceLocators` must not contain copied story paragraphs, transcript snippets, subtitles, lyrics, or official prose.
- `lastAccessedAt` should equal `createdAt` for startup memory seeds.
- `importance` should use one bounded scale across the implementation; this draft assumes `0..10` because existing relationship scores also use `0..10`.
- A future reflection memory must reference evidence memory IDs in `relatedMemoryIds`; do not seed reflection without evidence unless the implementation explicitly models Hua's uncertainty as an `observation` first.

## Routine Memory Effects

Routine events should not automatically create memory spam every tick. The first meaningful routine event per agent can create one action/plan memory.

| Routine event | Optional memory ID | Type | Create when | Do not create when |
|---|---|---|---|---|
| `evt_0600_006_elysia_started_routine` | `mem_elysia_morning_social_route` | `plan` or `action` | first routine of the day is visible and meaningful for later plan/retrieval | routine repeats without changed intent |
| `evt_0600_007_pardofelis_started_routine` | `mem_pardofelis_shop_opening_plan` | `plan` | first shop-opening route anchors movement and conversation hooks | already created by startup memory seed |
| `evt_0600_008_hua_started_routine` | `mem_hua_morning_forms` | `action` | first training event may become evidence for discipline/routine | every training tick |

Implementation recommendation:

- Prefer a deterministic `shouldRememberRoutine(event)` rule for Slice 2/3 tests.
- Later model-based importance scoring may adjust importance, but cannot create memories without `sourceEventIds`.

## First Perception and Plan Seeds

After startup, the first non-trivial agent loop can be deterministic and no-network.

| Step | Event kind | Actor | Trigger | Payload keys | Expected result |
|---:|---|---|---|---|---|
| 1 | `agent.perceivedEvent` | `agent_elysia` | Pardo's shop routine is visible or included in eligible public events. | `observedEventIds`, `perceptionSummary`, `diagnosticsRef` | Elysia may consider a low-pressure visit. |
| 2 | `agent.updatedPlan` | `agent_elysia` | Deterministic action proposal chooses `move` or `startConversation` intent. | `planId`, `actionKind`, `reason`, `sourceMemoryIds` | Elysia plan card updates; no direct movement unless engine applies typed input. |
| 3 | `agent.perceivedEvent` | `agent_pardofelis` | Elysia movement/plan becomes public enough to notice. | `observedEventIds`, `perceptionSummary`, `diagnosticsRef` | Pardo may accept, defer, or prepare shop small talk. |
| 4 | `agent.perceivedEvent` | `agent_hua` | Hua notices only events in location/schedule scope. | `observedEventIds`, `perceptionSummary`, `diagnosticsRef` | Hua continues training unless a valid trigger appears. |

Boundary:

- Perception events can create observation memories only if a memory policy chooses them. They are not memories by themselves.
- `perceptionSummary` must be project-authored or generated original text; it must not quote source material.

## Conversation Seed Scenario A: Elysia Checks on Pardo

This is the recommended first two-agent conversation scenario because it exercises social initiation, acceptance/decline, conversation lifecycle, participant-specific summaries, and relationship memory seeds without requiring the full 13-agent roster.

### Preconditions

- `agent_elysia` has perceived `agent_pardofelis`'s shop-opening routine.
- `agent_elysia` has no active conversation and no in-flight operation.
- `agent_pardofelis` has no active conversation and no blocking cooldown.
- Engine validates both participants and `pardo_shop` location.

### Event sequence

| Order | Event kind | Source | Actor | Targets | Payload keys | Notes |
|---:|---|---|---|---|---|---|
| 1 | `agent.updatedPlan` | `agent` or `llm` via typed result | `agent_elysia` | `agent_pardofelis` | `planId`, `actionKind: move/startConversation`, `reason`, `sourceMemoryIds` | Plan only; not state mutation by the model. |
| 2 | `agent.updatedPlan` or `agent.startedRoutine` | `system` | `agent_elysia` | `pardo_shop` | `planId`, `actionKind: move`, `locationId`, `intent` | Engine-owned movement/plan application. |
| 3 | `conversation.invited` | `agent` via engine | `agent_elysia` | `agent_pardofelis` | `conversationId`, `locationId`, `topicSeed`, `cooldownKey` | Topic seed must be original, e.g. shop/wellbeing curiosity, not official scene recreation. |
| 4 | `conversation.started` or `conversation.ended` with declined outcome | `system` | none | both agents | `conversationId`, `locationId`, `participantIds`, optional `declineReason` | Refusal/defer is valid and should be visible. |
| 5 | `conversation.ended` | `system` | none | both agents | `conversationId`, `messageCount`, `summaryOperationIds`, `outcome` | Message bodies are stored separately and summarized later. |
| 6 | `memory.created` | `system` or `llm` result via engine | `agent_elysia` | source event IDs | `memoryId`, `type: conversation`, `importance`, `visibility`, `sourceEventIds` | Elysia perspective summary. |
| 7 | `memory.created` | `system` or `llm` result via engine | `agent_pardofelis` | source event IDs | `memoryId`, `type: conversation`, `importance`, `visibility`, `sourceEventIds` | Pardo perspective summary; must differ from Elysia's. |

### Conversation memory drafts

| Memory ID | Owner | Type | Visibility | Source events | Summary rule |
|---|---|---|---|---|---|
| `mem_elysia_conv_pardo_shop_001` | `agent_elysia` | `conversation` | `private` | invitation/start/end events | Elysia records Pardo's evasive warmth and whether the invitation felt welcome; do not declare hidden fear as fact unless observed. |
| `mem_pardofelis_conv_elysia_shop_001` | `agent_pardofelis` | `conversation` | `private` | invitation/start/end events | Pardo records that Elysia's attention was warm but could mean trouble/obligation; keep ordinary courage and practical framing. |

### Validation expectations

- An agent cannot join another active conversation while this one is active.
- Pair cooldown is set after end, e.g. `conversation:agent_elysia:agent_pardofelis`.
- Summary memories are created after `conversation.ended`, not after every message.
- Conversation transcript/body storage stays outside `WorldSnapshot.activeConversations`.

## Conversation Seed Scenario B: Hua Offers Practical Guidance

Use this after Scenario A or as a separate deterministic test once conversation lifecycle exists.

| Field | Draft |
|---|---|
| Participants | `agent_hua`, `agent_pardofelis` |
| Trigger | Pardo avoids `training_court`, carries a harmless archive object, or has a public uncertainty event. |
| Location | `central_hall` or `pardo_shop` |
| Valid outcomes | Pardo accepts advice, deflects with practical humor, or postpones. |
| Memory expectation | Hua records practical concern without exposing Pardo; Pardo records useful advice without calling it emotional support. |

Required boundary:

- Hua's guidance must be practical and evidence-aware, not a forced confession or a generic mentor speech.
- Pardo's response must preserve agency and fear; do not force bravery every time.

## Conversation Seed Scenario C: Elysia Visits Hua After Training

| Field | Draft |
|---|---|
| Participants | `agent_elysia`, `agent_hua` |
| Trigger | Hua completes first training routine and `training:interruptible` cooldown permits approach. |
| Location | `training_court` |
| Valid outcomes | Hua accepts brief conversation, defers, or declines. |
| Memory expectation | Elysia records respect for restraint; Hua records trust plus possible discomfort with emotional directness. |

Required boundary:

- Elysia may invite but cannot override refusal.
- Hua's memory uncertainty remains visible; no hidden canon knowledge is invented.

## User Intervention Seeds

Interventions are typed inputs. They must become `source: user` events before agents can perceive or remember them.

| Input kind | Example payload intent | Event kind | Memory effect | Validation |
|---|---|---|---|---|
| `observerCommand` | `pause`, `resume`, `step`, `changeSpeed`, `requestDebugTrace` | `realm.interventionSubmitted` or control-specific event | Usually none, unless an agent perceives a debug/reflection request intentionally. | command name, world ID, optional target IDs. |
| `realmEvent` | schedule quiet gathering at `garden_courtyard`; place harmless archive prompt in `archive_room` | `realm.interventionSubmitted` then specific `realm.*` event | observation/intervention memory for affected agents only. | target location/agents must exist. |
| `directPrivateMessage` | user sends one private message to `agent_hua` | `realm.interventionSubmitted` plus user message record | `intervention` memory for targeted agent; other agents do not know unless exposed. | one target agent, message stored as user-authored, no hidden prompt-only context. |

Forbidden shortcuts:

- User input must not directly patch `agent.status`, `locationId`, `currentPlanId`, `currentAction`, memories, or relationship scores.
- Direct messages must not become secret prompt-only context outside event/memory records.
- User-authored text must be marked `user`, not `generated` or `configured`.

## Operation and Failure Seeds

The seed should make failure paths visible from the beginning.

| Operation kind | Deterministic seed behavior | Failure event | Memory effect |
|---|---|---|---|
| `actionProposal` | Fake provider proposes a valid `move`, `startConversation`, `wait`, or `reflect` with existing IDs. | `agent.operationFailed` when shape is invalid or references unknown IDs. | No fake action memory. Optional diagnostic event only. |
| `conversationSummary` | Fake provider returns two participant-specific summaries after `conversation.ended`. | `agent.operationFailed` or conversation summary diagnostic failure. | Do not create conversation memories on invalid output. |
| `reflection` | Fake provider requires evidence memory IDs. | `agent.operationFailed` if evidence is empty or invalid. | Do not create reflection memory without evidence. |
| `embedding` | Fake embedding returns deterministic vector/cache refs if Slice 3 includes retrieval. | `agent.operationFailed` or memory diagnostic event. | Memory can exist without embedding only if retrieval handles missing `embeddingRef` visibly. |

Rules:

- Failed operation status must be visible in diagnostics and agent state if relevant.
- Failed operations do not create fake successful action, memory, relationship, or reflection events.
- One agent has at most one in-flight operation in the MVP.

## Event Kind Validator Backlog

Before frontend rendering or replay relies on these events, implement one shared validator/projection per event kind.

### Startup / engine events

- `world.created`
- `world.timeAdvanced`
- `agent.spawned`
- `agent.startedRoutine`
- `memory.seeded`

### Agent loop events

- `agent.perceivedEvent`
- `agent.updatedPlan`
- `agent.operationFailed`

### Conversation events

- `conversation.invited`
- `conversation.started`
- `conversation.ended`
- optional later: `conversation.messageRecorded` with message ID only

### Memory events

- `memory.created`
- `memory.reflectionCreated` if kept separate from `memory.created`
- optional later: `relationship.noteCreated`

### User / realm events

- `realm.interventionSubmitted`
- optional later: `realm.infrastructureEvent`

Validator requirements:

- Every event payload has a single decoder/validator in shared or backend boundary code.
- Frontend consumes typed projections, not raw payload casts.
- Unknown event kinds render as explicit unsupported/debug rows, not silently disappear.
- Event validation errors are visible in test output and diagnostics.

## Replay Expectations

A no-network smoke test should assert this shape:

1. Create the world seed with 3 agents and 6 locations.
2. Step from `06:00` to `06:05` with fixed seed/time.
3. Emit startup events in the documented order.
4. Create `memory.seeded` and the sparse memory records with source event IDs.
5. Let Elysia perceive Pardo's shop routine.
6. Create an `agent.updatedPlan` event for a low-pressure visit or wait decision.
7. If the deterministic branch starts a conversation, enforce lifecycle and pair cooldown.
8. End the conversation and create two perspective-specific summary memories.
9. Optionally request Hua reflection only when evidence memory IDs exist.
10. Replay event log and assert the same event kinds/order without live provider calls.

Minimum assertions:

- Event order is stable.
- Every memory has at least one `sourceEventId`.
- No memory is stored on persona fixtures.
- Every referenced agent/location/persona ID exists.
- No event payload contains copied official prose or transcript-like content.
- Replay does not call any live provider.

## Slice Mapping

| Future slice | Uses this draft for | Do not combine with |
|---|---|---|
| Slice 1: Domain contracts and persona schema | Relationship/routine/location alignment and fixture validation. | LLM, conversation lifecycle, retrieval. |
| Slice 2: Deterministic simulation engine | Startup event order, world seed, event log, replay smoke test. | Live model calls. |
| Slice 3: Memory store and retrieval | Sparse memory seed shape, `sourceEventIds`, metadata, retrieval diagnostics. | Persona fixture mutation. |
| Slice 4: Agent cognitive loop | First perception/plan/action proposal event shape and failure path. | Direct world mutation by LLM output. |
| Slice 5: Conversation lifecycle | Scenario A/B/C lifecycle and per-participant summary memories. | Transcript-as-memory or forced acceptance. |
| Slice 6: Observation-terminal frontend | Timeline projection, provenance badges, debug unsupported-event behavior. | Component-local event payload parsing. |

## Open Decisions Before Code Use

| Decision | Recommended default |
|---|---|
| Whether `memory.seeded` is a distinct event kind or represented as `memory.created` with `seedKind` metadata | Use `memory.seeded` for batch provenance plus `memory.created` for each actual memory if the implementation wants a fully event-sourced memory log; use only `memory.created` for the smallest first PR if event kinds must stay minimal. |
| Whether startup routine events immediately create plan/action memories | Create only one meaningful memory per agent at startup; avoid every-tick memory spam. |
| Whether Scenario A must always start a conversation in tests | Test both accepted and declined/deferred branches once lifecycle exists. For first smoke test, a deterministic accepted branch is acceptable if refusal is covered separately. |
| Whether source locators live in `MemoryRecord.metadata` or a separate source table | Use `metadata.sourceLocators` for MVP; migrate later only if UI/source filtering requires a normalized table. |
| Whether importance scale is `0..10` or `1..10` | Use `0..10` consistently unless implementation picks a different bounded scale and updates tests/spec. |

## Verification Checklist for Future PR

- Read this file, `mvp-world-seed-blueprint.md`, and `persona-spec-source-mapping.md` before writing fixtures.
- Keep source content as locators and project-authored summaries only.
- Add event validators before frontend projection code consumes these event kinds.
- Add tests for unknown relationship/location IDs.
- Add tests that generated/runtime fields remain rejected from persona fixtures.
- Add tests that seeded memories have `sourceEventIds`.
- Add tests that failed operations do not produce fake success events.
- Add replay test with fixed event order.

## Verification Log

- Consolidated event and memory seed details from `mvp-world-seed-blueprint.md`, `mvp-pilot-persona-seeds.md`, `story-event-taxonomy.md`, `persona-spec-source-mapping.md`, and `implementation-research-handoff.md`.
- Cross-checked current `SimulationEvent`, `MemoryRecord`, `ConversationRecord`, and `WorldSnapshot` contract fields.
- Cross-checked backend authority, persona/memory separation, and frontend projection rules in `.trellis/spec/`.
- Kept all seed summaries project-authored and omitted official dialogue, story text, transcripts, subtitles, lyrics, images, audio, animation frames, and extracted assets.
