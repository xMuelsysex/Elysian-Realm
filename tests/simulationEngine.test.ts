import test from "node:test";
import assert from "node:assert/strict";

import type { SimulationInput } from "../src/shared/contracts/index.js";
import {
  createEventKindTimeline,
  createReplaySummary,
  createSimulationEngine,
  OBSERVATION_MVP_INITIAL_STEP_ID,
  OBSERVATION_MVP_INITIAL_TIME,
  OBSERVATION_MVP_WORLD_ID,
  queueSimulationInput,
  stepSimulationEngine,
  validateSimulationEvent,
} from "../src/server/simulation/index.js";

const expectedLocationIds = ["atrium", "garden", "lounge", "archives", "training-hall", "overlook", "quarters"];
const expectedAgentIds = ["agent_elysia", "agent_kevin", "agent_eden"];

test("creates a deterministic observation MVP seed snapshot", () => {
  const state = createSimulationEngine();

  assert.equal(state.snapshot.id, OBSERVATION_MVP_WORLD_ID);
  assert.equal(state.snapshot.status, "paused");
  assert.equal(state.snapshot.currentTime, OBSERVATION_MVP_INITIAL_TIME);
  assert.equal(state.snapshot.timeScale, 60);
  assert.equal(state.snapshot.lastStepId, OBSERVATION_MVP_INITIAL_STEP_ID);
  assert.deepEqual(state.snapshot.queuedInputs, []);
  assert.deepEqual(state.snapshot.activeConversations, []);
  assert.deepEqual(state.snapshot.locations.map((location) => location.id), expectedLocationIds);
  assert.deepEqual(state.snapshot.agents.map((agent) => agent.id), expectedAgentIds);
  assert.deepEqual(state.snapshot.agents.map((agent) => agent.status), ["idle", "idle", "idle"]);
});

test("first step emits stable startup and routine events", () => {
  const result = stepSimulationEngine(createSimulationEngine());

  assert.equal(result.state.snapshot.currentTime, "2026-05-31T06:05:00.000Z");
  assert.equal(result.state.snapshot.lastStepId, "step_0605_001");
  assert.deepEqual(createEventKindTimeline(result.events), [
    "world.created",
    "agent.spawned",
    "agent.spawned",
    "agent.spawned",
    "world.timeAdvanced",
    "agent.startedRoutine",
    "agent.startedRoutine",
    "agent.startedRoutine",
    "memory.seeded",
  ]);
  assert.deepEqual(result.events.map((event) => event.id), [
    "evt_0605_001_001_world_created",
    "evt_0605_001_002_agent_elysia_spawned",
    "evt_0605_001_003_agent_kevin_spawned",
    "evt_0605_001_004_agent_eden_spawned",
    "evt_0605_001_005_time_advanced",
    "evt_0605_001_006_agent_elysia_started_routine",
    "evt_0605_001_007_agent_kevin_started_routine",
    "evt_0605_001_008_agent_eden_started_routine",
    "evt_0605_001_009_memory_seeded",
  ]);
  for (const event of result.events) {
    assert.deepEqual(validateSimulationEvent(event), []);
  }
  assert.deepEqual(result.events[4]?.payload, {
    from: "2026-05-31T06:00:00.000Z",
    to: "2026-05-31T06:05:00.000Z",
    timeScale: 60,
    stepId: "step_0605_001",
  });
  assert.deepEqual(result.events.at(-1)?.payload, {
    seedBatchId: "mvp-current-roster-v1:memory-events-only",
    memoryIds: [],
    provenance: "system",
    note: "Memory seeding is recorded as an event only; MemoryRecord storage is deferred.",
  });
});

test("event validator rejects missing payload fields for known event kinds", () => {
  const result = stepSimulationEngine(createSimulationEngine());
  const worldCreated = result.events[0];

  assert.ok(worldCreated);
  assert.deepEqual(validateSimulationEvent({ ...worldCreated, payload: {} }), [
    "event.payload.seedId must be a non-empty string",
    "event.payload.personaIds must be a non-empty string array",
    "event.payload.locationIds must be a non-empty string array",
    "event.payload.initialStatus must be a non-empty string",
  ]);
});

test("queued observer input applies only during a step", () => {
  const initial = createSimulationEngine();
  const input = createObserverInput("input_user_resume_001", "resume");
  const queued = queueSimulationInput(initial, input);

  assert.equal(initial.snapshot.status, "paused");
  assert.equal(queued.snapshot.status, "paused");
  assert.deepEqual(queued.snapshot.queuedInputs.map((queuedInput) => queuedInput.id), ["input_user_resume_001"]);

  const result = stepSimulationEngine(queued);

  assert.equal(result.state.snapshot.status, "running");
  assert.deepEqual(result.state.snapshot.queuedInputs, []);
  assert.equal(result.events.at(-1)?.kind, "realm.interventionSubmitted");
  assert.equal(result.events.at(-1)?.causedByInputId, "input_user_resume_001");
  assert.deepEqual(result.events.at(-1)?.payload, {
    inputId: "input_user_resume_001",
    commandKind: "observerCommand",
    accepted: true,
    summary: "observerCommand:resume",
  });
});

