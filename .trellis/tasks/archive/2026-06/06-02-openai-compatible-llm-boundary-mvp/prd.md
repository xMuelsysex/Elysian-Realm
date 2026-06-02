# OpenAI-compatible LLM Boundary MVP

## Goal

Add the first safe, testable LLM provider boundary for Elysian Realm using an OpenAI-compatible chat-completions interface, without coupling live model calls to the simulation engine or requiring network/API keys for tests.

## User Value

The project can start connecting to large models while preserving the existing deterministic simulation architecture. Developers should be able to configure a real OpenAI-compatible endpoint for local experiments, but all core validation and CI checks must remain offline and deterministic through a fake provider.

## Confirmed Facts

- Current stack is TypeScript ESM with Node built-in test runner.
- Existing shared contracts already define `LlmOperationMetadata`, `OperationKind`, `OperationStatus`, and `OperationId`.
- There is no current `src/server/llm/**` implementation.
- Backend specs require all model/embedding calls to go through explicit provider interfaces.
- Backend specs forbid:
  - direct vendor SDK calls from the simulation engine;
  - hard-coded provider/model/API keys in source or persona files;
  - tests requiring live network model calls;
  - silent fallback from failed model output to fabricated successful behavior.
- `.env` and `.env.*` are gitignored; `!.env.example` is explicitly allowed.
- The first implementation should support OpenAI-compatible HTTP APIs because that covers OpenAI, OpenRouter, DeepSeek/Qwen-compatible gateways, and many local gateways through `baseUrl`/`model`/`apiKey` configuration.
- OpenAI-compatible structured output commonly uses `response_format: { type: "json_schema", json_schema: { name, strict, schema } }`; compatible providers may return JSON in `choices[0].message.content` plus optional `usage` metadata.

## Requirements

### R1. Provider interface

- Add a backend-owned provider abstraction under `src/server/llm/**`.
- Support at least a non-streaming chat completion method with:
  - messages with `system`, `user`, and `assistant` roles;
  - provider/model metadata;
  - optional JSON schema response format;
  - timeout/cancellation support;
  - usage/latency diagnostics when available.
- Keep the interface provider-agnostic and dependency-light.

### R2. OpenAI-compatible HTTP provider

- Implement an OpenAI-compatible HTTP provider using `fetch`, not a vendor SDK.
- Configure it through explicit config values derived from environment variables.
- Required configuration fields:
  - base URL;
  - model;
  - API key;
  - timeout in milliseconds.
- Normalize the base URL so callers do not have to know whether to include `/chat/completions`.
- Send `Authorization: Bearer <apiKey>` only inside the provider boundary.
- Never expose API keys in thrown errors, diagnostics, logs, tests, or docs.
- Treat non-2xx responses, malformed provider responses, missing choices/content, aborts, and invalid JSON as visible provider failures.

### R3. Fake provider

- Add a deterministic `FakeLlmProvider` for tests and offline development.
- It must not perform network calls.
- It should support fixed text/JSON responses and configurable failure modes.

### R4. Operation runner / metadata

- Add a minimal operation runner that turns one provider call into `LlmOperationMetadata`.
- It should record:
  - operation id;
  - world id;
  - optional agent id;
  - operation kind;
  - status (`completed`, `failed`, or `timedOut` for this MVP);
  - prompt schema version;
  - provider;
  - model;
  - start/completion timestamps;
  - result or structured error;
  - diagnostics including latency and token counts when available.
- Failed operations must stay failed; no fabricated successful model output.

### R5. Structured output validation

- Add a narrow structured-output helper for this boundary MVP.
- The provider may request JSON schema output, but local code must still parse and validate expected JSON before marking an operation result usable.
- Invalid JSON or invalid shape should create a failed operation with preserved non-secret diagnostics.

### R6. Configuration and docs

- Add `.env.example` entries for local LLM configuration with placeholders only.
- Document local usage in `README.md` without instructing users to commit secrets.
- Do not create or modify real `.env` files.

## Acceptance Criteria

- [x] `src/server/llm/**` exposes provider types, `FakeLlmProvider`, OpenAI-compatible provider/config helpers, and an operation runner.
- [x] Existing `LlmOperationMetadata` is reused rather than replaced by a second operation contract.
- [x] Fake provider tests cover successful text output, successful structured JSON output, provider failure, malformed structured output, and timeout/cancellation behavior where practical.
- [x] OpenAI-compatible provider tests mock `fetch` and cover request shape, authorization header use, usage diagnostics, non-2xx errors, malformed responses, and API-key redaction.
- [x] Operation runner tests prove failures are visible and do not produce fake successful results.
- [x] Core simulation tests still do not require live network or API keys.
- [x] `.env.example` contains only placeholder variable names/values, no secrets.
- [x] README documents the optional local model configuration and warns not to commit `.env`.
- [x] `npm run typecheck` passes.
- [x] `npm test` passes.
- [x] `npm run build` passes.
- [x] `git diff --check` passes.
- [x] `python3 ./.trellis/scripts/task.py validate 06-02-openai-compatible-llm-boundary-mvp` passes.

## Out of Scope

- Live LLM calls during tests.
- Storing real API keys, tokens, or credentials.
- Streaming responses.
- Embeddings implementation.
- Direct simulation-engine agent behavior driven by LLM results.
- Prompt builders for full daily plan/action/conversation/reflection flows.
- Database persistence for operations.
- Frontend UI for provider configuration or operation traces.
- Retrying failed provider calls.

## Follow-up Extension: Responses API Transport

The boundary was extended to support an optional OpenAI Responses-style transport while preserving the same `LlmProvider` and `runLlmOperation` contracts.

- `ELYSIAN_LLM_API_MODE=chat_completions` keeps the original `/chat/completions` behavior.
- `ELYSIAN_LLM_API_MODE=responses` sends `POST /responses` requests.
- Responses structured output uses `text.format` instead of `response_format`.
- Responses output text is normalized from `output_text` or `output[].content[].text`.
- Responses usage maps `input_tokens`/`output_tokens` to prompt/completion diagnostics.
- Responses refusals and non-`completed` statuses are visible provider failures.
- Responses requests include `store: false` by default.

## Open Questions

None blocking. Later tasks can wire specific agent operations into the simulation loop.
