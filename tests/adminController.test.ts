import test from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import type { AdminErrorResponse, AdminStateResponse, LlmActionProposalResponse, LlmConversationTurnResponse, LlmRuntimeTestResponse } from "../src/server/admin/index.js";
import { createAdminController, createAdminServer, createAdminStateResponse } from "../src/server/admin/index.js";
import { OBSERVATION_MVP_WORLD_ID, stepSimulationEngine, createSimulationEngine } from "../src/server/simulation/index.js";

test("admin controller exposes deterministic initial state", () => {
  const controller = createAdminController();
  const state = controller.getState();

  assert.equal(state.snapshot.id, OBSERVATION_MVP_WORLD_ID);
  assert.equal(state.snapshot.status, "paused");
  assert.deepEqual(state.events, []);
  assert.deepEqual(state.timeline, []);
  assert.deepEqual(state.diagnostics, []);
  assert.deepEqual(state.agentTickDiagnostics, []);
  assert.deepEqual(state.reflectionDiagnostics, []);
  assert.deepEqual(state.agentMemories.map((memory) => memory.id), [
    "memory_seed_agent_elysia",
    "memory_seed_agent_kevin",
    "memory_seed_agent_eden",
  ]);
  assert.equal(state.personas.length, 3);
  assert.ok(state.personas.some((persona) => persona.id === "elysia"));
});

test("admin state response exposes cloned read-only persona fixtures", () => {
  const controller = createAdminController();
  const first = controller.getState();

  first.personas[0]?.profile.longTermGoals.push("mutated by test response");
  first.personas[0]?.relationships.push({ targetPersonaId: "mutated", affinity: 1, trust: 1, tension: 9, notes: "should not persist" });

  const second = controller.getState();
  assert.equal(second.personas[0]?.profile.longTermGoals.includes("mutated by test response"), false);
  assert.equal(second.personas[0]?.relationships.some((relationship) => relationship.targetPersonaId === "mutated"), false);
});

test("admin state response exposes cloned read-only agent memory records", () => {
  const controller = createAdminController();
  const first = controller.getState();
  const mutableMemory = first.agentMemories[0] as typeof first.agentMemories[number] & {
    sourceIds: string[];
    tags: string[];
    metadata: { source: "engine" | "seed" };
  };

  mutableMemory.sourceIds.push("mutated_source");
  mutableMemory.tags.push("mutated_tag");
  mutableMemory.metadata.source = "engine";

  const second = controller.getState();
  assert.deepEqual(second.agentMemories[0]?.sourceIds, ["mvp-current-roster-v1:agent_elysia:initial-memory"]);
  assert.equal(second.agentMemories[0]?.tags.includes("mutated_tag"), false);
  assert.equal(second.agentMemories[0]?.metadata.source, "seed");
});

test("admin state response deeply clones conversation event payloads", () => {
  const controller = createAdminController();
  const submitted = controller.submitInput({
    kind: "directPrivateMessage",
    targetIds: ["agent_elysia"],
    payload: { message: "Hello Elysia." },
    source: "user",
  });
  assert.equal(submitted.ok, true);
  if (!submitted.ok) return;

  const started = submitted.body.events.find((event) => event.kind === "conversation.started");
  assert.ok(started);
  const participantIds = started.payload.participantIds as string[];
  participantIds.push("agent_mutated");

  const second = controller.getState();
  const persisted = second.events.find((event) => event.kind === "conversation.started");
  assert.deepEqual(persisted?.payload.participantIds, ["agent_elysia"]);
});

