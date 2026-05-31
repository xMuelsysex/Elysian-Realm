# Pre-Implementation Open Decisions

## Purpose

Record the remaining implementation-entry decisions for the Elysian Realm observation-terminal MVP. These decisions are small enough not to block the research baseline, but they must be handled deliberately before or during the first code slice.

This document is planning-only. It does not authorize application-code changes. Implementation still requires explicit user approval per the task review gate.

## Decision Policy

Use these defaults unless the user or implementation reviewer explicitly chooses otherwise:

1. Prefer the smallest reversible implementation path.
2. Keep one authoritative simulation core.
3. Keep research provenance as locators and project-authored summaries.
4. Do not introduce schema migrations unless the current schema prevents the next testable slice.
5. Use deterministic fake providers and fixed seeds before live LLM calls.

## Decision Summary

| ID | Decision | Recommended default | Needs user confirmation? | Applies to | Risk if ignored |
|---|---|---|---|---|---|
| D1 | Pilot executable roster | Use `elysia`, `pardofelis`, `hua` for the first fan-research MVP fixture slice. | No, unless preserving current `kevin`/`eden` fixtures is desired. | Slice 1 | Fixture tests and research docs drift from the chosen MVP trio. |
| D2 | Existing placeholder fixtures | Replace current placeholders intentionally in one fixture PR, or keep them under a clearly named legacy/example export. | No for replacement during approved implementation; yes if user wants both rosters. | Slice 1 | Duplicate “pilot” rosters create confusion and second facts. |
| D3 | `sourceNotes` shape | Keep current `sourceNotes: string` for the first minimal fixture slice. | No. | Slice 1 | Premature schema migration expands scope. |
| D4 | Structured source notes | Defer `SourceNote[]` migration until fixtures grow beyond MVP trio or UI needs source filtering. | No now; yes before schema change. | Slice 1 / Slice 6 | Hard-to-audit provenance if string grows too long. |
| D5 | Authorship enum | Use existing `placeholder` for research-derived fan summaries. | No. | Slice 1 | Invalid enum values such as `project-authored-summary` will fail validation. |
| D6 | Location vocabulary | Use research location IDs: `central_hall`, `garden_courtyard`, `pardo_shop`, `training_court`, `archive_room`, `quiet_room`. | No, unless implementation wants to preserve current placeholder IDs. | Slice 1 / Slice 2 | Persona routines can point to unknown locations. |
| D7 | World initial status | Tests use `paused`; manual demo may start `running`. | No. | Slice 2 | Flaky tests or demo that feels inert. |
| D8 | Initial memories | Create seeded memories through explicit `memory.seeded` or equivalent events. | No. | Slice 2 / Slice 3 | Memories lack source event IDs and replay evidence. |
| D9 | Event kind validators | Add shared validators/projections before frontend consumes new event kinds. | No. | Slice 2 / Slice 6 | Components parse raw payloads independently. |
| D10 | Conversation message storage | Keep message bodies outside active `WorldSnapshot`; active state holds metadata only. | No. | Slice 5 | Hot world state bloats and replay becomes noisy. |
| D11 | First LLM usage | Do not call live LLMs in the first fixture/simulation tests; use deterministic FakeProvider. | No. | Slice 3 / Slice 4 / Slice 5 | Network-dependent tests and non-reproducible behavior. |
| D12 | Direct private messages | Keep as optional typed intervention, not primary UI. | No; already resolved by product baseline. | Slice 2 / Slice 6 | Product becomes a standard chatbot instead of observation terminal. |
| D13 | Seeded lore content | Store only locators and project-authored summaries; never official story/dialogue text. | No; hard boundary. | All slices | Legal/content-boundary violation. |
| D14 | First implementation task scope | Start with persona/world fixture validation only. | Yes: user must approve implementation start. | Slice 1 | First PR becomes too broad and mixes fixtures, engine, LLM, UI. |

