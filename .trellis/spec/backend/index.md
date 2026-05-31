# Backend Development Guidelines

> Backend rules for the Elysian Realm multi-agent daily-life simulation.

---

## Overview

The repository now contains the first TypeScript backend/shared slice: shared domain/contracts, persona validation, three pilot persona fixtures, and offline Node test coverage.

Backend work must keep one authoritative simulation core, typed cross-layer contracts, inspectable memory/replay records, and explicit LLM/provider boundaries. Current executable conventions live under `src/shared/**`, `src/server/personas/**`, and `tests/**`.

---

## Pre-Development Checklist

Before writing backend code:

- [ ] Read [Agent Simulation](./agent-simulation.md) for world/engine/input rules.
- [ ] Read [Persona and Memory](./persona-memory.md) before adding persona, memory, retrieval, or reflection code.
- [ ] Read [LLM Orchestration](./llm-orchestration.md) before adding model calls, prompt builders, or embedding code.
- [ ] Map the data flow from command -> simulation input -> event -> projection -> frontend.
- [ ] Confirm the chosen stack and persistence layer are recorded in the active task design.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Backend module ownership and implemented TypeScript slice layout | Active baseline |
| [Agent Simulation](./agent-simulation.md) | World engine, input queue, event log, conversations, replay | Planning baseline |
| [Persona and Memory](./persona-memory.md) | Implemented persona schema/validator plus planned memory/retrieval/reflection rules | Active baseline |
| [LLM Orchestration](./llm-orchestration.md) | Provider abstraction, prompt builders, operations, structured outputs | Planning baseline |
| [Database Guidelines](./database-guidelines.md) | Persistence boundaries for world, events, messages, memories, embeddings | Planning baseline |
| [Error Handling](./error-handling.md) | Visible failures, operation errors, API error shape | Planning baseline |
| [Logging Guidelines](./logging-guidelines.md) | Simulation, LLM, memory, and replay diagnostics | Planning baseline |
| [Quality Guidelines](./quality-guidelines.md) | Required tests, forbidden shortcuts, review checklist | Active baseline |

---

## Quality Check

Before backend work is considered ready for review:

- [ ] No UI, LLM operation, or database adapter directly mutates authoritative world state.
- [ ] State-changing payloads use shared validators/decoders.
- [ ] Tests can run offline with Node's built-in test runner and fake LLM/embedding providers when those providers exist.
- [ ] Memory retrieval, reflection, and replay behavior are inspectable in logs or diagnostics.
- [ ] Generated content is separated from configured persona facts and user-authored content.

---

**Language**: All documentation should be written in **English**.
