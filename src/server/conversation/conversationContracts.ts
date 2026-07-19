import type { AgentRuntimeState, LocationRef, PersonaSpec } from "../../shared/contracts/index.js";
import type { AgentId } from "../../shared/domain/index.js";
import type { EngineMemoryRecord } from "../simulation/index.js";

export const CONVERSATION_TURN_PROMPT_SCHEMA_VERSION = "conversation-turn-v1" as const;
export const MAX_CONVERSATION_MESSAGE_LENGTH = 4_000; //用户消息最多 4,000 字符
export const MAX_CONVERSATION_REPLY_LENGTH = 4_000; //AI 回复最多 4,000 字符
export const MAX_CONVERSATION_TONE_LENGTH = 80; //语气最多 80 字符
export const MAX_RECENT_CONVERSATION_MESSAGES = 8; //最近 8 条消息
export const MAX_RELEVANT_CONVERSATION_MEMORIES = 5; //最多 5 条相关记忆

export const CONVERSATION_TURN_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    reply: { type: "string" }, //AI 回复
    tone: { type: "string" }, //语气
    memoryImportance: { type: "integer" }, //记忆重要性
    shouldContinue: { type: "boolean" }, //是否继续对话
  },
  required: ["reply", "tone", "memoryImportance", "shouldContinue"], //必需字段
  additionalProperties: false, //不允许额外属性
};

export interface ConversationHistoryMessage {
  eventId: string; //事件 ID
  messageId: string; //消息 ID
  role: "user" | "assistant";
  senderId: string; //发送者 ID 
  content: string; //消息内容
  time: string; //时间
  messageIndex: number; //消息索引
}

export interface ConversationTurnContext {
  incomingMessage: string; //输入消息
  conversationId: string; //对话 ID
  world: {
    id: string; //世界 ID
    status: string; //世界状态
    currentTime: string; //当前时间
    lastStepId: string; //最后一步 ID
  };
  agent: AgentRuntimeState; //代理状态
  location: LocationRef; //位置
  persona: PersonaSpec; //人格
  nearbyAgentIds: AgentId[]; //附近代理 ID
  recentMessages: ConversationHistoryMessage[]; //最近消息
  relevantMemories: EngineMemoryRecord[]; //相关记忆
}

export interface ConversationTurnDraft {
  reply: string; //AI 回复
  tone: string; //语气
  memoryImportance: number; //记忆重要性
  shouldContinue: boolean; //是否继续对话
  referencedMemoryIds: string[]; //引用记忆 ID
}

export interface GeneratedConversationTurnRecord {
  operationId: string; //操作 ID
  agentId: AgentId; //代理 ID
  message: string; //消息
  draft: ConversationTurnDraft; //草稿
  consumed: boolean; //是否消耗
}
