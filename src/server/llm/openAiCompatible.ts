import {
  LlmProviderError,
  redactSecrets,
  type LlmChatCompletion,
  type LlmChatMessage,
  type LlmChatRequest,
  type LlmProvider,
  type LlmRequestOptions,
  type LlmResponseFormat,
  type LlmUsageDiagnostics,
} from "./provider.js";

export type OpenAiCompatibleApiMode = "chatCompletions" | "responses";

export interface OpenAiCompatibleProviderConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
  timeoutMs: number;
  providerName?: string;
  apiMode?: OpenAiCompatibleApiMode;
}

export interface OpenAiCompatibleEnvConfig {
  ELYSIAN_LLM_BASE_URL?: string;
  ELYSIAN_LLM_MODEL?: string;
  ELYSIAN_LLM_API_KEY?: string;
  ELYSIAN_LLM_TIMEOUT_MS?: string;
  ELYSIAN_LLM_PROVIDER_NAME?: string;
  ELYSIAN_LLM_API_MODE?: string;
}

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

const DEFAULT_TIMEOUT_MS = 30_000;
const CHAT_COMPLETIONS_SUFFIX = "/chat/completions";
const RESPONSES_SUFFIX = "/responses";

export class OpenAiCompatibleProvider implements LlmProvider {
  readonly name: string;
  readonly model: string;

  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;
  private readonly apiMode: OpenAiCompatibleApiMode;

  constructor(config: OpenAiCompatibleProviderConfig, fetchImpl: FetchLike = globalThis.fetch.bind(globalThis)) {
    assertConfig(config);
    this.name = config.providerName?.trim() || "openai-compatible";
    this.model = config.model.trim();
    this.apiMode = config.apiMode ?? "chatCompletions";
    this.endpoint = normalizeOpenAiCompatibleUrl(config.baseUrl, this.apiMode);
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs;
    this.fetchImpl = fetchImpl;
  }

  async completeChat(request: LlmChatRequest, options: LlmRequestOptions = {}): Promise<LlmChatCompletion> {
    assertRequest(request);
    const startedAt = Date.now();
    const abort = createAbortController(options, this.timeoutMs);

    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createRequestBody(this.model, request, this.apiMode)),
        signal: abort.signal,
      });

      const bodyText = await response.text();
      if (!response.ok) {
        throw new LlmProviderError("LLM_PROVIDER_HTTP_ERROR", `LLM provider returned HTTP ${response.status}.`, {
          status: response.status,
          details: {
            statusText: response.statusText,
            bodyExcerpt: redactSecrets(bodyText.slice(0, 800), [this.apiKey]),
          },
          redactSecrets: [this.apiKey],
        });
      }

      const body = parseProviderJson(bodyText, this.apiKey);
      const completion = normalizeCompletion(body, this.apiMode, this.apiKey);
      return {
        ...completion,
        usage: {
          ...completion.usage,
          latencyMs: Date.now() - startedAt,
        },
      };
    } catch (caught) {
      if (caught instanceof LlmProviderError) {
        throw caught;
      }
      if (abort.timedOut()) {
        throw new LlmProviderError("LLM_PROVIDER_TIMEOUT", `LLM provider request timed out after ${abort.timeoutMs}ms.`, {
          redactSecrets: [this.apiKey],
          cause: caught,
        });
      }
      if (abort.aborted()) {
        throw new LlmProviderError("LLM_PROVIDER_ABORTED", "LLM provider request was aborted.", {
          redactSecrets: [this.apiKey],
          cause: caught,
        });
      }
      throw new LlmProviderError("LLM_PROVIDER_RESPONSE_ERROR", `LLM provider request failed: ${readErrorMessage(caught)}`, {
        redactSecrets: [this.apiKey],
        cause: caught,
      });
    } finally {
      abort.cleanup();
    }
  }
}

