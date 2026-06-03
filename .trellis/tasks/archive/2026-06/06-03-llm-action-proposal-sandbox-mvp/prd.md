# LLM Action Proposal Sandbox MVP

## Goal

Let a developer generate a one-shot LLM action proposal for a selected agent from the current world snapshot, persona facts, current action/location, and recent events, while keeping the proposal as a sandbox preview that never mutates simulation state.

## Requirements

1. Reuse the session-only runtime LLM config pattern; do not require editing `.env`.
2. API keys remain frontend session memory only and are sent to the backend only for explicit LLM requests.
3. Backend calls must go through `src/server/llm/**` provider boundary and `runLlmOperation`.
4. The simulation engine must not call the real provider and must not be mutated by a proposal result.
5. Action proposal output must be structured and validated.
6. Reject or surface invalid target location/agent references in operation diagnostics.
7. Frontend must label the result as generated/sandbox and not apply it to the world.
8. Tests must remain offline/deterministic via injected fake fetch.

## Acceptance Criteria

- [ ] Admin backend exposes an action proposal sandbox endpoint.
- [ ] Endpoint accepts runtime LLM config plus `agentId`.
- [ ] Prompt includes selected agent runtime context, persona facts, valid locations/agents, and recent event summaries.
- [ ] LLM output is parsed as structured JSON.
- [ ] Invalid action kind or invalid target ids produce visible failed operation metadata.
- [ ] Frontend can generate a proposal for a selected/current agent from the LLM panel.
- [ ] Result is displayed as generated sandbox output and does not change `WorldSnapshot`.
- [ ] Tests are offline/deterministic.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] `git diff --check` passes.
- [ ] Trellis validation passes.
