# Observable simulation agent demo

## Goal

Give the user a direct way to see the simulation-agent framework effect without reading tests. The demo should run locally from an npm script and print a deterministic, human-readable trace of one agent tick, memory retrieval/write, action proposal, and explicit reflection.

## What I Already Know

- M1-M7 completed the package boundary, memory, reflection, runtime facade, Elysian runtime consumption, README usage example, and testing helpers.
- The current "effect" is visible only through tests and source code.
- The user wants the actual effect, not another explanation.
- The fastest useful observable surface is a CLI demo before a larger Admin UI/runtime persistence integration.

## Requirements

- Add an npm script `demo:simulation-agent`.
- The script must build the server/package first, then run a deterministic CLI demo.
- The demo output must show:
  - agent id and observation/perception summary;
  - retrieved memories;
  - cognitive tick phase diagnostics;
  - submitted action proposal;
  - plan memory written by the tick;
  - explicit reflection result and persisted reflection memory.
- Keep the demo offline and deterministic, using fake/deterministic planning and reflection only.
- Add a test for the structured demo result or formatted output so the demo cannot silently drift.
- Do not add Admin UI changes, production persistence, real LLM calls, provider config, or automatic reflection scheduling.
- Do not make demo memory authoritative world state.

## Acceptance Criteria

- [x] `npm run demo:simulation-agent` prints a readable deterministic demo.
- [x] Demo code imports `@elysian/simulation-agent` through the package root only.
- [x] Demo structured result includes tick phases, proposal, memory records, and reflection memory.
- [x] A Node test validates the demo's structured output and key formatted sections.
- [x] `npm run build:packages`, `npm run typecheck`, and `npm test` pass.
- [x] Package/app boundary scans pass.

## Definition of Done

- M8 work is committed separately.
- The task is archived and journaled after verification.
- The branch is pushed after commits.

## Out of Scope

- Admin UI visualization.
- Engine-owned persisted memories.
- Reflection scheduling policy.
- Real LLM provider integration.
- Embeddings/vector search.
- Any frontend changes.

## Technical Notes

- Primary source target: `src/server/demo/simulationAgentDemo.ts`.
- Primary test target: `tests/simulationAgentDemo.test.ts`.
- Npm script target: root `package.json`.
- The demo can reuse `SimulationAgentRuntime`, `InMemoryMemoryStore`, and deterministic reflection planner from the package public API.
