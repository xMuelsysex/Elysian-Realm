# Bilibili Part-Level Event Catalog for Elysian Realm

## Purpose

Provide a part-level, source-indexed catalog for Bilibili Elysian Realm story-navigation videos so future persona/worldbuilding work can locate relevant material without copying official game text.

This document stores only public metadata identifiers, BV IDs, part numbers, public part labels, project categories, and project-authored usage notes. It must not store transcripts, subtitles, official dialogue, full plot text, lyrics, images, audio, or extracted game assets.

## Source Policy

- `fan-navigation`: public BV/part labels used to locate material for manual review.
- `fan-analysis`: uploader-authored analysis or flow interpretation; verify with official/wiki before using as persona constraints.
- Part labels are not treated as official canon text unless independently corroborated.
- Use this catalog to choose source locators for future `PersonaSpec.sourceNotes`, memory seeds, event packs, and debug UI filters.

## Source Videos Checked

| BV | Title | Creator | Pages | Primary use |
|---|---|---|---:|---|
| `BV1vg411Y7si` | 【崩坏3】往世乐土全剧情合集（不含战斗） | 千万-伏特 | 73 | Primary ER mode story/navigation index with clear split across main story, recollections, events, signet-giving, object entries, and relationship graph. |
| `BV1ff4y1L7hv` | 【崩坏3】往世乐土剧情故事全流程（持续更新）1080+ | 想抱莉莉娅的云天 | 40 | Alternate full-flow navigation; useful for cross-checking character appearances and infrastructure/system events. |
| `BV1kM4y1K733` | 【崩坏3】活动「往世乐土」全剧情流程（更新至第26章） | 档案Archivare | 26 | Long-form event-flow navigation; labels are stylized uploader summaries, useful as fan-navigation/fan-analysis only. |

## Category Legend

| Category | Meaning | Future use |
|---|---|---|
| `realm.main_story` | ER chapter act-level progression | High-level timeline, world background, replay/lore filters. |
| `realm.recollection` | Historical memory fragments / 追忆 | Long-term memory seeds, reflection evidence, persona constraints after cross-check. |
| `realm.character_event` | Character-specific events / 事件 | Conversation topics, directed relationship hooks, daily-life seed inspiration. |
| `realm.signet_event` | Signet-giving interaction locator | Signet/persona theme cross-check, roster completeness, not combat implementation. |
| `realm.object_memory` | Object/item/archive memory locator | Archive UI, memory-artifact events, no item text copied. |
| `realm.relationship_map` | Relationship graph locator | Directed relationship seed validation. |
| `realm.system_event` | Klein/admin/Deep End/anomaly/realm infrastructure locator | Backend world modules and anomaly event packs. |
| `fan.flow_index` | Alternate uploader flow section | Cross-check only; do not use as official chronology by itself. |

## Primary Catalog: `BV1vg411Y7si`

URL: https://www.bilibili.com/video/BV1vg411Y7si/

