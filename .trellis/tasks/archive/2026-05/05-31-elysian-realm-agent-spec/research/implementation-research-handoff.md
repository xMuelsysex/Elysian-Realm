# Implementation Research Handoff

## Purpose

Hand off the Elysian Realm / Thirteen Flame-Chasers research artifacts to future implementation slices without turning source research into ad-hoc prompt text or copied game content.

This document is planning-only. It does not authorize implementation work. Per the active task review gate, do not start application-code changes until the user explicitly approves implementation start.

## Non-Negotiable Boundaries

- Do not copy official dialogue, official story text, subtitles, transcripts, lyrics, images, audio, animation frames, guide images, or extracted game assets.
- Store source references as URLs, BV IDs, part numbers, page titles, and project-authored summaries only.
- Treat HoYoverse/miHoYo JS-rendered pages as `official-url` anchors unless manually verified.
- Treat Fandom/Moegirl as secondary summaries, Bilibili story videos as `fan-navigation`, and Bilibili analysis videos as `fan-analysis`.
- Generated runtime output must be stored as generated event/message/memory/reflection content, never as immutable persona fact.
- UI and LLM operations must not directly mutate authoritative world state; submit typed inputs to the simulation engine.

## Research Artifact Inventory

| Artifact | Status | Primary owner slice | Use |
|---|---|---|---|
| `honkai-elysian-realm-lore-sources.md` | Active index | All slices | Canon/source boundary, source lists, artifact index, verification log. |
| `thirteen-flame-chasers-character-matrix.md` | Complete baseline | Slice 1, Slice 7 | Full roster identity/signets/relationship hooks/persona constraints. |
| `mvp-pilot-persona-seeds.md` | Complete baseline | Slice 1 | Elysia/Pardofelis/Hua research seeds, routines, relationships, locations, event seeds. |
| `persona-spec-source-mapping.md` | Complete baseline | Slice 1 | Maps research seeds to current `PersonaSpec v1` fields and validation constraints. |
| `mvp-world-seed-blueprint.md` | Complete baseline | Slice 2, Slice 6 | World ID, locations, runtime state, event sequence, memory boundaries, UI projection, smoke test. |
| `story-event-taxonomy.md` | Complete baseline | Slice 2, Slice 3, Slice 4, Slice 6 | Provenance labels, lore categories, future event kinds, memory mappings, debug filters. |
| `bilibili-elysian-realm-story-index.md` | Complete baseline | Slice 1, Slice 3, Slice 7 | Story/navigation source overview and safe Bilibili usage. |
| `bilibili-part-event-catalog.md` | Complete baseline | Slice 1, Slice 3, Slice 4, Slice 7 | BV/part locators for recollections, character events, signets, objects, relationship map. |
| `official-version-chapter-timeline.md` | Complete baseline | Slice 1, Slice 2, Slice 6 | Release-order anchors, official URL vs secondary-readable reliability notes, safe event seeds. |
| `github-agent-simulation-specs.md` | Complete baseline | All backend slices | External architecture patterns: Generative Agents, AI Town, TinyTroupe, AgentSociety/CAMEL. |

## Slice 1 Handoff: Domain Contracts and Persona Schema

### Research inputs

- `persona-spec-source-mapping.md`
- `mvp-pilot-persona-seeds.md`
- `thirteen-flame-chasers-character-matrix.md`
- `bilibili-part-event-catalog.md`
- `official-version-chapter-timeline.md`

### Code areas likely touched

- `src/shared/contracts/persona.ts`
- `src/server/personas/validation.ts`
- `src/server/personas/fixtures/pilotPersonas.ts`
- `tests/personaValidation.test.ts`
- future world/location fixture files if introduced

### Implementation guidance

1. Decide whether the first executable roster becomes `elysia`, `pardofelis`, `hua` or whether the current placeholder `elysia`, `kevin`, `eden` roster coexists during transition.
2. Keep `authorship` valid for the implemented enum. Current research provenance labels are not valid `authorship` values.
3. Keep `sourceNotes` as a string unless a schema migration is explicitly included.
4. Use source locators and project-authored summaries only.
5. Align persona routine `locationId` values with the world seed location IDs.

### Validation gate

- `validatePersonaRoster` passes for the chosen pilot roster.
- Invalid fixtures with runtime/generated fields are rejected recursively.
- Unknown relationship targets are rejected.
- `sourceNotes` contains locators and provenance labels, not story text.
- Tests prove the relationship graph is directed.

### Do not

- Add `project-authored-summary` as an `authorship` enum without schema/test updates.
- Store source-note arrays unless the contract changes intentionally.
- Put memories, reflections, current plan, or generated content into persona fixtures.

## Slice 2 Handoff: Deterministic Simulation Engine

