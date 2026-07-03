# Open Source Map Visual Style References

## Current Project Boundary

- Current frontend stack is React 19 + PixiJS 8.19.0, with `RealmPixiStage` manually drawing into a Pixi `Application`.
- `RealmMapPanel` keeps a DOM text fallback after the Pixi stage, so visual changes should remain canvas-only and preserve accessible location/agent controls.
- `createRealmMapViewModel` owns map projection data: location nodes use stable percentage coordinates, agents are grouped by backend location, pulses come from timeline events, and links are currently sequential location connections.
- The practical integration seam is replacing the visual renderer inside `RealmPixiStage` while keeping `RealmMapViewModel` as the source of locations, agents, links, pulses, selected IDs, and labels.

## Strong References

| Reference | Category | License / IP Risk | Stack Fit | Reuse Value | Complexity |
| --- | --- | --- | --- | --- | --- |
| [`riebel/pixi-tiledmap`](https://github.com/riebel/pixi-tiledmap) | PixiJS v8 Tiled renderer | MIT; low code risk, bring own assets | Excellent: PixiJS v8, TypeScript, `Assets` loader, `.tmj`/`.tmx` | High for both pixel-art and isometric maps; supports all Tiled orientations, object/group layers, render order, runtime edits | Medium: introduces map asset pipeline and async asset loading |
| [`pixijs-userland/tilemap`](https://github.com/pixijs-userland/tilemap) | Low-level Pixi tile batching | MIT; low code risk, bring own assets | Excellent for PixiJS v8 | High for performant orthogonal/pixel-art tiles; useful if map is procedurally generated from view model | Low-medium: must implement coordinates, layers, and interaction mapping ourselves |
| [`loksland/pixel-art-game-test`](https://github.com/loksland/pixel-art-game-test) | Pixi pixel-art rendering technique | Demo/reference; uses Kenney assets attribution | Excellent: PixiJS concepts apply directly | High for avoiding blur/shimmer: `imageRendering: pixelated`, nearest texture scale mode, `roundPixels` | Low: can adopt renderer settings without structural rewrite |
| [`vocksel/react-pixi-tilemap`](https://github.com/vocksel/react-pixi-tilemap) | React + Pixi + Tiled component | MIT; low code risk | Partial: older React/Pixi ecosystem and `.tmx` only | Medium as API inspiration for layer slots, collisions, object hooks | Medium-high if used directly; better as pattern reference |
| [`axaq/traviso.js`](https://github.com/axaq/traviso.js) | Pixi isometric engine | MIT; code low risk | Partial: supports Pixi 7, not current Pixi 8 | Medium for isometric engine concepts, camera, callbacks, map data | High direct integration cost due Pixi version gap |
| [`kittykatattack/tileUtilities`](https://github.com/kittykatattack/tileUtilities) | Tiled + Pixi iso utilities | MIT-style utility reference; older code | Partial: older Pixi-era utility style | Medium for formulas: iso pointer, depth sort, Tiled custom map properties | Medium as reference, high if copied wholesale |
| [`sammccord/iceoh`](https://github.com/sammccord/iceoh) | Minimal typed isometric coordinate library | Project appears reusable; verify package license before use | Good: renderer-agnostic, Pixi-friendly | Medium for coordinate projection and z/depth values without a full engine | Low-medium if license and package maturity check pass |
| [`twofactor/pogicity-demo`](https://github.com/twofactor/pogicity-demo) | Isometric city builder reference | Project code reference; assets/IP should be checked before reuse | Conceptual only: Phaser + Next.js | High for depth sorting rules, anchor conventions, multi-tile object slicing | High for direct port; valuable as design notes |
| [`Annoraaq/grid-engine`](https://github.com/Annoraaq/grid-engine) | Phaser grid movement | Apache-2.0; low code risk | Poor for current Pixi renderer | Low-medium; useful if future map becomes navigable grid | High because it implies Phaser-style runtime concerns |

## Blue Archive-Adjacent References

| Reference | What To Borrow | What To Avoid |
| --- | --- | --- |
| [`sf-yuzifu/BA-style-homepage`](https://github.com/sf-yuzifu/homepage) | UI language: pale blue/white panels, rounded cards, loading transitions, click effects, dialog/modal treatment, soft motion | Do not copy Blue Archive layouts, game assets, Live2D/spine resources, names, or extracted content |
| [`respectZ/blue-archive-viewer`](https://github.com/respectZ/blue-archive-viewer) | General viewer architecture and asset-gallery UI patterns | Avoid extracted official assets; repo explicitly depends on game data workflows |
| [`hny-codes/lobby-archive`](https://github.com/hny-codes/lobby-archive) | Content browsing layout patterns | Avoid memorial lobby videos/images and official content |
| [`Kiramei/baas-webui`](https://github.com/Kiramei/baas-webui) | Dashboard polish, Tailwind-era BA-inspired control surface ideas | GPLv3 code contamination risk; automation/game-specific assets are out of scope |

Blue Archive dorm-like should be treated as a mood board: bright academy UI, soft rounded panels, cute room composition, character markers, subtle bounce/click feedback, and pastel blue accents. Use original or CC0 assets only.

## Open Asset Sources For Prototyping

| Asset Source | License / Terms | Useful For | Notes |
| --- | --- | --- | --- |
| [Kenney Isometric Library Tiles](https://kenney-assets.itch.io/isometric-library-tiles) | CC0 1.0; commercial use allowed, attribution optional | Dorm/library-like indoor prototype with walls, floors, tables, bookcases | Strong first asset candidate for a BA-adjacent study-room map without IP risk |
| [Kenney Isometric Dungeon Tiles](https://kenney-assets.itch.io/isometric-dungeon-tiles) | CC0 1.0; commercial use allowed, attribution optional | Isometric room mechanics, furniture, characters, Tiled sample | Theme is fantasy/dungeon; good for pipeline testing |
| [Kenney Isometric Blocks](https://kenney-assets.itch.io/isometric-blocks) | CC0 1.0; commercial use allowed, attribution optional | Generic isometric blocks and placeholder terrain | Best for low-fidelity proof of concept |
| [Screaming Brain Studios Isometric Stone Soup](https://screamingbrainstudios.itch.io/isometric-stone-soup) | CC0/public domain; commercial use allowed | Large 64x32 floor/wall tile library with Tiled `.tsx` | Good for testing Tiled + isometric import at scale |
| [Screaming Brain Studios Isometric Floor/Wall/Object packs](https://screamingbrainstudios.itch.io/isotilepack) | Author states CC0/no restrictions | Floor/wall/object variety | Validate each pack page before committing assets |
| [Newc42 Pixel Art Isometric Map Tileset](https://newc-42.itch.io/pixel-art-isometric-map-tileset) | CC0 | Outdoor/terrain pixel isometric route | Strong for a realm-overworld look, weaker for dorm interiors |
| [Kabukidanshi Isometric Pixel Art Home Interior Pack](https://kabukidanshi.itch.io/isometric-pixel-art-home-interior-pack) | Free commercial use with attribution; no redistribution/resale | Home/dorm interior furniture | Attribution required; check redistribution constraints before bundling |

## Direction Comparison

### Pixel-Art Top-Down / Orthogonal Map

- Best references: `@pixi/tilemap`, `loksland/pixel-art-game-test`, Kenney roguelike/indoor assets.
- Pros: fastest path from current percentage coordinates; low depth-sorting complexity; easy to preserve clickable location/agent nodes; visually clear at small panel sizes.
- Cons: feels more like a game map than a dorm/room; room coziness needs custom art direction and decorative sprites.
- Implementation sketch: keep `RealmMapViewModel`, project location percentages onto a small pixel grid, render a tile floor/background with nearest-neighbor scaling, place room/location icons and chibi-style agent tokens on top.

### Isometric Room / Dorm-Like Map

- Best references: `pixi-tiledmap`, Kenney Isometric Library, Screaming Brain Studios Stone Soup, `iceoh` or hand-written iso projection formulas, `twofactor/pogicity-demo` depth notes.
- Pros: closest to “dorm-like” feeling; supports furniture zones, cozy spaces, and character presence; Tiled can author room layout without changing backend data.
- Cons: needs asset pipeline, grid coordinate mapping, z-order/depth rules, and careful hit testing; Blue Archive must remain inspiration only.
- Implementation sketch: author a small original `.tmj` isometric room in Tiled, load with `pixi-tiledmap`, add transparent interactive overlays for `RealmMapLocationNode`s, render agent markers as Pixi sprites/containers sorted by iso depth, keep DOM fallback unchanged.

### Phaser Isometric Room

- Best references: `nadi-stuti/phaser-isometric-test`, `daan93/phaser-isometric-demo`, `grid-engine`, `pogicity-demo`.
- Pros: many examples for pathfinding, camera, depth sorting, object interaction.
- Cons: introduces a second rendering/game framework into an existing Pixi app; poor fit for current `RealmPixiStage` boundary.
- Recommendation: use only as conceptual reference unless the product becomes a full navigable game view.

### Blue Archive UI / Animation Layer

- Best reference: `sf-yuzifu/BA-style-homepage` for fan-style UI patterns.
- Pros: improves emotional tone without risky asset reuse; can be layered on top of either pixel or isometric map.
- Cons: style imitation can drift into IP risk if copied too literally.
- Implementation sketch: original pastel UI chrome, rounded white/blue floating info cards, soft pop/bounce on selection, translucent speech/activity chips, and original icons.

## Recommended First Implementation Direction

Choose an isometric room prototype using `pixi-tiledmap` plus CC0 Kenney Isometric Library assets.

Rationale:

1. It fits the existing PixiJS v8 renderer directly and avoids a Phaser rewrite.
2. It supports both target aesthetics: pixel-art assets and dorm-like isometric composition.
3. Tiled gives a concrete art/layout workflow while `RealmMapViewModel` remains the single data source for dynamic simulation state.
4. The rollout can be reversible: keep the current `RealmPixiStage` renderer as fallback or behind a local renderer switch while the new stage matures.

Suggested MVP:

1. Add a small static isometric room background loaded from original/CC0 tiles.
2. Map each backend location ID to a fixed room hotspot coordinate, replacing the current percentage-only visual layout inside the stage.
3. Render location highlights, event pulses, and agent markers above the tilemap using existing labels and selection handlers.
4. Apply pixel-art rendering settings: nearest scale mode, integer/camera snapping where possible, and CSS `image-rendering: pixelated` only when the selected art style needs crisp pixels.
5. Keep `RealmMapPanel` DOM fallback unchanged and preserve current view-model contracts.

## Follow-Up Questions For Planning

- Product direction: should the first prototype prioritize “cozy dorm room” over “realm world map”? Recommended answer: cozy room, because it is visually more distinctive and still compatible with location hotspots.
- Asset policy: can CC0 placeholder assets be checked into the repo for prototype work? Recommended answer: yes with attribution notes in `public/assets/.../README.md`, then replace with original assets later.
- Interaction depth: should agents move along paths in MVP? Recommended answer: no; start with static markers plus pulse/selection animation, then add movement after coordinates and depth sorting are stable.
