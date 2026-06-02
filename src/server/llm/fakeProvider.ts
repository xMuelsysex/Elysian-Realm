import { LlmProviderError, type LlmChatCompletion, type LlmChatRequest, type LlmProvider, type LlmRequestOptions } from "./provider.js";

export type FakeLlmProviderResponse = string | LlmChatCompletion;

export interface FakeLlmProviderOptions {
  name?: string;
  model?: string;
  responses?: readonly FakeLlmProviderResponse[];
  failure?: Error;
}

export class FakeLlmProvider implements LlmProvider {
  readonly name: string;
  readonly model: string;

  private readonly responses: FakeLlmProviderResponse[];
  private readonly failure?: Error;
  private callCount = 0;

  constructor(options: FakeLlmProviderOptions = {}) {
    this.name = options.name ?? "fake";
    this.model = options.model ?? "fake-model";
    this.responses = [...(options.responses ?? ["{}"])] ;
    this.failure = options.failure;
  }

  async completeChat(_request: LlmChatRequest, options: LlmRequestOptions = {}): Promise<LlmChatCompletion> {
    if (options.signal?.aborted) {
      throw new LlmProviderError("LLM_PROVIDER_ABORTED", "LLM request was aborted before the fake provider completed.");
    }
    if (this.failure) {
      throw this.failure;
    }

    const response = this.responses[Math.min(this.callCount, this.responses.length - 1)] ?? "{}";
    this.callCount += 1;

    if (typeof response === "string") {
      return {
        content: response,
        finishReason: "stop",
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
      };
    }

    return {
      finishReason: "stop",
      ...response,
    };
  }

  getCalls(): number {
    return this.callCount;
  }
}
