# LLM Proposal Review & Apply Draft MVP

## Goal

Convert generated LLM action proposals into editable intervention drafts that require explicit user confirmation before submission, preserving backend authority and sandbox safety.

## Requirements

- Add a review step after an LLM action proposal is generated.
- Let the user convert a proposal into an editable intervention draft.
- Draft must be local frontend state until the user explicitly submits it.
- Draft submission must reuse the existing admin input path (`submitAdminInput`) rather than mutating simulation state directly.
- The proposal must never auto-apply, auto-step, or enqueue simulation input without a user action.
- Preserve the session-only LLM API-key policy:
  - no `.env` writes;
  - no `localStorage` / `sessionStorage`;
  - no backend persistence;
  - no key in responses.
- Keep backend authoritative: frontend may prepare command payloads but does not become a simulation engine.
- Keep tests offline and deterministic; no real LLM calls or API keys.

## Acceptance Criteria

- [ ] A generated action proposal can be copied into a visible editable draft.
- [ ] Draft fields are editable before submission.
- [ ] Submission requires an explicit user click.
- [ ] Submitting a draft routes through existing admin input submission and produces the usual receipt/diagnostics flow.
- [ ] Closing or clearing the draft does not mutate world state.
- [ ] Invalid or failed LLM proposal results cannot be applied silently.
- [ ] Tests cover proposal-to-draft behavior without live network calls.
- [ ] `npm run typecheck`, `npm test`, `npm run build`, `git diff --check`, and Trellis validate pass.

## Notes

- Recommended frontend location: Control tab, near the existing LLM runtime panel and intervention panel.
- Prefer minimal UI state and reuse existing intervention contracts over adding a second submission path.
