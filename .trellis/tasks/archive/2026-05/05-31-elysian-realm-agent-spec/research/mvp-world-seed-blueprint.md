# MVP World Seed Blueprint: Observation-Terminal Elysian Realm

## Purpose

Define a safe, implementation-ready planning blueprint for the first observation-terminal MVP world seed. This document connects the research artifacts for `elysia`, `pardofelis`, and `hua` to the current shared contracts for `WorldSnapshot`, agents, locations, events, memories, conversations, interventions, and UI projections.

This is not application code and does not implement fixtures. It is a seed blueprint for a future implementation slice. It must not copy official story text, official dialogue, subtitles, lyrics, images, audio, animation frames, or extracted game assets.

## Inputs

| Source | Role |
|---|---|
| `mvp-pilot-persona-seeds.md` | MVP trio profile, routines, relationship seeds, location preferences, event seeds. |
| `persona-spec-source-mapping.md` | Mapping from research notes to implemented `PersonaSpec v1` fields and validation constraints. |
| `bilibili-part-event-catalog.md` | Safe BV/part locators for character events, recollections, object memories, and relationship-map references. |
| `story-event-taxonomy.md` | Lore categories, future event kinds, memory mappings, provenance labels. |
| `mvp-event-memory-seed-draft.md` | Follow-up implementation draft for startup event order, sparse memory records, first perception/plan events, conversation scenarios, interventions, operation failures, validators, and replay assertions. |
| `official-version-chapter-timeline.md` | Release-order anchors and ER/Elysium Everlasting feature context. |
| `src/shared/contracts/simulation.ts` | Current shared TypeScript shape for world, agents, events, memories, conversations, inputs, and operations. |
| `.trellis/spec/backend/agent-simulation.md` | Backend authority, tick loop, event log, concurrency, replay rules. |
| `.trellis/spec/frontend/realm-interface.md` | Observation-terminal UI responsibilities, provenance labels, replay/debug requirements. |

## MVP World Identity

Recommended seed:

| Field | Value | Notes |
|---|---|---|
| `worldId` | `world_elysian_observation_mvp` | Stable test fixture ID. |
| Display name | `Observation Realm MVP` | UI label only; not official product copy. |
| Initial status | `paused` for tests, `running` for manual demo | Tests should start paused and step deterministically. |
| Initial time | `2026-05-31T06:00:00.000Z` | Dawn start supports routines. |
| Time scale | `60` | One real second equals one simulated minute for manual demo; tests can step fixed deltas. |
| Seed | `mvp-elysia-pardo-hua-v1` | If randomness is introduced, use a fixed seed. |
| Roster | `elysia`, `pardofelis`, `hua` | Observation-first trio. |

## Location Seed

Use one shared location vocabulary for persona routines, world state, and UI filters.

| `LocationRef.id` | Display name | Description | Primary agents | Initial UI use |
|---|---|---|---|---|
| `central_hall` | Central Hall | Shared crossing space where residents pass through and visible timeline events happen. | Elysia, Pardo, Hua | Main dashboard location column. |
| `garden_courtyard` | Garden Courtyard | Quiet social space for gentle invitations, gathering seeds, and evening scenes. | Elysia | Timeline filter and gathering view. |
| `pardo_shop` | Pardo's Shop | Small market corner for trade, gossip, safe errands, and object-memory discoveries. | Pardofelis | Agent card focus and event source for shop routines. |
| `training_court` | Training Court | Practical space for Hua's morning forms, training observations, and low-pressure guidance. | Hua | Agent status and routine timeline. |
| `archive_room` | Archive Room | Memory/recollection/source-index space for relationship-map, object-memory, and replay hooks. | Hua, Elysia, Pardo | Debug/source panel and memory event links. |
| `quiet_room` | Quiet Room | Low-interruption reflection space for nighttime synthesis and decompression. | Hua | Reflection/replay debug filter. |

Implementation caution:

- Current placeholder fixtures use location IDs such as `atrium`, `garden`, `lounge`, `archives`, `training-hall`, `overlook`, and `quarters`.
- Future fixture PR should migrate persona routines and world seed together, or provide aliases intentionally.
- Add validation later so `PersonaRoutineActivity.locationId` must reference a known `LocationRef.id`.

## Initial Agent Runtime State

Current contract: `AgentRuntimeState` contains `id`, `personaId`, `displayName`, `status`, `locationId`, optional plan/action/operation fields, cooldowns, and relationshipRefs.

