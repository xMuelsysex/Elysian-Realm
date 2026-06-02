# OpenAI-compatible LLM Boundary MVP Implementation Plan

## Implementation Checklist

1. Planning / context
   - [x] Read task PRD and design.
   - [x] Read backend specs for directory structure, agent simulation, persona/memory, LLM orchestration, error handling, logging, and quality.
   - [x] Confirm existing shared operation contract (`LlmOperationMetadata`) will be reused.

2. LLM module skeleton
   - [x] Create `src/server/llm/index.ts` exports.
   - [x] Create `provider.ts` with provider/request/response/error types and secret redaction helper.

3. Fake provider
   - [x] Implement deterministic `FakeLlmProvider` with fixed response sequence and failure modes.
   - [x] Add tests for success/failure and no-network behavior.

4. Structured output helper
   - [x] Implement dependency-free JSON object parser and narrow JSON-schema-subset validator.
   - [x] Add tests for valid object, malformed JSON, missing required field, wrong primitive type, and disallowed extra property.

5. OpenAI-compatible provider
   - [x] Implement config loader from env-like records.
   - [x] Implement base URL normalization.
   - [x] Implement fetch-based non-streaming `/chat/completions` call.
   - [x] Add tests with mocked fetch for request body, headers, response parsing, usage metadata, HTTP errors, malformed responses, timeout, and redaction.

6. Operation runner
   - [x] Implement `runLlmOperation` using existing `LlmOperationMetadata`.
   - [x] Add tests for completed, failed, timed out, structured output parsed, and structured output validation failed.

7. Docs/config examples
   - [x] Add `.env.example` placeholder LLM variables only.
   - [x] Update README with optional local LLM setup and secret-handling warning.

8. Verification
   - [x] `npm run typecheck`
   - [x] `npm test`
   - [x] `npm run build`
   - [x] `git diff --check`
   - [x] `python3 ./.trellis/scripts/task.py validate 06-02-openai-compatible-llm-boundary-mvp`

## Validation Commands

```bash
npm run typecheck
npm test
npm run build
git diff --check
python3 ./.trellis/scripts/task.py validate 06-02-openai-compatible-llm-boundary-mvp
```

## Risky Files / Boundaries

- `.env.example`: placeholders only; never write real secrets.
- `README.md`: docs must warn that `.env` is ignored and secrets must not be committed.
- `src/server/llm/openAiCompatible.ts`: must not expose API key values in errors or operation metadata.
- `src/shared/contracts/simulation.ts`: avoid changing the existing operation contract unless absolutely necessary.
- `src/server/simulation/**`: no direct provider calls in this MVP.

## Rollback Plan

The implementation is isolated. If needed, remove `src/server/llm/**`, `tests/llmProvider.test.ts`, `.env.example`, and the README LLM section. No database or persistent state migration is involved.
