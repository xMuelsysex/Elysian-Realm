# Backend Quality Guidelines

> Quality standards for the Elysian Realm multi-agent simulation backend.

## Core Quality Bar

Backend code must be deterministic where possible, observable when non-deterministic, and testable without live LLM calls.

The current TypeScript baseline uses strict TypeScript, zero-runtime-dependency persona validation, Node's built-in test runner, and generated output ignored through the root `.gitignore`.

## Required Patterns

- One authoritative simulation owner per world.
- State mutations enter through typed simulation inputs.
- Event payloads, persona specs, memory records, and LLM outputs use shared validators.
- LLM and embedding providers are injected behind interfaces.
- Fake providers support deterministic offline tests.
- Generated content is labeled and stored separately from configured persona facts.
- Memory writes preserve source event IDs.
- Reflection records preserve evidence memory IDs.

## Forbidden Patterns

- Direct world-state writes from frontend handlers, model operations, or memory repositories.
- Hard-coded character prompts in code instead of structured persona specs.
- Silent fallback from failed LLM output to fabricated successful action.
- Unbounded reflection or conversation loops.
- Multiple modules implementing their own event payload parsing.
- Tests that require real API keys or network access for core simulation behavior.
- Storing official game dialogue, extracted official assets, or proprietary story dumps in the repository.

## Testing Requirements

Current project commands:

```bash
npm run typecheck
npm test
```

`npm test` runs `npm run build` first, then executes `node --test dist/tests/*.test.js`. Generated `dist/` output and `node_modules/` must remain ignored and uncommitted.

Add targeted tests with each implementation slice:

### Contract and Schema Tests

- persona schema accepts valid pilot fixtures;
- persona parser throws `PersonaValidationError` with diagnostics for invalid input;
- persona schema rejects missing identity, speech, routine, relationship, and boundary fields;
- persona schema rejects forbidden generated/runtime fields at top-level and nested locations;
- persona roster validation rejects duplicate or unknown relationship targets when context is supplied;
- memory schema rejects records without source event IDs;
- event/input validators reject unknown kinds and invalid references.

### Simulation Tests

- fixed seed run produces stable event log;
- invalid input is rejected without state mutation;
- one agent cannot join two active conversations;
- replay reconstructs the same timeline from events/snapshots.

### Memory Tests

- retrieval ranking covers recency-dominant, relevance-dominant, and importance-dominant cases;
- retrieval diagnostics include component scores;
- reflection triggers only after threshold/schedule;
- reflection evidence links point to existing memories.

### LLM Boundary Tests

- fake provider drives daily plan/action/conversation tests;
- malformed structured output creates failed operation diagnostics;
- provider timeout or rate limit does not corrupt world state;
- operation result can affect state only through typed inputs.

## Review Checklist

Before approving backend changes:

- [ ] Does this introduce a second source of truth for world, plan, memory, or relationship state?
- [ ] Are state-changing payloads validated once at the boundary and shared across consumers?
- [ ] Can the behavior be replayed or explained from event logs and diagnostics?
- [ ] Can tests run without live LLM/embedding providers?
- [ ] Are generated outputs visually and persistently separated from configured facts?
- [ ] Are failures visible rather than hidden behind fallback behavior?

## Complexity Control

Prefer the smallest complete vertical slice:

1. schema and fixtures;
2. deterministic simulation loop;
3. memory retrieval;
4. one LLM-backed operation;
5. two-agent conversation;
6. text timeline UI.

Do not add combat, roguelike mechanics, multiplayer, accounts, or 2D movement until the text-first simulation contracts pass validation.
