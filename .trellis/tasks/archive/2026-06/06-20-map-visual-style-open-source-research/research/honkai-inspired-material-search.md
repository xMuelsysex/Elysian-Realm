# Honkai-Inspired Material Search

## Search Scope

Keywords checked in Chinese and English:

- 圣芙蕾雅 / St. Freya / St. Freya High / St. Freya Academy
- 黄金庭院 / Golden Courtyard
- 往世乐土 / Elysian Realm
- 崩坏3 / Honkai Impact 3rd
- MMD 场景配布 / model download / Blender / Unity / stage DL / assets

Goal: find whether there are usable materials for a map visual direction inspired by St. Freya, Golden Courtyard, or Elysian Realm.

## Bottom Line

There are plenty of references, fan works, official MMD character model links, guide images, and extracted/ripped resources. There are very few safe-to-ship scene assets for this project.

Recommended asset policy:

1. Use Honkai/St. Freya/Golden Courtyard/Elysian Realm only as mood-board references.
2. Do not commit extracted game assets, ripped scene data, fan redistributions, official character models, or MMD ports into this repo.
3. Build the real prototype from CC0/original tilesets while borrowing broad concepts: academy dorm, warm courtyard, archive room, memory garden, lounge, chapel/library atmosphere.

## Findings By Theme

### St. Freya / 圣芙蕾雅

| Source Type | Examples Found | Usefulness | Risk |
| --- | --- | --- | --- |
| Official wiki/lore pages | HoYo/MiHoYo wiki, Honkai Impact 3 Wiki pages for St. Freya High | Good for naming, school/campus atmosphere, high-level setting traits | Reference only; no direct asset reuse |
| Fan/MMD activity posts | “崩坏3宿舍MMD大赏 圣芙蕾雅冬季轰趴” and many Bilibili/MMD entries | Good evidence that dorm/chibi St. Freya vibe is a recognizable direction | Activity/model assets are official/fan-distributed; avoid bundling |
| Minecraft recreation | “崩坏3圣芙蕾雅学院全景 位于MC中的崩坏” | Useful as composition reference for campus scale | Fan recreation; reference only |
| Official MMD model link collections | HoYoLAB posts listing official Honkai 3rd MMD models, including dorm/chibi models | Useful for private visual study and proportion reference | Official IP; do not include in product assets without explicit license clearance |

Conclusion: St. Freya is useful as a design vocabulary: academy campus, dorm room, lounge, principal/school motifs, clean white-blue tech school feeling. It is not a practical source of safe scene assets.

### Golden Courtyard / 黄金庭院

| Source Type | Examples Found | Usefulness | Risk |
| --- | --- | --- | --- |
| Official/fan documentation | “黄金庭院：冬日里的新年愿望” pages on 4399, 萌娘百科, 番组百科 | Good for story mood: warm winter house, shared table, cozy ensemble cast | Screenshot/reference only; no direct reuse |
| MMD stage search | Results mostly point to Genshin “Golden House” / 黄金屋 MMD stage, not Honkai Golden Courtyard | Low direct value for Honkai map | Genshin/MiHoYo scene ports are IP-risky and off-theme |
| Generic garden/courtyard assets | CLIP STUDIO “fountain garden/palace” and other fantasy garden stages | Potential mood proxy | License and format-specific restrictions need review |

Conclusion: Golden Courtyard is better treated as a tone target than an asset source: warm shared home, festive table, soft lights, winter/cozy props, garden-like shared space.

### Elysian Realm / 往世乐土

| Source Type | Examples Found | Usefulness | Risk |
| --- | --- | --- | --- |
| Guide image repositories | `MskTmi/ElysianRealm-Data`, `Bh3-ElysianRealm-Strategy`, Yunzai plugins | Useful only for UI/content research around guide cards and naming | Images are from Honkai community/official strategy sources; do not reuse as product art |
| Fan websites | `risbi0/Elysian-Realm`, `AdoriZahard/hi3er`, Abyss Lab, AruStats | Useful for information architecture and game-mode terminology | Not scene assets |
| Scene/model redistribution | `vx.maid.zone` “永世乐土档案室（场景配布）” and similar mod/MMD scene posts | Could be visually close for private study | Explicitly indicates miHoYo model/source; redistribution/mod restrictions; do not commit or ship |
| Ripping/importing guides | HI-Model-Importer, vg-resource ripping help, RipperStore posts | Useful to identify risk boundary | Out of scope for this project; extraction workflows should be avoided |

