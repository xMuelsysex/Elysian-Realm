export type LlmChatRole = "system" | "user" | "assistant";

export interface LlmChatMessage {
  role: LlmChatRole;
  content: string;
}

export interface LlmJsonSchemaDefinition {
  name: string;
  description?: string;
  strict?: boolean;
  schema: Record<string, unknown>;
}

export type LlmResponseFormat =
  | { type: "json_object" }
  | { type: "json_schema"; jsonSchema: LlmJsonSchemaDefinition };

export interface LlmChatRequest {
  messages: readonly LlmChatMessage[];
  responseFormat?: LlmResponseFormat;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface LlmUsageDiagnostics {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  costUsd?: number;
  latencyMs?: number;
}

export interface LlmChatCompletion {
  content: string;
  finishReason?: string;
  providerResponseId?: string;
  usage?: LlmUsageDiagnostics;
}

export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  completeChat(request: LlmChatRequest, options?: LlmRequestOptions): Promise<LlmChatCompletion>;
}

export type LlmProviderErrorCode =
  | "LLM_PROVIDER_CONFIG_ERROR"
  | "LLM_PROVIDER_HTTP_ERROR"
  | "LLM_PROVIDER_RESPONSE_ERROR"
  | "LLM_PROVIDER_TIMEOUT"
  | "LLM_PROVIDER_ABORTED"
  | "LLM_STRUCTURED_OUTPUT_ERROR";

export interface LlmProviderErrorOptions {
  status?: number;
  details?: Record<string, unknown>;
  redactSecrets?: readonly (string | undefined)[];
  cause?: unknown;
}

const REDACTED = "[REDACTED]";
const BEARER_SECRET_PATTERN = /Bearer\s+[A-Za-z0-9._~+\-/=]+/gi;
const API_KEY_SECRET_PATTERN = /(api[_-]?key[\"'\s:=]+)([^\"'\s,}]+)/gi;
const AUTHORIZATION_SECRET_PATTERN = /(authorization[\"'\s:=]+)(Bearer\s+)?([^\"'\s,}]+)/gi;

export class LlmProviderError extends Error {
  readonly code: LlmProviderErrorCode;
  readonly status?: number;
  readonly details?: Record<string, unknown>;

  constructor(code: LlmProviderErrorCode, message: string, options: LlmProviderErrorOptions = {}) {
    super(redactSecrets(message, options.redactSecrets), { cause: options.cause });
    this.name = "LlmProviderError";
    this.code = code;
    this.status = options.status;
    this.details = options.details ? redactDetails(options.details, options.redactSecrets) : undefined;
  }
}

export function isLlmProviderError(value: unknown): value is LlmProviderError {
  return value instanceof LlmProviderError;
}

export function redactSecrets(input: string, explicitSecrets: readonly (string | undefined)[] = []): string {
  let output = input;
  for (const secret of explicitSecrets) {
    const trimmed = secret?.trim();
    if (trimmed) {
      output = output.split(trimmed).join(REDACTED);
    }
  }

  output = output.replace(BEARER_SECRET_PATTERN, "Bearer [REDACTED]");
  output = output.replace(API_KEY_SECRET_PATTERN, `$1${REDACTED}`);
  output = output.replace(AUTHORIZATION_SECRET_PATTERN, `$1$2${REDACTED}`);

  return output;
}

function redactDetails(details: Record<string, unknown>, explicitSecrets: readonly (string | undefined)[] = []): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    redacted[key] = redactUnknown(value, explicitSecrets);
  }
  return redacted;
}

function redactUnknown(value: unknown, explicitSecrets: readonly (string | undefined)[] = []): unknown {
  if (typeof value === "string") return redactSecrets(value, explicitSecrets);
  if (Array.isArray(value)) return value.map((item) => redactUnknown(item, explicitSecrets));
  if (isRecord(value)) return redactDetails(value, explicitSecrets);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
