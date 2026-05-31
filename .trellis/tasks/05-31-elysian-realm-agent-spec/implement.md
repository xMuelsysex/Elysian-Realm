# Implementation Plan: Elysian Realm Multi-Agent Project

## Status

Planning only. Do not start implementation until the user reviews the PRD/design and answers the review-gate questions.

## Recommended Delivery Slices

### Slice 0. Project Stack Decision

Goal: choose the implementation stack and first presentation mode.

Decisions required:

- No blocking product decisions remain for this planning baseline.
- Implementation must not start until the user reviews these artifacts and explicitly approves `task.py start`.

Resolved decisions:

- First MVP presentation mode is observation-terminal / text-timeline first, with lightweight locations, agent statuses, conversations, replay, and interventions.
- Primary stack is TypeScript full-stack, with one backend simulation authority, shared frontend/backend contracts, and Web observation terminal first.
- Python is deferred to optional offline experiments for prompt/persona evaluation or retrieval tuning; it must not mutate authoritative world state.
- Initial MVP roster is 3 pilot agents first, with schemas and contracts designed to scale to all 13.
- Persona fidelity is strictly canon-aligned for behavior constraints, while repository content remains user-authored summaries/placeholders and original generated daily-life output only.
- Model strategy is provider-agnostic OpenAI-compatible configuration, deterministic FakeProvider for tests, configurable low-cost cloud/local development models, token/cost counters, budget limits, embedding cache, and throttled reflection/conversation operations.
- User intervention model is mixed: observer commands and realm events are primary, while direct private messages exist as typed commands.

Exit criteria:

- The first MVP scope is narrowed to one independently testable vertical slice.

### Slice 1. Domain Contracts and Persona Schema

Goal: define the shared domain model before any UI or LLM prompt code.

Work:

- Add shared contracts for world, agent, persona, event, memory, conversation, plan, and intervention.
- Add persona schema validator.
- Add sample specs for 3 pilot agents using user-authored placeholder summaries.
- Add seed relationship graph and location preferences.

Validation:

- Schema validation accepts valid persona fixtures.
- Schema validation rejects missing required identity/style/routine/relationship fields.
- Generated/runtime memory fields cannot be placed inside immutable persona fixtures.

### Slice 2. Deterministic Simulation Engine

Goal: run a realm clock and event loop without LLM dependencies.

Work:

- Implement world creation, pause/resume/archive, and time advancement.
- Implement typed input queue and event log.
- Implement deterministic agent statuses, schedules, cooldowns, and simple rule-based next actions.
- Implement replay from event log or step snapshots.

Validation:

- Fixed seed simulation produces stable event logs.
- UI/client cannot mutate world state except through typed inputs.
- Replay reconstructs the same timeline from persisted events.

### Slice 3. Memory Store and Retrieval

Goal: persist typed memories and retrieve relevant context for decisions.

Work:

- Implement memory schema and repository.
- Implement embedding provider interface with fake provider for tests.
- Implement recency + importance + relevance ranking.
- Implement access throttling and retrieval diagnostics.

Validation:

- Retrieval ranking tests cover recency-dominant, importance-dominant, and relevance-dominant cases.
- Memory writes include source event IDs.
- Fake provider tests require no network access.

### Slice 4. Agent Cognitive Loop

Goal: connect perception, retrieval, planning, action, and reflection.

Work:

- Implement perception from world events and nearby/conversation context.
- Implement daily plan generation interface and deterministic fallback fixtures for tests.
- Implement short-horizon action proposal.
- Implement reflection trigger by accumulated importance or scheduled interval.
- Persist decision diagnostics.

Validation:

- Agent loop order is tested: perceive -> retrieve -> plan/act -> memory/reflection.
- Invalid LLM structured output is surfaced as an error operation, not silent success.
- One in-flight operation per agent is enforced.

### Slice 5. Conversation Lifecycle

Goal: support believable two-agent conversations.

