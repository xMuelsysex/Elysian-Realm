# PersonaSpec Source Mapping for Elysian Realm Research

## Purpose

Map the current Elysian Realm / Thirteen Flame-Chasers research artifacts into the implemented `PersonaSpec v1` shape so future implementation can create valid persona fixtures without copying official story text, dialogue, subtitles, images, audio, lyrics, or extracted assets.

This is a planning and fixture-authoring guide only. It does not modify application code.

## Current Implemented Contract

Current source paths:

- `src/shared/contracts/persona.ts`
- `src/server/personas/validation.ts`
- `src/server/personas/fixtures/pilotPersonas.ts`
- `.trellis/spec/backend/persona-memory.md`

Current `PersonaSpec` requires:

```ts
schemaVersion: "persona.v1"
id: PersonaId
displayName: string
aliases: string[]
authorship: "user-authored" | "placeholder" | "licensed" | "generated-draft"
sourceNotes: string
updatedAt: string
profile: { archetype, values, longTermGoals, constraints }
speech: { tone, cadence, preferredAddressForms, tabooTopics, tabooPhrases }
personality: { traits, strengths, flaws, emotionalTriggers }
routines: { morning, day, evening, night, specialDayOverrides }
preferences: { locations, activities, likes, dislikes }
relationships: [{ targetPersonaId, affinity, trust, tension, notes }]
contentBoundaries: { canonFidelity, legal, safety }
```

Important mismatch to avoid:

- Research labels such as `official-url`, `wiki-summary`, `fan-navigation`, and `project-authored` are **source provenance labels**, not valid `authorship` enum values.
- Current `authorship` must use one of the implemented enum values. For fan-written fixtures based on summaries, use `placeholder` until a future schema adds richer provenance fields.
- Current `sourceNotes` is a single string, not a structured array. Store concise provenance-labelled URLs/BV parts there until a future schema migration introduces structured source notes.
- Generated/runtime fields such as `memories`, `memoryStream`, `generatedMemories`, `reflections`, `runtimeState`, `currentPlan`, `currentAction`, and `inProgressOperationId` are forbidden in immutable persona fixtures.

## Research Artifact Inputs

| Artifact | Fixture-authoring role |
|---|---|
| `honkai-elysian-realm-lore-sources.md` | Top-level source index, source policy, official/wiki/Bilibili/GitHub boundaries. |
| `thirteen-flame-chasers-character-matrix.md` | Per-character identity, signet, role anchors, relationship hooks, simulation constraints. |
| `mvp-pilot-persona-seeds.md` | MVP trio draft fields, relationship scores, location preferences, event seeds. |
| `bilibili-elysian-realm-story-index.md` | High-level Bilibili story/navigation source descriptions. |
| `bilibili-part-event-catalog.md` | Part-level BV/part locators for character events, recollections, signets, object memories, relationship graph. |
| `story-event-taxonomy.md` | Provenance labels, lore categories, future event kinds, memory mapping, MVP daily-life event seeds. |
| `official-version-chapter-timeline.md` | Release-order and chapter arc anchors, official URL vs secondary-readable reliability notes. |

## Field Mapping Rules

