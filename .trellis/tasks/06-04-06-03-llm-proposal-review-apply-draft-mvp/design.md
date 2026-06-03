# LLM Proposal Review & Apply Draft MVP Design

## Scope

Add a frontend review/apply draft flow for the existing LLM action proposal sandbox. This task should not make the backend apply proposals automatically.

## Data flow

1. User enters session-only LLM runtime config.
2. User generates an action proposal for a selected agent.
3. Frontend converts a valid `LlmActionProposalPreview` into an editable draft.
4. User reviews and edits the draft.
5. User explicitly submits the draft through existing `onSubmitInput` / `/api/admin/input`.
6. Backend simulation engine remains the only component that mutates `WorldSnapshot`.

## Draft mapping

Initial mapping should be conservative:

- `move` proposal -> draft `realmEvent` or `observerCommand` only if the existing command templates can express it clearly.
- `performActivity`, `reflect`, `wait`, `continue` -> editable draft payload with proposal metadata and user-review provenance.
- Include `proposalAction`, `reason`, `intent`, optional targets, and selected `agentId` in the draft payload.

If exact semantic application is ambiguous, prefer creating a reviewable observer command draft over inventing new backend simulation behavior.

## Safety rules

- No auto-submit after proposal generation.
- No hidden fallback that applies a malformed proposal.
- Failed operation metadata is display-only and cannot be applied.
- API key remains in React state only and is not stored with the draft.
- Draft lifecycle is local UI state only.

## Testing strategy

- Unit-test pure mapping helpers if added.
- Exercise UI-facing view/model logic through existing deterministic tests where practical.
- Existing backend action-proposal tests remain offline and deterministic.
