# Realm Interface Frontend Spec

> UI rules for the Elysian Realm multi-agent daily-life simulation.

## Evidence Base

Reference patterns:

- `a16z-infra/ai-town` renders server-owned game state in a browser UI and submits inputs back to the engine.
- `microsoft/TinyTroupe` emphasizes inspectable simulations, generated outputs, extraction, and validation.
- `joonspk-research/generative_agents` supports replay and demo views for saved simulations.

## Frontend Responsibility Boundary

The frontend renders backend projections and submits typed commands.

Allowed responsibilities:

- display world clock, active agents, timeline, conversations, memories, relationships, and replay state
- submit user interventions and control commands through shared command contracts
- visualize generated-vs-configured-vs-user-authored content
- show diagnostics such as memory retrieval scores and operation failures

Forbidden responsibilities:

- reimplementing simulation rules in components
- directly mutating agent state, world time, conversations, plans, or memories
- parsing raw untyped event payloads in multiple components
- hiding backend operation failures as normal agent behavior

## Core Screens

### Realm Timeline

Purpose: show what happened in the realm.

Required UI elements:

- current world time and playback status
- event stream grouped by simulated time
- filters by agent, event kind, location, and source
- badges for `system`, `user`, `agent`, `llm`, and `test` sources
- links from events to related conversation, memory, plan, or operation records

Rules:

- Render events from shared typed projections.
- Do not infer event meaning from string matching.
- Empty/loading/error states must be explicit.

### Agent Profile

Purpose: inspect one character agent.

Required UI sections:

- base persona facts from configuration
- current status, location, plan, and active operation
- recent private/shared memories
- reflections with evidence memory links
- directed relationships to other agents
- conversation history summaries
- diagnostics for last decision/retrieval when debug mode is enabled

Rules:

- Clearly separate configured persona facts from generated memories/reflections.
- Mark generated content and user-authored interventions.
- Do not let generated content appear as immutable canon facts.

### Conversation View

Purpose: inspect active and archived conversations.

Required UI elements:

- participants and lifecycle state
- message list or streaming transcript
- start/end time, location, message count
- per-participant generated summaries after completion
- relationship or memory effects when available

Rules:

- Conversation transcript rendering can use paginated/high-volume message queries.
- Active world state should only show lightweight conversation metadata.

### Replay / Debug View

Purpose: reproduce and debug a simulation run.

Required UI elements:

- replay controls: start, pause, step, speed, jump to time/event
- event IDs and step IDs
- selected agent decision trace
- memory retrieval candidates and scores
- operation status and errors

Rules:

- Replay uses persisted event/snapshot data, not live model calls.
- Debug views can be hidden in normal mode but must remain available for development.

### User Intervention Panel

Purpose: let the user influence the realm without turning the product into a pure chatroom.

MVP intervention model:

- **Observer commands**: pause/resume/step simulation, change speed, request debug traces, request reflection.
- **Realm events**: introduce gatherings, location events, schedule nudges, anomalies, invitations, or environmental prompts.
- **Direct private messages**: optional typed command for speaking to one agent; this creates user-sourced events/memories rather than bypassing the world model.

Rules:

- Observer commands and realm events are the primary intervention modes.
- Direct messages are allowed, but they must remain one typed command among others, not the dominant UI model.
- Every intervention submits a typed command.
- The resulting event must show `source: user`.
- Intervention forms must validate required target IDs and payload shape before submit.
- UI copy should preserve the feeling that the user is observing and influencing a living realm, not operating a standard chatbot.

## Component Data Flow

```text
backend projection/query -> feature hook -> typed view model -> component render
component form -> shared command schema -> backend command boundary
```

Rules:

- Feature hooks may compose queries and transform into view models.
- Components should not know database schemas or internal memory/vector structures.
- Components should receive typed props and avoid optional-field chains over raw payloads.
- Any event kind projection should be implemented once and reused.

## Content Provenance UI

Every displayed narrative item should indicate provenance:

- `configured`: base persona or location config
- `generated`: LLM-created memory, dialogue, reflection, or plan
- `user`: user intervention or authored persona content
- `system`: deterministic engine event or diagnostic

Use badges, labels, or separate sections. Do not blend official-inspired base summaries and generated output without provenance.

## Accessibility and Interaction Rules

- Timeline and conversation lists must be keyboard navigable.
- Agent status and operation errors must be readable as text, not only color.
- Playback controls must have accessible labels.
- Long generated text should preserve paragraph breaks and support copy/debug inspection.
- Auto-updating timelines should not steal focus.

## Visual Roadmap

Recommended MVP is text/timeline-first.

2D map requirements can be added later:

- location coordinates and paths come from backend projections
- movement animation interpolates server state but does not own pathfinding rules
- map interactions submit typed movement/intervention commands
- replay interpolation uses snapshot/history buffers, not component-local truth

## Testing Requirements

When frontend code exists, add tests for:

- empty/loading/error states for realm timeline and agent profile
- generated/configured/user provenance labels
- command form validation
- event projection rendering per event kind
- replay controls not requiring live model calls
- operation failure display

## Common Mistakes to Avoid

- Treating the UI as the source of the current agent status.
- Letting each component parse `event.payload` independently.
- Showing generated memories as canon facts.
- Building a 2D map before text/replay contracts are stable.
- Suppressing failed LLM operations because they are "debug-only".
