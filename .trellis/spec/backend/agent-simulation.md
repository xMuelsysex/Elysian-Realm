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

## Implemented Local Admin API Contract

### 1. Scope / Trigger

The debug/admin interface introduced a local development-only API boundary under `src/server/admin/**`. Future management surfaces, test controls, or browser debug tools must preserve this contract because it is the first cross-layer control surface around the authoritative simulation engine.

### 2. Signatures

Current source paths:

- `src/server/admin/adminContracts.ts`
- `src/server/admin/adminController.ts`
- `src/server/admin/adminServer.ts`
- `src/server/admin/index.ts`
- `tests/adminController.test.ts`

Current public API:

```ts
export interface AdminController {
  getState(): AdminStateResponse;
  step(): AdminStateResponse;
  reset(): AdminStateResponse;
  submitInput(request: unknown): AdminRouteResult;
}

export function createAdminController(
  initialState?: SimulationEngineState,
): AdminController;

export function createAdminStateResponse(
  state: SimulationEngineState,
): AdminStateResponse;

export function createAdminServer(options?: AdminServerOptions): Server;
export function startAdminServer(options?: AdminServerOptions): Server;
```

HTTP routes are intentionally narrow:

- `GET /api/admin/state`
- `POST /api/admin/step`
- `POST /api/admin/reset`
- `POST /api/admin/input`

### 3. Contracts

`AdminStateResponse` is the browser-facing read model:

```ts
interface AdminStateResponse {
  snapshot: WorldSnapshot;
  events: SimulationEvent[];
  timeline: TimelineEntry[];
  replay: ReplaySummary;
  diagnostics: AdminDiagnostic[];
  personas: PersonaSpec[];
}
```

`SubmitAdminInputRequest` is the only state-changing request body accepted by `/api/admin/input`:

```ts
interface SubmitAdminInputRequest {
  kind: InterventionKind;
  targetIds: string[];
  payload: Record<string, unknown>;
  source?: EventSource; // defaults to user
}
```

Runtime rules:

- The controller owns exactly one in-memory `SimulationEngineState` per controller instance.
- `step()` must call `stepSimulationEngine`.
- `reset()` must call `createSimulationEngine`.
- `submitInput()` must build a `SimulationInput`, call `queueSimulationInput`, then call `stepSimulationEngine` so UI feedback is immediate.
- Admin DTOs clone snapshots, events, and loaded `PersonaSpec[]` before returning them to avoid exposing mutable engine or fixture internals.
- Diagnostics include `simulation.inputRejected` events and `validateSimulationEvent` failures.
- The default API bind target is local: `127.0.0.1:4317`. This API is not an auth or production boundary.

### 4. Validation & Error Matrix

- missing or non-object `/input` body -> `400 INVALID_ADMIN_INPUT_REQUEST`
- unsupported `kind` -> `400 INVALID_ADMIN_INPUT_REQUEST`
- empty or non-string `targetIds` -> `400 INVALID_ADMIN_INPUT_REQUEST`
- non-object `payload` -> `400 INVALID_ADMIN_INPUT_REQUEST`
- unsupported `source` -> `400 INVALID_ADMIN_INPUT_REQUEST`
- malformed JSON request body -> `400 INVALID_JSON`
- body over the configured byte limit -> `400 INVALID_JSON` with a body-size message
- unknown admin route -> `404 NOT_FOUND`
- unexpected server exception -> `500 ADMIN_SERVER_ERROR`
- simulation-level input rejection -> return `200 AdminStateResponse`, emit `simulation.inputRejected`, and expose an `AdminDiagnostic`
- event validation failure in the event log -> return `200 AdminStateResponse` with an `AdminDiagnostic`
- persona fixture data requested by the UI -> return cloned `personas` in every `AdminStateResponse`; do not require the frontend to import server fixture modules

### 5. Good/Base/Bad Cases

Good:

```ts
const result = controller.submitInput({
  kind: "observerCommand",
  targetIds: [state.snapshot.id],
  payload: { action: "resume" },
  source: "user",
});
// The input is queued and applied by stepSimulationEngine; the response contains the new snapshot and user-sourced event.
```

Base:

```ts
const controller = createAdminController();
const response = controller.getState();
// Deterministic seed snapshot, no events, empty diagnostics, cloned read-only personas.
```

