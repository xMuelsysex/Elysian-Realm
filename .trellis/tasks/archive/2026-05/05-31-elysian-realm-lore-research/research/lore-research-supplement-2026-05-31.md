# Lore Research Supplement: Elysian Realm / Flame-Chasers

## Purpose

Supplement the archived Elysian Realm research with additional source locators and implementation-facing notes from the three source classes requested by the user: Bilibili story/analysis videos, Moegirl wiki entries, and GitHub repositories.

This document is a source index and project-authored summary only. It stores URLs, BV IDs, titles, public metadata, repository names, provenance, trust boundaries, and future-use notes. It does not store video subtitles, transcripts, official dialogue, lyrics, images, audio, frames, guide images, extracted assets, or copied wiki prose.

## Research Boundary

| Source class | Stored here | Not stored here | Future use |
|---|---|---|---|
| `fan-analysis` | BV/URL, title, creator, episode number, duration/date when public, concise project summary | analysis transcript, scene dialogue, screen text, screenshots | interpretation hypotheses, story arc orientation, reviewer watchlist |
| `fan-navigation` | BV/URL, part or playlist labels, source role | subtitles, full plot text, official script | locator for manual review and sourceNotes |
| `wiki-summary` | page URL, topic, project-authored safe summary | copied Moegirl/Fandom/Baidu prose | terminology, relationship constraints, cross-check anchors |
| `github-metadata` | repo URL, repo role, metadata examples, safe boundary | images, data dumps, extracted dialogue/cutscene files | alias mapping, gameplay labels, automation risk classification |

## Executive Conclusions

1. **泛式剧情讲堂 ER gap is now filled.** Public Bilibili playlist/page metadata identifies:
   - `BV19S4y1h7ot` as episode #11 `往世乐土`.
   - `BV1fa411P7M5` as episode #12 `人之律者`.
2. **Moegirl supplement should focus on system/arc pages beyond the 13-character roster.** Useful additions are `克莱茵(崩坏系列)`, `律者`, `真我·人之律者`, `侵蚀之律者`, `黄金庭院：冬日里的新年愿望`, plus the already-indexed `逐火之蛾` and character pages.
3. **GitHub supplement should distinguish guide/alias metadata from unsafe corpus/asset sources.** `MskTmi/ElysianRealm-Data` and bot plugins are useful for alias/gameplay keyword normalization; dialogue/cutscene corpus or extractor repos are explicitly unsafe for fixture content and must not be used as lore text sources.
4. **Implementation mapping remains unchanged:** future code should consume these as source locators and provenance notes, not as direct content. No persona fixture, memory seed, event payload, or UI copy should paste source prose.

## Bilibili Supplement

### Confirmed 泛式 entries

| Provenance | BV / URL | Public title / metadata | Safe use | Boundary |
|---|---|---|---|---|
| `fan-analysis` | `BV19S4y1h7ot` / https://www.bilibili.com/video/BV19S4y1h7ot/ | 泛式剧情讲堂 #11. Public title: `第十三律者降临！编剧你睡得着吗？带你看往世乐土到底讲了啥！「崩坏3剧情讲堂#11」`. Public metadata: creator `泛式`, duration about `12:38`, public page metadata date 2022-04-21 UTC. | Condensed explanation of the in-game Elysian Realm mode through its third chapter; useful as a low-trust orientation layer before manual review of primary story/navigation videos. | Fan analysis only; do not treat jokes, compression, or interpretation as canon. Do not store transcript/dialogue. |
| `fan-analysis` | `BV1fa411P7M5` / https://www.bilibili.com/video/BV1fa411P7M5/ | 泛式剧情讲堂 #12. Public title: `人之律者登场？十三英桀全灭！带你看往世乐土大结局！「崩坏3剧情讲堂#12」`. Public metadata: creator `泛式`, duration about `14:34`, public page metadata date 2022-08-13 UTC. | Condensed explanation of late Elysian Realm / mainline chapters 29-31 / Elysia identity arc; useful for future implementation review of final-arc provenance and `human-herrscher` terminology. | Fan analysis only; use as a watchlist and cross-check with wiki/official URLs. No transcript/dialogue storage. |

