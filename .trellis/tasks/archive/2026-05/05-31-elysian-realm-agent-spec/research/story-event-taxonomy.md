# Story Event Taxonomy for Elysian Realm Simulation

## Purpose

Convert Elysian Realm lore research sources into safe, implementation-ready categories for future simulation events, persona memories, UI filters, and provenance labels.

This is not a transcript, lore dump, or official story recreation. It defines how future code and content should reference summarized research without copying official dialogue, story text, images, audio, or extracted assets.

## Source-Informed Categories

The Bilibili source index shows a useful split in the Elysian Realm material:

- main chapter acts;
- recollections / 追忆;
- character events / 事件;
- object or item memory entries;
- signet-giving interactions;
- relationship-map references;
- system/infrastructure events such as Klein, maintenance, Deep End, anomalies, or corruption.

Future simulation should preserve that shape because the Elysian Realm is fragmentary and memory-oriented rather than a single linear chat.

## Provenance Labels

Use one of these labels for every research-derived content seed:

| Label | Meaning | Can be used for persona facts? | Notes |
|---|---|---:|---|
| `official-url` | URL to official HoYoverse/miHoYo page, without copied page content | Yes, as URL/source only | Many official pages are JS-rendered; store URL plus short project-authored summary. |
| `official-summary` | Project-authored summary after checking an official source | Yes | Do not store official wording unless it is a short name/title. |
| `wiki-summary` | Project-authored summary based on Moegirl or other wiki pages | Yes, with cross-check | Secondary source; useful for roster, signets, relationships, continuity. |
| `fan-navigation` | Bilibili BV/part used to locate story or event material | Yes, only as locator | Store BV, part number/title, and our summary; no transcripts. |
| `fan-analysis` | Bilibili or other analysis interpretation | Maybe, with caution | Lower confidence; verify against official/wiki before hard persona constraints. |
| `project-authored` | Original project-authored daily-life expansion consistent with constraints | Yes | Must be labeled as fan simulation content, not canon. |
| `generated` | Runtime LLM output or generated memory/reflection | No immutable persona facts | Store outside persona specs as generated memory/event/reflection. |
| `user-authored` | Direct user configuration or intervention | Yes if config, otherwise memory/event | Keep distinct from generated content. |

## Research Event Categories

These categories are for lore indexing and future source references.

| Category | Description | Example source locator | Future use |
|---|---|---|---|
| `realm.main_story` | Chapter act-level ER story progression | `BV1vg411Y7si` P1-P3, P20-P23, P40-P44 | Timeline filters, world-background summaries, replay/lore debug panel. |
| `realm.recollection` | Historical memory fragments tied to agents or Previous Era events | `BV1vg411Y7si` P4-P11, P24-P29, P45-P56 | Seed long-term memories, reflection evidence, persona tension notes. |
| `realm.character_event` | Optional interactions or character-specific events | `BV1vg411Y7si` P12-P19, P30-P39, P57-P71 | Daily-life event inspiration, relationship hooks, conversation prompt constraints. |
| `realm.object_memory` | Object/item/archive memory entry | `BV1vg411Y7si` P72; `BV1ff4y1L7hv` P22/P34 | UI archive, memory artifact event seeds, not copied text. |
| `realm.relationship_map` | Directed relationship graph reference | `BV1vg411Y7si` P73; official relationship-map URL | Validate directed relationship seeds. |
| `realm.system_event` | ER infrastructure/admin/anomaly events | Klein, Deep End, maintenance, corruption/anomaly locators | Backend world modules, diagnostics, anomaly event pack. |
| `analysis.previous_era_plan` | Fan-analysis of Previous Era plans | `BV1o8411G7zH` | Worldbuilding constraints for Kevin/Su/Vill-V/Griseo/Kosma; verify before hard-coding. |
| `golden_courtyard.tone` | Slice-of-life ensemble tone references | Golden Courtyard official uploads / wiki pages | Daily-life tone only; do not copy scenes or dialogue. |

