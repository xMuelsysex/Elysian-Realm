import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { expect, test } from "@playwright/test";

const AGENT_ID = "agent_elysia";
const USER_MESSAGE = "今晚花园里的风会让人安心吗？";
const GENERATED_REPLY = "The garden breeze feels patient tonight, dear guest.";
const REVIEWED_REPLY = "The garden breeze feels gentle tonight; stay a little longer, dear guest.";
const OPERATION_ID_PREFIX = "llm_conversation_turn_step_0600_000_agent_elysia";

let fakeProvider: Server;
let fakeProviderBaseUrl: string;

test.beforeAll(async () => {
  fakeProvider = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
      messages?: Array<{ role?: string; content?: string }>;
    };
    const serializedMessages = JSON.stringify(body.messages ?? []);

    if (request.method !== "POST" || request.url !== "/v1/chat/completions") {
      response.writeHead(404).end();
      return;
    }
    if (!serializedMessages.includes("private-message reply") || !serializedMessages.includes(USER_MESSAGE)) {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: { message: "Expected persona conversation prompt." } }));
      return;
    }

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({
      id: "chatcmpl_e2e_conversation_turn_001",
      choices: [{
        finish_reason: "stop",
        message: {
          role: "assistant",
          content: JSON.stringify({
            reply: GENERATED_REPLY,
            tone: "warm and reflective",
            memoryImportance: 7,
            shouldContinue: true,
          }),
        },
      }],
      usage: { prompt_tokens: 120, completion_tokens: 24, total_tokens: 144 },
    }));
  });
  await new Promise<void>((resolve) => fakeProvider.listen(0, "127.0.0.1", resolve));
  const address = fakeProvider.address() as AddressInfo;
  fakeProviderBaseUrl = `http://127.0.0.1:${address.port}/v1`;
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) => fakeProvider.close((error) => error ? reject(error) : resolve()));
});

test.beforeEach(async ({ request }) => {
  const response = await request.post("/api/admin/reset");
  expect(response.ok()).toBeTruthy();
});

test("generates, reviews, and persists a persona conversation turn", async ({ page, request }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await page.getByRole("tab", { name: /控制$/ }).click();
  await page.getByRole("textbox", { name: "Base URL" }).fill(fakeProviderBaseUrl);
  await page.getByRole("textbox", { name: "模型" }).fill("fake-conversation-model");
  await page.getByLabel("API Key").fill("e2e-secret-key");
  await page.getByRole("combobox", { name: "回复角色" }).selectOption(AGENT_ID);
  await page.getByRole("textbox", { name: "用户消息" }).fill(USER_MESSAGE);

  const [generationResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/admin/llm/conversation-turn") && response.request().method() === "POST"),
    page.getByRole("button", { name: "生成角色回复" }).click(),
  ]);
  expect(generationResponse.ok()).toBeTruthy();
  await expect(page.getByRole("heading", { name: "回复草稿结果" })).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: GENERATED_REPLY })).toBeVisible();
  await expect(page.getByRole("heading", { name: "审阅角色回复" })).toBeVisible();

  await page.getByRole("textbox", { name: "回复草稿" }).fill(REVIEWED_REPLY);
  await page.getByRole("textbox", { name: "语气" }).fill("gently reassuring");
  await page.getByRole("spinbutton", { name: /记忆重要度/ }).fill("9");

  const [applicationResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/admin/input") && response.request().method() === "POST"),
    page.getByRole("button", { name: "审阅并发送" }).click(),
  ]);
  expect(applicationResponse.ok()).toBeTruthy();
  await expect(page.getByRole("textbox", { name: "用户消息" })).toHaveValue("");
  await expect(page.getByRole("heading", { name: "审阅角色回复" })).toHaveCount(0);

  await page.getByRole("tab", { name: /角色$/ }).click();
  const messagePanel = page.getByRole("region", { name: "消息流" });
  const messageLog = messagePanel.getByRole("log", { name: "私信会话 爱莉希雅" });
  await expect(messageLog.getByText(USER_MESSAGE, { exact: true })).toBeVisible();
  await expect(messageLog.getByText(REVIEWED_REPLY, { exact: true })).toBeVisible();
  await expect(messageLog.getByText("gently reassuring", { exact: false })).toBeVisible();
  await expect(messageLog.getByText("user-reviewed-llm-conversation", { exact: true })).toBeVisible();

  const stateResponse = await request.get("/api/admin/state");
  expect(stateResponse.ok()).toBeTruthy();
  const state = await stateResponse.json() as {
    events: Array<{ kind: string; payload: Record<string, unknown> }>;
    agentMemories: Array<{
      importance: number;
      metadata: { llmOperationId?: string; responseTone?: string; responseProvenance?: string };
    }>;
  };
  const responseEvent = state.events.find((event) => (
    event.kind === "conversation.messageSent" && event.payload.direction === "response"
  ));
  expect(responseEvent?.payload).toEqual(expect.objectContaining({
    content: REVIEWED_REPLY,
    tone: "gently reassuring",
    memoryImportance: 9,
    provenance: "user-reviewed-llm-conversation",
  }));
  expect(String(responseEvent?.payload.llmOperationId)).toContain(OPERATION_ID_PREFIX);
  const responseMemory = state.agentMemories.find((memory) => memory.metadata.llmOperationId === responseEvent?.payload.llmOperationId);
  expect(responseMemory).toEqual(expect.objectContaining({
    importance: 9,
    metadata: expect.objectContaining({
      responseTone: "gently reassuring",
      responseProvenance: "user-reviewed-llm-conversation",
    }),
  }));
  expect(JSON.stringify(state)).not.toContain("e2e-secret-key");
  expect(pageErrors).toEqual([]);
});