| `PersonaSpec` field | Source mapping | Rule |
|---|---|---|
| `schemaVersion` | Contract only | Always `PERSONA_SCHEMA_VERSION` / `"persona.v1"`. |
| `id` | Character matrix `Agent ID`; MVP seed `id` | Stable lowercase machine ID such as `elysia`, `pardofelis`, `hua`. |
| `displayName` | Character matrix + project naming | Prefer English display name for UI consistency; put Chinese name in aliases if needed. |
| `aliases` | Matrix signet/rank/name variants | Include short aliases like Chinese name, signet title, rank label, but not official dialogue. |
| `authorship` | Fixture authorship, not source provenance | Use `placeholder` for research-derived fan summary fixtures unless user explicitly authors finalized config. |
| `sourceNotes` | Source index, matrix, part catalog, timeline | Single concise string with provenance-labelled source locators; no story text. |
| `updatedAt` | Fixture creation/update time | ISO timestamp; do not use source publication date as fixture update time. |
| `profile.archetype` | Matrix `Core setting anchors`; MVP profile anchors | One concise project-authored sentence. |
| `profile.values` | Matrix persona constraints + MVP seeds | 3-6 values as abstract nouns or short phrases. |
| `profile.longTermGoals` | MVP profile + daily-life simulation goal | Simulation-facing goals, not copied canon plot objectives. |
| `profile.constraints` | Matrix constraints + legal boundary | Include canon-behavior constraints and anti-omniscience / no-state-bypass rules. |
| `speech.tone` | MVP `Speech and Interaction Style` | Project-authored style summary; never include exact catchphrases. |
| `speech.cadence` | MVP style notes | Structural description only. |
| `speech.preferredAddressForms` | Project-authored | Use generic safe forms; avoid official catchphrase reproduction. |
| `speech.tabooTopics` | Content boundaries | Include official dialogue/scenes/transcripts, official songs/lyrics, extracted assets. |
| `speech.tabooPhrases` | Content boundary tests | Phrases like `repeat official dialogue`, `quote the game exactly`, not actual official lines. |
| `personality.traits` | Matrix + MVP seeds | Short adjectives/phrases; keep strictly behavior-aligned. |
| `personality.strengths` | Matrix + MVP seeds | Daily-life useful capabilities. |
| `personality.flaws` | Matrix + MVP seeds | Meaningful limitations; avoid parody flattening. |
| `personality.emotionalTriggers` | MVP seeds + relationship hooks | Source-informed but project-authored triggers. |
| `routines.*` | MVP routine seeds | Convert to `[{ label, locationId, intent }]`; labels must be original daily-life actions. |
| `preferences.locations` | Shared MVP locations | Must match future world seed location IDs. Current placeholder fixture IDs (`atrium`, `lounge`, etc.) differ from research IDs. |
| `preferences.activities` | MVP routines and event seeds | Original daily-life verbs; no plot recreation. |
| `preferences.likes/dislikes` | MVP seeds + matrix constraints | Safe summaries; avoid official phrase reuse. |
| `relationships` | MVP directed relationship table | Directed numeric seeds `0..10`; relationship `notes` must summarize evidence/provenance without copying text. |
| `contentBoundaries.canonFidelity` | Matrix constraints | Behavior constraints: temperament, values, relationship limits, no omniscience. |
| `contentBoundaries.legal` | Shared policy | No official dialogue, story dumps, art, music, voice, proprietary assets, transcript extraction. |
| `contentBoundaries.safety` | Persona-specific boundaries | Avoid coercion, manipulation shortcuts, childlike-persona misuse, self-harm glorification, etc. |

## Recommended MVP Fixture Roster

The research baseline recommends replacing/adding future implementation fixtures for this trio first:

| ID | Display | Reason |
|---|---|---|
| `elysia` | `Elysia` | Social catalyst and central memory figure; drives observation-terminal conversations without making the product a pure chatroom. |
| `pardofelis` | `Pardofelis` | Shop/routine generator, ordinary-life perspective, safe low-stakes movement/events. |
| `hua` | `Hua` | Training/reflection anchor, restrained memory handling, strong test case for evidence-linked reflection. |

Current implemented placeholder fixtures are `elysia`, `kevin`, and `eden`. Do not silently swap them in code during research. A future implementation slice should intentionally update fixtures, tests, and location seeds together.

## MVP Location ID Mapping

Research seed locations:

| Location ID | Intended use | Fixture impact |
|---|---|---|
| `central_hall` | Crossings, timeline-visible movement, casual encounters | High for Elysia, medium for Pardo/Hua. |
| `garden_courtyard` | Warm tone, quiet gatherings, social scenes | High for Elysia. |
| `pardo_shop` | Trading, gossip, object-memory discoveries, errands | Required for Pardofelis. |
| `training_court` | Hua routine, discipline, practical guidance | Required for Hua. |
| `archive_room` | Memory fragments, relationship-map references, replay/debug hooks | Important for Elysia/Hua, medium for Pardo. |
| `quiet_room` | Reflection and low-interruption scenes | Important for Hua. |

Implementation caution:

- The current placeholder fixtures use `atrium`, `garden`, `lounge`, `archives`, `training-hall`, `overlook`, and `quarters`.
- Future fixture work must either seed the world with both sets or migrate fixtures to one shared location vocabulary.
- Persona validation currently only checks `locationId` as a non-empty string; later world validation should reject unknown location IDs.

## SourceNotes Format Until Schema Migration

Current type is `sourceNotes: string`. Recommended pattern:

```text
project-authored summary; official-url: <archive-url>; official-url: <relationship-map-url>; wiki-summary: <wiki-page-url>; fan-navigation: BV1vg411Y7si P45/P71; research: mvp-pilot-persona-seeds.md
```

Rules:

- Keep it short enough for UI display or debug panels.
- Include only URLs, BV IDs, part numbers, doc names, and provenance labels.
- Do not paste page paragraphs, video descriptions, dialogue, subtitles, or item text.

Future schema improvement candidate:

```ts
sourceNotes: SourceNote[]
interface SourceNote {
  provenance: "official-url" | "official-summary" | "wiki-summary" | "fan-navigation" | "fan-analysis" | "project-authored" | "user-authored";
  locator: string;
  summary?: string; // project-authored only, short
}
```

Do not add this schema until an implementation task explicitly includes migration and validator updates.

## Per-Agent Mapping: `elysia`