export function loadOpenAiCompatibleConfigFromEnv(env: OpenAiCompatibleEnvConfig): OpenAiCompatibleProviderConfig {
  const baseUrl = readRequiredEnv(env.ELYSIAN_LLM_BASE_URL, "ELYSIAN_LLM_BASE_URL");
  const model = readRequiredEnv(env.ELYSIAN_LLM_MODEL, "ELYSIAN_LLM_MODEL");
  const apiKey = readRequiredEnv(env.ELYSIAN_LLM_API_KEY, "ELYSIAN_LLM_API_KEY");
  const timeoutMs = parseTimeoutMs(env.ELYSIAN_LLM_TIMEOUT_MS);

  const apiMode = parseApiMode(env.ELYSIAN_LLM_API_MODE);
  return {
    baseUrl,
    model,
    apiKey,
    timeoutMs,
    providerName: env.ELYSIAN_LLM_PROVIDER_NAME?.trim() || undefined,
    ...(apiMode ? { apiMode } : {}),
  };
}

export function normalizeChatCompletionsUrl(baseUrl: string): string {
  return normalizeOpenAiCompatibleUrl(baseUrl, "chatCompletions");
}

export function normalizeResponsesUrl(baseUrl: string): string {
  return normalizeOpenAiCompatibleUrl(baseUrl, "responses");
}

function normalizeOpenAiCompatibleUrl(baseUrl: string, apiMode: OpenAiCompatibleApiMode): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (!trimmed) {
    throw new LlmProviderError("LLM_PROVIDER_CONFIG_ERROR", "LLM base URL must be a non-empty URL.");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch (cause) {
    throw new LlmProviderError("LLM_PROVIDER_CONFIG_ERROR", "LLM base URL must be a valid URL.", { cause });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new LlmProviderError("LLM_PROVIDER_CONFIG_ERROR", "LLM base URL must use http or https.");
  }

  const suffix = apiMode === "responses" ? RESPONSES_SUFFIX : CHAT_COMPLETIONS_SUFFIX;
  if (parsed.pathname.endsWith(suffix)) {
    return parsed.toString().replace(/\/+$/, "");
  }

  const basePath = stripKnownEndpointSuffix(parsed.pathname.replace(/\/+$/, ""));
  parsed.pathname = `${basePath}${suffix}`;
  return parsed.toString().replace(/\/+$/, "");
}

function stripKnownEndpointSuffix(pathname: string): string {
  if (pathname.endsWith(CHAT_COMPLETIONS_SUFFIX)) {
    return pathname.slice(0, -CHAT_COMPLETIONS_SUFFIX.length);
  }
  if (pathname.endsWith(RESPONSES_SUFFIX)) {
    return pathname.slice(0, -RESPONSES_SUFFIX.length);
  }
  return pathname;
}

function assertConfig(config: OpenAiCompatibleProviderConfig): void {
  if (!config.model.trim()) {
    throw new LlmProviderError("LLM_PROVIDER_CONFIG_ERROR", "LLM model must be configured.");
  }
  if (!config.apiKey.trim()) {
    throw new LlmProviderError("LLM_PROVIDER_CONFIG_ERROR", "LLM API key must be configured.");
  }
  if (!Number.isFinite(config.timeoutMs) || config.timeoutMs <= 0) {
    throw new LlmProviderError("LLM_PROVIDER_CONFIG_ERROR", "LLM timeout must be a positive number of milliseconds.");
  }
  normalizeOpenAiCompatibleUrl(config.baseUrl, config.apiMode ?? "chatCompletions");
}

function assertRequest(request: LlmChatRequest): void {
  if (!Array.isArray(request.messages) || request.messages.length === 0) {
    throw new LlmProviderError("LLM_PROVIDER_CONFIG_ERROR", "LLM chat request must include at least one message.");
  }
  for (const message of request.messages) {
    if ((message.role !== "system" && message.role !== "user" && message.role !== "assistant") || !message.content.trim()) {
      throw new LlmProviderError("LLM_PROVIDER_CONFIG_ERROR", "LLM chat request messages must have a valid role and non-empty content.");
    }
  }
}