| `AgentRuntimeState.id` | `personaId` | Display | Initial status | Initial location | Relationship refs | Notes |
|---|---|---|---|---|---|---|
| `agent_elysia` | `elysia` | Elysia | `idle` | `garden_courtyard` | `pardofelis`, `hua` | Starts near social/warm location but should not immediately force conversation. |
| `agent_pardofelis` | `pardofelis` | Pardofelis | `idle` | `pardo_shop` | `elysia`, `hua` | Starts with shop-opening routine. |
| `agent_hua` | `hua` | Hua | `idle` | `training_court` | `elysia`, `pardofelis` | Starts with morning training routine. |

Initial cooldown recommendations:

| Agent | Cooldown key | Initial value | Reason |
|---|---|---|---|
| all | `conversation:any` | unset | Allow first organic conversation. |
| all | `reflection:scheduled` | next simulated night | Prevent reflection spam at startup. |
| `agent_elysia` | `conversation:initiate` | unset | Elysia can initiate first social scene after a perception step. |
| `agent_pardofelis` | `shop:discovery` | after first shop event | Prevent repeated object-memory finds. |
| `agent_hua` | `training:interruptible` | after first training action | Avoid immediate interruption every tick. |

## Initial Plan Seeds

Do not store plans inside `PersonaSpec`; use future `PlanRecord` or deterministic fixture generation.

| Agent | First plan item kind | Location | Intent | Expected event |
|---|---|---|---|---|
| `agent_elysia` | `performActivity` | `garden_courtyard` | Notice who is awake and choose a gentle social route. | `agent.startedRoutine` |
| `agent_pardofelis` | `performActivity` | `pardo_shop` | Open the shop, arrange goods, and check safe routes. | `agent.startedRoutine` |
| `agent_hua` | `performActivity` | `training_court` | Practice morning forms and record physical/memory steadiness. | `agent.startedRoutine` |

Suggested follow-up plan options:

| Agent | Option | Trigger | Rule |
|---|---|---|---|
| `agent_elysia` | visit Pardo's shop | Pardo completes shop-opening event | Submit typed `agentProposedAction`, then engine moves or starts conversation. |
| `agent_pardofelis` | find harmless archive object | Shop event plus low discovery cooldown | Create `realm.infrastructureEvent` or `agent.perceivedLoreFragment`; no direct memory write without event. |
| `agent_hua` | visit archive room | Training action completes or user asks for reflection | Move through typed action; reflection requires evidence memories. |

## Initial Event Log Shape

Current `SimulationEvent.kind` is a string. Future implementation should centralize validators for each kind rather than parsing raw payloads in components.

Recommended startup event sequence for deterministic tests:

| Order | Event kind | Source | Actor | Targets | Payload keys | UI summary |
|---:|---|---|---|---|---|---|
| 1 | `world.created` | `system` | none | world | `seedId`, `personaIds`, `locationIds` | Realm seed created. |
| 2 | `world.timeAdvanced` | `system` | none | world | `from`, `to`, `timeScale`, `stepId` | Dawn tick begins. |
| 3 | `agent.spawned` | `system` | each agent | location | `personaId`, `locationId`, `status` | Agent appears in initial location. |
| 4 | `agent.startedRoutine` | `agent` or `system` | each agent | location | `routineId`, `locationId`, `intent`, `provenance` | First visible routine events. |
| 5 | `agent.perceivedEvent` | `agent` | eligible agent | source event IDs | `observedEventIds`, `perceptionSummary`, `diagnosticsRef` | Perception diagnostics; not a memory by itself unless stored. |
| 6 | `agent.updatedPlan` | `agent` or `llm` via typed input | agent | optional target | `planId`, `actionKind`, `reason`, `sourceMemoryIds` | Plan card update. |
| 7 | `conversation.invited` | `agent` | initiating agent | invited agent | `conversationId`, `locationId`, `topicSeed`, `cooldownKey` | Timeline invitation. |
| 8 | `conversation.started` | `system` | none | participants | `conversationId`, `locationId`, `participantIds` | Active conversation row. |
| 9 | `conversation.ended` | `system` | none | participants | `conversationId`, `messageCount`, `summaryOperationIds` | Conversation archived. |
| 10 | `memory.created` | `system` or `llm` result via typed input | agent | source events | `memoryId`, `type`, `importance`, `visibility`, `sourceEventIds` | Profile memory badge. |

Do not include raw conversation messages in active world state events. Message bodies belong in separate conversation-message storage, while the event log references message IDs or counts.

## Memory Seed Boundaries

