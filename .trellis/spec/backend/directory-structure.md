# Backend Directory Structure

> Backend organization for the Elysian Realm multi-agent simulation.

## Status

The first TypeScript slice is implemented. Current source establishes project scripts, shared contracts, shared domain enums/IDs, persona validation, pilot persona fixtures, and offline tests.

## Core Rule

Choose one authoritative simulation core. Do not create parallel TypeScript and Python implementations that can both mutate world state.

## Implemented TypeScript Baseline

The chosen primary implementation path is TypeScript full-stack. The implemented Slice 1 layout is:

```text
src/
├── server/
│   └── personas/
│       ├── fixtures/pilotPersonas.ts  # three placeholder pilot persona specs
│       ├── index.ts                   # persona module exports
│       └── validation.ts              # zero-runtime-dependency persona validator
└── shared/
    ├── contracts/
    │   ├── index.ts                   # shared contract exports
    │   ├── persona.ts                 # PersonaSpec and persona.v1 contract
    │   └── simulation.ts              # world/agent/event/memory/conversation/plan/input/operation DTOs
    └── domain/
        ├── ids.ts                     # string ID aliases
        ├── index.ts                   # domain exports
        ├── provenance.ts              # authorship/provenance/source/visibility unions
        └── simulation.ts              # status/kind/state unions

tests/
└── personaValidation.test.ts          # Node built-in test runner coverage
```

Future slices should extend the planned backend shape without moving these contracts unless a migration is recorded:

```text
src/server/simulation/      # world state owner, engine loop, inputs, events, replay
src/server/agents/          # cognitive loop, perception, planning, action selection
src/server/memory/          # memory records, embeddings, retrieval scoring, reflection
src/server/conversations/   # lifecycle, message persistence, summaries
src/server/llm/             # provider interfaces, fake provider, prompt schemas
src/server/observability/   # logs, operation traces, cost/token metrics
src/app/ or src/client/     # frontend reads shared contracts only
```

## Python Boundary

Python is not the MVP simulation authority.

It may be introduced later only for offline experiments such as:

- prompt comparison notebooks;
- persona consistency evaluation;
- retrieval/ranking experiments;
- batch simulation analysis against exported event logs.

Python tools must consume exported fixtures or API snapshots and must not mutate production world state, own replay, or become a parallel simulation core.

## Module Ownership

- `simulation` owns active world snapshots, input processing, event emission, and replay.
- `agents` owns agent loop orchestration but submits state changes as simulation inputs.
- `memory` owns memory persistence, retrieval diagnostics, reflection records, and embedding cache.
- `personas` owns immutable base persona specs and validation.
- `conversations` owns transcript storage, lifecycle state transitions, and per-participant summaries.
- `llm` owns provider calls, prompt schema versions, structured output validation, and fake providers.
- `shared/contracts` owns all state-changing DTOs and event decoders used by backend and frontend.

## Naming Conventions

Use names that expose the domain boundary:

- `World`, `AgentRuntimeState`, `PersonaSpec`, `RealmEvent`, `MemoryRecord`, `Conversation`, `SimulationInput`.
- Use `*Schema` or `*Validator` for runtime validation objects.
- Use `*Projection` for read models sent to the UI.
- Use `*Repository` only for persistence adapters; do not put business rules in repositories.
- Use `Fake*Provider` for deterministic test providers.

## Anti-Patterns

- A `utils/` folder containing simulation rules.
- A prompt file that also writes database records.
- Frontend-only types that duplicate backend event payloads.
- Database table shapes imported directly into UI components.
- Two different modules calculating relationship or memory retrieval scores.

## Verification

For the current TypeScript baseline, run:

```bash
npm run typecheck
npm test
```

Generated output from `npm test` goes to `dist/`, and dependencies go to `node_modules/`; both are ignored by the root `.gitignore` and must not be committed.

For future backend modules, also verify:

- state-changing inputs have shared validators;
- simulation code does not import UI modules;
- prompt builders are pure and do not import database clients;
- replay tests can run without live LLM calls.