## Detailed Decisions

### D1. Pilot executable roster

Recommended: first executable MVP roster should be:

- `elysia`
- `pardofelis`
- `hua`

Reason:

- This trio is already supported by `mvp-pilot-persona-seeds.md`, `persona-spec-source-mapping.md`, and `mvp-world-seed-blueprint.md`.
- It exercises social initiation, shop/ordinary-life routines, training/reflection, directed relationships, and memory uncertainty without starting with the most complex characters.

Implementation note:

- Current code fixtures are `elysia`, `kevin`, and `eden`. Do not silently treat them as the final MVP trio.
- If replacement happens, update fixture tests and any world location references in the same PR.

### D2. Existing placeholder fixture handling

Recommended: during approved implementation, replace the current placeholder pilot fixture export with the research MVP trio, unless there is a specific need for legacy/example fixtures.

If both are kept:

- Name them explicitly, e.g. `examplePersonas` versus `mvpPilotPersonas`.
- Tests should validate the intended production seed roster separately.
- Do not let both act as competing sources for MVP decisions.

### D3-D4. `sourceNotes` and provenance structure

Recommended for first implementation:

- Keep `sourceNotes` as a concise string.
- Format it with provenance labels and locators:

```text
project-authored placeholder; official-url: Flame-Chaser archive; official-url: relationship map; wiki-summary: Moegirl page; fan-navigation: BV1vg411Y7si P45/P71; research: mvp-pilot-persona-seeds.md
```

Defer structured source notes until one of these triggers appears:

- frontend needs filterable source lists;
- personas expand to 13 and source strings become too long;
- fixture review needs machine-readable provenance;
- source migration is explicitly included in a slice.

### D5. Authorship enum

Current valid values:

- `user-authored`
- `placeholder`
- `licensed`
- `generated-draft`

Recommended:

- Use `placeholder` for current research-derived fan summaries.
- Do not use provenance labels as authorship values.
- Do not add `project-authored-summary` without updating contract, validator, tests, and specs.

### D6. Location vocabulary

Recommended canonical MVP locations:

| Location ID | Purpose |
|---|---|
| `central_hall` | crossings, timeline-visible movement |
| `garden_courtyard` | social/warm gathering scenes |
| `pardo_shop` | Pardofelis routines, trade, gossip, object-memory seeds |
| `training_court` | Hua routines and practical guidance |
| `archive_room` | memories, relationship-map references, debug/source panel |
| `quiet_room` | reflection/decompression |

Implementation rule:

- Persona routine `locationId` values and world `LocationRef.id` values must come from the same vocabulary.
- Add validation once a world seed contract exists.

### D7. World initial status

Recommended:

- Tests: `paused`, then step manually.
- Manual demo: `running`, with visible pause/resume controls.

Reason:

- Deterministic tests need explicit step control.
- User-facing demo should feel like a living realm.

### D8. Initial memory strategy

Recommended:

- Seed any initial memories via explicit events such as `memory.seeded`.
- Each memory points to its source event through `sourceEventIds`.
- Research locators appear in metadata/source notes, not as copied source text.

Reason:

- Replay and debugging need a source for every memory.
- Persona configs remain immutable and free of runtime state.

### D9. Event kind validators and projections

Recommended:

- Define a shared validator/projection per event kind before frontend rendering.
- Start with a small event set:
  - `world.created`
  - `world.timeAdvanced`
  - `agent.spawned`
  - `agent.startedRoutine`
  - `agent.updatedPlan`
  - `conversation.invited`
  - `conversation.started`
  - `conversation.ended`
  - `memory.created`
  - `realm.interventionSubmitted`
  - `agent.operationFailed`

Reason:

- Frontend must not parse raw payloads independently.
- Replay/debug requires stable event semantics.

### D10. Conversation message storage

Recommended:

- `ConversationRecord` in active world state stores metadata: participants, state, location, timestamps, message count.
- Message bodies live in a separate message store/log.
- Ended conversations trigger per-participant summary memories.

