import type { AgentRuntimeState } from "../../shared/contracts/index.js";
import { pilotPersonas } from "../personas/index.js";
import type { ReviewedConversationTurnPayload } from "./inputs.js";

export interface DeterministicPrivateMessageResponse {
  incomingMessage: string;
  responseMessage: string;
}

export interface ReviewedPrivateMessageResponse extends DeterministicPrivateMessageResponse {
  provenance: "user-reviewed-llm-conversation";
  tone: string;
  memoryImportance: number;
  shouldContinue: boolean;
  llmOperationId: string;
  reviewedBy: string;
  referencedMemoryIds: string[];
}

export function createDeterministicPrivateMessageResponse(
  agent: AgentRuntimeState,
  message: string,
): DeterministicPrivateMessageResponse {
  const persona = pilotPersonas.find((candidate) => candidate.id === agent.personaId);
  if (!persona) {
    throw new Error(`Missing persona ${agent.personaId} for private message response`);
  }

  const incomingMessage = message.trim();
  const address = persona.speech.preferredAddressForms[0]?.trim();
  if (!address) {
    throw new Error(`Persona ${persona.id} must define a preferred address form`);
  }

  return {
    incomingMessage,
    responseMessage: `I hear you, ${address}. You said: "${incomingMessage}" I will keep it in mind.`,
  };
}

export function createReviewedPrivateMessageResponse(
  reviewedTurn: ReviewedConversationTurnPayload,
): ReviewedPrivateMessageResponse {
  return {
    incomingMessage: reviewedTurn.message,
    responseMessage: reviewedTurn.reply,
    provenance: reviewedTurn.provenance,
    tone: reviewedTurn.tone,
    memoryImportance: reviewedTurn.memoryImportance,
    shouldContinue: reviewedTurn.shouldContinue,
    llmOperationId: reviewedTurn.llmOperationId,
    reviewedBy: reviewedTurn.reviewedBy,
    referencedMemoryIds: [...reviewedTurn.referencedMemoryIds],
  };
}
