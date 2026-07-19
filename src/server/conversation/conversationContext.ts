import { retrieveMemoryRecords } from "@elysian/simulation-agent"; //检索记忆记录
import type { PersonaSpec, SimulationEvent } from "../../shared/contracts/index.js"; //人格规范，模拟事件
import type { AgentId } from "../../shared/domain/index.js"; //代理 ID
import { pilotPersonas } from "../personas/index.js"; //飞行员人格
import type { SimulationEngineState } from "../simulation/index.js"; //模拟引擎状态
import {
  MAX_CONVERSATION_MESSAGE_LENGTH, //用户消息最多 4,000 字符
  MAX_RECENT_CONVERSATION_MESSAGES, //最近 8 条消息
  MAX_RELEVANT_CONVERSATION_MEMORIES, //最多 5 条相关记忆 
  type ConversationHistoryMessage, //对话历史消息
  type ConversationTurnContext, //对话上下文
} from "./conversationContracts.js"; //对话上下文

export type ConversationTurnContextResult = //对话上下文结果
  | { ok: true; value: ConversationTurnContext } //对话上下文成功
  | { ok: false; message: string }; //对话上下文结果

export function createConversationTurnContext( //创建对话上下文
  state: SimulationEngineState,
  agentId: string, //代理 ID
  message: string, //消息
  personas: readonly PersonaSpec[] = pilotPersonas, //人格
): ConversationTurnContextResult { //对话上下文结果
  const incomingMessage = message.trim();
  if (!incomingMessage) {
    return { ok: false, message: "message must be a non-empty string" }; //消息不能为空
  }
  if (incomingMessage.length > MAX_CONVERSATION_MESSAGE_LENGTH) { //消息长度不能超过 4,000 字符
    return { ok: false, message: `message must be at most ${MAX_CONVERSATION_MESSAGE_LENGTH} characters` };
  }

  const agent = state.snapshot.agents.find((candidate) => candidate.id === agentId);
  if (!agent) { //代理不存在
    return { ok: false, message: "agentId must reference a known agent" }; //代理 ID 必须引用已知的代理
  }

  const persona = personas.find((candidate) => candidate.id === agent.personaId);
  if (!persona) { //人格不存在
    return { ok: false, message: `persona ${agent.personaId} was not found for agent ${agent.id}` };
  }

  const location = state.snapshot.locations.find((candidate) => candidate.id === agent.locationId);
  if (!location) {
    return { ok: false, message: `location ${agent.locationId} was not found for agent ${agent.id}` };
  }

  const conversationId = createPrivateConversationId(agent.id);
  const recentMessages = selectRecentConversationMessages(state.events, conversationId);
  const relevantMemories = retrieveMemoryRecords(state.agentMemories, agent.id, {
    text: [incomingMessage, agent.id, agent.personaId, agent.locationId, persona.profile.archetype].join(" "),
    now: state.snapshot.currentTime,
    topK: MAX_RELEVANT_CONVERSATION_MEMORIES,
    tags: [agent.id, agent.personaId, agent.locationId, "conversation", "reflection", "relationship"],
  }).hits.map((hit) => hit.record);
  const nearbyAgentIds = state.snapshot.agents
    .filter((candidate) => candidate.id !== agent.id && candidate.locationId === agent.locationId)
    .map((candidate) => candidate.id);

  return {
    ok: true,
    value: {
      incomingMessage,
      conversationId,
      world: {
        id: state.snapshot.id,
        status: state.snapshot.status,
        currentTime: state.snapshot.currentTime,
        lastStepId: state.snapshot.lastStepId,
      },
      agent: structuredClone(agent),
      location: { ...location },
      persona: structuredClone(persona),
      nearbyAgentIds: [...nearbyAgentIds],
      recentMessages,
      relevantMemories: relevantMemories.map((memory) => structuredClone(memory)),
    },
  };
}

function selectRecentConversationMessages(
  events: readonly SimulationEvent[],
  conversationId: string,
): ConversationHistoryMessage[] {
  return events
    .filter((event) => event.kind === "conversation.messageSent" && event.payload.conversationId === conversationId)
    .map(toConversationHistoryMessage)
    .filter((message): message is ConversationHistoryMessage => message !== undefined)
    .sort((left, right) => left.messageIndex - right.messageIndex || left.eventId.localeCompare(right.eventId))
    .slice(-MAX_RECENT_CONVERSATION_MESSAGES)
    .map((message) => ({ ...message }));
}

function toConversationHistoryMessage(event: SimulationEvent): ConversationHistoryMessage | undefined {
  const messageId = readNonEmptyString(event.payload.messageId);
  const senderId = readNonEmptyString(event.payload.senderId);
  const content = readNonEmptyString(event.payload.content);
  const direction = event.payload.direction;
  const messageIndex = event.payload.messageIndex;
  if (!messageId || !senderId || !content || (direction !== "incoming" && direction !== "response")) {
    return undefined;
  }
  if (typeof messageIndex !== "number" || !Number.isInteger(messageIndex) || messageIndex <= 0) {
    return undefined;
  }

  return {
    eventId: event.id,
    messageId,
    role: direction === "incoming" ? "user" : "assistant",
    senderId,
    content,
    time: event.time,
    messageIndex,
  };
}

function createPrivateConversationId(agentId: AgentId): string {
  return `conversation_user_${agentId}`;
}

function readNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}