Bad:

```ts
// Do not patch admin state directly from an API handler.
state.snapshot.status = "running";

// Do not turn invalid requests into fake accepted intervention events.
return { ok: true, body: fabricatedAcceptedResponse };

// Do not make the browser import backend fixture modules as a second source.
import { pilotPersonas } from "../../server/personas";
```

### 6. Tests Required

Admin API tests must assert:

- initial state exposes the deterministic observation seed;
- `step()` advances through `stepSimulationEngine` and returns timeline entries;
- `reset()` returns the deterministic seed;
- valid observer input changes state only through the engine and emits a `source: user` event;
- malformed admin requests return structured errors;
- simulation validation failures remain visible as diagnostics;
- event validation failures remain visible as diagnostics;
- HTTP routes expose state, step, input submission, and JSON parse errors.
- `AdminStateResponse.personas` exposes the pilot fixtures and mutating one response's nested persona arrays does not affect the next response.

### 7. Wrong vs Correct

#### Wrong

```ts
// Handler owns simulation rules and bypasses the engine.
if (body.payload.action === "resume") {
  state.snapshot.status = "running";
}
```

#### Correct

```ts
const input = buildSimulationInput(body, state.snapshot);
state = stepSimulationEngine(queueSimulationInput(state, input)).state;
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

## Implemented Simulation Agent Package Contract

### 1. Scope / Trigger

The first executable agent runtime slice lives in the workspace package `packages/simulation-agent/**` and is consumed by `src/server/simulation/agentRuntimeAdapter.ts` through the public package entrypoint. Update this contract whenever the package exports, cognitive loop ports, engine adapter, or engine tick diagnostics change.

### 2. Signatures

`@elysian/simulation-agent` is port-converged and has no Elysian concrete imports. Host code imports only from the package root:

```ts
import { SimulationAgentRuntime, type CognitiveLoopDeps } from "@elysian/simulation-agent";
```

Current public API:

```ts
export interface PerceptionPort<Perception> {
  perceive(agentId: string, now: string): Perception;
}

export interface MemoryPort<MemoryQuery, MemoryHit, MemoryWrite> {
  retrieve(agentId: string, query: MemoryQuery): readonly MemoryHit[];
  remember(agentId: string, write: MemoryWrite): void;
}

export interface PlanningPort<Perception, MemoryHit, ActionProposal> {
  plan(input: PlanInput<Perception, MemoryHit>): Promise<PlanResult<ActionProposal>> | PlanResult<ActionProposal>;
}

export interface ActionSink<ActionProposal> {
  submit(agentId: string, proposal: ActionProposal): void;
}

export function runCognitiveTick(...): Promise<CognitiveTickResult<ActionProposal>>;
export function runCognitiveTickSync(...): CognitiveTickResult<ActionProposal>;
export class SimulationAgentRuntime<...> { ... }
```

Engine step remains synchronous and exposes agent diagnostics outside the event log:

```ts
interface SimulationStepResult {
  state: SimulationEngineState;
  events: SimulationEvent[];
  agentTickDiagnostics: EngineAgentTickDiagnostic[];
}
```

### 3. Contracts

- `packages/simulation-agent/src/**` must not import `src/shared/**`, `src/server/**`, `src/app/**`, or Elysian domain/contracts concrete types.
- Elysian app/server/test code must import `@elysian/simulation-agent` only through the package root, never `packages/simulation-agent/src/**` or `@elysian/simulation-agent/src/**`.
- The root `build:server` path must build the package first so runtime tests resolve the package's built `dist/index.js`.
- The sync simulation engine uses `SimulationAgentRuntime.tickSync`, which delegates to `runCognitiveTickSync`; future LLM-backed planners use `SimulationAgentRuntime.tick` or an async engine operation boundary.
- The Elysian adapter passes a copied read-only perception projection into the package. It must not hand mutable `WorldSnapshot` / `AgentRuntimeState` references to the loop.
- The package only submits a typed proposal to `ActionSink`; `engine.ts` remains the single place that applies proposals to authoritative state and emits `SimulationEvent`s.
- `agentTickDiagnostics` are visible on `SimulationStepResult` and must not be appended to `events`, because diagnostics must not perturb replay event sequences.

### 4. Validation & Error Matrix

- Perception/retrieval/planning throws -> that phase is `failed`, later phases are `skipped`, no proposal is submitted.
- Planner returns malformed structured output -> `plan` phase is `failed`, no proposal is submitted.
- `SimulationAgentRuntime.tickSync` / `runCognitiveTickSync` receives a Promise-returning planner -> `plan` phase is `failed` with an async misuse message; use the async loop or an operation boundary instead.
- Agent has `inProgressOperationId` -> deterministic adapter planner returns `source: "skipped"`, so no second proposal is started.
- Plan source is `"skipped"` or has no proposal -> `act` phase is `skipped` and `ActionSink.submit` is not called.
- Package imports Elysian source modules or host code deep-imports package source -> fail the boundary scan before review.

### 5. Good/Base/Bad Cases

Good:

```ts
const tick = runAgentCognitiveTickForEngine(snapshot, agent);
// engine.ts applies tick.proposal and emits agent.moved / agent.continuedRoutine
```

Base:

```ts
const result = stepSimulationEngine(state);
result.events;               // replay-visible events only
result.agentTickDiagnostics; // phase diagnostics, not replay events
```

Bad:

```ts
// The simulation-agent package must not own or patch world state.
snapshot.agents[0].locationId = proposedLocation;

// Host code must not deep-import package internals.
import { runCognitiveTickSync } from "../../packages/simulation-agent/src/loop/cognitiveLoop.js";
```

### 6. Tests Required

Simulation-agent package tests must assert:

- six-phase order and skipped Remember/Reflect diagnostics;
- proposal passthrough to `ActionSink`;
- thrown or malformed planner output produces `failed` diagnostics and no proposal;
- sync tick rejects async planner misuse visibly.

Simulation/adapter tests must assert:

- existing `tests/simulationEngine.test.ts` replay/event assertions remain unchanged and green;
- adapter does not mutate input snapshots;
- one-in-flight operation skips starting another proposal;
- `SimulationStepResult.agentTickDiagnostics` exposes phase diagnostics without adding events.

Package-boundary checks must assert:

- `npm run build:packages` succeeds;
- no `packages/simulation-agent/src/**` file imports `src/server`, `src/shared`, `src/app`, or `../../src`;
- no `src/**` or `tests/**` file deep-imports `packages/simulation-agent/src/**`, `@elysian/simulation-agent/src/**`, or old `src/agent-core/**` paths.

### 7. Wrong vs Correct

#### Wrong

```ts
// Hidden second source of truth: planner patches active agent state.
agent.currentAction = proposal;
agent.locationId = proposal.locationId;
```

#### Correct

```ts
const tick = runAgentCognitiveTickForEngine(snapshot, agent);
if (tick.proposal) {
  // engine.ts applies the proposal and emits replay-visible events.
}

import { SimulationAgentRuntime } from "@elysian/simulation-agent";
```

## Implemented Simulation Agent Runtime Facade Contract

### 1. Scope / Trigger

M4 added the first package-owned runtime facade over the M1 cognitive loop, M2 memory store, and M3 reflection boundary. Update this section whenever runtime facade constructor dependencies, `tick`, `reflect`, reflection persistence behavior, or runtime diagnostics change.

Current source paths:

- `packages/simulation-agent/src/runtime/simulationAgentRuntime.ts`
- `tests/simulationAgentRuntime.test.ts`

### 2. Signatures

The package exports the facade only from `@elysian/simulation-agent`:

```ts
export interface ReflectionMemoryWriter<ReflectionMetadata = Record<string, unknown>> {
  remember(
    agentId: string,
    write: MemoryWrite<ReflectionMetadata>,
  ): MemoryRecord<ReflectionMetadata> | void;
}

export type SimulationAgentRuntimeDeps<P, MQ, MH, MW, A, RM = Record<string, unknown>> =
  CognitiveLoopDeps<P, MQ, MH, MW, A> & {
    reflectionMemory?: ReflectionMemoryWriter<RM>;
  };

export interface SimulationAgentRuntimeOptions {
  persistReflectionWrites?: boolean;
}

export interface RuntimeReflectionOptions {
  request?: LlmRequestOptionsLike;
  persistWrites?: boolean;
}

export interface RuntimeReflectionResult<RM = Record<string, unknown>>
  extends ReflectionResult<RM> {
  persistedRecords: readonly MemoryRecord<RM>[];
}

export class SimulationAgentRuntime<P, MQ, MH, MW, A, RM = Record<string, unknown>> {
  tick(agentId: string, now: string): Promise<CognitiveTickResult<A>>;
  tickSync(agentId: string, now: string): CognitiveTickResult<A>;
  reflect<EvidenceMetadata>(
    input: ReflectionInput<EvidenceMetadata>,
    planner: ReflectionPlanner<EvidenceMetadata, RM>,
    options?: RuntimeReflectionOptions,
  ): Promise<RuntimeReflectionResult<RM>>;
}
```

### 3. Contracts

- `tick` delegates to `runCognitiveTick`; it must not duplicate loop phase logic or change the reflect phase into an automatic scheduler.
- `tickSync` delegates to `runCognitiveTickSync`; it preserves the sync engine contract and visible async-planner misuse diagnostic.
- `reflect` delegates to `runReflection`; it must preserve M3 validation, diagnostics, and evidence-link rules.
- Dry-run reflection is the default. It returns candidate `memoryWrites` and `persistedRecords: []`.
- Reflection persistence is explicit via `persistReflectionWrites` or per-call `persistWrites`.
- Reflection persistence uses `reflectionMemory`, not the generic loop `memory` port, so host-specific loop memory write types do not get confused with `MemoryWrite<ReflectionMetadata>`.
- If persistence is requested without a `reflectionMemory` writer, return `status: "failed"`, no `memoryWrites`, and a visible diagnostic.
- The runtime facade still does not own world state, provider configuration, retry policy, budgets, secrets, embeddings, or multi-agent scheduling.

### 4. Validation & Error Matrix

- perception/retrieval/planning failure during `tick` -> same phase diagnostics as `runCognitiveTick`
- Promise-returning planner during `tickSync` -> same failed diagnostic as `runCognitiveTickSync`
- reflection input/planner/output failure -> same failed result as `runReflection`, `persistedRecords: []`
- `reflect` dry-run -> no memory persistence
- `reflect` persistence requested without `reflectionMemory` -> failed output diagnostic
- `reflectionMemory.remember` throws -> failed output diagnostic; do not report completed persistence
- malformed reflection output -> failed result and no persisted reflection memory

### 5. Good/Base/Bad Cases

Good:

```ts
const runtime = new SimulationAgentRuntime({
  perception,
  memory: store.toPort(),
  planning,
  actionSink,
  buildMemoryQuery,
  buildMemoryWrite,
  reflectionMemory: store,
}, { persistReflectionWrites: true });

await runtime.tick(agentId, now);
runtime.tickSync(agentId, now);
await runtime.reflect(reflectionInput, fakeReflectionPlanner);
```

Base:

```ts
const dryRun = await runtime.reflect(reflectionInput, fakeReflectionPlanner);
dryRun.memoryWrites;      // candidate writes
dryRun.persistedRecords; // []
```

Bad:

```ts
// Do not hide scheduling policy inside the facade's tick.
await runtime.tick(agentId, now); // must not auto-run reflection every tick

// Do not pass host world state mutation through runtime memory.
snapshot.agents[0].locationId = "garden";
```

### 6. Tests Required

Runtime facade tests must assert:

- `tick` runs through the existing cognitive loop and exposes proposal diagnostics;
- `tickSync` runs through the existing sync cognitive loop and exposes async-planner misuse visibly;
- `tick` records memories through the existing memory write hook;
- dry-run `reflect` returns candidate writes without mutating the memory store;
- persisting `reflect` writes `kind: "reflection"` records with evidence links;
- per-call dry-run can override a persisting runtime;
- malformed planner output and thrown planner errors do not persist fake records;
- persistence requested without a writer fails visibly;
- tests import only from `@elysian/simulation-agent`.

### 7. Wrong vs Correct

#### Wrong

```ts
// A facade that reimplements phases becomes a second cognitive loop.
class Runtime {
  async tick(...) {
    await perceive();
    await retrieve();
    await plan();
  }
}
```

#### Correct

```ts
class SimulationAgentRuntime {
  tick(agentId: string, now: string) {
    return runCognitiveTick(agentId, now, this.deps);
  }
}
```

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