### Additional Bilibili analysis/navigation leads

| Provenance | URL / locator | What pi-web-access search confirmed | Safe use | Boundary |
|---|---|---|---|---|
| `fan-navigation` | `BV1vg411Y7si` | Existing primary full-story navigation video still appears in search as the clearest ER mode collection; its public description highlights three ER chapters and non-strict ordering of recollections/events. | Keep as primary Bilibili locator for ER mode structure and future sourceNotes. | Already cataloged; do not expand into transcript. |
| `fan-navigation` | `BV1ff4y1L7hv` | Search exposes a long public description with part-level story labels and topic tags around Klein, Deep End, Pardo, Aponia, Vill-V, and late continuation. | Existing catalog remains useful; future manual timestamp pass may add locator timestamps only. | The search result includes descriptive plot snippets; do not copy them into fixtures or memory content. |
| `fan-analysis` | `BV1o8411G7zH` | Search result confirms 档案Archivare playlist/related entries include Previous Era plan analysis, ER final recap, Elysium Everlasting / Corruption, Vill-V / Helix, Corruption Herrscher, and Elysia ability analysis. | Create a future fan-analysis watchlist for Previous Era plans and late ER interpretation. | Analysis lower than official/wiki; do not store commentary transcript. |
| `fan-analysis` | 17173 / Hupu text summaries from search results | Search results surface fan timeline/summary discussions around Previous Era and ER 3.0. | Use only as low-trust leads for manual cross-checking if a future researcher needs chronology disputes. | Not authoritative; do not use as persona fact source. |

### Bilibili-to-implementation mapping

- `BV19S4y1h7ot` -> `sourceNotes` locator for ER-mode overview, `fan-analysis`, future lore review checklist.
- `BV1fa411P7M5` -> `sourceNotes` locator for Elysia / Human Herrscher / chapters 29-31 overview, `fan-analysis`.
- `BV1vg411Y7si` and `BV1ff4y1L7hv` -> keep as `fan-navigation` for event taxonomy, memory/recollection locator IDs, and debug source filters.
- Do not make any Bilibili-derived sentence part of immutable persona facts; translate only manually reviewed conclusions into short project-authored summaries.

## Moegirl Supplement

| Provenance | Topic / URL | Safe project-authored summary | Future use | Boundary |
|---|---|---|---|---|
| `wiki-summary` | 克莱茵(崩坏系列) / https://zh.moegirl.org.cn/%E5%85%8B%E8%8E%B1%E8%8C%B5(%E5%B4%A9%E5%9D%8F%E7%B3%BB%E5%88%97) | Entry for Klein as a Mobius-related assistant/ELF and Elysian Realm maintenance/admin-adjacent character. | Add `klein_admin` / `realm_maintenance` source locator for world infrastructure, operation failure messages, and archive caretaker concepts. | Do not copy character self-introductions, diary text, or skill text. |
| `wiki-summary` | 律者 / https://zh.moegirl.org.cn/%E5%BE%8B%E8%80%85 | Broad Herrscher terminology page. Search/fetch previews identify key anchors around `人之律者`, `始源之律者`, previous-era sequence, and the relation between Elysia and later human-aligned Herrschers. | Cross-check `human-herrscher`, `origin-herrscher`, `corruption-herrscher`, `finality` glossary entries and UI taxonomy labels. | Page contains long official/wikified explanations; summarize only. |
| `wiki-summary` | 真我·人之律者 / https://zh.moegirl.org.cn/%E7%88%B1%E8%8E%89%E5%B8%8C%E9%9B%85/%E7%9C%9F%E6%88%91%C2%B7%E4%BA%BA%E4%B9%8B%E5%BE%8B%E8%80%85 | Battlesuit/identity page surfaced by pi-web-access as a direct Moegirl result for Human Herrscher. | Identifier support for Elysia post-arc naming, not behavior source. | Gameplay/battlesuit text is not persona canon; no skill text copied. |
| `wiki-summary` | 侵蚀之律者 / https://zh.moegirl.org.cn/%E4%BE%B5%E8%9A%80%E4%B9%8B%E5%BE%8B%E8%80%85 | Late Elysian Realm / Elysium Everlasting antagonist context; useful for data-space threat, corruption/anomaly, and memory-erasure taxonomy. | Future `realm.anomaly`, `memory.corruption`, `source: wiki-summary` event categories; UI debug filter for lore threats. | Do not copy story beats or dialogue; keep antagonist arc as high-level taxonomy. |
| `wiki-summary` | 黄金庭院：冬日里的新年愿望 / https://zh.moegirl.org.cn/%E9%BB%84%E9%87%91%E5%BA%AD%E9%99%A2%EF%BC%9A%E5%86%AC%E6%97%A5%E9%87%8C%E7%9A%84%E6%96%B0%E5%B9%B4%E6%84%BF%E6%9C%9B | Special animation metadata page; confirms Golden Courtyard as a slice-of-life ensemble media source with full Flame-Chaser cast plus Klein. | Tone anchor for non-canon daily-life MVP event packs such as gatherings, meals, and festive routines. | Tone only; no plot, dialogue, lyrics, images, music, or cast prose copied into fixtures. |
| `wiki-summary` | 逐火之蛾 / https://zh.moegirl.org.cn/%E9%80%90%E7%81%AB%E4%B9%8B%E8%9B%BE | Existing core organization page remains the best Moegirl entry for Previous Era organization, projects, and Flame-Chaser roster context. | Keep as organization and project terminology source. | Already indexed; no change to source boundary. |