Initial memory records should be sparse and evidence-linked. They must not be embedded in `PersonaSpec`. The more detailed implementation draft for exact seed IDs, source events, metadata keys, and replay assertions lives in `mvp-event-memory-seed-draft.md`.

| Seed ID | Agent | Type | Visibility | Importance | Source event / locator | Content rule |
|---|---|---|---|---:|---|---|
| `mem_elysia_source_relationship_map` | `agent_elysia` | `observation` | `private` | 5 | `BV1vg411Y7si` P73 + official relationship-map URL | Project-authored note that relationship clues exist; no graph art/text copied. |
| `mem_pardo_shop_role` | `agent_pardofelis` | `plan` | `private` | 4 | `mvp-pilot-persona-seeds.md` | Original plan seed for opening shop and checking safe routes. |
| `mem_hua_memory_uncertainty` | `agent_hua` | `reflection` or `observation` | `private` | 6 | `BV1vg411Y7si` P7/P52 locators + wiki-summary | Project-authored note about handling incomplete memory carefully. |
| `mem_shared_archive_context` | all agents separately | `observation` | `shared` or `private` per agent | 3 | `official-version-chapter-timeline.md` ER archive feature anchor | Each agent receives its own perspective, not one shared sentence copied across all. |

Rules:

- Every memory must have at least one `sourceEventId` once the simulation engine exists.
- If a memory is seeded from research rather than in-run events, create a deterministic `memory.seeded` event first and point the memory to that event.
- Reflection memories must reference evidence memory IDs in `relatedMemoryIds`.
- Conversation summaries must be per participant and perspective-specific.

## User Intervention Seeds

MVP should remain observation-first. Direct private messages are allowed but not the dominant path.

| Intervention kind | Example command intent | Engine result | UI provenance |
|---|---|---|---|
| `observerCommand` | pause, resume, step, change speed, request debug trace | `SimulationInput` -> engine tick -> `realm.interventionSubmitted` or control event | `user` |
| `realmEvent` | schedule a quiet gathering at `garden_courtyard`; place a harmless archive prompt in `archive_room` | Engine validates target IDs and emits a realm event | `user` |
| `directPrivateMessage` | send a private message to one agent | User-sourced event/memory; agent may perceive/retrieve/respond through normal loop | `user` |

Forbidden shortcuts:

- UI must not directly change `agent.status`, `locationId`, `currentPlanId`, or memory records.
- User messages must not be injected as hidden prompt-only context; they enter through typed inputs/events.
- LLM output must not patch world state directly.

## Conversation MVP Scenarios

| Scenario | Participants | Trigger | Location | Lifecycle expectation | Memory expectation |
|---|---|---|---|---|---|
| Elysia checks on Pardo | `agent_elysia`, `agent_pardofelis` | Elysia observes Pardo shop-opening event | `pardo_shop` | `invited -> walkingOver? -> participating -> ending -> ended` | Two conversation memories: Elysia notes Pardo's evasive warmth; Pardo notes kindness plus mild danger-of-attention tension. |
| Hua offers practical guidance | `agent_hua`, `agent_pardofelis` | Pardo avoids training court or carries an archive object | `central_hall` or `pardo_shop` | Same lifecycle, with cooldown after end | Hua records practical concern; Pardo records useful advice without calling it emotional support. |
| Elysia visits Hua after training | `agent_elysia`, `agent_hua` | Hua completes training routine and is interruptible | `training_court` | Hua may accept, defer, or decline; refusal is valid event | Elysia records respect for restraint; Hua records trust plus discomfort with direct warmth. |

Cooldowns:

- Same pair should not start a new conversation immediately after `conversation.ended`.
- Elysia should not initiate all conversations; deterministic tests should prove Pardo/Hua can also generate events or decline.

## LLM / Fake Provider Expectations

The world seed should be runnable without live network calls.

| Operation kind | MVP need | Test provider behavior |
|---|---|---|
| `dailyPlan` | Optional after deterministic routines exist | Fake provider returns stable 2-3 plan items per agent. |
| `actionProposal` | Needed once agent loop is implemented | Fake provider returns `continue`, `move`, `startConversation`, `wait`, or `reflect` with valid IDs only. |
| `conversationTurn` | Needed for generated dialogue | Fake provider returns deterministic original text and `continue/end` flag; never official dialogue. |
| `conversationSummary` | Required after conversation lifecycle | Fake provider returns participant-specific summaries and importance. |
| `reflection` | Needed for Hua/night reflection tests | Fake provider returns insights with evidence memory IDs. |
| `importanceScore` | Optional; deterministic rubric acceptable first | Fake provider/rubric returns bounded number. |
| `embedding` | Optional for Slice 3 | Fake embedding provider returns deterministic vectors/cache keys. |