Work:

- Implement invite/accept/participating/ended lifecycle.
- Implement message persistence separate from active world state.
- Implement per-participant conversation summary memories.
- Add cooldowns to prevent repeated immediate conversations.

Validation:

- Agent cannot participate in two active conversations in the MVP.
- Conversation summaries differ by participant perspective.
- Ended conversations are archived and still available for memories/profile UI.

### Slice 6. Observation-Terminal Frontend

Goal: expose a usable text-first living realm that feels like observing an active world.

Work:

- Render world clock, playback controls, event timeline, named locations, agent cards/statuses, active conversations, and profile panels.
- Show configured persona facts separately from generated memories/reflections.
- Add user intervention form that submits typed commands or realm events.
- Add debug views for retrieval scores and decision traces.

Validation:

- Components render empty/loading/error states.
- UI imports shared contracts/projections rather than parsing raw event payloads inline.
- User interventions appear in event log and replay.

### Slice 7. Expansion to 13 Agents and Event Packs

Goal: scale content after core contracts are stable.

Work:

- Add remaining character specs.
- Add daily-life event pack system: meals, training, archives, music, garden, private reflection, group gathering.
- Tune relationship weights and routine variety.
- Add cost and token dashboards.

Validation:

- 13-agent simulation runs for an accelerated day within budget.
- Event variety tests prevent all agents from entering identical routines.
- Persona adherence checks flag out-of-character generated outputs.

## Risky Files / Rollback Points

No source files exist yet. Future implementation should treat these as risky areas:

- Shared event and memory contracts: changing them affects backend, frontend, replay, and tests.
- Persona schema: changes require fixture migration.
- LLM structured output schemas: changes require prompt and parser updates.
- Simulation engine step logic: changes can break replay determinism.

Rollback strategy:

- Keep each slice independently testable.
- Persist schema versions for persona specs, prompt outputs, memory records, and events.
- Add migrations only after fixtures prove the new shape.

## Validation Commands To Define Later

The chosen stack is TypeScript full-stack. Future implementation should define commands for:

- TypeScript type checks
- schema/contract validation
- unit tests
- deterministic simulation/replay smoke test
- frontend render tests
- lint/format checks
- fake-provider no-network test suite

## Current Planning Artifacts

- `prd.md`: requirements, scope, acceptance criteria, open questions.
- `design.md`: architecture, data contracts, trade-offs.
- `research/github-agent-simulation-specs.md`: source-backed GitHub spec extraction.
- `.trellis/spec/backend/agent-simulation.md`: backend simulation rules.
- `.trellis/spec/backend/persona-memory.md`: persona/memory rules.
- `.trellis/spec/backend/llm-orchestration.md`: LLM/provider rules.
- `.trellis/spec/frontend/realm-interface.md`: frontend realm UI rules.

## Review Gate

Ask the user one question at a time.

Resolved:

- MVP presentation mode: observation-terminal / text-timeline first, because the user wants to observe a real running realm rather than build a pure chatroom.
- Primary stack: TypeScript full-stack for a web-first observation terminal with shared contracts and one backend simulation authority.
- Python may be added later only as an offline experiment harness, not as a second world-state authority.
- Initial MVP roster: 3 pilot agents first, with schemas and data contracts designed to scale to all 13 after the simulation loop, memory, conversation, and replay tests are stable.
- Persona fidelity: strictly canon-aligned behavior and relationship constraints, implemented through user-authored summaries/placeholders and original generated content; no copied official dialogue/assets.
- Model strategy: provider-agnostic OpenAI-compatible interface, deterministic FakeProvider required for tests, configurable low-cost cloud/local development models, token/cost counters, budget limits, embedding cache, and throttled reflection/conversation operations.
- User intervention model: mixed, with observer commands and realm events as the primary intervention model, plus optional direct private messages as typed commands.

No blocking product questions remain for this planning baseline. Next step is user review and explicit approval before `task.py start`.
