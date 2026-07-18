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
  assert.deepEqual(state.snapshot.agents.map((agent) => agent.currentAction?.id), ["elysia.morning.0", "kevin.morning.0", "eden.morning.0"]);
  assert.deepEqual(state.snapshot.agents.map((agent) => agent.currentPlanId), ["elysia.morning", "kevin.morning", "eden.morning"]);
  assert.deepEqual(state.agentMemories.map((memory) => memory.id), [
    "memory_seed_agent_elysia",
    "memory_seed_agent_kevin",
    "memory_seed_agent_eden",
  ]);
  assert.ok(state.agentMemories.every((memory) => memory.kind === "observation" && memory.metadata.source === "seed"));
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
    memoryIds: ["memory_seed_agent_elysia", "memory_seed_agent_kevin", "memory_seed_agent_eden"],
    provenance: "system",
    note: "Memory seeding records are stored in the engine memory stream; this event records the seed batch only.",
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

test("event validator rejects missing routine progression payload fields", () => {
  const atNoon = stepTimes(createSimulationEngine(), 72);
  const moved = atNoon.events.find((event) => event.kind === "agent.moved");
  const continued = atNoon.events.find((event) => event.kind === "agent.continuedRoutine");

  assert.ok(moved);
  assert.deepEqual(validateSimulationEvent({ ...moved, payload: {} }), [
    "event.payload.fromLocationId must be a non-empty string",
    "event.payload.toLocationId must be a non-empty string",
    "event.payload.reason must be routine",
    "event.payload.routineId must be a non-empty string",
    "event.payload.intent must be a non-empty string",
  ]);
  assert.ok(continued);
  assert.deepEqual(validateSimulationEvent({ ...continued, payload: {} }), [
    "event.payload.routineId must be a non-empty string",
    "event.payload.locationId must be a non-empty string",
    "event.payload.intent must be a non-empty string",
    "event.payload.period must be one of: morning, day, evening, night",
    "event.payload.provenance must be configured",
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

test("direct private message rejects non-user sources", () => {
  const input = createInterventionInput(
    "input_llm_dm_source_001",
    "directPrivateMessage",
    ["agent_elysia"],
    { message: "Generated message." },
  );
  const result = stepSimulationEngine(queueSimulationInput(createSimulationEngine(), { ...input, source: "llm" }));

  assert.deepEqual(result.state.snapshot.activeConversations, []);
  assert.equal(result.state.agentMemories.some((memory) => memory.metadata.conversationId !== undefined), false);
  assert.equal(result.events.at(-1)?.kind, "simulation.inputRejected");
  assert.deepEqual(result.events.at(-1)?.payload, {
    inputId: "input_llm_dm_source_001",
    code: "INVALID_SIMULATION_INPUT",
    message: "directPrivateMessage input source must be user",
    commandKind: "directPrivateMessage",
  });
});

test("direct private message creates a conversation response and linked memories", () => {
  const inputId = "input_user_dm_001";
  const result = stepSimulationEngine(queueSimulationInput(
    createSimulationEngine(),
    createInterventionInput(inputId, "directPrivateMessage", ["agent_elysia"], { message: "  Hello Elysia.  " }),
  ));

  assert.deepEqual(createEventKindTimeline(result.events).slice(-4), [
    "realm.interventionSubmitted",
    "conversation.started",
    "conversation.messageSent",
    "conversation.messageSent",
  ]);
  assert.deepEqual(result.state.snapshot.activeConversations, [{
    id: "conversation_user_agent_elysia",
    worldId: OBSERVATION_MVP_WORLD_ID,
    participants: ["agent_elysia"],
    state: "participating",
    locationId: "atrium",
    startedAt: "2026-05-31T06:05:00.000Z",
    lastMessageAt: "2026-05-31T06:05:00.000Z",
    messageCount: 2,
  }]);

  const messages = result.events.filter((event) => event.kind === "conversation.messageSent");
  const incoming = messages[0];
  const response = messages[1];
  assert.deepEqual(incoming?.payload, {
    conversationId: "conversation_user_agent_elysia",
    messageId: "message_evt_0605_001_010_intervention_submitted_incoming",
    senderId: "user",
    recipientId: "agent_elysia",
    content: "Hello Elysia.",
    direction: "incoming",
    messageIndex: 1,
    memoryId: "memory_message_evt_0605_001_010_intervention_submitted_incoming",
  });
  assert.equal(response?.actorId, "agent_elysia");
  assert.equal(response?.source, "agent");
  assert.deepEqual(response?.payload, {
    conversationId: "conversation_user_agent_elysia",
    messageId: "message_evt_0605_001_010_intervention_submitted_response",
    senderId: "agent_elysia",
    recipientId: "user",
    content: "I hear you, dear guest. You said: \"Hello Elysia.\" I will keep it in mind.",
    direction: "response",
    messageIndex: 2,
    memoryId: "memory_message_evt_0605_001_010_intervention_submitted_response",
    inReplyToMessageId: "message_evt_0605_001_010_intervention_submitted_incoming",
  });

  const privateMemories = result.state.agentMemories.filter((memory) => memory.metadata.conversationId === "conversation_user_agent_elysia");
  assert.equal(privateMemories.length, 2);
  assert.deepEqual(privateMemories.map((memory) => [memory.kind, memory.visibility, memory.metadata.messageRole]), [
    ["intervention", "user-authored", "incoming"],
    ["conversation", "private", "response"],
  ]);
  assert.deepEqual(privateMemories[1]?.relatedMemoryIds, [privateMemories[0]?.id]);
  assert.deepEqual(privateMemories[0]?.sourceIds, [
    "evt_0605_001_012_agent_elysia_private_message_incoming",
    "evt_0605_001_010_intervention_submitted",
    inputId,
  ]);
  assert.deepEqual(privateMemories[1]?.sourceIds, [
    "evt_0605_001_013_agent_elysia_private_message_response",
    "evt_0605_001_012_agent_elysia_private_message_incoming",
    "evt_0605_001_010_intervention_submitted",
    inputId,
  ]);
  for (const event of result.events) {
    assert.deepEqual(validateSimulationEvent(event), []);
  }
});

test("private messages reuse their conversation and remain deterministic", () => {
  const run = () => {
    const first = stepSimulationEngine(queueSimulationInput(
      createSimulationEngine(),
      createInterventionInput("input_user_dm_repeat_001", "directPrivateMessage", ["agent_kevin"], { message: "Are you available?" }),
    ));
    const second = stepSimulationEngine(queueSimulationInput(
      first.state,
      createInterventionInput("input_user_dm_repeat_002", "directPrivateMessage", ["agent_kevin"], { message: "I will keep this brief." }),
    ));
    return {
      snapshot: second.state.snapshot,
      events: second.state.events,
      memories: second.state.agentMemories,
      replay: createReplaySummary(second.state.snapshot, second.state.events),
    };
  };

  const first = run();
  const second = run();

  assert.deepEqual(first, second);
  assert.equal(first.snapshot.activeConversations.length, 1);
  assert.equal(first.snapshot.activeConversations[0]?.id, "conversation_user_agent_kevin");
  assert.equal(first.snapshot.activeConversations[0]?.messageCount, 4);
  assert.equal(first.snapshot.activeConversations[0]?.startedAt, "2026-05-31T06:05:00.000Z");
  assert.equal(first.snapshot.activeConversations[0]?.lastMessageAt, "2026-05-31T06:10:00.000Z");
  assert.equal(first.events.filter((event) => event.kind === "conversation.started").length, 1);
  assert.deepEqual(first.events.filter((event) => event.kind === "conversation.messageSent").map((event) => event.payload.messageIndex), [1, 2, 3, 4]);
  assert.equal(first.memories.filter((memory) => memory.metadata.conversationId === "conversation_user_agent_kevin").length, 4);
});

test("conversation message validator rejects an incomplete payload", () => {
  const result = stepSimulationEngine(queueSimulationInput(
    createSimulationEngine(),
    createInterventionInput("input_user_dm_validator_001", "directPrivateMessage", ["agent_eden"], { message: "Hello." }),
  ));
  const message = result.events.find((event) => event.kind === "conversation.messageSent");

  assert.ok(message);
  assert.deepEqual(validateSimulationEvent({ ...message, payload: {} }), [
    "event.payload.conversationId must be a non-empty string",
    "event.payload.messageId must be a non-empty string",
    "event.payload.senderId must be a non-empty string",
    "event.payload.recipientId must be a non-empty string",
    "event.payload.content must be a non-empty string",
    "event.payload.direction must be one of: incoming, response",
    "event.payload.messageIndex must be a positive integer",
    "event.payload.memoryId must be a non-empty string",
  ]);
});

test("reviewed LLM move proposals update agent state and append provenance memory", () => {
  const queued = queueSimulationInput(createSimulationEngine(), createReviewedLlmProposalInput("input_user_reviewed_llm_move_001"));

  const result = stepSimulationEngine(queued);
  const agent = findAgent(result.state.snapshot.agents, "agent_elysia");
  const accepted = result.events.at(-1);
  const memory = result.state.agentMemories.find((candidate) => candidate.id === "memory_step_0605_001_agent_elysia_input_user_reviewed_llm_move_001_llm_proposal");

  assert.equal(agent?.locationId, "garden");
  assert.equal(agent?.status, "moving");
  assert.equal(agent?.currentPlanId, "llm.input_user_reviewed_llm_move_001.agent_elysia");
  assert.deepEqual(agent?.currentAction, {
    id: "llm.input_user_reviewed_llm_move_001.agent_elysia.move",
    kind: "move",
    startsAt: "2026-05-31T06:05:00.000Z",
    locationId: "garden",
    targetAgentId: "agent_eden",
    intent: "Walk to the garden and check on Eden gently.",
  });
  assert.equal(accepted?.kind, "realm.interventionSubmitted");
  assert.equal(accepted?.causedByInputId, "input_user_reviewed_llm_move_001");
  assert.deepEqual(accepted?.payload, {
    inputId: "input_user_reviewed_llm_move_001",
    commandKind: "realmEvent",
    accepted: true,
    summary: "realmEvent:llm.proposal.move",
    reviewedLlmProposal: {
      eventKind: "llm.proposal.move",
      provenance: "user-reviewed-llm-proposal",
      sandbox: true,
      agentId: "agent_elysia",
      proposalAction: "move",
      reason: "Eden is lingering near the fountain after rehearsal.",
      intent: "Walk to the garden and check on Eden gently.",
      llmOperationId: "llm_action_proposal_step_0600_000_agent_elysia",
      reviewedBy: "user",
      targetLocationId: "garden",
      targetAgentId: "agent_eden",
    },
  });
  assert.ok(memory);
  assert.equal(memory.kind, "plan");
  assert.equal(memory.agentId, "agent_elysia");
  assert.equal(memory.visibility, "user-authored");
  assert.deepEqual(memory.sourceIds, ["evt_0605_001_010_intervention_submitted", "input_user_reviewed_llm_move_001"]);
  assert.deepEqual(memory.tags, ["agent_elysia", "move", "llm", "user-reviewed"]);
  assert.equal(memory.metadata.source, "engine");
  assert.equal(memory.metadata.stepId, "step_0605_001");
  assert.equal(memory.metadata.locationId, "garden");
  assert.equal(memory.metadata.planId, "llm.input_user_reviewed_llm_move_001.agent_elysia");
  assert.equal(memory.metadata.llmOperationId, "llm_action_proposal_step_0600_000_agent_elysia");
  assert.equal(memory.metadata.reviewedBy, "user");
  assert.equal(memory.metadata.proposalAction, "move");
  for (const event of result.events) {
    assert.deepEqual(validateSimulationEvent(event), []);
  }
});

test("non-user reviewed LLM proposal inputs are rejected without applying generated output", () => {
  const queued = queueSimulationInput(
    createSimulationEngine(),
    createReviewedLlmProposalInput("input_llm_reviewed_llm_source_001", { source: "llm" }),
  );

  const result = stepSimulationEngine(queued);
  const agent = findAgent(result.state.snapshot.agents, "agent_elysia");

  assert.equal(agent?.locationId, "atrium");
  assert.equal(agent?.currentAction?.id, "elysia.morning.0");
  assert.equal(result.state.agentMemories.some((memory) => memory.id.includes("llm_proposal")), false);
  assert.equal(result.events.at(-1)?.kind, "simulation.inputRejected");
  assert.deepEqual(result.events.at(-1)?.payload, {
    inputId: "input_llm_reviewed_llm_source_001",
    code: "INVALID_SIMULATION_INPUT",
    message: "reviewed LLM proposal input source must be user",
    commandKind: "realmEvent",
  });
});

test("reviewed LLM proposals map every supported action into deterministic agent state", () => {
  const cases = [
    {
      action: "wait",
      targetIds: ["agent_elysia"],
      payload: { targetLocationId: undefined, targetAgentId: undefined },
      expectedStatus: "waiting",
      expectedKind: "wait",
      expectedLocationId: "atrium",
    },
    {
      action: "performActivity",
      targetIds: ["agent_elysia", "lounge"],
      payload: { eventKind: "llm.proposal.performActivity", proposalAction: "performActivity", targetLocationId: "lounge", targetAgentId: undefined },
      expectedStatus: "idle",
      expectedKind: "performActivity",
      expectedLocationId: "lounge",
    },
    {
      action: "reflect",
      targetIds: ["agent_elysia"],
      payload: { targetLocationId: undefined, targetAgentId: undefined },
      expectedStatus: "reflecting",
      expectedKind: "reflect",
      expectedLocationId: "atrium",
    },
    {
      action: "continue",
      targetIds: ["agent_elysia"],
      payload: { targetLocationId: undefined, targetAgentId: undefined },
      expectedStatus: "idle",
      expectedKind: "performActivity",
      expectedLocationId: "atrium",
    },
  ] as const;

  for (const testCase of cases) {
    const inputId = `input_user_reviewed_llm_${testCase.action}_001`;
    const result = stepSimulationEngine(queueSimulationInput(
      createSimulationEngine(),
      createReviewedLlmProposalInput(inputId, {
        targetIds: [...testCase.targetIds],
        payload: {
          eventKind: `llm.proposal.${testCase.action}`,
          proposalAction: testCase.action,
          ...testCase.payload,
        },
      }),
    ));
    const agent = findAgent(result.state.snapshot.agents, "agent_elysia");

    assert.equal(agent?.status, testCase.expectedStatus);
    assert.equal(agent?.locationId, testCase.expectedLocationId);
    assert.equal(agent?.currentPlanId, `llm.${inputId}.agent_elysia`);
    assert.equal(agent?.currentAction?.id, `llm.${inputId}.agent_elysia.${testCase.action}`);
    assert.equal(agent?.currentAction?.kind, testCase.expectedKind);
    assert.equal(agent?.currentAction?.locationId, testCase.expectedLocationId);
  }
});

test("same-step reviewed LLM proposals for one agent keep unique memory ids and do not corrupt later steps", () => {
  const queued = [
    createReviewedLlmProposalInput("input_user_reviewed_llm_multi_001"),
    createReviewedLlmProposalInput("input_user_reviewed_llm_multi_002", {
      targetIds: ["agent_elysia"],
      payload: {
        eventKind: "llm.proposal.wait",
        proposalAction: "wait",
        intent: "Wait near the garden path after checking in.",
        targetLocationId: undefined,
        targetAgentId: undefined,
      },
    }),
  ].reduce((state, input) => queueSimulationInput(state, input), createSimulationEngine());

  const result = stepSimulationEngine(queued);
  const proposalMemoryIds = result.state.agentMemories
    .filter((memory) => memory.id.includes("llm_proposal"))
    .map((memory) => memory.id);
  const next = stepSimulationEngine(result.state);

  assert.deepEqual(proposalMemoryIds, [
    "memory_step_0605_001_agent_elysia_input_user_reviewed_llm_multi_001_llm_proposal",
    "memory_step_0605_001_agent_elysia_input_user_reviewed_llm_multi_002_llm_proposal",
  ]);
  assert.equal(new Set(proposalMemoryIds).size, proposalMemoryIds.length);
  assert.equal(next.state.agentMemories.filter((memory) => memory.id.includes("llm_proposal")).length, 2);
});

test("reviewed LLM proposal state remains visible on post-startup steps", () => {
  const startup = stepSimulationEngine(createSimulationEngine());
  const result = stepSimulationEngine(queueSimulationInput(
    startup.state,
    createReviewedLlmProposalInput("input_user_reviewed_llm_post_startup_001"),
  ));
  const agent = findAgent(result.state.snapshot.agents, "agent_elysia");
  const elysiaReflection = result.reflectionDiagnostics.find((diagnostic) => diagnostic.agentId === "agent_elysia");

  assert.equal(agent?.locationId, "garden");
  assert.equal(agent?.status, "moving");
  assert.equal(agent?.currentAction?.id, "llm.input_user_reviewed_llm_post_startup_001.agent_elysia.move");
  assert.equal(result.events.some((event) => event.kind === "agent.continuedRoutine" && event.actorId === "agent_elysia"), false);
  assert.equal(elysiaReflection?.status, "skipped");
  assert.equal(elysiaReflection?.reason, "no current-step plan memory");
});

test("invalid reviewed LLM proposals are rejected without mutating agent state", () => {
  const queued = queueSimulationInput(
    createSimulationEngine(),
    createReviewedLlmProposalInput("input_user_reviewed_llm_bad_001", {
      targetIds: ["agent_elysia"],
      payload: { proposalAction: "move", targetLocationId: undefined },
    }),
  );

  const result = stepSimulationEngine(queued);
  const agent = findAgent(result.state.snapshot.agents, "agent_elysia");

  assert.equal(agent?.locationId, "atrium");
  assert.equal(agent?.currentAction?.id, "elysia.morning.0");
  assert.equal(result.state.agentMemories.some((memory) => memory.id.includes("llm_proposal")), false);
  assert.equal(result.events.at(-1)?.kind, "simulation.inputRejected");
  assert.deepEqual(result.events.at(-1)?.payload, {
    inputId: "input_user_reviewed_llm_bad_001",
    code: "INVALID_SIMULATION_INPUT",
    message: "reviewed LLM move proposal must include targetLocationId",
    commandKind: "realmEvent",
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

test("post-startup steps do not duplicate unchanged routine events", () => {
  const firstStep = stepSimulationEngine(createSimulationEngine());
  const secondStep = stepSimulationEngine(firstStep.state);

  assert.deepEqual(createEventKindTimeline(secondStep.events), ["world.timeAdvanced"]);
  assert.deepEqual(secondStep.state.snapshot.agents.map((agent) => agent.currentAction?.id), ["elysia.morning.0", "kevin.morning.0", "eden.morning.0"]);
  assert.equal(secondStep.state.agentMemories.length, 3);
  assert.ok(secondStep.agentTickDiagnostics.every((diagnostic) => findTickPhase(diagnostic, "retrieve")?.detail === "retrieved 1 memory hit(s)"));
});

test("post-startup steps progress agents through configured routine periods", () => {
  const atNoon = stepTimes(createSimulationEngine(), 72);

  const elysia = findAgent(atNoon.snapshot.agents, "agent_elysia");
  const kevin = findAgent(atNoon.snapshot.agents, "agent_kevin");
  const eden = findAgent(atNoon.snapshot.agents, "agent_eden");

  assert.equal(atNoon.snapshot.currentTime, "2026-05-31T12:00:00.000Z");
  assert.equal(elysia?.locationId, "lounge");
  assert.equal(elysia?.currentPlanId, "elysia.day");
  assert.equal(elysia?.currentAction?.id, "elysia.day.0");
  assert.equal(elysia?.currentAction?.kind, "performActivity");
  assert.equal(kevin?.locationId, "training-hall");
  assert.equal(kevin?.currentAction?.id, "kevin.day.0");
  assert.equal(eden?.locationId, "archives");
  assert.equal(eden?.currentAction?.id, "eden.day.0");
  assert.ok(atNoon.events.some((event) => event.kind === "agent.moved" && event.actorId === "agent_elysia"));
  assert.ok(atNoon.events.some((event) => event.kind === "agent.continuedRoutine" && event.actorId === "agent_eden"));
  assert.deepEqual(atNoon.agentMemories.map((memory) => memory.id), [
    "memory_seed_agent_elysia",
    "memory_step_1200_072_agent_elysia_plan",
    "memory_step_1200_072_agent_elysia_reflection",
    "memory_seed_agent_kevin",
    "memory_step_1200_072_agent_kevin_plan",
    "memory_step_1200_072_agent_kevin_reflection",
    "memory_seed_agent_eden",
    "memory_step_1200_072_agent_eden_plan",
    "memory_step_1200_072_agent_eden_reflection",
  ]);
  const elysiaPlanMemory = atNoon.agentMemories.find((memory) => memory.id === "memory_step_1200_072_agent_elysia_plan");
  assert.ok(elysiaPlanMemory);
  assert.equal(elysiaPlanMemory.kind, "plan");
  assert.equal(elysiaPlanMemory.agentId, "agent_elysia");
  assert.equal(elysiaPlanMemory.importance, 4);
  assert.deepEqual(elysiaPlanMemory.sourceIds, ["step_1200_072"]);
  assert.equal(elysiaPlanMemory.metadata.source, "engine");
  assert.equal(elysiaPlanMemory.metadata.stepId, "step_1200_072");
  assert.equal(elysiaPlanMemory.metadata.locationId, "lounge");
  assert.equal(elysiaPlanMemory.metadata.planId, "elysia.day.0");
  const elysiaReflectionMemory = atNoon.agentMemories.find((memory) => memory.id === "memory_step_1200_072_agent_elysia_reflection");
  assert.ok(elysiaReflectionMemory);
  assert.equal(elysiaReflectionMemory.kind, "reflection");
  assert.deepEqual(elysiaReflectionMemory.sourceIds, ["step_1200_072"]);
  assert.deepEqual(elysiaReflectionMemory.relatedMemoryIds, [
    "memory_step_1200_072_agent_elysia_plan",
    "memory_seed_agent_elysia",
  ]);
  assert.equal(elysiaReflectionMemory.metadata.source, "engine");
  assert.equal(elysiaReflectionMemory.metadata.triggerKind, "importance-threshold");
  assert.equal(elysiaReflectionMemory.metadata.reflectionSource, "deterministic");
});

test("engine memory records stay outside events timeline and replay projections", () => {
  const atNoon = stepTimes(createSimulationEngine(), 72);
  const replay = createReplaySummary(atNoon.snapshot, atNoon.events);
  const replayVisible = JSON.stringify({
    events: atNoon.events,
    replay,
  });

  assert.equal(atNoon.agentMemories.length, 9);
  assert.equal(replayVisible.includes("agentMemories"), false);
  assert.equal(replayVisible.includes("Elysia planned performActivity"), false);
  assert.equal(replayVisible.includes("Elysia reflected on agent_elysia planned performActivity"), false);
  assert.equal(replayVisible.includes("\"metadata\":{\"stepId\":\"step_1200_072\""), false);
  assert.equal(replay.timeline.length, atNoon.events.length);
});

test("reflection policy completes only for current-step plan memories and does not loop", () => {
  const firstStep = stepSimulationEngine(createSimulationEngine());
  assert.deepEqual(firstStep.reflectionDiagnostics, []);

  const secondStep = stepSimulationEngine(firstStep.state);
  assert.equal(secondStep.reflectionDiagnostics.length, expectedAgentIds.length);
  assert.ok(secondStep.reflectionDiagnostics.every((diagnostic) => diagnostic.status === "skipped" && diagnostic.reason === "no current-step plan memory"));

  const atNoon = stepResultTimes(createSimulationEngine(), 72);
  assert.equal(atNoon.reflectionDiagnostics.length, expectedAgentIds.length);
  assert.ok(atNoon.reflectionDiagnostics.every((diagnostic) => diagnostic.status === "completed"));
  assert.ok(atNoon.reflectionDiagnostics.every((diagnostic) => diagnostic.evidenceMemoryIds.length === 2));
  assert.ok(atNoon.reflectionDiagnostics.every((diagnostic) => diagnostic.persistedMemoryIds.length === 1));
  assert.equal(atNoon.reflectionDiagnostics[0]?.trigger?.kind, "importance-threshold");

  const afterNoon = stepSimulationEngine(atNoon.state);
  assert.equal(afterNoon.state.agentMemories.length, atNoon.state.agentMemories.length);
  assert.ok(afterNoon.reflectionDiagnostics.every((diagnostic) => diagnostic.status === "skipped" && diagnostic.reason === "no current-step plan memory"));
});

test("routine progression emits validated movement before routine events", () => {
  const atNoon = stepTimes(createSimulationEngine(), 72);
  const noonStepEvents = atNoon.events.filter((event) => event.stepId === "step_1200_072");
  const movedIndex = noonStepEvents.findIndex((event) => event.kind === "agent.moved" && event.actorId === "agent_elysia");
  const continuedIndex = noonStepEvents.findIndex((event) => event.kind === "agent.continuedRoutine" && event.actorId === "agent_elysia");

  assert.ok(movedIndex >= 0);
  assert.ok(continuedIndex > movedIndex);
  assert.deepEqual(noonStepEvents[movedIndex]?.payload, {
    fromLocationId: "atrium",
    toLocationId: "lounge",
    reason: "routine",
    routineId: "elysia.day.0",
    intent: "notice who may need company",
  });
  assert.deepEqual(noonStepEvents[continuedIndex]?.payload, {
    routineId: "elysia.day.0",
    locationId: "lounge",
    intent: "notice who may need company",
    period: "day",
    provenance: "configured",
  });
  for (const event of noonStepEvents) {
    assert.deepEqual(validateSimulationEvent(event), []);
  }
});

test("routine progression is deterministic for same seed and inputs", () => {
  const run = () => {
    const state = stepTimes(createSimulationEngine(), 205);
    return {
      replay: createReplaySummary(state.snapshot, state.events),
      agents: state.snapshot.agents.map((agent) => ({
        id: agent.id,
        status: agent.status,
        locationId: agent.locationId,
        currentPlanId: agent.currentPlanId,
        currentActionId: agent.currentAction?.id,
      })),
    };
  };

  assert.deepEqual(run(), run());
});

test("routine progression covers evening and night period transitions", () => {
  const atNight = stepTimes(createSimulationEngine(), 192);

  assert.equal(atNight.snapshot.currentTime, "2026-05-31T22:00:00.000Z");
  assert.equal(findAgent(atNight.snapshot.agents, "agent_elysia")?.currentAction?.id, "elysia.night.0");
  assert.equal(findAgent(atNight.snapshot.agents, "agent_kevin")?.currentAction?.id, "kevin.night.0");
  assert.equal(findAgent(atNight.snapshot.agents, "agent_eden")?.currentAction?.id, "eden.night.0");
  assert.ok(atNight.events.some((event) => event.kind === "agent.continuedRoutine" && event.payload.period === "evening"));
  assert.ok(atNight.events.some((event) => event.kind === "agent.continuedRoutine" && event.payload.period === "night"));
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

function stepTimes(initial: ReturnType<typeof createSimulationEngine>, count: number): ReturnType<typeof stepSimulationEngine>["state"] {
  return stepResultTimes(initial, count).state;
}

function stepResultTimes(initial: ReturnType<typeof createSimulationEngine>, count: number): ReturnType<typeof stepSimulationEngine> {
  let state = initial;
  let result: ReturnType<typeof stepSimulationEngine> | undefined;
  for (let index = 0; index < count; index += 1) {
    result = stepSimulationEngine(state);
    state = result.state;
  }
  assert.ok(result, "stepResultTimes requires a positive count");
  return result;
}

function findAgent(agents: ReturnType<typeof createSimulationEngine>["snapshot"]["agents"], id: string) {
  return agents.find((agent) => agent.id === id);
}

function findTickPhase(
  diagnostic: ReturnType<typeof stepSimulationEngine>["agentTickDiagnostics"][number],
  phase: string,
) {
  return diagnostic.phases.find((entry) => entry.phase === phase);
}

function createObserverInput(id: string, action: string, extraPayload: Record<string, unknown> = {}, targetIds = [OBSERVATION_MVP_WORLD_ID]): SimulationInput {
  return createInterventionInput(id, "observerCommand", targetIds, { action, ...extraPayload });
}

function createReviewedLlmProposalInput(
  id: string,
  overrides: { source?: SimulationInput["source"]; targetIds?: string[]; payload?: Record<string, unknown> } = {},
): SimulationInput {
  const input = createInterventionInput(id, "realmEvent", overrides.targetIds ?? ["agent_elysia", "garden", "agent_eden"], {
    eventKind: "llm.proposal.move",
    provenance: "user-reviewed-llm-proposal",
    sandbox: true,
    agentId: "agent_elysia",
    proposalAction: "move",
    reason: "Eden is lingering near the fountain after rehearsal.",
    intent: "Walk to the garden and check on Eden gently.",
    llmOperationId: "llm_action_proposal_step_0600_000_agent_elysia",
    reviewedBy: "user",
    targetLocationId: "garden",
    targetAgentId: "agent_eden",
    ...overrides.payload,
  });
  return overrides.source ? { ...input, source: overrides.source } : input;
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
