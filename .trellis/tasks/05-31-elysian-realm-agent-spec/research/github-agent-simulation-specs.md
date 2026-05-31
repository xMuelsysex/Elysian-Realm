# GitHub Research: Agent Simulation Specs for Elysian Realm

## Research Goal

Extract implementation-relevant specifications from high-star or authoritative open-source projects that simulate believable multi-agent worlds, daily routines, memory, reflection, conversations, and persona-driven behavior.

## Primary References

### 1. `joonspk-research/generative_agents` (~21k stars)

Source evidence:

- README: `https://github.com/joonspk-research/generative_agents`
- Cognitive modules: `reverie/backend_server/persona/cognitive_modules/plan.py`, `retrieve.py`, `reflect.py`
- Paper: "Generative Agents: Interactive Simulacra of Human Behavior"

Extracted specs:

- Use a cognitive loop: perceive -> retrieve -> plan -> reflect -> execute.
- Store a complete natural-language memory stream for agent experiences.
- Retrieve memories using a weighted blend of recency, importance, and relevance.
- Create daily long-term plans at day boundaries and short-term actions when the current action expires.
- Trigger reflection when accumulated importance crosses a threshold.
- Save and replay simulations; long-running simulations should be checkpointed because LLM calls and rate limits can fail.
- Support authoring initial agent history from structured files, then load those memories into agent streams.

Design implications for this project:

- Every Flame-Chaser agent needs a memory stream, not just a chat history.
- Daily-life simulation should be modeled as time + plans + event reactions, not as stateless prompt completion.
- Retrieval scoring must remain inspectable; future UI should show why a memory influenced a decision.

### 2. `a16z-infra/ai-town` (~10k stars)

Source evidence:

- README: `https://github.com/a16z-infra/ai-town`
- Architecture: `https://github.com/a16z-infra/ai-town/blob/main/ARCHITECTURE.md`
- Agent schema/memory code: `convex/agent/schema.ts`, `convex/agent/memory.ts`
- AI Town describes itself as a virtual town where AI characters live, chat, and socialize.

Extracted specs:

- Split the system into explicit layers: server-side game logic, client UI, game engine, and agent layer.
- Mutate simulation state through typed inputs rather than arbitrary writes.
- Keep hot game state small; archive old players/conversations/agents outside the active world state.
- Run the engine as a single-threaded per-world loop to avoid overlapping simulation steps and race conditions.
- Use asynchronous agent operations for long LLM work; completed operations submit typed inputs back to the engine.
- Keep frequent chat messages outside the core game state because they are high-volume and latency-sensitive.
- Store memories with typed data, importance, last access time, and vector embeddings.
- Cache embeddings by text hash to avoid repeated provider calls.
- Summarize conversations from each participant's perspective before inserting memory records.

Design implications for this project:

- The backend should have one owner for simulation state transitions.
- UI and LLM actions should submit typed commands/events; they should not directly patch agent status or world state.
- Conversation text, summaries, memory embeddings, and active world snapshots should be separate persistence concerns.

### 3. `microsoft/TinyTroupe` (~7k stars)

Source evidence:

- README: `https://github.com/microsoft/TinyTroupe`
- Example persona JSON: `examples/agents/Lisa.agent.json`
- Principles: persona-based, multiagent, experiment-oriented, utilities-heavy.

Extracted specs:

- Represent agents as detailed structured persona specifications.
- Persona fields should include name, demographics/context, education/history, long-term goals, occupation/role, style, personality traits, preferences, skills, beliefs, behaviors, routines, health, relationships, and other facts.
- Support both JSON-file personas and programmatic modification of loaded personas.
- Treat simulation as experiment-oriented: run, inspect, extract results, validate, and refine.
- Provide behavior correction/monitoring mechanisms such as persona adherence, self-consistency, and fluency checks.
- Track cost at client/environment/agent levels when LLM APIs are used.

Design implications for this project:

- Flame-Chaser character configuration should be structured JSON/YAML, not large untyped prompt strings.
- Generated memories/reflections must not be mixed with base persona facts.
- Tests should verify persona adherence and distinguish configured facts from generated content.

### 4. `tsinghua-fib-lab/AgentSociety` (~900+ stars, research framework)

Source evidence:

- README: `https://github.com/tsinghua-fib-lab/AgentSociety`

