import type { LlmOperationMetadata } from "../../shared/contracts/index.js";
import {
  MAX_CONVERSATION_REPLY_LENGTH,
  MAX_CONVERSATION_TONE_LENGTH,
  type ConversationTurnDraft,
} from "./conversationContracts.js";

export function validateConversationTurnOperation(
  operation: LlmOperationMetadata,
  referencedMemoryIds: readonly string[],
): { operation: LlmOperationMetadata; draft?: ConversationTurnDraft } {
  const parsed = operation.result?.parsed;
  if (!isRecord(parsed)) {
    return failConversationTurnOperation(
      operation,
      "LLM conversation turn did not include parsed structured output.",
      { parsed },
    );
  }

  const reply = readBoundedString(parsed.reply, MAX_CONVERSATION_REPLY_LENGTH);
  if (!reply) {
    return failConversationTurnOperation(
      operation,
      `LLM conversation reply must be a non-empty string of at most ${MAX_CONVERSATION_REPLY_LENGTH} characters.`,
      { reply: parsed.reply },
    );
  }

  const tone = readBoundedString(parsed.tone, MAX_CONVERSATION_TONE_LENGTH);
  if (!tone) {
    return failConversationTurnOperation(
      operation,
      `LLM conversation tone must be a non-empty string of at most ${MAX_CONVERSATION_TONE_LENGTH} characters.`,
      { tone: parsed.tone },
    );
  }

  const memoryImportance = parsed.memoryImportance;
  if (typeof memoryImportance !== "number" || !Number.isInteger(memoryImportance) || memoryImportance < 1 || memoryImportance > 10) {
    return failConversationTurnOperation(
      operation,
      "LLM conversation memoryImportance must be an integer from 1 through 10.",
      { memoryImportance },
    );
  }

  if (typeof parsed.shouldContinue !== "boolean") {
    return failConversationTurnOperation(
      operation,
      "LLM conversation shouldContinue must be a boolean.",
      { shouldContinue: parsed.shouldContinue },
    );
  }

  return {
    operation,
    draft: {
      reply,
      tone,
      memoryImportance,
      shouldContinue: parsed.shouldContinue,
      referencedMemoryIds: [...referencedMemoryIds],
    },
  };
}

function failConversationTurnOperation(
  operation: LlmOperationMetadata,
  message: string,
  raw: unknown,
): { operation: LlmOperationMetadata } {
  return {
    operation: {
      ...operation,
      status: "failed",
      error: {
        code: "LLM_CONVERSATION_TURN_VALIDATION_ERROR",
        message,
        raw,
      },
    },
  };
}

function readBoundedString(value: unknown, maximumLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= maximumLength ? trimmed : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