### Research inputs

- `mvp-world-seed-blueprint.md`
- `story-event-taxonomy.md`
- `official-version-chapter-timeline.md`
- `github-agent-simulation-specs.md`

### Code areas likely touched

- future `src/server/simulation/**`
- `src/shared/contracts/simulation.ts`
- future event/input validators
- future deterministic world seed fixtures
- tests for replay and engine steps

### Implementation guidance

1. Implement one authoritative world-state owner.
2. Use `world_elysian_observation_mvp` or an equivalent stable seed ID for deterministic tests.
3. Seed six shared locations from `mvp-world-seed-blueprint.md`.
4. Create startup events explicitly: `world.created`, `agent.spawned`, `agent.startedRoutine`.
5. If seeded memories are needed, create `memory.seeded` or equivalent events first so every memory has a source event.
6. Keep raw high-volume conversation messages outside active world state.

### Validation gate

- Fixed seed produces stable event log order.
- Replay reconstructs the same timeline without LLM calls.
- Inputs are applied only during engine steps.
- UI-facing projections come from typed events/snapshots, not direct object patching.

### Do not

- Let prompt builders, UI handlers, memory code, or conversation storage directly change `WorldSnapshot`.
- Create hidden fallback actions when an operation fails.
- Infer event meaning from untyped strings in multiple consumers.

## Slice 3 Handoff: Memory Store and Retrieval

### Research inputs

- `story-event-taxonomy.md`
- `bilibili-part-event-catalog.md`
- `persona-spec-source-mapping.md`
- `.trellis/spec/backend/persona-memory.md`

### Code areas likely touched

- future `src/server/memory/**`
- `src/shared/contracts/simulation.ts` memory contracts
- fake embedding provider tests
- retrieval diagnostics storage/logging

### Implementation guidance

1. Keep source-derived recollections as short project-authored summaries with source locators.
2. Create memory records outside persona specs.
3. Use `sourceEventIds` for all memories.
4. Keep conversation messages separate from summarized `conversation` memories.
5. Implement deterministic fake embedding/relevance for tests before live providers.

### Validation gate

- Retrieval ranking covers recency, importance, relevance, and optional context boosts.
- `lastAccessedAt` updates only for selected memories and can be throttled.
- Reflection memory references evidence memory IDs.
- Fake provider tests run offline.

### Do not

- Treat Bilibili/Fandom/Moegirl text as memory content to paste into fixtures.
- Use one shared conversation summary for every participant.
- Run reflection on every memory write.

## Slice 4 Handoff: Agent Cognitive Loop

### Research inputs

- `mvp-world-seed-blueprint.md`
- `story-event-taxonomy.md`
- `mvp-pilot-persona-seeds.md`
- `.trellis/spec/backend/llm-orchestration.md`

### Code areas likely touched

- future `src/server/agents/**`
- future `src/server/llm/**`
- operation validators and prompt builders
- fake provider fixtures

### Implementation guidance

1. Preserve loop order: perceive -> retrieve -> plan/act -> remember/reflect.
2. Elysia can initiate social scenes but must not become omniscient.
3. Pardofelis's luck/discoveries must become typed events, not direct state changes.
4. Hua's memory uncertainty should remain visible and evidence-linked.
5. Use FakeProvider deterministic action proposals for core tests.

### Validation gate

- One in-flight operation per agent is enforced.
- Invalid structured output creates a failed operation with raw diagnostics.
- Failed operation does not produce a fake successful action.
- Agent decisions submit typed inputs back to the simulation engine.

### Do not

- Let LLM output patch locations, statuses, conversations, plans, or memories directly.
- Let persona powers bypass engine authority.
- Hide parser/provider failures as normal agent behavior.

## Slice 5 Handoff: Conversation Lifecycle

### Research inputs

- `mvp-world-seed-blueprint.md`
- `mvp-pilot-persona-seeds.md`
- `story-event-taxonomy.md`

### Code areas likely touched

- future `src/server/conversations/**`
- conversation message storage
- conversation summary operation schemas
- memory write integration

### Implementation guidance

First scenarios:

1. Elysia checks on Pardo at `pardo_shop`.
2. Hua gives Pardo practical guidance.
3. Elysia visits Hua after training, with refusal/defer as valid outcomes.

Conversation lifecycle must remain explicit:

```text
invited -> walkingOver? -> participating -> ending -> ended
```

### Validation gate

- An agent cannot be in two active conversations.
- Ended conversations are archived and still inspectable.
- Conversation cooldown prevents immediate re-chat loops.
- Per-participant summaries differ by perspective and source event IDs.

### Do not

- Store full transcript text as memory.
- Put high-volume messages in active world snapshot.
- Force every invitation to be accepted.

