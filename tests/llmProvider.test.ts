import test from "node:test";
import assert from "node:assert/strict";

import {
  FakeLlmProvider,
  LlmProviderError,
  OpenAiCompatibleProvider,
  loadOpenAiCompatibleConfigFromEnv,
  normalizeChatCompletionsUrl,
  normalizeResponsesUrl,
  parseStructuredJsonObject,
  redactSecrets,
  runLlmOperation,
  type FetchLike,
} from "../src/server/llm/index.js";

const WORLD_ID = "world_elysian_observation_mvp";
const ACTION_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string" },
    confidence: { type: "number" },
  },
  required: ["action", "confidence"],
  additionalProperties: false,
};

test("fake provider returns deterministic responses without network", async () => {
  const provider = new FakeLlmProvider({ responses: ["first", { content: "second", usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 } }] });

  const first = await provider.completeChat({ messages: [{ role: "user", content: "hello" }] });
  const second = await provider.completeChat({ messages: [{ role: "user", content: "again" }] });
  const third = await provider.completeChat({ messages: [{ role: "user", content: "repeat" }] });

  assert.equal(first.content, "first");
  assert.equal(second.content, "second");
  assert.deepEqual(second.usage, { promptTokens: 1, completionTokens: 2, totalTokens: 3 });
  assert.equal(third.content, "second");
  assert.equal(provider.getCalls(), 3);
});

test("fake provider exposes configured failures", async () => {
  const provider = new FakeLlmProvider({ failure: new LlmProviderError("LLM_PROVIDER_RESPONSE_ERROR", "fake failure") });

  await assert.rejects(
    () => provider.completeChat({ messages: [{ role: "user", content: "hello" }] }),
    (caught: unknown) => caught instanceof LlmProviderError && caught.code === "LLM_PROVIDER_RESPONSE_ERROR" && caught.message === "fake failure",
  );
});

test("structured output parser validates a narrow JSON schema subset", () => {
  const parsed = parseStructuredJsonObject('{"action":"wait","confidence":0.8}', ACTION_SCHEMA);

  assert.deepEqual(parsed, { action: "wait", confidence: 0.8 });
  assert.throws(() => parseStructuredJsonObject("not json", ACTION_SCHEMA), /not valid JSON/);
  assert.throws(() => parseStructuredJsonObject("[]", ACTION_SCHEMA), /must be a JSON object/);
  assert.throws(() => parseStructuredJsonObject('{"action":"wait"}', ACTION_SCHEMA), /output.confidence is required/);
  assert.throws(() => parseStructuredJsonObject('{"action":"wait","confidence":"high"}', ACTION_SCHEMA), /output.confidence must be number/);
  assert.throws(() => parseStructuredJsonObject('{"action":"wait","confidence":0.8,"extra":true}', ACTION_SCHEMA), /output.extra is not allowed/);
});

test("OpenAI-compatible config loads from env-like records", () => {
  const config = loadOpenAiCompatibleConfigFromEnv({
    ELYSIAN_LLM_BASE_URL: "https://example.test/v1",
    ELYSIAN_LLM_MODEL: "test-model",
    ELYSIAN_LLM_API_KEY: "test-secret",
    ELYSIAN_LLM_TIMEOUT_MS: "1234",
    ELYSIAN_LLM_PROVIDER_NAME: "test-provider",
  });
  const responsesConfig = loadOpenAiCompatibleConfigFromEnv({
    ELYSIAN_LLM_BASE_URL: "https://example.test/v1",
    ELYSIAN_LLM_MODEL: "test-model",
    ELYSIAN_LLM_API_KEY: "test-secret",
    ELYSIAN_LLM_API_MODE: "responses",
  });

  assert.deepEqual(config, {
    baseUrl: "https://example.test/v1",
    model: "test-model",
    apiKey: "test-secret",
    timeoutMs: 1234,
    providerName: "test-provider",
  });
  assert.equal(responsesConfig.apiMode, "responses");
  assert.equal(normalizeChatCompletionsUrl("https://example.test/v1"), "https://example.test/v1/chat/completions");
  assert.equal(normalizeChatCompletionsUrl("https://example.test/v1/chat/completions"), "https://example.test/v1/chat/completions");
  assert.equal(normalizeChatCompletionsUrl("https://example.test/v1/responses"), "https://example.test/v1/chat/completions");
  assert.equal(normalizeResponsesUrl("https://example.test/v1"), "https://example.test/v1/responses");
  assert.equal(normalizeResponsesUrl("https://example.test/v1/responses"), "https://example.test/v1/responses");
  assert.equal(normalizeResponsesUrl("https://example.test/v1/chat/completions"), "https://example.test/v1/responses");
  assert.throws(() => loadOpenAiCompatibleConfigFromEnv({}), /ELYSIAN_LLM_BASE_URL/);
  assert.throws(
    () => loadOpenAiCompatibleConfigFromEnv({
      ELYSIAN_LLM_BASE_URL: "https://example.test/v1",
      ELYSIAN_LLM_MODEL: "test-model",
      ELYSIAN_LLM_API_KEY: "test-secret",
      ELYSIAN_LLM_API_MODE: "unknown",
    }),
    /ELYSIAN_LLM_API_MODE/,
  );
});

