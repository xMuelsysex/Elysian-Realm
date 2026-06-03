# LLM Proposal Review & Apply Draft MVP Implementation Plan

1. Research existing submission UI
   - [x] Inspect `InterventionPanel` and existing admin input templates.
   - [x] Identify the smallest reusable draft shape.

2. Draft mapping
   - [x] Add a pure helper to convert valid proposals into editable draft state.
   - [x] Ensure failed or missing proposals cannot create an apply draft.
   - [x] Preserve proposal metadata for review/audit.

3. Frontend UI
   - [x] Add a review/apply draft panel or section near the LLM proposal result.
   - [x] Support edit, clear, and explicit submit.
   - [x] Route submission through existing `onSubmitInput`.

4. Verification
   - [x] Add deterministic tests for mapping and safety behavior.
   - [x] Run `npm run typecheck`.
   - [x] Run `npm test`.
   - [x] Run `npm run build`.
   - [x] Run `git diff --check`.
   - [x] Run Trellis validate.
