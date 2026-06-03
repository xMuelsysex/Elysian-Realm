# LLM Action Proposal Sandbox MVP Implementation Plan

1. Backend contracts/API
   - [x] Add action proposal request/response/proposal types.
   - [x] Add admin controller action proposal method.
   - [x] Add HTTP route.
   - [x] Keep API key out of response and state.

2. Prompt and validation
   - [x] Build minimal action proposal prompt from snapshot/persona/recent events.
   - [x] Parse structured JSON through `runLlmOperation`.
   - [x] Validate action kind and target ids.
   - [x] Return failed operation metadata for invalid output.

3. Frontend
   - [x] Add API helper.
   - [x] Extend runtime LLM panel with agent selector and proposal button/result.
   - [x] Show generated/sandbox labeling.

4. Tests/verification
   - [x] Add offline admin controller/HTTP tests.
   - [x] Run `npm run typecheck`.
   - [x] Run `npm test`.
   - [x] Run `npm run build`.
   - [x] Run `git diff --check`.
   - [x] Run Trellis validate.
