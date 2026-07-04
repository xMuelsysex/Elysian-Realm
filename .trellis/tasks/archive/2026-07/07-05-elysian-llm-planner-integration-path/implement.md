# Elysian LLM Planner Integration Path - Implementation Plan

## Step 0 - Pre-Check

- Read backend/frontend/LLM specs via `trellis-before-dev`.
- Baseline:
  - `npm run build:packages`
  - `npm run typecheck`
  - `npm test`

## Step 1 - Reviewed Proposal Parser

- Add a simulation-layer parser for user-reviewed LLM proposal realm events.
- Validate action, agent ID, target location/agent IDs, and required move target.
- Keep invalid payloads visible through `simulation.inputRejected`.

## Step 2 - Engine State Application

- Apply accepted reviewed proposals in `applyValidatedInput(...)`.
- Preserve deterministic default tick path.
- Append deterministic reviewed proposal memory records after accepted intervention events are created.

## Step 3 - Admin/UI Copy + Tests

- Update LLM panel copy to describe review-gated application accurately.
- Add engine/admin/draft tests for accepted and rejected reviewed proposals.
- Ensure existing fake-provider tests still prove no API keys leak and sandbox call alone does not mutate.

## Step 4 - Verify

Run:

```bash
npm run build:packages
npm run typecheck
npm test
npm run build:ui
rg -n "src/server|src/shared|src/app|\\.\\./\\.\\./src" packages/simulation-agent/src
rg -n "packages/simulation-agent/src|@elysian/simulation-agent/src" src tests
git diff --check
python3 ./.trellis/scripts/task.py validate 07-05-elysian-llm-planner-integration-path
```

## Commit Boundary

Single work commit:

```text
feat: apply reviewed llm planner proposals
```

Then archive, journal, and push.
