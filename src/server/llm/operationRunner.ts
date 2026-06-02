import type { AgentId, OperationKind, WorldId } from "../../shared/domain/index.js";
import type { LlmOperationMetadata } from "../../shared/contracts/index.js";
import { isLlmProviderError, LlmProviderError, redactSecrets, type LlmChatRequest, type LlmProvider } from "./provider.js";
import { parseStructuredJsonObject } from "./structuredOutput.js";

export interface RunLlmOperationRequest {
  id: string;
  worldId: WorldId;
  agentId?: AgentId;
  kind: OperationKind;
  inputRef?: string;
  promptSchemaVersion: string;
  provider: LlmProvider;
  chat: LlmChatRequest;
  structuredOutputSchema?: Record<string, unknown>;
  now?: () => Date;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export async function runLlmOperation(request: RunLlmOperationRequest): Promise<LlmOperationMetadata> {
  const now = request.now ?? (() => new Date());
  const startedAt = now();
  const base = createBaseOperation(request, startedAt.toISOString());

  try {
    const completion = await request.provider.completeChat(request.chat, {
      timeoutMs: request.timeoutMs,
      signal: request.signal,
    });
    const parsed = request.structuredOutputSchema
      ? parseStructuredJsonObject(completion.content, request.structuredOutputSchema)
      : undefined;
    const completedAt = now();

    return {
      ...base,
      status: "completed",
      completedAt: completedAt.toISOString(),
      result: {
        outputText: completion.content,
        ...(parsed ? { parsed } : {}),
        ...(completion.finishReason ? { finishReason: completion.finishReason } : {}),
        ...(completion.providerResponseId ? { providerResponseId: completion.providerResponseId } : {}),
      },
      diagnostics: {
        ...completion.usage,
        latencyMs: completion.usage?.latencyMs ?? completedAt.getTime() - startedAt.getTime(),
      },
    };
  } catch (caught) {
    const completedAt = now();
    const providerError = toProviderError(caught);
    return {
      ...base,
      status: providerError.code === "LLM_PROVIDER_TIMEOUT" ? "timedOut" : "failed",
      completedAt: completedAt.toISOString(),
      error: {
        code: providerError.code,
        message: providerError.message,
        raw: providerError.details,
      },
      diagnostics: {
        latencyMs: completedAt.getTime() - startedAt.getTime(),
      },
    };
  }
}

function createBaseOperation(request: RunLlmOperationRequest, startedAt: string): LlmOperationMetadata {
  return {
    id: request.id,
    worldId: request.worldId,
    agentId: request.agentId,
    kind: request.kind,
    status: "running",
    inputRef: request.inputRef,
    promptSchemaVersion: request.promptSchemaVersion,
    provider: request.provider.name,
    model: request.provider.model,
    startedAt,
    diagnostics: {},
  };
}

function toProviderError(caught: unknown): LlmProviderError {
  if (isLlmProviderError(caught)) return caught;
  const message = caught instanceof Error ? caught.message : String(caught);
  return new LlmProviderError("LLM_PROVIDER_RESPONSE_ERROR", `LLM operation failed: ${redactSecrets(message)}`, {
    cause: caught,
  });
}