function createRequestBody(model: string, request: LlmChatRequest, apiMode: OpenAiCompatibleApiMode): Record<string, unknown> {
  if (apiMode === "responses") {
    return createResponsesRequestBody(model, request);
  }
  return createChatCompletionsRequestBody(model, request);
}

function createChatCompletionsRequestBody(model: string, request: LlmChatRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    messages: request.messages.map((message) => ({ role: message.role, content: message.content })),
    stream: false,
  };

  if (request.temperature !== undefined) body.temperature = request.temperature;
  if (request.maxTokens !== undefined) body.max_completion_tokens = request.maxTokens;
  if (request.responseFormat) body.response_format = formatChatCompletionsResponseFormat(request.responseFormat);

  return body;
}

function createResponsesRequestBody(model: string, request: LlmChatRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    input: request.messages.map(toResponsesInputMessage),
    stream: false,
    store: false,
  };

  if (request.temperature !== undefined) body.temperature = request.temperature;
  if (request.maxTokens !== undefined) body.max_output_tokens = request.maxTokens;
  if (request.responseFormat) body.text = { format: formatResponsesTextFormat(request.responseFormat) };

  return body;
}

function toResponsesInputMessage(message: LlmChatMessage): Record<string, unknown> {
  return {
    role: message.role,
    content: message.content,
  };
}

function formatChatCompletionsResponseFormat(format: LlmResponseFormat): Record<string, unknown> {
  if (format.type === "json_object") {
    return { type: "json_object" };
  }

  return {
    type: "json_schema",
    json_schema: {
      name: format.jsonSchema.name,
      description: format.jsonSchema.description,
      strict: format.jsonSchema.strict ?? true,
      schema: format.jsonSchema.schema,
    },
  };
}

function formatResponsesTextFormat(format: LlmResponseFormat): Record<string, unknown> {
  if (format.type === "json_object") {
    return { type: "json_object" };
  }

  return {
    type: "json_schema",
    name: format.jsonSchema.name,
    description: format.jsonSchema.description,
    strict: format.jsonSchema.strict ?? true,
    schema: format.jsonSchema.schema,
  };
}

function parseProviderJson(bodyText: string, apiKey: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(bodyText) as unknown;
    if (isRecord(parsed)) return parsed;
  } catch (cause) {
    throw new LlmProviderError("LLM_PROVIDER_RESPONSE_ERROR", "LLM provider response was not valid JSON.", {
      details: { reason: readErrorMessage(cause) },
      redactSecrets: [apiKey],
      cause,
    });
  }

  throw new LlmProviderError("LLM_PROVIDER_RESPONSE_ERROR", "LLM provider response must be a JSON object.", {
    redactSecrets: [apiKey],
  });
}

function normalizeCompletion(body: Record<string, unknown>, apiMode: OpenAiCompatibleApiMode, apiKey: string): LlmChatCompletion {
  if (apiMode === "responses") {
    return normalizeResponsesCompletion(body, apiKey);
  }
  return normalizeChatCompletionsCompletion(body, apiKey);
}

function normalizeChatCompletionsCompletion(body: Record<string, unknown>, apiKey: string): LlmChatCompletion {
  const choices = body.choices;
  if (!Array.isArray(choices) || choices.length === 0 || !isRecord(choices[0])) {
    throw new LlmProviderError("LLM_PROVIDER_RESPONSE_ERROR", "LLM provider response must include at least one choice.", {
      redactSecrets: [apiKey],
    });
  }

  const firstChoice = choices[0];
  const message = firstChoice.message;
  const content = isRecord(message) ? message.content : undefined;
  if (typeof content !== "string" || content.trim() === "") {
    throw new LlmProviderError("LLM_PROVIDER_RESPONSE_ERROR", "LLM provider response choice must include non-empty message content.", {
      redactSecrets: [apiKey],
    });
  }

  return {
    content,
    finishReason: typeof firstChoice.finish_reason === "string" ? firstChoice.finish_reason : undefined,
    providerResponseId: typeof body.id === "string" ? body.id : undefined,
    usage: normalizeUsage(body.usage),
  };
}

