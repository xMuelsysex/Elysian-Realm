# LLM Runtime API Config Panel MVP Implementation Plan

1. Backend contract/API
   - [x] Add runtime LLM config request/result types.
   - [x] Add admin controller method for one-shot provider test.
   - [x] Add HTTP route.

2. Frontend API/UI
   - [x] Add admin API helper for the LLM test route.
   - [x] Add session-only React state panel.
   - [x] Add import JSON support without browser persistence.

3. Tests/verification
   - [x] Add offline backend tests.
   - [x] Run `npm run typecheck`.
   - [x] Run `npm test`.
   - [x] Run `npm run build`.
   - [x] Run `git diff --check`.