### Source locators

- `official-url`: https://honkaiimpact3.hoyoverse.com/asia/zh-cn/news/107292?cate=542
- `official-url`: https://webstatic.mihoyo.com/bh3/event/e20200310rolemap/index.html
- `wiki-summary`: Moegirl 爱莉希雅 page listed in `honkai-elysian-realm-lore-sources.md`
- `fan-navigation`: `BV1vg411Y7si` P4, P12, P24, P30, P49, P60
- `secondary-readable`: v5.1/v6.0 anchors from `official-version-chapter-timeline.md`
- `research`: `mvp-pilot-persona-seeds.md`, `thirteen-flame-chasers-character-matrix.md`

### Field guidance

| Field group | Guidance |
|---|---|
| `profile` | Warm social connector; values beauty, connection, curiosity, consent-aware candor. Goals should involve keeping the realm emotionally welcoming and noticing isolation. Constraints: not omniscient, no hidden private-memory access, no overriding refusals. |
| `speech` | Bright, affectionate, teasing, sincere. Cadence uses light invitations and gentle pivots. Taboo: exact official lines, songs, scene recreation, forcing confession. |
| `personality` | Traits: empathetic, curious, playful, perceptive. Flaws: may pry with good intentions, can mask concern behind charm. Triggers: exclusion, loneliness, beauty treated as trivial. |
| `routines` | Morning social check-in; day archive/lounge/shop visits; evening small gathering; night private observations. |
| `preferences` | `central_hall`, `garden_courtyard`, `archive_room`, `pardo_shop`; hosting, listening, decorating, gentle invitations. |
| `relationships` | `elysia -> pardofelis`: affinity 8, trust 7, tension 2. `elysia -> hua`: affinity 7, trust 8, tension 3. |
| `contentBoundaries` | Preserve warmth and sincerity; no official dialogue; respect other agents' boundaries and refusals. |

## Per-Agent Mapping: `pardofelis`

### Source locators

- `official-url`: https://honkaiimpact3.hoyoverse.com/asia/zh-cn/news/107292?cate=542
- `official-url`: https://webstatic.mihoyo.com/bh3/event/e20200310rolemap/index.html
- `wiki-summary`: Moegirl 帕朵菲莉丝 page listed in `honkai-elysian-realm-lore-sources.md`
- `fan-navigation`: `BV1vg411Y7si` P45, P71; `BV1ff4y1L7hv` P10, P25, P35
- `secondary-readable`: v5.6/v5.9 anchors from `official-version-chapter-timeline.md`
- `research`: `mvp-pilot-persona-seeds.md`, `bilibili-part-event-catalog.md`

### Field guidance

| Field group | Guidance |
|---|---|
| `profile` | Practical shopkeeper/trader and ordinary-life perspective. Values safety, small gains, loyalty, flexibility. Goals should involve keeping the shop running, avoiding danger, and helping without admitting sentiment. |
| `speech` | Casual, quick, businesslike, nervous-comedic under pressure. Avoid copied slang/catchphrases; do not flatten into pure comic relief. |
| `personality` | Traits: practical, evasive, lucky, talkative, loyal under fear. Flaws: avoids danger, dodges vulnerability, may over-focus on short-term safety. Triggers: sudden danger, being cornered, friends in quiet trouble. |
| `routines` | Morning shop opening; day trade/gossip/deliveries; evening account closing or dodging invitations; night quiet favor-checks. |
| `preferences` | `pardo_shop`, `central_hall`, `archive_room`; trading, gossip, errands, harmless treasure-finding. |
| `relationships` | `pardofelis -> elysia`: affinity 8, trust 7, tension 2. `pardofelis -> hua`: affinity 6, trust 7, tension 3. |
| `contentBoundaries` | Luck cannot bypass simulation rules; discoveries must become typed events. Preserve fear, loyalty, and ordinary courage. |

## Per-Agent Mapping: `hua`

### Source locators

- `official-url`: https://honkaiimpact3.hoyoverse.com/asia/zh-cn/news/107292?cate=542
- `official-url`: https://webstatic.mihoyo.com/bh3/event/e20200310rolemap/index.html
- `wiki-summary`: Moegirl 符华 / 华 page listed in `honkai-elysian-realm-lore-sources.md`
- `fan-navigation`: `BV1vg411Y7si` P7, P15, P27, P33, P52, P70; `BV1ff4y1L7hv` P3, P10, P34
- `secondary-readable`: v5.3 and Chapter XXX anchors from `official-version-chapter-timeline.md`
- `research`: `mvp-pilot-persona-seeds.md`, `story-event-taxonomy.md`

### Field guidance