function normalizeResponsesCompletion(body: Record<string, unknown>, apiKey: string): LlmChatCompletion {
  const status = typeof body.status === "string" ? body.status : undefined;
  if (status && status !== "completed") {
    throw new LlmProviderError("LLM_PROVIDER_RESPONSE_ERROR", `LLM Responses API returned status ${status}.`, {
      details: { status },
      redactSecrets: [apiKey],
    });
  }

  const content = readResponsesOutputText(body, apiKey);
  return {
    content,
    finishReason: status,
    providerResponseId: typeof body.id === "string" ? body.id : undefined,
    usage: normalizeUsage(body.usage),
  };
}

function readResponsesOutputText(body: Record<string, unknown>, apiKey: string): string {
  if (typeof body.output_text === "string" && body.output_text.trim() !== "") {
    return body.output_text;
  }

  const texts: string[] = [];
  const output = body.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      if (!isRecord(item) || !Array.isArray(item.content)) continue;
      for (const contentItem of item.content) {
        if (!isRecord(contentItem)) continue;
        if (contentItem.type === "output_text" && typeof contentItem.text === "string" && contentItem.text.trim() !== "") {
          texts.push(contentItem.text);
        }
        if (contentItem.type === "refusal" && typeof contentItem.refusal === "string") {
          throw new LlmProviderError("LLM_PROVIDER_RESPONSE_ERROR", "LLM Responses API returned a refusal instead of output text.", {
            details: { refusal: contentItem.refusal },
            redactSecrets: [apiKey],
          });
        }
      }
    }
  }

  const content = texts.join("\n").trim();
  if (content) return content;

  throw new LlmProviderError("LLM_PROVIDER_RESPONSE_ERROR", "LLM Responses API response must include non-empty output text.", {
    redactSecrets: [apiKey],
  });
}

function normalizeUsage(value: unknown): LlmUsageDiagnostics | undefined {
  if (!isRecord(value)) return undefined;
  return {
    promptTokens: readNumber(value.prompt_tokens) ?? readNumber(value.input_tokens),
    completionTokens: readNumber(value.completion_tokens) ?? readNumber(value.output_tokens),
    totalTokens: readNumber(value.total_tokens),
  };
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readRequiredEnv(value: string | undefined, name: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new LlmProviderError("LLM_PROVIDER_CONFIG_ERROR", `${name} must be set for the OpenAI-compatible LLM provider.`);
  }
  return trimmed;
}

function parseTimeoutMs(value: string | undefined): number {
  const trimmed = value?.trim();
  if (!trimmed) return DEFAULT_TIMEOUT_MS;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new LlmProviderError("LLM_PROVIDER_CONFIG_ERROR", "ELYSIAN_LLM_TIMEOUT_MS must be a positive number of milliseconds.");
  }
  return parsed;
}

function parseApiMode(value: string | undefined): OpenAiCompatibleApiMode | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "chat" || normalized === "chat_completions" || normalized === "chat-completions" || normalized === "chatcompletions") {
    return "chatCompletions";
  }
  if (normalized === "responses" || normalized === "response") {
    return "responses";
  }
  throw new LlmProviderError("LLM_PROVIDER_CONFIG_ERROR", "ELYSIAN_LLM_API_MODE must be chat_completions or responses.");
}

function createAbortController(options: LlmRequestOptions, defaultTimeoutMs: number) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
  let timedOut = false;
  let aborted = false;

  if (options.signal?.aborted) {
    aborted = true;
    controller.abort();
  }

  const abortFromSignal = () => {
    aborted = true;
    controller.abort();
  };
  options.signal?.addEventListener("abort", abortFromSignal, { once: true });

  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    timeoutMs,
    timedOut: () => timedOut,
    aborted: () => aborted,
    cleanup: () => {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abortFromSignal);
    },
  };
}

function readErrorMessage(value: unknown): string {
  return value instanceof Error ? value.message : String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
