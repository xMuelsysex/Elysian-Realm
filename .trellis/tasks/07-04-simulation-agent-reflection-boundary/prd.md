# Simulation agent reflection boundary

## Goal

Add reflection-boundary primitives to `@elysian/simulation-agent` so hosts can synthesize evidence-linked reflection memories through an injected reflection planner / LLM boundary without bundling provider adapters or requiring live model calls in package tests.

This is M3 of the simulation-agent framework scope. M1 established the package boundary and M2 added deterministic memory primitives. M3 should add reflection contracts, validation, diagnostics, and memory creation rules while keeping scheduling, provider implementation, secrets, retries, and host world state outside the package.

## Requirements

- Define package-owned reflection trigger/input contracts.
- Define structured reflection output contracts.
- Define reflection diagnostics and failure states.
- Consume an injected reflection planner/provider boundary only; do not import Elysian LLM modules or provider adapters.
- Validate reflection planner outputs before creating memories.
- Reflection output must preserve explicit evidence memory IDs.
- Evidence memory IDs must reference existing memories retrieved/provided to the reflection call.
- Valid reflection output creates a `kind: "reflection"` memory write compatible with `InMemoryMemoryStore`.
- Malformed output fails visibly with diagnostics and creates no fake insight memory.
- Core tests must use deterministic fake planners/providers only.
- Export reflection primitives through `packages/simulation-agent/src/index.ts`.
- Keep package source free of Elysian imports, provider secrets, env reads, network calls, and concrete Elysian domain types.

## Acceptance Criteria

- [x] Package root exports reflection input/output/planner/diagnostic types.
- [x] A valid fake reflection planner can produce an evidence-linked reflection memory write.
- [x] Reflection validation rejects empty insights, missing evidence IDs, unknown evidence IDs, invalid importance, and malformed planner output.
- [x] Failed reflection returns visible diagnostics and stores no reflection memory.
- [x] Reflection planner/provider errors are visible failures, not fabricated success.
- [x] Reflection tests run offline and do not require API keys or network.
- [x] Existing memory and cognitive-loop tests remain green.
- [x] Package boundary scans still find no Elysian imports or deep imports.
- [x] `npm run build:packages`, `npm run typecheck`, and `npm test` pass.

## Definition of Done

- M3 code is committed separately from M1/M2 work.
- Reflection public API is explicit and reviewable through `packages/simulation-agent/src/index.ts`.
- Reflection memories are evidence-linked and compatible with M2 memory primitives.
- Tests remain offline and deterministic.
- Backend specs are updated if concrete reflection signatures differ from this plan.

## Out of Scope

- OpenAI-compatible provider implementation inside the package.
- Live LLM calls in package tests.
- Host-specific reflection scheduling policy.
- Provider secret/env loading, retry policy, budget handling, or timeout orchestration beyond accepting injected options.
- Embedding/vector retrieval.
- Elysian engine/admin/frontend integration.
- Automatic cognitive-loop `reflect` phase execution. The loop may continue to skip reflect until a separate runtime/facade task wires it.

## Technical Notes

- Parent task: `.trellis/tasks/07-03-agent-framework-scope`.
- Existing package modules:
  - `packages/simulation-agent/src/ports/ports.ts`
  - `packages/simulation-agent/src/memory/**`
- Relevant specs:
  - `.trellis/spec/backend/persona-memory.md`
  - `.trellis/spec/backend/agent-simulation.md`
  - `.trellis/spec/backend/llm-orchestration.md`
  - `.trellis/spec/backend/error-handling.md`
  - `.trellis/spec/backend/quality-guidelines.md`