test("admin state response exposes cloned reflection diagnostics", () => {
  const controller = createAdminController();
  const reflected = stepControllerTimes(controller, 72);
  const mutableDiagnostic = reflected.reflectionDiagnostics[0] as typeof reflected.reflectionDiagnostics[number] & {
    evidenceMemoryIds: string[];
    persistedMemoryIds: string[];
    diagnostics: Array<{ evidenceMemoryIds?: string[] }>;
    trigger?: { sourceIds: string[] };
  };

  mutableDiagnostic.evidenceMemoryIds.push("mutated_evidence");
  mutableDiagnostic.persistedMemoryIds.push("mutated_persisted");
  mutableDiagnostic.diagnostics[0]?.evidenceMemoryIds?.push("mutated_nested");
  mutableDiagnostic.trigger?.sourceIds.push("mutated_source");

  const second = controller.getState();
  assert.equal(second.reflectionDiagnostics[0]?.evidenceMemoryIds.includes("mutated_evidence"), false);
  assert.equal(second.reflectionDiagnostics[0]?.persistedMemoryIds.includes("mutated_persisted"), false);
  assert.equal(second.reflectionDiagnostics[0]?.diagnostics[0]?.evidenceMemoryIds?.includes("mutated_nested"), false);
  assert.equal(second.reflectionDiagnostics[0]?.trigger?.sourceIds.includes("mutated_source"), false);
});

test("admin controller steps through the simulation engine", () => {
  const controller = createAdminController();
  const stepped = controller.step();

  assert.equal(stepped.snapshot.currentTime, "2026-05-31T06:05:00.000Z");
  assert.equal(stepped.snapshot.lastStepId, "step_0605_001");
  assert.ok(stepped.events.some((event) => event.kind === "world.timeAdvanced"));
  assert.equal(stepped.timeline.length, stepped.events.length);
});

test("admin controller exposes latest agent tick diagnostics outside replay events", () => {
  const controller = createAdminController();
  const startup = controller.step();
  const stepped = controller.step();

  assert.deepEqual(startup.agentTickDiagnostics, []);
  assert.equal(stepped.agentTickDiagnostics.length, stepped.snapshot.agents.length);
  assert.ok(stepped.agentTickDiagnostics.every((diagnostic) => diagnostic.phases.length === 6));
  assert.ok(stepped.agentTickDiagnostics.some((diagnostic) => diagnostic.agentId === "agent_elysia"));
  assert.equal(stepped.agentMemories.length, 3);
  assert.equal(stepped.reflectionDiagnostics.length, stepped.snapshot.agents.length);
  assert.ok(stepped.reflectionDiagnostics.every((diagnostic) => diagnostic.status === "skipped"));

  const replayVisible = JSON.stringify({
    events: stepped.events,
    timeline: stepped.timeline,
    replay: stepped.replay,
  });
  assert.equal(replayVisible.includes("agentTickDiagnostics"), false);
  assert.equal(replayVisible.includes("reflectionDiagnostics"), false);
  assert.equal(replayVisible.includes("\"phases\""), false);
  assert.equal(replayVisible.includes("agentMemories"), false);
  assert.equal(replayVisible.includes("starts in atrium with the configured morning routine"), false);
  assert.equal(stepped.timeline.length, stepped.events.length);
  assert.equal(stepped.replay.timeline.length, stepped.events.length);
});

test("admin controller reset returns the deterministic seed", () => {
  const controller = createAdminController();
  controller.step();
  controller.step();
  const reset = controller.reset();

  assert.equal(reset.snapshot.id, OBSERVATION_MVP_WORLD_ID);
  assert.equal(reset.snapshot.status, "paused");
  assert.equal(reset.snapshot.currentTime, "2026-05-31T06:00:00.000Z");
  assert.deepEqual(reset.events, []);
  assert.deepEqual(reset.agentTickDiagnostics, []);
});