test("OpenAI-compatible provider sends chat completion requests and normalizes usage", async () => {
  const calls: Array<{ input: string | URL | Request; init?: RequestInit }> = [];
  const fetchImpl: FetchLike = async (input, init) => {
    calls.push({ input, init });
    return new Response(
      JSON.stringify({
        id: "chatcmpl_test_001",
        choices: [{ finish_reason: "stop", message: { role: "assistant", content: "{\"action\":\"wait\",\"confidence\":0.7}" } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
      { status: 200, statusText: "OK" },
    );
  };
  const provider = new OpenAiCompatibleProvider(
    { baseUrl: "https://example.test/v1", model: "test-model", apiKey: "test-secret", timeoutMs: 5000, providerName: "test-provider" },
    fetchImpl,
  );

  const completion = await provider.completeChat({
    messages: [
      { role: "system", content: "Return JSON." },
      { role: "user", content: "Choose an action." },
    ],
    responseFormat: { type: "json_schema", jsonSchema: { name: "action", strict: true, schema: ACTION_SCHEMA } },
    temperature: 0.2,
    maxTokens: 64,
  });

  assert.equal(completion.content, '{"action":"wait","confidence":0.7}');
  assert.equal(completion.finishReason, "stop");
  assert.equal(completion.providerResponseId, "chatcmpl_test_001");
  assert.equal(completion.usage?.promptTokens, 10);
  assert.equal(completion.usage?.completionTokens, 5);
  assert.equal(completion.usage?.totalTokens, 15);
  assert.equal(typeof completion.usage?.latencyMs, "number");

  assert.equal(String(calls[0]?.input), "https://example.test/v1/chat/completions");
  assert.deepEqual(calls[0]?.init?.headers, { Authorization: "Bearer test-secret", "Content-Type": "application/json" });
  const body = JSON.parse(String(calls[0]?.init?.body)) as Record<string, unknown>;
  assert.equal(body.model, "test-model");
  assert.equal(body.stream, false);
  assert.equal(body.temperature, 0.2);
  assert.equal(body.max_completion_tokens, 64);
  assert.deepEqual(body.response_format, {
    type: "json_schema",
    json_schema: {
      name: "action",
      strict: true,
      schema: ACTION_SCHEMA,
    },
  });
});

test("OpenAI-compatible provider sends Responses API requests and normalizes output_text", async () => {
  const calls: Array<{ input: string | URL | Request; init?: RequestInit }> = [];
  const fetchImpl: FetchLike = async (input, init) => {
    calls.push({ input, init });
    return new Response(
      JSON.stringify({
        id: "resp_test_001",
        status: "completed",
        output_text: "{\"action\":\"wait\",\"confidence\":0.6}",
        usage: { input_tokens: 11, output_tokens: 7, total_tokens: 18 },
      }),
      { status: 200, statusText: "OK" },
    );
  };
  const provider = new OpenAiCompatibleProvider(
    { baseUrl: "https://example.test/v1", model: "test-model", apiKey: "test-secret", timeoutMs: 5000, apiMode: "responses" },
    fetchImpl,
  );

  const completion = await provider.completeChat({
    messages: [
      { role: "system", content: "Return JSON." },
      { role: "user", content: "Choose an action." },
    ],
    responseFormat: { type: "json_schema", jsonSchema: { name: "action", strict: true, schema: ACTION_SCHEMA } },
    temperature: 0.1,
    maxTokens: 32,
  });

  assert.equal(completion.content, '{"action":"wait","confidence":0.6}');
  assert.equal(completion.finishReason, "completed");
  assert.equal(completion.providerResponseId, "resp_test_001");
  assert.equal(completion.usage?.promptTokens, 11);
  assert.equal(completion.usage?.completionTokens, 7);
  assert.equal(completion.usage?.totalTokens, 18);

  assert.equal(String(calls[0]?.input), "https://example.test/v1/responses");
  assert.deepEqual(calls[0]?.init?.headers, { Authorization: "Bearer test-secret", "Content-Type": "application/json" });
  const body = JSON.parse(String(calls[0]?.init?.body)) as Record<string, unknown>;
  assert.equal(body.model, "test-model");
  assert.equal(body.stream, false);
  assert.equal(body.store, false);
  assert.equal(body.temperature, 0.1);
  assert.equal(body.max_output_tokens, 32);
  assert.deepEqual(body.input, [
    { role: "system", content: "Return JSON." },
    { role: "user", content: "Choose an action." },
  ]);
  assert.deepEqual(body.text, {
    format: {
      type: "json_schema",
      name: "action",
      strict: true,
      schema: ACTION_SCHEMA,
    },
  });
});

test("OpenAI-compatible Responses API parser falls back to output content text", async () => {
  const provider = new OpenAiCompatibleProvider(
    { baseUrl: "https://example.test/v1", model: "test-model", apiKey: "test-secret", timeoutMs: 5000, apiMode: "responses" },
    async () => new Response(
      JSON.stringify({
        id: "resp_test_002",
        status: "completed",
        output: [
          {
            type: "message",
            role: "assistant",
            content: [
              { type: "output_text", text: "first" },
              { type: "output_text", text: "second" },
            ],
          },
        ],
      }),
      { status: 200 },
    ),
  );

  const completion = await provider.completeChat({ messages: [{ role: "user", content: "hello" }] });

  assert.equal(completion.content, "first\nsecond");
  assert.equal(completion.providerResponseId, "resp_test_002");
});

test("OpenAI-compatible Responses API refusals and incomplete statuses are visible failures", async () => {
  const refusalProvider = new OpenAiCompatibleProvider(
    { baseUrl: "https://example.test/v1", model: "test-model", apiKey: "test-secret", timeoutMs: 5000, apiMode: "responses" },
    async () => new Response(JSON.stringify({ status: "completed", output: [{ content: [{ type: "refusal", refusal: "cannot comply" }] }] }), { status: 200 }),
  );
  const incompleteProvider = new OpenAiCompatibleProvider(
    { baseUrl: "https://example.test/v1", model: "test-model", apiKey: "test-secret", timeoutMs: 5000, apiMode: "responses" },
    async () => new Response(JSON.stringify({ status: "incomplete", output_text: "partial" }), { status: 200 }),
  );

  await assert.rejects(
    () => refusalProvider.completeChat({ messages: [{ role: "user", content: "hello" }] }),
    (caught: unknown) => caught instanceof LlmProviderError && caught.code === "LLM_PROVIDER_RESPONSE_ERROR" && /refusal/.test(caught.message),
  );
  await assert.rejects(
    () => incompleteProvider.completeChat({ messages: [{ role: "user", content: "hello" }] }),
    (caught: unknown) => caught instanceof LlmProviderError && caught.code === "LLM_PROVIDER_RESPONSE_ERROR" && /incomplete/.test(caught.message),
  );
});

test("OpenAI-compatible provider surfaces non-2xx errors and redacts secrets", async () => {
  const fetchImpl: FetchLike = async () => new Response("provider leaked test-secret and Bearer test-secret", { status: 429, statusText: "Too Many Requests" });
  const provider = new OpenAiCompatibleProvider({ baseUrl: "https://example.test/v1", model: "test-model", apiKey: "test-secret", timeoutMs: 5000 }, fetchImpl);

  await assert.rejects(
    () => provider.completeChat({ messages: [{ role: "user", content: "hello" }] }),
    (caught: unknown) => {
      assert.ok(caught instanceof LlmProviderError);
      assert.equal(caught.code, "LLM_PROVIDER_HTTP_ERROR");
      assert.equal(caught.status, 429);
      assert.equal(caught.message.includes("test-secret"), false);
      assert.equal(JSON.stringify(caught.details).includes("test-secret"), false);
      assert.match(JSON.stringify(caught.details), /\[REDACTED\]/);
      return true;
    },
  );
});

test("OpenAI-compatible provider rejects malformed provider responses", async () => {
  const provider = new OpenAiCompatibleProvider(
    { baseUrl: "https://example.test/v1", model: "test-model", apiKey: "test-secret", timeoutMs: 5000 },
    async () => new Response(JSON.stringify({ choices: [] }), { status: 200 }),
  );

  await assert.rejects(
    () => provider.completeChat({ messages: [{ role: "user", content: "hello" }] }),
    (caught: unknown) => caught instanceof LlmProviderError && caught.code === "LLM_PROVIDER_RESPONSE_ERROR",
  );
});

test("OpenAI-compatible provider converts aborting fetches into timeouts", async () => {
  const fetchImpl: FetchLike = (_input, init) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new Error("aborted by timeout")), { once: true });
  });
  const provider = new OpenAiCompatibleProvider({ baseUrl: "https://example.test/v1", model: "test-model", apiKey: "test-secret", timeoutMs: 1 }, fetchImpl);

  await assert.rejects(
    () => provider.completeChat({ messages: [{ role: "user", content: "hello" }] }),
    (caught: unknown) => caught instanceof LlmProviderError && caught.code === "LLM_PROVIDER_TIMEOUT",
  );
});

