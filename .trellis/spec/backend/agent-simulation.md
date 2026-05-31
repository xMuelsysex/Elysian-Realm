# Agent Simulation Backend Spec

> Source-backed rules for the Elysian Realm multi-agent simulation backend.

## Evidence Base

These rules are extracted from the planning research in `.trellis/tasks/05-31-elysian-realm-agent-spec/research/github-agent-simulation-specs.md` and should be revisited after the first implementation exists.

Primary reference patterns:

- `joonspk-research/generative_agents`: perceive -> retrieve -> plan -> reflect -> execute cognitive loop; memory stream; replayable saved simulations.
- `a16z-infra/ai-town`: server-side game logic, input-driven mutations, single-threaded world engine, async agent operations.
- `microsoft/TinyTroupe`: structured persona simulation and experiment-oriented validation.

## Layer Boundaries

Keep these backend concerns separate:

- **Simulation engine**: owns authoritative world state, time advancement, event queue processing, replay snapshots, and deterministic rules.
- **Agent runtime**: owns perception, memory retrieval, planning, action proposals, and reflection triggers.
- **LLM operations**: perform long-running model calls and return structured operation results.
- **Memory store**: owns typed memories, embeddings, retrieval scores, and reflection evidence.
- **Conversation service**: owns invite/join/message/end lifecycle and summary memory creation.
- **API/command boundary**: validates external commands and submits typed inputs to the engine.

Do not put simulation rules in UI handlers, prompt builders, database adapters, or random utility modules.

## Authoritative State Rule

The simulation engine is the single owner of active world state.

The MVP user intervention model is mixed:

- observer commands for pause/resume/step/speed/debug/reflection requests;
- realm events for gatherings, location events, schedule nudges, anomalies, invitations, or environmental prompts;
- direct private messages as typed commands that create user-sourced events/memories instead of bypassing the world model.

Required pattern:

1. External callers submit typed inputs/commands.
2. The command boundary validates the payload.
3. The simulation engine applies the input during a step.
4. The engine emits events and updates the world snapshot.
5. Other services read projections or append non-authoritative records such as messages, memories, and diagnostics.

Forbidden patterns:

- Directly patching `agent.status`, `currentAction`, `location`, or `conversationId` from an LLM action.
- Letting frontend code update world state outside typed inputs.
- Letting memory or conversation storage become a second source of truth for active world state.

## Simulation Step Contract

A simulation step must be explicit and replayable:

```text
load world snapshot
advance time
read queued inputs
validate and apply deterministic inputs
process timers, cooldowns, and conversation lifecycle
run eligible agent ticks
apply completed operation results as typed inputs
append events and diagnostics
save world diff/snapshot
```

Every non-trivial behavior should produce an event with:

- `id`
- `worldId`
- `stepId`
- `time`
- `kind`
- `actorId?`
- `targetIds`
- `payload`
- `source`
- `causedByInputId?`

Event payloads must be decoded by shared validators. Do not cast raw event payloads locally in multiple consumers.

## Agent Cognitive Loop

Each active agent follows this sequence when it needs to decide:

1. **Perceive** relevant events, nearby agents, current conversation state, user interventions, and schedule changes.
2. **Retrieve** memories for focused events or current plan context.
3. **Plan** daily and short-horizon actions.
4. **Act** by submitting a typed action proposal/input, not by mutating world state directly.
5. **Remember** observations/actions/conversations with source event IDs.
6. **Reflect** when scheduled or accumulated importance crosses a threshold.

The loop may skip expensive LLM work when a deterministic rule is sufficient, but skipped phases must be visible in diagnostics.

## Concurrency Rule

For the MVP, each agent may have at most one in-flight operation.

Required fields in runtime state:

- `inProgressOperationId?`
- operation kind
- operation started time
- structured status: `pending | completed | failed | cancelled`

If an agent has an active operation, the tick may wait, continue deterministic movement, or time out the operation. It must not start another long-running LLM call for the same agent.

## Conversation Lifecycle

A conversation must have an explicit lifecycle:

```text
invited -> walkingOver? -> participating -> ending -> ended
```

Rules:

- A participant can be in only one active conversation in the MVP.
- Conversation messages are high-volume records and must not bloat active world state.
- Ended conversations are archived with participants, start/end time, message count, and last message summary.
- Conversation completion triggers perspective-specific summary memories for each participant.
- Cooldowns or buffers must prevent agents from immediately restarting the same conversation loop.

## Replay and Determinism

Every deterministic simulation test should run with:

- fixed initial world
- fixed seed, if randomness is used
- fake LLM provider or precomputed operation results
- event log assertions

Replay must use the event log and/or step snapshots. Do not depend on live LLM calls to replay a prior run.

## Observability Requirements

Log or persist diagnostics for:

- step duration and step ID
- input ID, kind, validation result, and outcome
- agent tick phase and decision result
- operation ID, provider/model, token/cost metadata, and status
- memory retrieval candidates and component scores
- memory writes and reflection evidence IDs
- conversation lifecycle transitions
- structured errors with enough context to reproduce

Never swallow LLM, parser, embedding, or persistence errors as successful agent actions.

## Tests to Add With Implementation

- Input validation rejects invalid command payloads.
- Engine applies inputs only through the step loop.
- Agent loop order is preserved.
- One in-flight operation per agent is enforced.
- Conversation lifecycle prevents duplicate active memberships.
- Replay reconstructs the same event timeline from deterministic fixtures.