## Future Simulation Event Types

These types are for future application events. They should be validated by shared contracts before use.

| Future event kind | Source category mapping | Actor/targets | Payload summary | Memory effect |
|---|---|---|---|---|
| `world.timeAdvanced` | none | system | step ID, old/new time, time scale | none |
| `agent.perceivedLoreFragment` | `realm.recollection`, `realm.object_memory` | agent | source locator, project-authored fragment summary, provenance | observation memory |
| `agent.recalledMemory` | `realm.recollection` | agent | memory IDs, trigger event, retrieval scores | access diagnostics, not new canon |
| `agent.startedRoutine` | `project-authored`, `golden_courtyard.tone` | agent | routine kind, location, intent | action memory if meaningful |
| `agent.updatedPlan` | `project-authored`, generated | agent | plan item IDs, source memories, reason | plan memory |
| `conversation.started` | `realm.character_event`, `project-authored` | participants | location, initiating event, topic seed | later conversation memory |
| `conversation.messageRecorded` | generated | speaker/participants | message ID only in active event; transcript stored separately | no direct memory until summary |
| `conversation.ended` | generated/project-authored | participants | outcome, message count, summary operation refs | per-participant conversation memories |
| `relationship.noteCreated` | `realm.relationship_map`, generated/project-authored | one agent -> target agent | directed note, evidence IDs, confidence/provenance | relationship memory |
| `memory.reflectionCreated` | generated from evidence | agent | insight IDs, evidence memory IDs, provenance | reflection memory |
| `realm.interventionSubmitted` | user-authored | user/system/targets | typed observer command, realm event, or direct message | intervention memory |
| `realm.infrastructureEvent` | `realm.system_event` | system/Klein-like admin if modeled | maintenance, anomaly, Deep End, archive update, corruption marker | observation/system memory |
| `agent.operationFailed` | none | agent/provider | operation ID, provider/model, error type, raw diagnostics ref | error state, no fake action memory |

## Lore-to-Memory Mapping

| Lore source category | Future memory type | Rules |
|---|---|---|
| `realm.main_story` | `observation` or `plan` only if summarized as current simulation context | Do not inject full canon plot into an agent's private memory. Use as background constraints. |
| `realm.recollection` | `observation`, `relationship`, or `reflection` | Store short project-authored memory seeds with source IDs and evidence links. |
| `realm.character_event` | `conversation`, `relationship`, or `action` | Use as inspiration for original daily-life interaction patterns. |
| `realm.object_memory` | `observation` | Treat as archive artifact; store reference and summary, not item text. |
| `realm.relationship_map` | `relationship` | Directed, evidence-backed, not symmetric by default. |
| `realm.system_event` | `observation` or `system` | Useful for world events and debug panels. |
| `analysis.previous_era_plan` | `reflection` or `profile constraint` after verification | Keep fan-analysis confidence lower than official/wiki facts. |

## Safe Daily-Life Event Seeds for Recommended MVP Trio

The current research matrix recommends `elysia`, `pardofelis`, and `hua` as an observation-terminal pilot trio. These seeds are project-authored, canon-inspired summaries for future event packs; they are not official scenes.

### `elysia`

| Seed ID | Event kind | Location idea | Summary | Provenance basis |
|---|---|---|---|---|
| `elysia.greets-new-day` | `agent.startedRoutine` | Garden or central hall | Elysia starts the day by checking who seems isolated and planning a gentle social interruption. | `wiki-summary`, `fan-navigation` |
| `elysia.invites-tea` | `conversation.started` | Lounge | Elysia invites another agent to a light conversation framed as curiosity rather than interrogation. | `wiki-summary`, `project-authored` |
| `elysia.archive-note` | `agent.perceivedLoreFragment` | Archive | Elysia leaves or notices a memory-index note that nudges the user toward relationship exploration. | `realm.object_memory`, `project-authored` |
| `elysia.courtyard-host` | `realm.character_event` | Golden Courtyard-like hall | Elysia organizes a low-stakes gathering that exposes relationship tensions without forcing resolution. | `golden_courtyard.tone`, `project-authored` |