| Part | Public part label | Category | Character / topic tags | Safe future use |
|---:|---|---|---|---|
| P1 | 第1章 在无限的暗影之中 Act.1 | `realm.main_story` | chapter1, onboarding | Realm entry/context locator; use only high-level summary. |
| P2 | 第1章 在无限的暗影之中 Act.2 | `realm.main_story` | chapter1, onboarding | Early realm progression locator. |
| P3 | 第1章 在无限的暗影之中 Act.3 | `realm.main_story` | chapter1, onboarding | Chapter 1 closing/progression locator. |
| P4 | 无瑕的追忆（第1章） | `realm.recollection` | elysia, ego | Elysia memory-fragment locator. |
| P5 | 英雄的追忆（第1章） | `realm.recollection` | kevin, deliverance | Kevin memory-fragment locator. |
| P6 | 落樱的追忆（第1章） | `realm.recollection` | sakura, setsuna | Sakura memory-fragment locator. |
| P7 | 战士的追忆（第1章） | `realm.recollection` | hua, vicissitude | Hua memory-fragment locator. |
| P8 | 狂王的追忆（第1章） | `realm.recollection` | kalpas, decimation | Kalpas memory-fragment locator. |
| P9 | 歌者的追忆（第1章） | `realm.recollection` | eden, gold | Eden memory-fragment locator. |
| P10 | 觉者的追忆（第1章） | `realm.recollection` | su, bodhi | Su memory-fragment locator. |
| P11 | 蛇主的追忆（第1章） | `realm.recollection` | mobius, infinity | Mobius memory-fragment locator. |
| P12 | 事件-爱莉希雅（第1章） | `realm.character_event` | elysia | Elysia interaction/style locator; no dialogue copied. |
| P13 | 事件-凯文（第1章） | `realm.character_event` | kevin | Kevin interaction/relationship locator. |
| P14 | 事件-樱（第1章） | `realm.character_event` | sakura | Sakura interaction/relationship locator. |
| P15 | 事件-华（第1章） | `realm.character_event` | hua | Hua interaction/routine locator for MVP cross-check. |
| P16 | 事件-千劫（第1章） | `realm.character_event` | kalpas | Kalpas conflict/decline-interaction locator. |
| P17 | 事件-伊甸（第1章） | `realm.character_event` | eden | Eden gathering/music-tone locator. |
| P18 | 事件-苏（第1章） | `realm.character_event` | su | Su counsel/observer locator. |
| P19 | 事件-梅比乌斯（第1章） | `realm.character_event` | mobius | Mobius boundary-testing locator. |
| P20 | 第2章 致世界上的另一个我 Act.1 | `realm.main_story` | chapter2, deep_end | Chapter 2 progression and infrastructure locator. |
| P21 | 第2章 致世界上的另一个我 Act.2 | `realm.main_story` | chapter2, deep_end | Chapter 2 progression locator. |
| P22 | 第2章 致世界上的另一个我 Act.3 | `realm.main_story` | chapter2, deep_end | Chapter 2 progression locator. |
| P23 | 第2章 致世界上的另一个我 Act.4 | `realm.main_story` | chapter2, deep_end | Chapter 2 closing/progression locator. |
| P24 | 无瑕的追忆（第2章） | `realm.recollection` | elysia | Elysia chapter 2 memory-fragment locator. |
| P25 | 英雄的追忆（第2章） | `realm.recollection` | kevin | Kevin chapter 2 memory-fragment locator. |
| P26 | 落樱的追忆（第2章） | `realm.recollection` | sakura | Sakura chapter 2 memory-fragment locator. |
| P27 | 战士的追忆（第2章） | `realm.recollection` | hua | Hua chapter 2 memory-fragment locator. |
| P28 | 歌者的追忆（第2章） | `realm.recollection` | eden | Eden chapter 2 memory-fragment locator. |
| P29 | 蛇主的追忆（第2章） | `realm.recollection` | mobius | Mobius chapter 2 memory-fragment locator. |
| P30 | 事件-爱莉希雅（第2章） | `realm.character_event` | elysia | Elysia chapter 2 interaction locator. |
| P31 | 事件-凯文（第2章） | `realm.character_event` | kevin | Kevin chapter 2 interaction locator. |
| P32 | 事件-樱（第2章） | `realm.character_event` | sakura | Sakura chapter 2 interaction locator. |
| P33 | 事件-华（第2章） | `realm.character_event` | hua | Hua chapter 2 interaction locator. |
| P34 | 事件-千劫（第2章） | `realm.character_event` | kalpas | Kalpas chapter 2 interaction locator. |
| P35 | 事件-伊甸（第2章） | `realm.character_event` | eden | Eden chapter 2 interaction locator. |
| P36 | 事件-苏（第2章） | `realm.character_event` | su | Su chapter 2 interaction locator. |
| P37 | 事件-梅比乌斯（第2章） | `realm.character_event` | mobius | Mobius chapter 2 interaction locator. |
| P38 | 事件-克莱茵 | `realm.system_event` | klein, maintenance, mobius | Realm maintenance/admin locator. |
| P39 | 事件-渡鸦 | `realm.character_event` | raven, visitor | External visitor/context locator; not a Flame-Chaser persona seed. |
| P40 | 第3章 愿时光永驻此刻，愿明日—— Act.1-1 | `realm.main_story` | chapter3, deep_end | Chapter 3 progression locator. |
| P41 | 第3章 愿时光永驻此刻，愿明日—— Act.1-2 | `realm.main_story` | chapter3, deep_end | Chapter 3 progression locator. |
| P42 | 第3章 愿时光永驻此刻，愿明日—— Act.2-1 | `realm.main_story` | chapter3, deep_end | Chapter 3 progression locator. |
| P43 | 第3章 愿时光永驻此刻，愿明日—— Act.2-2 | `realm.main_story` | chapter3, deep_end | Chapter 3 progression locator. |
| P44 | 第3章 愿时光永驻此刻，愿明日—— Act.3 | `realm.main_story` | chapter3, deep_end | Chapter 3 closing/progression locator. |
| P45 | 凡人的追忆 | `realm.recollection` | pardofelis, reverie | Pardofelis memory-fragment locator for MVP pilot. |
| P46 | 少年的追忆 | `realm.recollection` | kosma, daybreak | Kosma memory-fragment locator. |
| P47 | 画家的追忆 | `realm.recollection` | griseo, stars | Griseo memory-fragment locator. |
| P48 | 愚人的追忆 | `realm.recollection` | vill-v, helix | Vill-V memory-fragment locator. |
| P49 | 无瑕的追忆（第3章） | `realm.recollection` | elysia | Elysia chapter 3 memory-fragment locator. |
| P50 | 英雄的追忆（第3章） | `realm.recollection` | kevin | Kevin chapter 3 memory-fragment locator. |
| P51 | 落樱的追忆（第3章） | `realm.recollection` | sakura | Sakura chapter 3 memory-fragment locator. |
| P52 | 战士的追忆（第3章） | `realm.recollection` | hua | Hua chapter 3 memory-fragment locator. |
| P53 | 狂王的追忆（第3章） | `realm.recollection` | kalpas | Kalpas chapter 3 memory-fragment locator. |
| P54 | 歌者的追忆（第3章） | `realm.recollection` | eden | Eden chapter 3 memory-fragment locator. |
| P55 | 觉者的追忆（第3章） | `realm.recollection` | su | Su chapter 3 memory-fragment locator. |
| P56 | 苦修的追忆 | `realm.recollection` | aponia, discipline | Aponia memory-fragment locator. |
| P57 | 事件-伊甸（第3章） | `realm.character_event` | eden | Eden chapter 3 interaction locator. |
| P58 | 妖精打字机 | `realm.system_event` | archive, typewriter, elysia | Archive/system object locator; future `realm.infrastructureEvent` seed. |
| P59 | 给予刻印-凯文 | `realm.signet_event` | kevin, deliverance | Signet/persona theme locator. |
| P60 | 给予刻印-爱莉希雅 | `realm.signet_event` | elysia, ego | Signet/persona theme locator. |
| P61 | 给予刻印-阿波尼亚 | `realm.signet_event` | aponia, discipline | Signet/persona theme locator. |
| P62 | 给予刻印-伊甸 | `realm.signet_event` | eden, gold | Signet/persona theme locator. |
| P63 | 给予刻印-维尔薇 | `realm.signet_event` | vill-v, helix | Signet/persona theme locator. |
| P64 | 给予刻印-千劫 | `realm.signet_event` | kalpas, decimation | Signet/persona theme locator. |
| P65 | 给予刻印-苏 | `realm.signet_event` | su, bodhi | Signet/persona theme locator. |
| P66 | 给予刻印-樱 | `realm.signet_event` | sakura, setsuna | Signet/persona theme locator. |
| P67 | 给予刻印-科斯魔 | `realm.signet_event` | kosma, daybreak | Signet/persona theme locator. |
| P68 | 给予刻印-梅比乌斯 | `realm.signet_event` | mobius, infinity | Signet/persona theme locator. |
| P69 | 给予刻印-格蕾修 | `realm.signet_event` | griseo, stars | Signet/persona theme locator. |
| P70 | 给予刻印-华 | `realm.signet_event` | hua, vicissitude | Signet/persona theme locator. |
| P71 | 给予刻印-帕朵菲莉丝 | `realm.signet_event` | pardofelis, reverie | Signet/persona theme locator. |
| P72 | 物品 | `realm.object_memory` | archive, objects | Object/archive memory locator; no item text copied. |
| P73 | 英桀关系网 | `realm.relationship_map` | relationship_graph, roster | Directed relationship graph locator; verify with official relationship-map URL. |

