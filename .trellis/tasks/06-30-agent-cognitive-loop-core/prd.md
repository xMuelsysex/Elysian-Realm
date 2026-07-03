# Agent cognitive loop core

## Goal

Grow the agent runtime cognitive loop as a **port-converged module**, incubated in-repo with Elysian Realm as the first consumer, on a path to extracting a reusable agent library later.

The agent runtime today is a stub: the engine's agent tick only runs deterministic routines (move to a scheduled location + `performActivity`). There is no Plan / Remember / Reflect, and `memory.seeded` is event-only with no memory store. This task builds the real cognitive loop behind clean ports so it can be reused.

## Strategy

**Logical separation first, physical extraction later.** A "general agent library" that no project has used will have the wrong API. Generality comes from at least one real consumer shaping the ports, not from up-front design or an empty repo.

- **Phase A (this task)**: create `src/agent-core/**` with port interfaces + a minimal cognitive-loop slice. Elysian's simulation engine is the first adapter. Fake LLM driven, fully deterministic and testable.
- **Phase B (later task)**: complete Remember / Reflect / memory store; wire a second scenario (even a test fixture) to validate port generality.
- **Phase C (later task)**: dependencies are already converged → extract to a standalone npm package / repo with near-zero rework.

## Scope (Phase A)

### In scope

- Define agent-core port interfaces (the boundary the loop depends on, nothing Elysian-specific):
  - `LlmPort` — model calls. Elysian's existing `LlmProvider` already satisfies this shape.
  - `PerceptionPort` — read events / nearby agents / conversation + intervention state for an agent.
  - `MemoryPort` — retrieve and write typed memories (Phase A: retrieve can be a deterministic stub; write records observations).
  - `ActionSink` — submit a typed action proposal; the loop never mutates world state.
- Implement the cognitive loop **Plan slice**: Perceive → Retrieve → Plan → emit a typed action proposal. Skipped phases (Remember/Reflect) must be visible in diagnostics, not silently dropped.
- Provide an Elysian adapter so the engine's agent tick can drive the loop through ports instead of the inline routine logic, **without breaking** the existing deterministic seed/replay contract.
- Keep agent-core free of Elysian `src/shared/domain` / `src/shared/contracts` concrete imports. Use generic type parameters or an agent-core-owned minimal type set; Elysian types live in the adapter layer.

### Out of scope (Phase A)

- Real embeddings / vector retrieval (use deterministic stub scoring).
- Reflection threshold logic and memory importance accumulation.
- Conversation lifecycle changes.
- Real LLM provider calls in engine tests (fake provider only).
- Physical extraction to a separate repo/package.
- Replacing `src/server/llm/openAiCompatible.ts` or introducing `pi-ai` (separately evaluated; not required here).

## Constraints

- **Authoritative state rule**: the simulation engine remains the single owner of world state. The loop only produces typed action proposals; it must not patch `agent.status`, `currentAction`, `location`, or `conversationId`.
- **Determinism / replay**: same seed + input sequence must still produce the same replay summary. No live LLM calls in deterministic tests.
- **One in-flight operation per agent** must be preserved.
- **No swallowed errors**: LLM / parser / retrieval failures surface as diagnostics, never as fake successful agent actions.
- **Dependency direction**: `agent-core` must not import from `src/server/simulation`, `src/server/admin`, or Elysian domain modules. The adapter depends on agent-core, not the reverse.

## Acceptance Criteria

- [x] `src/agent-core/**` exists with `LlmPort`, `PerceptionPort`, `MemoryPort`, `ActionSink` interfaces and no Elysian concrete-type imports (verified by import inspection / lint).
- [x] A cognitive-loop Plan slice runs Perceive → Retrieve → Plan → Act and returns a typed action proposal; skipped phases appear in a diagnostics structure.
- [x] An Elysian adapter drives the loop from the engine tick; the existing `simulationEngine.test.ts` seed/replay assertions still pass unchanged.
- [x] One-in-flight-operation invariant holds: the loop does not start a second operation for an agent that already has `inProgressOperationId`.
- [x] Deterministic tests drive the loop and adapter with pure fake ports and assert stable proposal output + diagnostics, with no network access.
- [x] Error injection (planner failure / malformed structured plan output) produces a visible diagnostic and no fabricated proposal.
- [x] Quality gate passes: `npm run typecheck` + `npm test` green (project has no lint/check script).

## Notes

- This is the carrier task for the cognitive loop. `design.md` defines port boundaries and the slice; `implement.md` defines execution order before `task.py start` work begins.
- Reference patterns (from `.trellis/spec/backend/agent-simulation.md`): generative_agents perceive→retrieve→plan→reflect, ai-town server-authoritative world engine.
- `pi-agent-core` (earendil-works/pi) is a conversational coding-agent harness with self-owned message state — structurally incompatible with the server-authoritative deterministic sim and is **not** reused. `pi-ai` (its multi-provider LLM layer) is a possible future `LlmPort` implementation, tracked separately.
