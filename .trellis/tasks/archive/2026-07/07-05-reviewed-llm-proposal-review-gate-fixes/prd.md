# Fix reviewed LLM proposal review gate regressions

## Goal

Fix two review-discovered regressions in the reviewed LLM proposal path so the M14 review gate remains authoritative and repeated reviewed proposals cannot corrupt the engine memory stream.

## What I Already Know

- Codeg Claude and Codex reviewed commit `18c1764 feat: apply reviewed llm planner proposals`.
- I locally reproduced that `source: "llm"` reviewed proposal inputs are currently accepted and mutate agent state.
- I locally reproduced that two reviewed proposals for the same agent in one step create duplicate `memory_<step>_<agent>_llm_proposal` IDs, and the next step throws when the memory store rehydrates records.
- The product boundary remains: LLM output is generated preview until a user-reviewed typed input is submitted.

## Requirements

- Reviewed LLM proposal inputs must be accepted only from `source: "user"`.
- Invalid reviewed LLM proposal sources must emit `simulation.inputRejected` and must not mutate agent state or memory state.
- Multiple reviewed proposals for the same agent in the same step must keep deterministic, unique memory IDs and must not crash later steps.
- Keep the fix offline and deterministic; do not add live LLM calls or new event kinds.
- Keep unrelated dirty worktree changes out of the commit.

## Acceptance Criteria

- [x] `source: "llm"` reviewed proposal input is rejected with visible diagnostics and no state mutation.
- [x] Two same-step reviewed proposals for the same agent produce unique memory IDs and a subsequent step does not throw.
- [x] Existing reviewed proposal happy-path behavior remains deterministic and tested.
- [x] `npm run typecheck`, `npm test`, `git diff --check`, and Trellis validate pass.

## Out of Scope

- Changing cross-step persistence semantics for reviewed proposal actions.
- Adding diagnostics history or new replay event kinds.
- Reworking Admin/UI draft flow.

## Technical Notes

- Expected data flow: Admin/UI or other caller -> `SimulationInput` -> `validateSimulationInput` -> engine state/memory update -> existing accepted/rejected events.
- Relevant files: `src/server/simulation/inputs.ts`, `src/server/simulation/engine.ts`, `tests/simulationEngine.test.ts`, `tests/adminController.test.ts`, `.trellis/spec/backend/llm-orchestration.md`, `.trellis/spec/backend/agent-simulation.md`.