Extracted specs:

- Use an LLM-native design with modular environment components and hot-pluggable tools.
- Support multiple reasoning patterns such as ReAct, Plan-Execute, Code Generation, and routers.
- Provide experiment replay for research workflows.
- Use environment variables for provider configuration.

Design implications for this project:

- Tool access and environment modules should be optional capabilities on an agent, not global hard-coded functions.
- Replay and observability should be designed early, even if the first simulation is small.

### 5. `camel-ai/camel` and OASIS ecosystem

Source evidence:

- README: `https://github.com/camel-ai/camel`

Extracted specs:

- Design for stateful memory, scalable coordination, multiple agent roles, model abstraction, tool integration, and benchmarks.
- Treat code and comments as prompts; clear naming and code organization directly affect agent maintainability.
- Include tracking/logging for model request/response when debugging multi-agent behavior.

Design implications for this project:

- Even if MVP is small, agent code should be model/provider-agnostic and benchmarkable.
- Observability is a core product feature for a multi-agent realm, not an afterthought.

## Consolidated Spec Themes

### Agent Persona Contract

A character spec must include:

- stable identity: `id`, `displayName`, `aliases`, `sourceNotes`
- base profile: archetype, tone, values, goals, limits, canonical/user-authored facts
- speech style: vocabulary, cadence, taboo topics, preferred address forms
- routines: morning/day/evening/night/default weekend or special schedule
- relationships: directed relationships to other agents with affinity, trust, tension, memories
- location preferences and activity preferences
- safety/legal metadata: whether content is user-authored, placeholder, licensed, or generated

### Simulation Loop Contract

A simulation step should:

1. Advance world time.
2. Read queued inputs/events.
3. Apply deterministic world rules.
4. Let agents perceive nearby/relevant events.
5. Retrieve memories for focused events or plan context.
6. Start at most one async reasoning operation per agent when needed.
7. Apply completed agent decisions through typed inputs.
8. Persist event log entries for replay/debug.

### Memory Contract

A memory record should include:

- `id`, `agentId`, `worldId`, `type`
- `content` or structured summary
- `createdAt`, `lastAccessedAt`, optional `expiresAt`
- `importance` numeric score
- `embeddingRef` or embedding vector reference
- `sourceEventIds` / `relatedMemoryIds`
- `visibility`: private, shared, system, user-authored
- type-specific payload for conversation, relationship, reflection, plan, observation, action, or intervention

Retrieval should rank by:

- semantic relevance to query/event
- recency or last access time
- importance/poignancy
- optional relationship or location boosts

### Conversation Contract

A conversation should include:

- participants and invite/accept/participating/ended lifecycle
- location and start/end timestamps
- transcript messages in a separate high-volume table/log
- per-participant summary memories after completion
- guard against infinite immediate re-chat loops via cooldowns or participation buffers

### Frontend Contract

The UI should display:

- active world clock and playback state
- active agents, current plans, current actions, location/status
- event timeline with source and generated status
- active/archived conversations
- character profile with base facts, generated memories, reflections, and relationships
- replay controls for deterministic inspection

The UI must submit typed commands and render backend projections; it must not own simulation rules.

## Recommended Initial Architecture

Use a TypeScript-first full-stack architecture if the goal is a web product similar to AI Town:

- `src/server/simulation`: deterministic world loop and event processing
- `src/server/agents`: cognitive modules, LLM orchestration, prompts
- `src/server/memory`: memory records, embeddings, retrieval, reflection
- `src/server/personas`: schema and character configuration loader
- `src/server/conversations`: conversation lifecycle and summarization
- `src/app` or `src/client`: live dashboard and replay UI

If the project later needs research notebooks or batch experiments, add a Python experiment harness separately; do not start with two authoritative simulation cores.

## Risks and Mitigations

- **Copyright/trademark risk**: keep official assets/dialogue out of repository; use user-authored configuration and placeholders.
- **Prompt drift**: define structured output schemas and validate LLM responses.
- **Cost blowups**: start with 3-agent MVP, fake providers in tests, throttled reflection, embedding cache.
- **Race conditions**: one simulation owner per world, typed input queue, one in-flight operation per agent.
- **Uninspectable behavior**: persist event logs, prompt/response metadata, memory retrieval scores, and replay snapshots.