### Moegirl-to-implementation mapping

- Add `Klein` as infrastructure/admin-adjacent source locator before implementing realm maintenance events.
- Use `律者` + `真我·人之律者` to normalize glossary labels only; do not let battlesuit/gameplay pages drive personality.
- Use `侵蚀之律者` as a high-level anomaly/corruption taxonomy source, not as a full plot recreation.
- Use `黄金庭院` as a slice-of-life tone anchor for generated original events, not as a scene source.

## GitHub Supplement

### Safe metadata / alias / automation references

| Provenance | Repository / URL | Public role | Safe use | Boundary |
|---|---|---|---|---|
| `github-metadata` | `MskTmi/ElysianRealm-Data` / https://github.com/MskTmi/ElysianRealm-Data | Elysian Realm strategy image/data index repository. pi-web-access search confirms role as `Bh3-ElysianRealm-Strategy` image/index library and public role-name rows such as `Felis`, `Human`, `Human_AstralRing`. | Alias normalization and gameplay keyword metadata: e.g. `Felis` -> Pardofelis, `Human` -> Human Herrscher, `Golden` -> Eden, `Helical` -> Vill-V, `Lnfinite` typo/legacy ID for Mobius noted in existing research. | Asset-heavy; do not copy images, guide contents, or use as lore authority. |
| `github-metadata` | `MskTmi/Bh3-ElysianRealm-Strategy` / https://github.com/MskTmi/Bh3-ElysianRealm-Strategy | Mirai-Console bot plugin that maps chat keywords to ER guide images and can update the guide repository. | Architecture/UX reference for alias maps, command naming, update diagnostics, and explicit failure messages around remote updates. | Gameplay automation only; no lore authority. Do not import plugin code. |
| `github-metadata` | `zipated/Elysian-Realm-plugin` / https://github.com/zipated/Elysian-Realm-plugin | Yunzai bot plugin using `ElysianRealm-Data` and alias YAML. | Secondary alias-map reference; shows multi-bot reuse of the same guide data. | Do not copy images or alias file wholesale; no lore authority. |
| `github-metadata` | `MskTmi/astrbot_plugin_bh3_elysian_realm_strategy` / https://github.com/MskTmi/astrbot_plugin_bh3_elysian_realm_strategy | AstrBot plugin using `ElysianRealm-Data` index, local overlay, update commands, and keyword list. | Good implementation analogy for layered source index + local overlay; could inspire future source-note or alias override tooling. | Still gameplay/image guide automation only; no lore authority. |
| `github-metadata` | `nonebot_plugin_bh3_elysian_realm` / PyPI result | NoneBot2 plugin depending on `ElysianRealm-Data` and `Bh3-ElysianRealm-Strategy`. | Ecosystem signal that the same data repo is reused; confirms alias/source boundary. | No direct implementation source required. |
| `github-metadata` | `risbi0/Elysian-Realm`, `ButteryRafa/elysian-realm`, `AdoriZahard/hi3er` | Static guide sites for Elysian Realm builds/signets. | Optional gameplay terminology reference if future UI needs non-MVP gameplay filters. | Not persona/lore; often stale and guide-focused. |