test("operation runner records completed structured output metadata", async () => {
  const now = sequentialNow(["2026-06-02T00:00:00.000Z", "2026-06-02T00:00:02.000Z"]);
  const operation = await runLlmOperation({
    id: "op_001",
    worldId: WORLD_ID,
    agentId: "agent_elysia",
    kind: "actionProposal",
    inputRef: "input_001",
    promptSchemaVersion: "action-proposal.v1",
    provider: new FakeLlmProvider({ responses: ['{"action":"wait","confidence":0.9}'] }),
    chat: { messages: [{ role: "user", content: "Choose action as JSON." }] },
    structuredOutputSchema: ACTION_SCHEMA,
    now,
  });

  assert.equal(operation.status, "completed");
  assert.equal(operation.provider, "fake");
  assert.equal(operation.model, "fake-model");
  assert.equal(operation.completedAt, "2026-06-02T00:00:02.000Z");
  assert.equal(operation.diagnostics.latencyMs, 2000);
  assert.deepEqual(operation.result?.parsed, { action: "wait", confidence: 0.9 });
  assert.equal(operation.error, undefined);
});

test("operation runner records provider failures without fake success", async () => {
  const operation = await runLlmOperation({
    id: "op_002",
    worldId: WORLD_ID,
    kind: "conversationTurn",
    promptSchemaVersion: "conversation-turn.v1",
    provider: new FakeLlmProvider({ failure: new LlmProviderError("LLM_PROVIDER_HTTP_ERROR", "provider failed", { status: 500 }) }),
    chat: { messages: [{ role: "user", content: "Say hi." }] },
    now: sequentialNow(["2026-06-02T00:00:00.000Z", "2026-06-02T00:00:01.000Z"]),
  });

  assert.equal(operation.status, "failed");
  assert.equal(operation.result, undefined);
  assert.equal(operation.error?.code, "LLM_PROVIDER_HTTP_ERROR");
  assert.equal(operation.error?.message, "provider failed");
});