### `pardofelis`

| Seed ID | Event kind | Location idea | Summary | Provenance basis |
|---|---|---|---|---|
| `pardo.opens-shop` | `agent.startedRoutine` | Small shop / market corner | Pardofelis arranges odd goods, tracks gossip, and tries to look busier than she feels. | `wiki-summary`, `fan-navigation` |
| `pardo-lucky-find` | `agent.perceivedLoreFragment` | Corridor or archive | Pardo finds an innocuous object that becomes a low-risk memory artifact for another agent. | `realm.object_memory`, `project-authored` |
| `pardo-avoids-trouble` | `agent.updatedPlan` | Any public area | Pardo changes route after noticing a tense agent, creating a chance encounter elsewhere. | `wiki-summary`, `project-authored` |
| `pardo-reluctant-kindness` | `conversation.started` | Shop / quiet side room | Pardo helps someone while pretending it is just business. | `wiki-summary`, `project-authored` |

### `hua`

| Seed ID | Event kind | Location idea | Summary | Provenance basis |
|---|---|---|---|---|
| `hua-morning-forms` | `agent.startedRoutine` | Training court | Hua practices quietly at dawn, using routine to manage memory burden. | `wiki-summary`, `project-authored` |
| `hua-memory-gap` | `agent.perceivedLoreFragment` | Archive | Hua encounters a summarized memory fragment and records uncertainty rather than treating it as complete truth. | `realm.recollection`, `project-authored` |
| `hua-offers-guidance` | `conversation.started` | Training court / corridor | Hua offers practical guidance when another agent seems unsettled, keeping emotion understated. | `wiki-summary`, `project-authored` |
| `hua-night-reflection` | `memory.reflectionCreated` | Quiet room | Hua synthesizes what she remembers, what she lacks, and what still requires action. | `realm.recollection`, `project-authored` |

## UI / Debug Filters

Future observation-terminal UI can expose these filters:

- Source: `official-url`, `wiki-summary`, `fan-navigation`, `fan-analysis`, `project-authored`, `generated`, `user-authored`, `system`.
- Lore category: `main_story`, `recollection`, `character_event`, `object_memory`, `relationship_map`, `system_event`, `analysis`.
- Simulation event kind: `routine`, `conversation`, `memory`, `relationship`, `reflection`, `intervention`, `operation_error`, `infrastructure`.
- Character: one or more agent IDs.
- Confidence: `confirmed`, `secondary`, `fan-analysis`, `project-authored`, `generated`.

## Validation Rules for Future Implementation

- Every research-derived seed must include at least one source locator or explicit `project-authored` label.
- No generated runtime memory may be written into immutable persona config.
- Relationship seeds must be directed and evidence-linked.
- LLM-generated content must preserve provenance as `generated` and must not be displayed as official canon.
- Failed source parsing, missing BV metadata, or provider errors should be logged as research diagnostics rather than silently ignored.
- Any exact quote or transcript-like content should be rejected from persona fixtures unless it is a short title/name needed for identification.

## Next Content Tasks

1. Use `mvp-event-memory-seed-draft.md` as the next implementation-facing detail layer for MVP event order, sparse memory seeds, conversation branches, interventions, operation failures, validators, and replay assertions.
2. Convert the MVP trio event seeds into future persona fixture routine placeholders after implementation starts.
3. Build a directed relationship seed table for `elysia`, `pardofelis`, and `hua` first.
4. Revisit official relationship-map URL with browser/manual review if needed, storing only summaries and source IDs.
5. Confirm exact Bilibili IDs for Elysian Realm-specific `崩坏3剧情讲堂` episodes; current web search was rate-limited and direct API search returned general ER results first.