Conclusion: Elysian Realm provides strong thematic cues: memory archive, luminous ruins, deep-end space, signet/engraving motifs, paradise garden. Available asset links are mostly guide images or extracted/modded resources, so use as reference only.

## Usability Tiers

### Safe For Repo / Product Prototype

Use these instead of Honkai assets:

- CC0 isometric interior tilesets, especially Kenney Isometric Library Tiles.
- CC0 fantasy/library/garden tilesets from Kenney or Screaming Brain Studios.
- Original sprites/icons created for this project.
- Tiled maps authored from CC0/original tiles.
- Abstracted UI motifs: white-blue rounded panels, soft glow, pastel labels, event pulse rings.

### Safe For Private Mood Board Only

These can guide composition, terminology, or atmosphere:

- Official screenshots/trailers/wikis for St. Freya, Golden Courtyard, and Elysian Realm.
- HoYoLAB official MMD model listings for proportion/character token study.
- Fan MMD videos and scene credits.
- Fan-made Minecraft St. Freya recreations.

### Avoid For Repo / Product Use

Do not import, commit, or ship:

- Extracted Honkai game assets.
- Ripped Unity bundles, AssetStudio outputs, or 3DMigoto model dumps.
- Official MMD character models or dorm/chibi models.
- Fan MMD scene ports using miHoYo assets.
- Paid/VIP repost sites with unclear redistribution rights.
- Community strategy images sourced from MiHoYo/Bilibili/Miyoushe unless used only as external references.

## Visual Concepts Worth Borrowing

### St. Freya-Inspired

- White-blue academy interior.
- Dorm lounge with school furniture, notice boards, plants, study desks.
- Clean campus signage and soft sci-fi UI labels.
- “Principal office / common room / training hall / archive” spatial vocabulary.

### Golden Courtyard-Inspired

- Shared long table, warm lamps, winter window light, cozy living room.
- Ensemble-home feeling: many small activity corners in one room.
- Gold/cream accents, soft pink highlights, gentle festive props.
- Central gathering zone as map atrium.

### Elysian Realm-Inspired

- Memory archive shelves, luminous sigils, glassy ruins, blue/gold particles.
- Garden paths connected to rooms by symbolic gates.
- Floating/pulsing event markers as “memory traces”.
- Each location can represent a memory domain rather than a literal campus room.

## Practical Recommendation For This Project

Use the map style as an original “Elysian dorm/archive room” rather than a direct Honkai location replica.

Concrete art direction:

- Base scene: cozy academy dorm + archive room hybrid.
- Center: atrium/common table for the current `atrium` location.
- Left/top: garden/plant corner for `garden`.
- Right: sofa/tea area for `lounge`.
- Back wall: bookshelves/record shelves for `archives`.
- Lower-left: beds/private nook for `quarters`.
- Lower-right: window/balcony for `overlook`.
- Upper-middle: practice mat/notice board for `training-hall`.

This lets the project benefit from Honkai-adjacent emotional vocabulary while staying clear of direct IP reuse.

## Sources Surfaced

- HoYo/MiHoYo official wiki and HoYoLAB MMD model link pages.
- Honkai Impact 3 Wiki pages for St. Freya High.
- Hoyostans St Freya Travels page.
- 4399 / 萌娘百科 / 番组百科 pages for Golden Courtyard special animation.
- GitHub Elysian Realm guide/data repositories: `MskTmi/ElysianRealm-Data`, `MskTmi/Bh3-ElysianRealm-Strategy`, `risbi0/Elysian-Realm`, `AdoriZahard/hi3er`, `zipated/Elysian-Realm-plugin`.
- Fan/MMD scene distribution pages on Bilibili, DeviantArt, MMD resource sites, vx.maid.zone, Steam Workshop, and RipperStore.
- Ripping/importing tooling references such as `SilentNightSound/HI-Model-Importer` and vg-resource discussions, used only to identify exclusion boundaries.
