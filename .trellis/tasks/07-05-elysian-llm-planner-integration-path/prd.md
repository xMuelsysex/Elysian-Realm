# LLM planner integration path

## Goal

Connect the existing Admin LLM action-proposal sandbox to the real simulation engine through a user-reviewed, typed input path. A completed LLM proposal should still be optional and review-gated, but once the user submits the reviewed draft, the engine should deterministically apply the resulting proposal to the target agent state and memory stream.

## What I Already Know

- Admin can already call an OpenAI-compatible provider and return a validated `LlmActionProposalResponse`.
- The frontend already creates a user-reviewed `realmEvent` draft from a completed proposal.
- Today that reviewed draft is replay-visible only as `realm.interventionSubmitted`; it does not affect agent action state.
- The core engine is synchronous and deterministic by default. M14 must not make live LLM calls mandatory for normal ticks or tests.

## Requirements

- Preserve the existing sandbox provider path and fake-provider tests.
- Treat LLM output as generated preview until a user-reviewed draft is submitted as a typed input.
- Validate reviewed LLM proposal payloads at the simulation boundary before they can affect state.
- Apply accepted reviewed proposals deterministically to the target agent's `currentAction`, `currentPlanId`, `status`, and location when applicable.
- Append a deterministic generated `plan` or `action` memory record linked to the accepted input/event, without adding a new replay event kind.
- Keep invalid or unreviewed LLM proposal payloads as rejected inputs with visible diagnostics.
- Preserve `events`, `timeline`, and `replay` as the replay-visible source, and keep generated proposal details inspectable through existing intervention payloads and memory stream.

## Acceptance Criteria

- [x] Reviewed LLM proposal drafts are validated for agent/action/target references before state changes.
- [x] Accepted reviewed proposals deterministically update the target agent action/location for move, wait, performActivity, reflect, and continue-style proposals.
- [x] Accepted reviewed proposals append a generated engine memory record with source/provenance metadata.
- [x] Invalid reviewed proposal payloads emit `simulation.inputRejected` and do not mutate state.
- [x] Admin/UI copy clarifies that LLM proposals are preview-only until reviewed and applied.
- [x] Default simulation ticks still use deterministic planning and do not require network/API keys.
- [x] `npm run build:packages`, `npm run typecheck`, `npm test`, `npm run build:ui`, boundary scans, `git diff --check`, and Trellis validate pass.

## Definition of Done

- Work is committed separately.
- Task is archived and journaled.
- Branch is pushed before M15 starts.

## Out of Scope

- Automatic live LLM calls inside default `stepSimulationEngine`.
- Async operation queues beyond the existing Admin sandbox call.
- Conversation-turn generation.
- Provider key persistence.
- Production operation persistence or cost dashboards.