| Field group | Guidance |
|---|---|
| `profile` | Disciplined Previous Era warrior with memory burden and practical restraint. Values duty, clarity, endurance, evidence, quiet care. Goals should involve maintaining routine, recording uncertainty, and helping without overexposure. |
| `speech` | Calm, concise, practical, understated. Advice should be framed through action and evidence. |
| `personality` | Traits: disciplined, restrained, observant, responsible. Flaws: guarded, slow to disclose uncertainty, may over-rely on routine. Triggers: incomplete memories, needless risk, others mistaking silence for indifference. |
| `routines` | Morning training forms; day patrol/archive visit; evening short guidance or plan review; night evidence-linked reflection. |
| `preferences` | `training_court`, `archive_room`, `quiet_room`, `central_hall`; training, patrol, evidence review, practical guidance. |
| `relationships` | `hua -> elysia`: affinity 7, trust 8, tension 4. `hua -> pardofelis`: affinity 6, trust 6, tension 2. |
| `contentBoundaries` | Keep as Previous Era `Hua` in MVP; do not merge all later Fu Hua continuity unless explicitly modeled. Memory uncertainty must remain visible. |

## Fixture Authoring Skeletons

These are not ready-to-paste official fixtures. They show how research data should be shaped to satisfy current validation.

### `sourceNotes` example

```text
project-authored placeholder; official-url: Flame-Chaser archive; official-url: relationship map; wiki-summary: Moegirl character page; fan-navigation: BV1vg411Y7si P45/P71; research: mvp-pilot-persona-seeds.md
```

### Relationship example

```ts
{
  targetPersonaId: "hua",
  affinity: 7,
  trust: 8,
  tension: 3,
  notes: "Project-authored directed seed: Elysia trusts Hua's restraint and creates room for her without forcing disclosure. Sources: wiki-summary + fan-navigation locators only."
}
```

### Routine example

```ts
{
  label: "open the shop and check safe routes",
  locationId: "pardo_shop",
  intent: "start the day with trade, gossip, and low-risk movement hooks"
}
```

## Memory Seed Boundary

Do not store memory seeds inside `PersonaSpec` under the current schema. Instead, future implementation should create separate memory/event fixtures such as:

| Seed source | Future record type | Rule |
|---|---|---|
| `BV1vg411Y7si` recollection locator | `MemoryRecord` type `observation` or `reflection` | Store only project-authored summary and source locator. |
| `BV1vg411Y7si` character event locator | `ConversationSeed` or generated conversation prompt context | Generate original dialogue at runtime; summarize after conversation ends. |
| `BV1vg411Y7si` P72 object locator | `agent.perceivedLoreFragment` event + memory | Store source ID and original artifact summary, not item text. |
| Official relationship map URL / P73 locator | Directed relationship seed or relationship memory | Keep notes directed and source-labeled; do not copy visual graph. |
| Runtime LLM output | `MemoryRecord`, event, conversation message, or reflection | Mark provenance as `generated`; never copy into immutable persona facts. |

## Validation Checklist for Future Fixture PR

When implementation starts, fixture work should include these checks:

- `validatePersonaRoster([elysia, pardofelis, hua])` passes.
- All relationships target known IDs and remain directed.
- No `project-authored-summary` value is used in `authorship`; use valid enum value such as `placeholder`.
- No generated/runtime fields appear anywhere in persona objects.
- `sourceNotes` contains provenance labels and locators, not story text.
- Routines reference world location IDs that exist in the corresponding world seed.
- `speech.tabooTopics` and `contentBoundaries.legal` explicitly reject official dialogue, transcripts, official media, and extracted assets.
- Tests reject a fixture containing `generatedMemories`, `memoryStream`, `currentPlan`, or transcript-like custom fields.
- Tests include at least one invalid relationship target and one missing routine period.

## Open Design Questions Before Code Changes

1. Should `sourceNotes` remain a string for MVP, or should Slice 1 add structured source notes before content-heavy fixtures are added?
2. Should the first code fixture trio replace `kevin`/`eden` placeholders with `pardofelis`/`hua`, or should research fixtures live separately until the simulation engine exists?
3. Should location IDs follow research names (`central_hall`, `pardo_shop`) or current placeholder names (`atrium`, `lounge`) for the initial executable tests?
4. How much source-locator detail should appear in frontend profile UI versus debug/source panels?

Recommended default: keep `sourceNotes` as a string for the next minimal slice, migrate fixture IDs to the research MVP trio only when the user approves implementation work, and use research location IDs in new world seeds so backend/frontend contracts share one vocabulary.

## Verification Log

- Read current `PersonaSpec` contract and validator implementation.
- Compared implemented placeholder fixtures against MVP research trio.
- Confirmed current `authorship` enum does not include research provenance labels.
- Confirmed forbidden runtime/generated fields are rejected recursively by persona validation.
- Mapped MVP seed material into current fixture fields without copying official text or dialogue.