## Alternate Flow Cross-Check: `BV1ff4y1L7hv`

URL: https://www.bilibili.com/video/BV1ff4y1L7hv/

| Part range | Public part labels / topics | Category | Safe use |
|---|---|---|---|
| P1-P7 | Early ER entry, first Flame-Chaser contacts, Hua, Mobius, Elysia trial, early real-world return/setup | `fan.flow_index`, `realm.main_story`, `realm.character_event` | Cross-check chapter 1 ordering and first-appearance context. |
| P8-P11 | Kalpas, Sakura, Pardofelis, Hua, Mobius-related interaction topics | `fan.flow_index`, `realm.character_event` | Locate early relationship hooks; verify against wiki/primary story index. |
| P12-P21 | Chapter 2, Deep End, Klein maintenance, external visitor, Divine Key, Mobius/Klein truth, chapter ending/setup | `fan.flow_index`, `realm.system_event`, `realm.main_story` | Strong infrastructure locator for Klein, Deep End, maintenance, and Mobius boundary rules. |
| P22 | 追忆之皿文字剧情 | `realm.object_memory` | Text-locator only; do not copy memory-vessel text. |
| P23-P34 | Chapter 3, Aponia, Pardofelis, Kosma, Griseo, Vill-V, Dusk Street investigation, Kalpas/Aponia confrontation, object descriptions | `fan.flow_index`, `realm.recollection`, `realm.character_event`, `realm.object_memory` | Locate late ER roster introductions and Dusk Street relationship threads. |
| P35-P40 | Later continuation, memory/signet object labels, official animation short locator | `fan.flow_index`, `realm.system_event`, `fan-navigation` | Link ER mode into Everlasting Elysium/late media without copying animation or subtitles. |