## Slice 6 Handoff: Observation-Terminal Frontend

### Research inputs

- `mvp-world-seed-blueprint.md`
- `story-event-taxonomy.md`
- `.trellis/spec/frontend/realm-interface.md`
- `persona-spec-source-mapping.md`

### Code areas likely touched

- future `src/app/**` or `src/client/**`
- shared projection contracts
- command form validators
- frontend tests

### Implementation guidance

Minimum UI:

- world header with time/status/time scale/step ID;
- location board with agents and active conversation markers;
- agent cards with status/current action/operation;
- typed timeline with source badges;
- profile panel separating configured facts from generated memories/reflections;
- conversation panel;
- debug panel for retrieval/operation/source locators;
- intervention panel for observer commands, realm events, and optional direct private message.

### Validation gate

- Empty/loading/error states render.
- UI imports shared projections/validators.
- User interventions submit typed commands and appear as `source: user` events.
- Generated content is visibly separate from configured facts.
- Replay/debug does not call live LLM providers.

### Do not

- Parse raw `event.payload` independently in each component.
- Treat generated memories as canon facts.
- Let UI own simulation rules or directly mutate world state.

## Slice 7 Handoff: Expansion to 13 Agents and Event Packs

### Research inputs

- `thirteen-flame-chasers-character-matrix.md`
- `bilibili-part-event-catalog.md`
- `official-version-chapter-timeline.md`
- `story-event-taxonomy.md`

### Implementation guidance

1. Add the remaining 10 Flame-Chasers only after the 3-agent loop, memory, conversation, replay, and UI provenance are stable.
2. Keep expansion as source-labeled project-authored summaries.
3. Add event packs incrementally: meals, training, archives, shop errands, music salon, garden gathering, private reflection, infrastructure/anomaly.
4. Add persona adherence checks before enabling more complex characters like Vill-V, Mobius, Aponia, Griseo/Kosma.

### Validation gate

- 13-agent simulation runs an accelerated day within cost/budget limits.
- Event variety tests prevent identical routines.
- Relationship graph remains directed and evidence-linked.
- Persona adherence checks flag source-boundary violations.

## Cross-Slice Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Source text copied into fixtures | Legal/content boundary violation | Store only URLs, BV IDs, part labels, and project-authored summaries; add fixture lint/review checklist. |
| Two authoritative state sources | Replay and UI drift | Simulation engine owns world state; UI/LLM/memory submit typed inputs only. |
| `sourceNotes` grows unstructured and unreadable | Hard to audit provenance | Keep short for MVP; plan structured source-note migration once fixtures grow. |
| Location ID mismatch | Plans/routines point to unknown locations | Introduce shared world seed validation before or with fixture changes. |
| Elysia drives every event | Simulation feels scripted and unbalanced | Add cooldowns, refusal paths, Pardo/Hua-initiated events, and deterministic variety tests. |
| LLM failures hidden | Debugging impossible, fake behavior | Operation failure must be visible and must not create fake success events. |
| Conversation loops repeat | Timeline spam | Conversation pair cooldowns and participation buffers. |
| Memory/reflection spam | Cost blowups and noisy UI | Importance thresholds, scheduled reflection, fake provider in tests. |
| Persona powers bypass rules | Security/state integrity issue | Powers become constraints and typed events, never direct mutations. |

## Recommended First Implementation Task

If the user approves implementation start, the first code task should stay narrow:

> Update the MVP persona/world seed fixtures and validation tests for `elysia`, `pardofelis`, and `hua` using current `PersonaSpec v1`, with no LLM calls and no simulation engine changes beyond fixture validation.

Suggested acceptance criteria:

- Persona fixtures validate as a roster.
- Relationship seeds match `mvp-pilot-persona-seeds.md`.
- Fixture `sourceNotes` cite `persona-spec-source-mapping.md` locators and contain no story text.
- World location seed IDs match persona routine IDs if world fixtures are included.
- Tests reject generated/runtime fields and unknown relationship targets.

Do not combine this first task with LLM providers, memory retrieval, or frontend UI.

## Verification Checklist Before Leaving Planning

- Research artifacts are linked from the main source index.
- Implementation plan references the handoff artifacts.
- No research artifact stores transcripts, dialogue, official story text, or assets.
- Open decisions before code are recorded: roster transition, `sourceNotes` shape, location vocabulary, initial memory seeding strategy.
- User explicitly approves implementation before `task.py start` or equivalent.

## Verification Log

- Read `implement.md` delivery slices and mapped each research artifact to future implementation scope.
- Cross-checked current source files for `PersonaSpec` and simulation contracts where relevant.
- Preserved the planning-only status and review gate.
- Kept all content as source indexes, summaries, and engineering guidance.
