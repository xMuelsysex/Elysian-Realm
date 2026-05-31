# Plan Elysian Realm Multi-Agent Project

## Goal

Plan a fan-oriented, multi-agent daily-life simulation inspired by Honkai Impact 3rd's Elysian Realm and the Thirteen Flame-Chasers. The product should let the user observe and interact with a living realm where character agents maintain personas, memories, routines, relationships, conversations, and emergent slice-of-life events.

This task is planning and specification only. It does not implement application code.

## User Value

- Give the user a persistent "living archive" for the Thirteen Flame-Chasers rather than a one-shot chatbot.
- Support believable day-to-day behavior: waking routines, work/rest cycles, chance encounters, meals, private reflections, group conversations, and user interventions.
- Keep agent behavior inspectable and replayable so generated stories can be debugged, refined, and curated.
- Establish engineering specs before implementation so future code does not grow into ad-hoc prompt scripts.

## Confirmed Facts

- The repository currently contains Trellis scaffolding and spec templates, but no application source code.
- The available project spec layers are `backend` and `frontend`.
- The task is complex and should remain in Trellis planning until requirements and implementation slices are reviewed.
- The user chose the first playable MVP experience: it should feel like observing a real running Elysian Realm world, not primarily like direct chat companionship.
- The initial presentation mode is therefore a text/timeline observation terminal with lightweight location/status state, agent profiles, conversations, replay, and interventions.
- External reference projects with relevant architecture patterns include:
  - `joonspk-research/generative_agents`: memory stream, perceive/retrieve/plan/reflect loop, saved/replayed simulations.
  - `a16z-infra/ai-town`: TypeScript virtual town, game engine, input-based state changes, agent async operations, vector memories.
  - `microsoft/TinyTroupe`: detailed persona JSON, `TinyPerson`/`TinyWorld`, experiment and validation mindset.
  - `tsinghua-fib-lab/AgentSociety` and `camel-ai/camel`: large-scale agent society patterns, stateful memory, environment/tool modularity.

## Requirements

### R1. Agent Roster and Persona Specs

- The first full product target is a roster of thirteen named character agents.
- Each agent must be configured from structured data, not hard-coded prompts.
- Persona specs must include identity, speech style, personality, long-term goals, relationships, routines, likes/dislikes, constraints, and content boundaries.
- Persona specs must distinguish canonical/user-authored facts from generated memories and reflections.

### R2. Multi-Agent Cognitive Loop

- Each active agent should follow a loop equivalent to: perceive environment/events -> retrieve relevant memories -> plan -> act/converse -> store observations -> reflect periodically.
- Plans must include both daily plans and short-horizon next actions.
- Agents must be able to notice other agents, invite or join conversations, decline interactions, wait, and resume prior plans.

### R3. World and Daily-Life Simulation

- The realm must model time, locations, agents, conversations, scheduled routines, random events, and user interventions.
- World state mutations should be processed through explicit inputs/commands/events instead of arbitrary writes from UI or LLM code.
- The MVP should prioritize slice-of-life simulation over combat or roguelike mechanics.

### R4. Memory and Reflection

- Store memories as typed records: observation, action, conversation summary, relationship note, plan, reflection, and user intervention.
- Memory retrieval must combine recency, importance, and relevance rather than semantic search alone.
- Conversation memories must be summarized from each participant's perspective.
- Reflection should synthesize higher-level insights after accumulated importance crosses a threshold or after scheduled intervals.

### R5. Orchestration and LLM Boundaries

- LLM calls must live behind provider interfaces so OpenAI-compatible APIs, local models, or test fakes can be swapped without changing domain logic.
- Long-running LLM/embedding operations must not directly mutate hot simulation state; they should submit typed inputs back to the simulation.
- Each agent should have at most one in-flight operation unless the design explicitly introduces safe concurrency.
- Failures must be visible and diagnosable; do not silently invent fallback actions that look like successful LLM output.

### R6. Frontend Experience