test("admin controller submits typed observer inputs through the engine", () => {
  const controller = createAdminController();
  const result = controller.submitInput({
    kind: "observerCommand",
    targetIds: [OBSERVATION_MVP_WORLD_ID],
    payload: { action: "resume" },
    source: "user",
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.equal(result.body.snapshot.status, "running");
  assert.equal(result.body.events.at(-1)?.kind, "realm.interventionSubmitted");
  assert.equal(result.body.events.at(-1)?.source, "user");
});

test("admin controller submitInput returns latest diagnostics when agent ticks run", () => {
  const controller = createAdminController();
  controller.step();

  const result = controller.submitInput({
    kind: "observerCommand",
    targetIds: [OBSERVATION_MVP_WORLD_ID],
    payload: { action: "resume" },
    source: "user",
  });

  assert.equal(result.ok, true);
  assert.equal(result.body.snapshot.status, "running");
  assert.equal(result.body.agentTickDiagnostics.length, result.body.snapshot.agents.length);
  assert.ok(result.body.agentTickDiagnostics.every((diagnostic) => diagnostic.phases.some((phase) => phase.phase === "plan")));
});

test("admin controller exposes the complete private message flow and resets it deterministically", () => {
  const controller = createAdminController();
  const first = controller.submitInput({
    kind: "directPrivateMessage",
    targetIds: ["agent_elysia"],
    payload: { message: "Hello Elysia." },
    source: "user",
  });

  assert.equal(first.ok, true);
  assert.equal(first.body.snapshot.activeConversations[0]?.id, "conversation_user_agent_elysia");
  assert.equal(first.body.snapshot.activeConversations[0]?.messageCount, 2);
  assert.deepEqual(first.body.events.filter((event) => event.kind === "conversation.messageSent").map((event) => event.payload.content), [
    "Hello Elysia.",
    "I hear you, dear guest. You said: \"Hello Elysia.\" I will keep it in mind.",
  ]);
  assert.equal(first.body.agentMemories.filter((memory) => memory.metadata.conversationId === "conversation_user_agent_elysia").length, 2);
  assert.equal(first.body.timeline.length, first.body.events.length);
  assert.equal(first.body.replay.timeline.length, first.body.events.length);

  const reset = controller.reset();
  assert.deepEqual(reset.snapshot.activeConversations, []);
  assert.equal(reset.agentMemories.filter((memory) => memory.metadata.conversationId !== undefined).length, 0);

  const repeated = controller.submitInput({
    kind: "directPrivateMessage",
    targetIds: ["agent_elysia"],
    payload: { message: "Hello Elysia." },
    source: "user",
  });
  assert.equal(repeated.ok, true);
  if (!repeated.ok) return;
  assert.deepEqual(repeated.body.snapshot.activeConversations, first.body.snapshot.activeConversations);
  assert.deepEqual(repeated.body.events, first.body.events);
  assert.deepEqual(repeated.body.agentMemories, first.body.agentMemories);
});

test("admin controller rejects malformed admin requests with structured errors", () => {
  const controller = createAdminController();
  const result = controller.submitInput({
    kind: "directPrivateMessage",
    targetIds: [],
    payload: { message: "Hello." },
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.equal(result.body.error.code, "INVALID_ADMIN_INPUT_REQUEST");
  assert.match(result.body.error.message, /targetIds/);
});

test("admin controller surfaces simulation validation diagnostics", () => {
  const controller = createAdminController();
  const result = controller.submitInput({
    kind: "directPrivateMessage",
    targetIds: ["missing_agent"],
    payload: { message: "Hello." },
    source: "user",
  });

  assert.equal(result.ok, true);
  assert.equal(result.body.snapshot.status, "paused");
  assert.equal(result.body.events.at(-1)?.kind, "simulation.inputRejected");
  assert.equal(result.body.diagnostics.length, 1);
  assert.match(result.body.diagnostics[0]?.message ?? "", /directPrivateMessage targetIds/);
});

test("admin controller rejects non-user reviewed LLM proposal submissions", () => {
  const controller = createAdminController();
  const result = controller.submitInput({
    kind: "realmEvent",
    targetIds: ["agent_elysia", "garden"],
    source: "llm",
    payload: {
      eventKind: "llm.proposal.move",
      provenance: "user-reviewed-llm-proposal",
      sandbox: true,
      agentId: "agent_elysia",
      proposalAction: "move",
      reason: "Generated proposal must still be user-reviewed.",
      intent: "Move to the garden.",
      llmOperationId: "llm_action_proposal_step_0600_000_agent_elysia",
      reviewedBy: "user",
      targetLocationId: "garden",
    },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const agent = result.body.snapshot.agents.find((candidate) => candidate.id === "agent_elysia");

  assert.equal(agent?.locationId, "atrium");
  assert.equal(agent?.currentAction?.id, "elysia.morning.0");
  assert.equal(result.body.events.at(-1)?.kind, "simulation.inputRejected");
  assert.match(result.body.diagnostics[0]?.message ?? "", /source must be user/);
});

test("admin controller tests runtime LLM config without returning API keys", async () => {
  const calls: Array<{ input: string | URL | Request; init?: RequestInit }> = [];
  const controller = createAdminController(createSimulationEngine(), {
    now: () => new Date("2026-05-31T06:00:00.000Z"),
    fetchImpl: async (input, init) => {
      calls.push({ input, init });
      return new Response(
        JSON.stringify({
          id: "chatcmpl_admin_test_001",
          choices: [{ finish_reason: "stop", message: { role: "assistant", content: "LLM connection works." } }],
          usage: { prompt_tokens: 12, completion_tokens: 4, total_tokens: 16 },
        }),
        { status: 200, statusText: "OK" },
      );
    },
  });

  const result = await controller.testLlmRuntimeConfig({
    baseUrl: "https://example.test/v1",
    model: "test-model",
    apiKey: "test-secret-key",
    providerName: "runtime-test-provider",
    apiMode: "chat_completions",
    timeoutMs: 5000,
    prompt: "Test connectivity.",
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.equal(result.body.provider.name, "runtime-test-provider");
  assert.equal(result.body.operation.status, "completed");
  assert.equal(result.body.outputText, "LLM connection works.");
  assert.equal(String(calls[0]?.input), "https://example.test/v1/chat/completions");
  assert.equal(JSON.stringify(result.body).includes("test-secret-key"), false);
});

test("admin controller rejects malformed runtime LLM config", async () => {
  const controller = createAdminController();

  const result = await controller.testLlmRuntimeConfig({
    baseUrl: "https://example.test/v1",
    model: "",
    apiKey: "test-secret-key",
    prompt: "Test connectivity.",
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.equal(result.body.error.code, "INVALID_LLM_RUNTIME_TEST_REQUEST");
  assert.match(result.body.error.message, /model/);
});

test("admin controller generates sandbox LLM action proposals without mutating state or returning API keys", async () => {
  const calls: Array<{ input: string | URL | Request; init?: RequestInit; body: Record<string, unknown> }> = [];
  const controller = createAdminController(createSimulationEngine(), {
    now: sequentialNow(["2026-05-31T06:00:00.000Z", "2026-05-31T06:00:01.000Z"]),
    fetchImpl: async (input, init) => {
      calls.push({ input, init, body: JSON.parse(String(init?.body)) as Record<string, unknown> });
      return new Response(
        JSON.stringify({
          id: "chatcmpl_action_proposal_001",
          choices: [
            {
              finish_reason: "stop",
              message: {
                role: "assistant",
                content: JSON.stringify({
                  action: "move",
                  reason: "Elysia wants to greet the morning with a gentle walk.",
                  intent: "Invite a calm encounter near the garden path.",
                  targetLocationId: "garden",
                }),
              },
            },
          ],
          usage: { prompt_tokens: 52, completion_tokens: 18, total_tokens: 70 },
        }),
        { status: 200, statusText: "OK" },
      );
    },
  });
  const before = controller.getState();

  const result = await controller.proposeLlmAction({
    baseUrl: "https://example.test/v1",
    model: "test-model",
    apiKey: "test-secret-key",
    providerName: "proposal-test-provider",
    agentId: "agent_elysia",
    apiMode: "chat_completions",
    timeoutMs: 5000,
  });
  const after = controller.getState();

  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.equal(result.body.provider.name, "proposal-test-provider");
  assert.equal(result.body.sandbox, true);
  assert.equal(result.body.provenance, "generated");
  assert.equal(result.body.agentId, "agent_elysia");
  assert.equal(result.body.operation.kind, "actionProposal");
  assert.equal(result.body.operation.status, "completed");
  assert.equal(result.body.proposal?.action, "move");
  assert.equal(result.body.proposal?.targetLocationId, "garden");
  assert.equal(String(calls[0]?.input), "https://example.test/v1/chat/completions");
  assert.deepEqual(before.snapshot, after.snapshot);
  assert.deepEqual(before.events, after.events);
  assert.equal(JSON.stringify(result.body).includes("test-secret-key"), false);
  assert.equal(JSON.stringify(calls[0]?.body).includes("test-secret-key"), false);

  const proposal = result.body.proposal;
  assert.ok(proposal);
  const reviewed = controller.submitInput({
    kind: "realmEvent",
    source: "user",
    targetIds: ["agent_elysia", "garden"],
    payload: {
      eventKind: `llm.proposal.${proposal.action}`,
      provenance: "user-reviewed-llm-proposal",
      sandbox: true,
      agentId: "agent_elysia",
      proposalAction: proposal.action,
      reason: proposal.reason,
      intent: proposal.intent,
      llmOperationId: result.body.operation.id,
      reviewedBy: "user",
      targetLocationId: proposal.targetLocationId,
    },
  });
  assert.equal(reviewed.ok, true);
  if (!reviewed.ok) return;
  const reviewedAgent = reviewed.body.snapshot.agents.find((agent) => agent.id === "agent_elysia");

  assert.equal(reviewedAgent?.locationId, "garden");
  assert.equal(reviewedAgent?.status, "moving");
  assert.equal(reviewedAgent?.currentAction?.id, "llm.admin_input_001.agent_elysia.move");
  assert.equal(reviewed.body.events.at(-1)?.kind, "realm.interventionSubmitted");
  assert.equal(reviewed.body.agentMemories.some((memory) => (
    memory.id === "memory_step_0605_001_agent_elysia_admin_input_001_llm_proposal" &&
    memory.metadata.llmOperationId === "llm_action_proposal_step_0600_000_agent_elysia"
  )), true);
});

test("admin controller returns failed operation metadata for invalid LLM proposal targets", async () => {
  const controller = createAdminController(createSimulationEngine(), {
    now: sequentialNow(["2026-05-31T06:00:00.000Z", "2026-05-31T06:00:01.000Z"]),
    fetchImpl: async () => new Response(
      JSON.stringify({
        id: "chatcmpl_action_proposal_invalid_target_001",
        choices: [
          {
            finish_reason: "stop",
            message: {
              role: "assistant",
              content: JSON.stringify({
                action: "move",
                reason: "Try an impossible shortcut.",
                targetLocationId: "missing-location",
              }),
            },
          },
        ],
      }),
      { status: 200, statusText: "OK" },
    ),
  });

  const result = await controller.proposeLlmAction({
    baseUrl: "https://example.test/v1",
    model: "test-model",
    apiKey: "test-secret-key",
    agentId: "agent_elysia",
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.equal(result.body.operation.status, "failed");
  assert.equal(result.body.operation.error?.code, "LLM_ACTION_PROPOSAL_VALIDATION_ERROR");
  assert.match(result.body.operation.error?.message ?? "", /targetLocationId/);
  assert.equal(result.body.proposal, undefined);
});

test("admin controller rejects action proposals for unknown agents before calling LLM", async () => {
  let callCount = 0;
  const controller = createAdminController(createSimulationEngine(), {
    fetchImpl: async () => {
      callCount += 1;
      return new Response("{}", { status: 200, statusText: "OK" });
    },
  });

  const result = await controller.proposeLlmAction({
    baseUrl: "https://example.test/v1",
    model: "test-model",
    apiKey: "test-secret-key",
    agentId: "missing-agent",
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.equal(result.body.error.code, "INVALID_LLM_ACTION_PROPOSAL_REQUEST");
  assert.match(result.body.error.message, /agentId/);
  assert.equal(callCount, 0);
});

test("admin controller generates a persona conversation draft and applies it only after review", async () => {
  const calls: Array<{ input: string | URL | Request; init?: RequestInit }> = [];
  const controller = createAdminController(createSimulationEngine(), {
    now: sequentialNow(["2026-05-31T06:00:00.000Z", "2026-05-31T06:00:01.000Z"]),
    fetchImpl: async (input, init) => {
      calls.push({ input, init });
      return new Response(
        JSON.stringify({
          id: "chatcmpl_conversation_turn_001",
          choices: [{
            finish_reason: "stop",
            message: {
              role: "assistant",
              content: JSON.stringify({
                reply: "The garden feels patient tonight, dear guest.",
                tone: "warm and reflective",
                memoryImportance: 7,
                shouldContinue: true,
              }),
            },
          }],
          usage: { prompt_tokens: 80, completion_tokens: 22, total_tokens: 102 },
        }),
        { status: 200, statusText: "OK" },
      );
    },
  });
  const before = controller.getState();

  const generated = await controller.proposeConversationTurn({
    baseUrl: "https://example.test/v1",
    model: "test-model",
    apiKey: "test-secret-key",
    providerName: "conversation-test-provider",
    agentId: "agent_elysia",
    message: "How does the garden feel tonight?",
    timeoutMs: 5000,
  });
  const afterGeneration = controller.getState();

  assert.equal(generated.ok, true);
  if (!generated.ok) return;
  assert.equal(generated.body.operation.kind, "conversationTurn");
  assert.equal(generated.body.operation.promptSchemaVersion, "conversation-turn-v1");
  assert.equal(generated.body.operation.status, "completed");
  assert.equal(generated.body.sandbox, true);
  assert.equal(generated.body.draft?.reply, "The garden feels patient tonight, dear guest.");
  assert.deepEqual(generated.body.draft?.referencedMemoryIds, ["memory_seed_agent_elysia"]);
  assert.deepEqual(before.snapshot, afterGeneration.snapshot);
  assert.deepEqual(before.events, afterGeneration.events);
  assert.equal(JSON.stringify(generated.body).includes("test-secret-key"), false);

  const providerBody = JSON.parse(String(calls[0]?.init?.body)) as { messages?: Array<{ content?: string }> };
  assert.match(providerBody.messages?.[0]?.content ?? "", /untrusted quoted data/);
  assert.match(providerBody.messages?.[1]?.content ?? "", /playful, affectionate, and observant/);
  assert.match(providerBody.messages?.[1]?.content ?? "", /How does the garden feel tonight/);

  const mismatchedReview = controller.submitInput({
    kind: "conversationTurn",
    targetIds: ["agent_elysia"],
    source: "user",
    payload: {
      provenance: "user-reviewed-llm-conversation",
      sandbox: true,
      agentId: "agent_elysia",
      message: "A different original message must not be accepted.",
      reply: "This reply should not be persisted.",
      tone: "neutral",
      memoryImportance: 5,
      shouldContinue: true,
      llmOperationId: generated.body.operation.id,
      reviewedBy: "user",
      referencedMemoryIds: generated.body.draft?.referencedMemoryIds ?? [],
    },
  });
  assert.equal(mismatchedReview.ok, false);
  if (mismatchedReview.ok) return;
  assert.match(mismatchedReview.body.error.message, /message must match/);
  assert.deepEqual(controller.getState().snapshot, before.snapshot);

  const applied = controller.submitInput({
    kind: "conversationTurn",
    targetIds: ["agent_elysia"],
    source: "user",
    payload: {
      provenance: "user-reviewed-llm-conversation",
      sandbox: true,
      agentId: "agent_elysia",
      message: generated.body.message,
      reply: "The garden is quiet, but it would welcome your company.",
      tone: "gently inviting",
      memoryImportance: 8,
      shouldContinue: true,
      llmOperationId: generated.body.operation.id,
      reviewedBy: "user",
      referencedMemoryIds: generated.body.draft?.referencedMemoryIds ?? [],
    },
  });
  assert.equal(applied.ok, true);
  if (!applied.ok) return;
  const responseEvent = applied.body.events.find((event) => (
    event.kind === "conversation.messageSent" && event.payload.direction === "response"
  ));
  assert.equal(responseEvent?.payload.content, "The garden is quiet, but it would welcome your company.");
  assert.equal(responseEvent?.payload.llmOperationId, generated.body.operation.id);
  const responseMemory = applied.body.agentMemories.find((memory) => memory.metadata.llmOperationId === generated.body.operation.id);
  assert.equal(responseMemory?.importance, 8);
  assert.deepEqual(responseMemory?.relatedMemoryIds, [
    "memory_message_evt_0605_001_010_intervention_submitted_incoming",
    "memory_seed_agent_elysia",
  ]);

  const repeated = controller.submitInput({
    kind: "conversationTurn",
    targetIds: ["agent_elysia"],
    source: "user",
    payload: {
      provenance: "user-reviewed-llm-conversation",
      sandbox: true,
      agentId: "agent_elysia",
      message: generated.body.message,
      reply: "Try to apply the same operation twice.",
      tone: "neutral",
      memoryImportance: 5,
      shouldContinue: true,
      llmOperationId: generated.body.operation.id,
      reviewedBy: "user",
      referencedMemoryIds: generated.body.draft?.referencedMemoryIds ?? [],
    },
  });
  assert.equal(repeated.ok, false);
  if (repeated.ok) return;
  assert.equal(repeated.body.error.code, "INVALID_REVIEWED_CONVERSATION_TURN");
  assert.match(repeated.body.error.message, /already been applied/);
});

test("admin controller rejects reviewed conversation turns without a generated operation", () => {
  const controller = createAdminController();
  const result = controller.submitInput({
    kind: "conversationTurn",
    targetIds: ["agent_elysia"],
    source: "user",
    payload: {
      provenance: "user-reviewed-llm-conversation",
      sandbox: true,
      agentId: "agent_elysia",
      message: "Forged message.",
      reply: "Forged reply.",
      tone: "neutral",
      memoryImportance: 5,
      shouldContinue: true,
      llmOperationId: "missing-operation",
      reviewedBy: "user",
      referencedMemoryIds: [],
    },
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.body.error.code, "INVALID_REVIEWED_CONVERSATION_TURN");
  assert.match(result.body.error.message, /generated conversation operation/);
});

test("admin state diagnostics include event validation failures", () => {
  const stepped = stepSimulationEngine(createSimulationEngine()).state;
  const firstEvent = stepped.events[0];

  assert.ok(firstEvent);
  const state = createAdminStateResponse({
    ...stepped,
    events: [{ ...firstEvent, payload: {} }],
  });

  assert.ok(state.diagnostics.some((diagnostic) => diagnostic.message.includes("event.payload.seedId")));
});

test("admin http server exposes state, step, input, LLM test, and structured JSON errors", async () => {
  const server = createAdminServer({
    controller: createAdminController(createSimulationEngine(), {
      now: () => new Date("2026-05-31T06:00:00.000Z"),
      fetchImpl: async (_input, init) => {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        if ("response_format" in body) {
          if (JSON.stringify(body.messages).includes("private-message reply")) {
            return new Response(
              JSON.stringify({
                id: "chatcmpl_admin_http_conversation_turn_001",
                choices: [
                  {
                    finish_reason: "stop",
                    message: {
                      role: "assistant",
                      content: JSON.stringify({
                        reply: "The atrium is bright, but I can still hear your question clearly.",
                        tone: "warm and attentive",
                        memoryImportance: 6,
                        shouldContinue: true,
                      }),
                    },
                  },
                ],
              }),
              { status: 200, statusText: "OK" },
            );
          }
          return new Response(
            JSON.stringify({
              id: "chatcmpl_admin_http_action_proposal_001",
              choices: [
                {
                  finish_reason: "stop",
                  message: {
                    role: "assistant",
                    content: JSON.stringify({
                      action: "reflect",
                      reason: "Elysia can briefly reflect on the morning routine before greeting others.",
                      intent: "Keep the next action calm and sandbox-only.",
                    }),
                  },
                },
              ],
              usage: { prompt_tokens: 44, completion_tokens: 15, total_tokens: 59 },
            }),
            { status: 200, statusText: "OK" },
          );
        }
        return new Response(
          JSON.stringify({
            id: "chatcmpl_admin_http_test_001",
            choices: [{ finish_reason: "stop", message: { role: "assistant", content: "HTTP LLM test works." } }],
            usage: { prompt_tokens: 9, completion_tokens: 5, total_tokens: 14 },
          }),
          { status: 200, statusText: "OK" },
        );
      },
    }),
  });
  const baseUrl = await listenOnRandomPort(server);

  try {
    const stateResponse = await requestJson<AdminStateResponse>(`${baseUrl}/api/admin/state`, { method: "GET" });
    assert.equal(stateResponse.snapshot.id, OBSERVATION_MVP_WORLD_ID);

    const stepResponse = await requestJson<AdminStateResponse>(`${baseUrl}/api/admin/step`, { method: "POST" });
    assert.equal(stepResponse.snapshot.lastStepId, "step_0605_001");

    const inputResponse = await requestJson<AdminStateResponse>(`${baseUrl}/api/admin/input`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "observerCommand",
        targetIds: [OBSERVATION_MVP_WORLD_ID],
        payload: { action: "resume" },
      }),
    });
    assert.equal(inputResponse.snapshot.status, "running");

    const llmResponse = await requestJson<LlmRuntimeTestResponse>(`${baseUrl}/api/admin/llm/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl: "https://example.test/v1",
        model: "test-model",
        apiKey: "test-secret-key",
        prompt: "Test connectivity.",
      }),
    });
    assert.equal(llmResponse.operation.status, "completed");
    assert.equal(llmResponse.outputText, "HTTP LLM test works.");
    assert.equal(JSON.stringify(llmResponse).includes("test-secret-key"), false);

    const actionProposalResponse = await requestJson<LlmActionProposalResponse>(`${baseUrl}/api/admin/llm/action-proposal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl: "https://example.test/v1",
        model: "test-model",
        apiKey: "test-secret-key",
        agentId: "agent_elysia",
      }),
    });
    assert.equal(actionProposalResponse.operation.status, "completed");
    assert.equal(actionProposalResponse.proposal?.action, "reflect");
    assert.equal(actionProposalResponse.sandbox, true);
    assert.equal(JSON.stringify(actionProposalResponse).includes("test-secret-key"), false);

    const conversationResponse = await requestJson<LlmConversationTurnResponse>(`${baseUrl}/api/admin/llm/conversation-turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl: "https://example.test/v1",
        model: "test-model",
        apiKey: "test-secret-key",
        agentId: "agent_elysia",
        message: "Can you hear me from the atrium?",
      }),
    });
    assert.equal(conversationResponse.operation.status, "completed");
    assert.equal(conversationResponse.operation.kind, "conversationTurn");
    assert.equal(conversationResponse.draft?.tone, "warm and attentive");
    assert.equal(conversationResponse.sandbox, true);
    assert.equal(JSON.stringify(conversationResponse).includes("test-secret-key"), false);

    const invalidJsonResponse = await fetch(`${baseUrl}/api/admin/input`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    const invalidJsonBody = (await invalidJsonResponse.json()) as AdminErrorResponse;
    assert.equal(invalidJsonResponse.status, 400);
    assert.equal(invalidJsonBody.error.code, "INVALID_JSON");
  } finally {
    await closeServer(server);
  }
});

function listenOnRandomPort(server: Server): Promise<string> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      assertAddressInfo(address);
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function stepControllerTimes(controller: ReturnType<typeof createAdminController>, count: number): AdminStateResponse {
  let state = controller.getState();
  for (let index = 0; index < count; index += 1) {
    state = controller.step();
  }
  return state;
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  assert.equal(response.ok, true);
  return (await response.json()) as T;
}

function sequentialNow(values: readonly string[]): () => Date {
  let index = 0;
  return () => {
    const value = values[Math.min(index, values.length - 1)] ?? "2026-05-31T06:00:00.000Z";
    index += 1;
    return new Date(value);
  };
}

function assertAddressInfo(address: string | AddressInfo | null): asserts address is AddressInfo {
  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");
}