Failure expectations:

- Invalid structured output creates a failed operation and visible `agent.operationFailed`/diagnostic event.
- Timeout or provider failure does not create a fake successful action.
- Each agent has at most one in-flight operation.

## Observation-Terminal Projection

Minimum UI projection for the first manual demo:

| UI area | Data source | Required content |
|---|---|---|
| World header | `WorldSnapshot` | current time, status, time scale, last step ID. |
| Location board | `WorldSnapshot.locations` + agents | locations with current agents and active conversation markers. |
| Agent cards | `AgentRuntimeState` + persona projection | display name, status, location, current action intent, active operation status. |
| Timeline | typed `SimulationEvent` projections | time-grouped events with `source` badge: `system`, `user`, `agent`, `llm`, `test`. |
| Conversation panel | `ConversationRecord` + messages query | participants, state, location, message count, per-participant summaries after end. |
| Profile panel | persona + memories + relationships | configured facts separated from generated memories/reflections and user interventions. |
| Debug panel | diagnostics | retrieval scores, operation IDs/status/errors, source locators, replay step IDs. |
| Intervention panel | shared command schema | observer commands, realm event form, optional private message. |

Provenance badges:

- `configured`: persona facts, location config, relationship seeds.
- `generated`: LLM-created dialogue, plan, memory, reflection.
- `user`: user-authored interventions and direct messages.
- `system`: deterministic engine events, diagnostics, seeded events.

## Deterministic Smoke Test Storyboard

A future no-network smoke test can assert this sequence. Use `mvp-event-memory-seed-draft.md` for the exact event IDs, memory IDs, conversation branches, operation failure expectations, and validator backlog:

1. Create world seed with 3 agents and 6 locations.
2. Step from 06:00 to 06:05.
3. Emit startup and routine events for Elysia, Pardo, and Hua.
4. Store action memories with source event IDs.
5. Let Elysia perceive Pardo's shop routine and propose a low-pressure visit.
6. Move Elysia to `pardo_shop` through typed action input.
7. Start a two-agent conversation if Pardo accepts.
8. End conversation after deterministic fake-provider turns.
9. Create two perspective-specific conversation memories.
10. Advance to evening or explicitly request Hua reflection via typed observer command.
11. Create reflection only if evidence memory IDs exist.
12. Replay event log and assert same event kinds/order with fixed seed.

## Validation Checklist for Future Implementation

- World seed has exactly 3 active agents and 6 named locations.
- All persona relationship targets exist in the roster.
- All agent `locationId` and routine `locationId` values reference seeded locations.
- No generated memories or reflections are stored in persona fixtures.
- All state changes happen through `SimulationInput` and engine steps.
- Event payloads have shared validators/projections before frontend rendering.
- Conversation membership rule prevents one agent from joining two active conversations.
- Conversation summaries are per participant and have source event IDs.
- Reflection requires evidence memory IDs and is throttled.
- Fake provider runs all core tests without network access.
- UI displays configured/generated/user/system provenance separately.
- Replay does not call the LLM provider.

## Open Questions Before Code Fixture Work

1. Should the first executable fixture migrate from current `elysia`/`kevin`/`eden` placeholders to `elysia`/`pardofelis`/`hua`, or should both rosters coexist during transition?
2. Should `sourceNotes` stay as a string for the first implementation slice, or should structured source notes be added before persona content grows?
3. Should initial world status default to `paused` for manual user control or `running` for the live-demo feeling?
4. Should seeded memories exist at world creation, or should the first tick create them from explicit `memory.seeded` events for cleaner replay?

Recommended defaults:

- Use `paused` for deterministic tests and `running` for demo startup.
- Use the research location IDs listed here.
- Create any initial memories through explicit seeded events so replay has a source for every memory.
- Keep `sourceNotes` as a string until a dedicated schema migration is approved.

## Verification Log

- Read current shared simulation contracts and domain enums.
- Cross-checked backend simulation authority/replay rules and frontend observation-terminal requirements.
- Linked follow-up event/memory implementation detail to `mvp-event-memory-seed-draft.md` so this blueprint remains high-level while future code work has exact seed matrices.
- Aligned location, agent, plan, event, memory, conversation, intervention, and UI projection seeds with current contracts.
- Kept all content as project-authored summaries and implementation guidance; no official story text, dialogue, subtitles, images, audio, or extracted assets were stored.