- The frontend should render a live realm dashboard with current time, agent locations/statuses, active conversations, recent events, and replay controls.
- Character profiles should show persona fields, current plan, memory summaries, relationship graph, and generated reflections.
- Generated content must be visually distinguishable from configured facts and user interventions.
- UI state should subscribe to backend snapshots/events and submit typed inputs; it must not reimplement simulation rules.

### R7. Legal and Content Boundary

- The repository must not include extracted official game assets, official dialogue dumps, proprietary audio, or copyrighted story text.
- Any game-inspired content should be represented as user-authored configuration, original generated dialogue, placeholders, or assets the user has rights to use.
- Specs and prompts should avoid claiming official affiliation.

### R8. Verification and Observability

- Future implementation must support deterministic tests with fake LLM and embedding providers.
- Core validation should cover schema parsing, cognitive loop ordering, memory retrieval ranking, reflection triggers, input processing, conversation lifecycle, and replay.
- Runtime logs should capture simulation ticks, agent decisions, LLM operation IDs, memory writes, prompt schema failures, and cost/token metrics.

## Recommended MVP Scope

Build an observation-terminal MVP before a full 2D map:

1. Structured persona specs for 3 pilot agents, with the schema designed to scale to 13.
2. A single realm with named locations, agent locations/statuses, and accelerated simulation time.
3. Text timeline + agent profile UI that makes the realm feel continuously alive.
4. Per-agent daily plan generation and next-action loop.
5. Two-agent conversations with per-agent memory summaries.
6. Reflection and replay using deterministic fixtures in tests.
7. User interventions framed as changes to the observed realm rather than only direct chat messages.

After the observation-terminal MVP is stable, add visual map movement and richer slice-of-life event packs.

## Out of Scope for Initial MVP

- Combat, roguelike signets, enemy encounters, scoring, or progression systems.
- Full official story recreation or direct extraction of official assets/dialogue.
- Real-money production deployment, public multiplayer, or account systems.
- Large-scale 1,000+ agent simulation.
- Voice synthesis or animation pipelines.

## Acceptance Criteria for This Planning Task

- [x] A Trellis planning task exists for the project direction.
- [x] High-star or authoritative multi-agent simulation projects are researched and summarized.
- [x] Backend and frontend specs are extracted into `.trellis/spec/` for future implementation.
- [x] A technical design document describes architecture, data contracts, and trade-offs.
- [x] An implementation plan proposes incremental deliverables and validation gates.
- [x] The user chooses the initial MVP presentation mode.
- [x] The user chooses the tech stack direction before implementation starts.

## Product Decisions

- Initial MVP presentation mode: observation-terminal / text timeline first, with lightweight locations and agent status so the user feels like observing a real running realm.
- First MVP should not be a pure chatroom; direct conversations can exist as interventions, but the primary UX is world observation.
- Primary implementation stack: TypeScript full-stack, with one backend simulation authority, shared frontend/backend contracts, and Web observation terminal first.
- Python is reserved for optional future offline experiments, prompt/persona evaluation, or retrieval tuning; it must not become a second authoritative simulation core.
- Initial MVP roster: 3 pilot agents first, with persona schema, relationship seeds, locations, and contracts designed to scale to all 13.
- Persona fidelity: strictly canon-aligned for character temperament, relationship constraints, values, speech-style intent, and major boundaries, while storing only user-authored summaries/placeholders and generated original daily-life content. The repository must not copy official dialogue, story dumps, art, music, voice, or proprietary assets.
- Model strategy: provider-agnostic OpenAI-compatible interface, deterministic FakeProvider required for tests, configurable low-cost cloud or local models for development, and built-in token/cost counters, budget limits, embedding cache, and reflection/conversation throttling.
- User intervention model: mixed intervention, with observer commands and realm events as the primary way to influence the running world, plus optional direct private messages as typed commands. This preserves the observation-first experience while allowing personal interaction.

## Open Product Questions

No blocking product questions remain for this planning baseline. Future implementation may still refine pilot agent selection, exact provider defaults, and UI copy.