Known public part-label tags from this source include: `Pardo/Pardofelis`, `Hua`, `Mobius`, `Klein`, `Aponia`, `Kosma`, `Griseo`, `Vill-V`, `Dusk Street`, `Deep End`, `Divine Key`, and object/recollection descriptors. Preserve labels as metadata only.

## Long-Form Flow Cross-Check: `BV1kM4y1K733`

URL: https://www.bilibili.com/video/BV1kM4y1K733/

This source is useful for long-form browsing because it splits the event flow into 26 uploader-labeled chapters. The labels are poetic/stylized fan-navigation metadata, not official chapter names in this repository.

| Part range | Category | Safe use |
|---|---|---|
| P1-P8 | `fan.flow_index` | Early and mid ER flow locator; use to find broad sections for manual review. |
| P9-P16 | `fan.flow_index`, `realm.recollection`, `realm.character_event` | Middle ER conflict and Mobius/Klein/Kalpas-oriented segments; verify before extracting constraints. |
| P17-P26 | `fan.flow_index`, `realm.system_event` | Late ER and transition context, including Aponia/Pardo/Kosma/Griseo/Vill-V/Hua-related navigation labels. |

## MVP Trio Locator Summary

| MVP agent | Best primary locators | Cross-check locators | Future use |
|---|---|---|---|
| `elysia` | `BV1vg411Y7si` P4, P12, P24, P30, P49, P60 | `BV1ff4y1L7hv` P5-P7, P20, P40 | Social catalyst, central memory figure, group-invitation seeds. |
| `pardofelis` | `BV1vg411Y7si` P45, P71 | `BV1ff4y1L7hv` P10, P25, P35; `BV1kM4y1K733` P17/P21 as navigation | Shop/routine generator, ordinary-life perspective, low-stakes event seeds. |
| `hua` | `BV1vg411Y7si` P7, P15, P27, P33, P52, P70 | `BV1ff4y1L7hv` P3, P10, P34; `BV1kM4y1K733` P26 as navigation | Memory burden, restrained guidance, training/quiet reflection seeds. |

## Persona / Event-Pack Usage Rules

1. Store source locators as arrays such as `[{ provenance: "fan-navigation", sourceId: "BV1vg411Y7si", part: 45 }]`.
2. Convert watched material into short project-authored summaries only after cross-checking with wiki/official URLs.
3. Never paste a transcript, subtitle line, cutscene quote, or item description into persona fixtures.
4. Treat `realm.signet_event` as thematic/roster metadata; do not turn combat mechanics into personality unless corroborated by story/wiki.
5. Use `realm.relationship_map` only to validate directed relationship seeds; do not copy relationship-map art or visual layout.
6. Use `realm.object_memory` to create original memory-artifact event seeds with source IDs, not item text.

## Verification Log

- Queried Bilibili public `x/web-interface/view` metadata for `BV1vg411Y7si`, `BV1ff4y1L7hv`, and `BV1kM4y1K733` with a browser-like user agent and referer.
- Verified page counts: 73, 40, and 26 respectively.
- Stored public BV IDs, titles, creators, page counts, part numbers, and part labels only.
- Did not fetch, transcribe, or store subtitles, official dialogue, story scripts, images, audio, or extracted assets.
