# OpenAI-compatible LLM Boundary MVP Design

## Architecture Summary

Add a new backend module under `src/server/llm/**` that owns all LLM provider interaction. The simulation engine will not import or call a concrete provider in this MVP.

```text
caller/test/local future agent service
  -> runLlmOperation(...)
    -> LlmProvider.completeChat(...)
      -> FakeLlmProvider OR OpenAI-compatible HTTP provider
    -> LlmOperationMetadata
```

The module reuses the existing shared `LlmOperationMetadata`, `OperationKind`, `OperationStatus`, and ID aliases. It does not introduce a second operation record contract.

## Module Layout

```text
src/server/llm/
  index.ts              # public exports
  provider.ts           # provider/request/response/error types
  fakeProvider.ts       # deterministic test/offline provider
  openAiCompatible.ts   # fetch-based OpenAI-compatible provider + env config
  operationRunner.ts    # provider call -> LlmOperationMetadata
  structuredOutput.ts   # parse/validate JSON object output helpers
```

Tests:

```text
tests/llmProvider.test.ts
```

Documentation:

```text
.env.example
README.md
```

## Boundaries and Contracts

### Provider interface

`LlmProvider` owns provider calls only. It returns normalized completion results and throws typed provider errors for failures.

Planned shape:

```ts
export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  completeChat(request: LlmChatRequest, options?: LlmRequestOptions): Promise<LlmChatCompletion>;
}
```

`LlmChatRequest` includes messages, optional `responseFormat`, and optional temperature/max token values. It intentionally does not include API key or base URL; those belong to provider construction.

### OpenAI-compatible HTTP provider

The HTTP provider sends `POST <baseUrl>/chat/completions` with:

- `Authorization: Bearer <apiKey>`;
- `Content-Type: application/json`;
- `model`;
- `messages`;
- optional `response_format` using `json_schema` or `json_object`.

It normalizes response to:

- content text from `choices[0].message.content`;
- finish reason from `choices[0].finish_reason` when available;
- usage tokens from `usage` when available;
- raw provider id/model only when useful and non-secret.

### Fake provider

`FakeLlmProvider` implements the same interface and can be constructed with a fixed response sequence or a failure. It is the only provider used by core tests.

### Operation runner

`runLlmOperation` wraps a single provider call into existing `LlmOperationMetadata`.

Rules:

- Successful provider call + valid optional structured output -> `completed`.
- Provider error -> `failed` or `timedOut`.
- JSON parse/schema validation error -> `failed`.
- Result is stored as a record with output text and optional parsed object.
- Error messages must be useful but must not contain API keys.

### Structured output validation

Provider-level `response_format` helps compatible models produce schema-shaped JSON, but local validation remains authoritative.

MVP local validator will support object-level checks for:

- output must be a JSON object;
- required keys exist;
- primitive field types (`string`, `number`, `integer`, `boolean`, `array`, `object`) match the provided JSON schema subset;
- `additionalProperties: false` rejects unknown keys.

This is intentionally narrow and dependency-free. Future work can replace it with a full JSON Schema validator if requirements grow.

## Data Flow

### Local/real provider experiment

```text
.env (developer local, ignored)
  -> loadOpenAiCompatibleConfigFromEnv(process.env)
  -> createOpenAiCompatibleProvider(config)
  -> runLlmOperation({ provider, request, metadata })
  -> LlmOperationMetadata for diagnostics/future persistence
```

### Tests

```text
FakeLlmProvider or mocked fetch
  -> runLlmOperation
  -> assertions on request shape, result, status, diagnostics, redaction
```

## Error Handling

Use a typed `LlmProviderError` with category/code/status where possible:

- `LLM_PROVIDER_HTTP_ERROR` for non-2xx responses;
- `LLM_PROVIDER_RESPONSE_ERROR` for missing/malformed response content;
- `LLM_PROVIDER_TIMEOUT` for abort/timeout;
- `LLM_PROVIDER_CONFIG_ERROR` for missing/invalid config;
- `LLM_STRUCTURED_OUTPUT_ERROR` for JSON parse/schema validation failures.

Redaction rule: API key values must never appear in errors, operation metadata, tests snapshots, README, or `.env.example`.

## Security / Secret Boundary

- Real secrets live only in the developer's ignored `.env` or shell environment.
- `.env.example` contains placeholder names/values only.
- The provider should not log raw request headers.
- Provider errors should include HTTP status/body excerpts only after redacting bearer-like secret values.

## Compatibility Notes

- This MVP uses Chat Completions-style `/chat/completions`, not the newer Responses API.
- Base URLs may be supplied as either provider root (`https://.../v1`) or full chat-completions URL (`https://.../v1/chat/completions`); the provider normalizes internally.
- Streaming is out of scope.
- Embeddings are out of scope even though the provider spec eventually requires them.

## Validation Plan

1. Targeted Node tests for provider interfaces and operation runner.
2. `npm run typecheck`.
3. `npm test`.
4. `npm run build`.
5. `git diff --check`.
6. Trellis task validation.
