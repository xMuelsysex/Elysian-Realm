import { expect, test } from "@playwright/test";

const MESSAGE = "今晚花园里的气氛怎么样？";
const INCOMING_MEMORY = `User wrote privately: ${MESSAGE}`;
const RESPONSE = `I hear you, dear guest. You said: "${MESSAGE}" I will keep it in mind.`;
const AGENT_ID = "agent_elysia";
const CONVERSATION_ID = `conversation_user_${AGENT_ID}`;

interface AdminStateProbe {
  snapshot: {
    activeConversations: Array<{
      id: string;
      participants: string[];
      messageCount: number;
    }>;
  };
  agentMemories: Array<{
    agentId: string;
    content: string;
    metadata: {
      conversationId?: string;
      messageRole?: string;
    };
  }>;
}

test.beforeEach(async ({ request }) => {
  const response = await request.post("/api/admin/reset");
  expect(response.ok()).toBeTruthy();
});

test("private message reaches one conversation, two memories, and the message stream", async ({ page, request }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await page.getByRole("tab", { name: /控制$/ }).click();
  await page.getByRole("combobox", { name: "角色", exact: true }).selectOption(AGENT_ID);
  await page.getByRole("textbox", { name: "消息", exact: true }).fill(MESSAGE);

  const [submitResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/admin/input") && response.request().method() === "POST"),
    page.getByRole("button", { name: "发送消息" }).click(),
  ]);
  expect(submitResponse.ok()).toBeTruthy();
  await expect(page.getByRole("textbox", { name: "消息", exact: true })).toHaveValue("");

  await page.getByRole("tab", { name: /角色$/ }).click();
  const messagePanel = page.getByRole("region", { name: "消息流" });
  const messageLog = messagePanel.getByRole("log", { name: "私信会话 爱莉希雅" });

  await expect(messageLog).toBeVisible();
  await expect(messageLog.getByRole("listitem")).toHaveCount(2);
  await expect(messageLog.getByText(MESSAGE, { exact: true })).toBeVisible();
  await expect(messageLog.getByText(RESPONSE, { exact: true })).toBeVisible();

  const stateResponse = await request.get("/api/admin/state");
  expect(stateResponse.ok()).toBeTruthy();
  const state = await stateResponse.json() as AdminStateProbe;
  expect(state.snapshot.activeConversations).toEqual([
    expect.objectContaining({
      id: CONVERSATION_ID,
      participants: [AGENT_ID],
      messageCount: 2,
    }),
  ]);

  const conversationMemories = state.agentMemories.filter(
    (memory) => memory.agentId === AGENT_ID && memory.metadata.conversationId === CONVERSATION_ID,
  );
  expect(conversationMemories).toEqual([
    expect.objectContaining({ content: INCOMING_MEMORY, metadata: expect.objectContaining({ messageRole: "incoming" }) }),
    expect.objectContaining({ content: RESPONSE, metadata: expect.objectContaining({ messageRole: "response" }) }),
  ]);

  const panelDimensions = await messagePanel.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(panelDimensions.scrollWidth).toBeLessThanOrEqual(panelDimensions.clientWidth + 1);
  expect(pageErrors).toEqual([]);
});