test("operation runner records invalid structured output as a failed operation", async () => {
  const operation = await runLlmOperation({
    id: "op_003",
    worldId: WORLD_ID,
    kind: "actionProposal",
    promptSchemaVersion: "action-proposal.v1",
    provider: new FakeLlmProvider({ responses: ['{"action":"wait"}'] }),
    chat: { messages: [{ role: "user", content: "Choose action as JSON." }] },
    structuredOutputSchema: ACTION_SCHEMA,
    now: sequentialNow(["2026-06-02T00:00:00.000Z", "2026-06-02T00:00:01.000Z"]),
  });

  assert.equal(operation.status, "failed");
  assert.equal(operation.result, undefined);
  assert.equal(operation.error?.code, "LLM_STRUCTURED_OUTPUT_ERROR");
  assert.match(operation.error?.message ?? "", /output.confidence is required/);
});

test("operation runner maps provider timeouts to timedOut status", async () => {
  const operation = await runLlmOperation({
    id: "op_004",
    worldId: WORLD_ID,
    kind: "reflection",
    promptSchemaVersion: "reflection.v1",
    provider: new FakeLlmProvider({ failure: new LlmProviderError("LLM_PROVIDER_TIMEOUT", "timed out") }),
    chat: { messages: [{ role: "user", content: "Reflect." }] },
  });

  assert.equal(operation.status, "timedOut");
  assert.equal(operation.result, undefined);
  assert.equal(operation.error?.code, "LLM_PROVIDER_TIMEOUT");
});

test("secret redaction removes bearer and explicit API keys", () => {
  const redacted = redactSecrets("Authorization: Bearer tok and api_key: tok", ["tok"]);

  assert.equal(redacted.includes("tok"), false);
  assert.match(redacted, /\[REDACTED\]/);
});

function sequentialNow(isoDates: readonly string[]): () => Date {
  let index = 0;
  return () => {
    const value = isoDates[Math.min(index, isoDates.length - 1)];
    index += 1;
    return new Date(value);
  };
}