### Explicitly unsafe / non-fixture source class

| Provenance | Repository / URL | Why it is risky | Repository rule |
|---|---|---|---|
| `unsafe-corpus` | `mrzjy/HonkaiImpact3rdDialog` | Public description says it collects Honkai Impact 3rd dialogue corpus and includes downloaded/transcribed game text. | Do not use as source for repo content. At most record existence as a “do not ingest” example. |
| `unsafe-corpus` | `mrzjy/honkai_impact_3rd_chinese_dialogue_corpus` / Hugging Face | Dataset advertises tens of thousands of dialogue/narration lines from video/OCR/VLM pipeline. | Do not fetch or store corpus rows. |
| `unsafe-media` | `mrzjy/honkai_impact_3rd_game_playthrough` / Hugging Face | Dataset includes videos/audio/OCR/frame-derived content. | Do not fetch media, OCR, frames, or parsed dialogue. |
| `unsafe-asset-extractor` | `Persivan/Eventurika-Honkai-Impact-Translation`, `neon-nyan/GI-HI3-cutscenes` | Tooling around extracted USM cutscenes, audio, video, and subtitles. | Do not use; outside project boundary and copyright risk. |

### GitHub-to-implementation mapping

- Future alias data can safely store compact, project-authored rows like `{ source: "github-metadata", repo: "MskTmi/ElysianRealm-Data", observedId: "Felis", label: "Pardofelis" }`.
- Do not treat gameplay guide IDs as lore IDs; use them only for search aliases, UI debug filters, or source discovery.
- Dialogue/cutscene/corpus repos are useful as negative examples for fixture linting: reject transcripts, OCR output, subtitles, extracted asset paths, or copied game script.

## Recommended Next Pass Status

| Prior recommendation | Status after this supplement | Notes |
|---|---|---|
| Confirm exact Bilibili IDs for ER-specific 泛式剧情讲堂 episodes | **Filled** | `BV19S4y1h7ot` (#11 往世乐土) and `BV1fa411P7M5` (#12 人之律者). |
| Expand Moegirl source entries beyond the roster | **Filled for system/arc anchors** | Added Klein, Herrscher glossary, Human Herrscher, Corruption Herrscher, Golden Courtyard. |
| Expand GitHub guide/data/plugin boundary | **Filled** | Added AstrBot plugin, negative corpus/cutscene sources, and clarified alias-only use. |
| Official JS-heavy pages manual browser capture | **Still future manual review** | Not attempted here; no cookies/login or browser bypass used. |
| Exact Bilibili timestamps for replay filters | **Future optional manual review** | Timestamps can be added later if needed, still without transcript/dialogue. |

## Verification / Reproducibility Log

- Used pi-web-access `web_search` with Bilibili-focused queries for 泛式 `崩坏3剧情讲堂`, `第11期 往世乐土`, `第12期 人之律者`, `BV19S4y1h7ot`, and `BV1fa411P7M5`.
- Used pi-web-access `web_search` with Moegirl-focused queries for `往世乐土`, `永世乐土`, `逐火之蛾`, `克莱茵`, `黄金庭院`, `律者`, `真我·人之律者`, and `侵蚀之律者`.
- Used pi-web-access `web_search` with GitHub-focused queries for `ElysianRealm-Data`, `Bh3-ElysianRealm-Strategy`, `astrbot_plugin_bh3_elysian_realm_strategy`, and Honkai dialogue/cutscene corpus risks.
- Public Bilibili page metadata confirmed the exact FanShi BVs; no subtitle APIs, video downloads, audio downloads, frame extraction, screenshots, or transcript storage were used.
- This document stores only source locators and project-authored summaries.
