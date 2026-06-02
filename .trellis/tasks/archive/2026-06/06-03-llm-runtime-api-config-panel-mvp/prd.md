# LLM Runtime API Config Panel MVP

## Goal

Add a local admin UI panel that lets a developer enter/import OpenAI-compatible LLM provider settings at runtime instead of editing `.env` for every experiment.

## Requirements

1. API key storage is session-only in frontend React state; no localStorage/sessionStorage/persistence.
2. Backend receives the key only for an explicit test request and does not store it.
3. Keep simulation engine isolated from real provider calls.
4. Use existing `src/server/llm/**` provider boundary and operation runner patterns.
5. Support base URL, model, API key, provider name, API mode, timeout, and a test prompt.
6. Surface provider failures visibly; do not fabricate successful responses.
7. Add tests for request validation and UI/API contract behavior where practical.

## Acceptance Criteria

- [x] Admin UI has an LLM config/test panel.
- [x] API key can be pasted/imported without modifying `.env`.
- [x] Key is not stored in localStorage/sessionStorage and is not returned by backend responses.
- [x] Test call goes through OpenAI-compatible provider boundary.
- [x] Tests remain offline/deterministic by using injected/fake fetch or validation-only paths.
- [x] `npm run typecheck` passes.
- [x] `npm test` passes.
- [x] `npm run build` passes.
- [x] `git diff --check` passes.
