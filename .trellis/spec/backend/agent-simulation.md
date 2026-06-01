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

## Implemented Offline Engine MVP Contract

### 1. Scope / Trigger

Slice 2 introduced the first executable deterministic simulation engine under `src/server/simulation/**`. Any future engine, event, input, replay, UI projection, or agent-operation code must preserve this contract because it is the first authoritative world-state owner and event boundary.

### 2. Signatures

Current source paths:

- `src/server/simulation/engine.ts`
- `src/server/simulation/events.ts`
- `src/server/simulation/inputs.ts`
- `src/server/simulation/replay.ts`
- `src/server/simulation/seeds/observationMvpSeed.ts`
- `tests/simulationEngine.test.ts`

Current public API:

```ts
export function createSimulationEngine(): SimulationEngineState;
export function queueSimulationInput(
  state: SimulationEngineState,
  input: SimulationInput,
): SimulationEngineState;
export function stepSimulationEngine(state: SimulationEngineState): SimulationStepResult;
export function validateSimulationEvent(event: SimulationEvent): string[];
export function validateSimulationInput(
  input: SimulationInput,
  context: SimulationInputValidationContext,
): SimulationInputValidationResult;
export function createReplaySummary(
  snapshot: WorldSnapshot,
  events: readonly SimulationEvent[],
): ReplaySummary;
```

### 3. Contracts

The deterministic seed uses the current executable roster, not the future research roster:

- `worldId`: `world_elysian_observation_mvp`
- personas: `elysia`, `kevin`, `eden`
- agents: `agent_elysia`, `agent_kevin`, `agent_eden`
- initial status: `paused`
- initial time: `2026-05-31T06:00:00.000Z`
- initial step: `step_0600_000`

Inputs are queued first and applied only inside `stepSimulationEngine`. The validator receives a snapshot-derived context:

```ts
interface SimulationInputValidationContext {
  worldId: WorldId;
  agentIds: readonly AgentId[];
  locationIds: readonly LocationId[];
}
```

Target validation rules:

- `observerCommand` targets must reference the active world.
- `realmEvent` targets must reference the active world, a known location, or a known agent.
- `directPrivateMessage` must target exactly one known agent.

MVP event kinds are centrally owned by `SIMULATION_EVENT_KINDS`:

- `world.created`
- `agent.spawned`
- `world.timeAdvanced`
- `agent.startedRoutine`
- `realm.interventionSubmitted`
- `simulation.inputRejected`
- `memory.seeded`

`memory.seeded` is event-only in this slice. It must not be treated as a stored `MemoryRecord`.

### 4. Validation & Error Matrix

- unknown event kind -> `event.kind must be one of: ...`
- missing event envelope fields -> `event.<field> must be a non-empty string`
- empty event targets -> `event.targetIds must be a non-empty string array`
- invalid per-kind payload -> `event.payload.<field> must ...`
- invalid input world -> `input.worldId must match the active world`
- empty input targets -> `input.command.targetIds must be a non-empty string array`
- observer command targeting an agent/location -> `observerCommand targets must reference the active world`
- realm event targeting an unknown ID -> `realmEvent targets must reference the active world, location, or agent`
- direct private message with zero/multiple/unknown targets -> `directPrivateMessage targetIds must contain exactly one known agent id`
- rejected input -> emit `simulation.inputRejected` and do not apply command effects

### 5. Good/Base/Bad Cases

Good:

```ts
const queued = queueSimulationInput(state, resumeWorldInput);
const result = stepSimulationEngine(queued);
// status changes only after stepSimulationEngine and an intervention event is emitted.
```

Base:

```ts
const state = createSimulationEngine();
const firstStep = stepSimulationEngine(state);
const timeline = createReplaySummary(firstStep.state.snapshot, firstStep.state.events);
```

Bad:

```ts
// Do not accept unknown event payload shapes.
validateSimulationEvent({ ...event, payload: {} });

// Do not normalize invalid target IDs into a valid command.
queueSimulationInput(state, inputWithUnknownTarget);
```

### 6. Tests Required

Simulation-engine tests must assert:

- deterministic seed shape: world, locations, agents, empty queues/conversations;
- stable first-step event order and deterministic event IDs;
- per-kind event payload validation rejects missing required payload fields;
- queued observer input has no effect before the next step;
- invalid command action/targets emit `simulation.inputRejected` without command effects;
- `realmEvent` and `directPrivateMessage` reject unknown targets;
- same seed and input sequence produce the same replay summary;
- `setTimeScale` affects later `world.timeAdvanced` payloads.

### 7. Wrong vs Correct

#### Wrong

```ts
// Frontend, prompt builder, or helper directly patches active state.
state.snapshot.agents[0].status = "moving";

// Consumer locally assumes payload shape.
const timeScale = (event.payload as { timeScale: number }).timeScale;
```

#### Correct

```ts
const queued = queueSimulationInput(state, input);
const stepped = stepSimulationEngine(queued);
const errors = validateSimulationEvent(stepped.events[0]);
```

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