Reason:

- Prevent hot world-state bloat.
- Preserve participant-specific memory perspectives.

### D11. First LLM usage

Recommended:

- No live model calls in initial fixture/engine tests.
- Use FakeProvider or deterministic rule-based proposals.
- Add live provider configuration only after provider boundaries and operation diagnostics exist.

Reason:

- The first MVP needs reproducibility more than model quality.
- Provider failures must be visible and not become fake successful actions.

### D12. Direct private messages

Recommended:

- Keep direct private messages as one typed intervention kind.
- Primary UI remains observer commands and realm events.
- Direct messages create `source: user` events/memories and enter the normal agent loop.

Reason:

- Maintains the observation-first product decision.
- Prevents a hidden chat bypass around world rules.

### D13. Source and content boundary

Hard rules:

- No official dialogue.
- No official story dumps.
- No transcripts or subtitles.
- No lyrics, official audio, images, animation frames, or extracted assets.
- No copied Fandom/Moegirl/Bilibili prose as fixture content.

Allowed:

- URLs.
- BV IDs and part numbers.
- Short public titles/names for identification.
- Project-authored summaries.
- Provenance labels and source confidence notes.

### D14. First implementation task scope

Recommended first code task after explicit approval:

> Update MVP persona/world seed fixtures and validation tests for `elysia`, `pardofelis`, and `hua` using current `PersonaSpec v1`, with no LLM calls and no simulation engine behavior beyond fixture validation.

Do not combine with:

- memory retrieval;
- conversation lifecycle;
- frontend UI;
- live LLM provider;
- structured source-note migration unless specifically approved.

## Decisions Requiring Explicit User Approval

These should not proceed automatically:

| Trigger | Why approval is needed |
|---|---|
| Starting application implementation | Active task is still planning-gated. |
| Changing schema beyond current `PersonaSpec v1` | Affects validators, fixtures, tests, future UI. |
| Adding live LLM provider credentials/config | Security/cost/config risk. |
| Copying or storing any official/media content | Legal/content boundary risk; default answer should be no. |
| Replacing current code fixtures if user wants to preserve examples | Product/test fixture semantics change. |
| Creating commits or branches | User has not requested git workflow. |

## Recommended Default Path

If the user approves implementation start, follow this exact order:

1. Keep `sourceNotes` as string.
2. Use the research MVP roster: `elysia`, `pardofelis`, `hua`.
3. Use research location IDs from `mvp-world-seed-blueprint.md`.
4. Use `mvp-event-memory-seed-draft.md` as the source for future startup event order, sparse memory seeds, first conversation scenarios, validator backlog, and replay assertions.
5. Update persona fixtures and validation tests only.
6. If world fixtures are included, validate that persona routine locations exist and that every seeded memory has a source event.
7. Do not add LLM calls.
8. Do not add memory retrieval.
9. Do not add frontend UI.
10. Run targeted persona validation tests / `npm test`.
11. Re-open planning if fixture validation exposes schema gaps.

## Verification Checklist

Before starting implementation, confirm:

- `implementation-research-handoff.md` is read.
- `persona-spec-source-mapping.md` is read.
- `mvp-world-seed-blueprint.md` is read if location/world fixtures are touched.
- `mvp-event-memory-seed-draft.md` is read if event, memory, conversation, intervention, operation, validator, or replay seeds are touched.
- `PersonaSpec` validator constraints are known.
- No official text/assets are being pasted.
- The user explicitly approved implementation start.

## Verification Log

- Consolidated open decisions from `persona-spec-source-mapping.md`, `mvp-world-seed-blueprint.md`, `mvp-event-memory-seed-draft.md`, `implementation-research-handoff.md`, and `implement.md`.
- Preserved planning-only status and implementation review gate.
- Kept all recommendations within current shared contracts unless marked as future migration.