test("invalid input action is rejected without applying command effects", () => {
  const initial = createSimulationEngine();
  const invalidInput = createObserverInput("input_user_bad_001", "teleport");
  const queued = queueSimulationInput(initial, invalidInput);

  const result = stepSimulationEngine(queued);

  assert.equal(result.state.snapshot.status, "paused");
  assert.equal(result.state.snapshot.timeScale, 60);
  assert.deepEqual(result.state.snapshot.queuedInputs, []);
  assert.equal(result.events.at(-1)?.kind, "simulation.inputRejected");
  assert.equal(result.events.at(-1)?.causedByInputId, "input_user_bad_001");
  assert.deepEqual(result.events.at(-1)?.payload, {
    inputId: "input_user_bad_001",
    code: "INVALID_SIMULATION_INPUT",
    message: "observerCommand.payload.action must be step, pause, resume, or setTimeScale",
    commandKind: "observerCommand",
  });
});

test("invalid input targets are rejected without being normalized into valid state", () => {
  const initial = createSimulationEngine();
  const invalidInput = createObserverInput("input_user_empty_targets_001", "resume", {}, []);
  const queued = queueSimulationInput(initial, invalidInput);

  assert.deepEqual(queued.snapshot.queuedInputs[0]?.command.targetIds, []);

  const result = stepSimulationEngine(queued);

  assert.equal(result.state.snapshot.status, "paused");
  assert.equal(result.events.at(-1)?.kind, "simulation.inputRejected");
  assert.deepEqual(result.events.at(-1)?.payload, {
    inputId: "input_user_empty_targets_001",
    code: "INVALID_SIMULATION_INPUT",
    message: "input.command.targetIds must be a non-empty string array",
    commandKind: "observerCommand",
  });
});

test("realm event with unknown target is rejected", () => {
  const queued = queueSimulationInput(
    createSimulationEngine(),
    createInterventionInput("input_user_bad_realm_target_001", "realmEvent", ["missing_location"], { eventKind: "garden.prompt" }),
  );

  const result = stepSimulationEngine(queued);

  assert.equal(result.events.at(-1)?.kind, "simulation.inputRejected");
  assert.deepEqual(result.events.at(-1)?.payload, {
    inputId: "input_user_bad_realm_target_001",
    code: "INVALID_SIMULATION_INPUT",
    message: "realmEvent targets must reference the active world, location, or agent",
    commandKind: "realmEvent",
  });
});

test("direct private message with unknown target is rejected", () => {
  const queued = queueSimulationInput(
    createSimulationEngine(),
    createInterventionInput("input_user_bad_dm_target_001", "directPrivateMessage", ["missing_agent"], { message: "Hello." }),
  );

  const result = stepSimulationEngine(queued);

  assert.equal(result.events.at(-1)?.kind, "simulation.inputRejected");
  assert.deepEqual(result.events.at(-1)?.payload, {
    inputId: "input_user_bad_dm_target_001",
    code: "INVALID_SIMULATION_INPUT",
    message: "directPrivateMessage targetIds must contain exactly one known agent id",
    commandKind: "directPrivateMessage",
  });
});

test("same seed and inputs produce the same replay summary", () => {
  const run = () => {
    const queued = queueSimulationInput(createSimulationEngine(), createObserverInput("input_user_scale_001", "setTimeScale", { timeScale: 120 }));
    const result = stepSimulationEngine(queued);
    return createReplaySummary(result.state.snapshot, result.state.events);
  };

  const first = run();
  const second = run();

  assert.deepEqual(first, second);
  assert.equal(first.worldId, OBSERVATION_MVP_WORLD_ID);
  assert.equal(first.finalStepId, "step_0605_001");
  assert.equal(first.finalTime, "2026-05-31T06:05:00.000Z");
  assert.equal(first.eventKinds.at(-1), "realm.interventionSubmitted");
});

test("setTimeScale input affects later time advancement events", () => {
  const queued = queueSimulationInput(createSimulationEngine(), createObserverInput("input_user_scale_002", "setTimeScale", { timeScale: 120 }));
  const firstStep = stepSimulationEngine(queued);
  const secondStep = stepSimulationEngine(firstStep.state);

  assert.equal(firstStep.state.snapshot.timeScale, 120);
  assert.deepEqual(secondStep.events[0]?.payload, {
    from: "2026-05-31T06:05:00.000Z",
    to: "2026-05-31T06:10:00.000Z",
    timeScale: 120,
    stepId: "step_0610_002",
  });
});

function createObserverInput(id: string, action: string, extraPayload: Record<string, unknown> = {}, targetIds = [OBSERVATION_MVP_WORLD_ID]): SimulationInput {
  return createInterventionInput(id, "observerCommand", targetIds, { action, ...extraPayload });
}

function createInterventionInput(id: string, kind: "observerCommand" | "realmEvent" | "directPrivateMessage", targetIds: string[], payload: Record<string, unknown>): SimulationInput {
  return {
    id,
    worldId: OBSERVATION_MVP_WORLD_ID,
    submittedAt: "2026-05-31T06:00:00.000Z",
    source: "user",
    command: {
      kind,
      targetIds,
      payload,
    },
  };
}
