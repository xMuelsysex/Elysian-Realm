import test from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import type { AdminErrorResponse, AdminStateResponse, LlmActionProposalResponse, LlmRuntimeTestResponse } from "../src/server/admin/index.js";
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

  const replayVisible = JSON.stringify({
    events: stepped.events,
    timeline: stepped.timeline,
    replay: stepped.replay,
  });
  assert.equal(replayVisible.includes("agentTickDiagnostics"), false);
  assert.equal(replayVisible.includes("\"phases\""), false);
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
