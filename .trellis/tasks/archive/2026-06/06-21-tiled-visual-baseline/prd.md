# Polish Tiled visual baseline

## Goal

Upgrade the current route-2 Tiled map from a pipeline placeholder into an original, reusable visual baseline for the 10×8 Elysian dorm/archive room while preserving the existing RealmMapViewModel-driven Pixi overlays and accessible DOM fallback.

## User Value

The current Tiled pipeline proves `.tmj` loading, tilesheet loading, hotspot anchors, Pixi overlays, and fallback diagnostics. The next value step is making the map read as an intentional soft blue-white archive room instead of a checkerboard pipeline demo.

## Confirmed Facts

- `RealmMapPanel` renders `RealmIsometricStage` and keeps a DOM/text fallback for locations and agents.
- `RealmIsometricStage` loads `/assets/realm/tiled/realm-room.tmj` with `pixi-tiledmap`, extracts `realm_hotspots`, and renders backend-projected locations, agents, and event pulses above the map.
- The first-pass `.tmj` is a 10×8 isometric map under `public/assets/realm/tiled/`.
- The current visible wall placeholder layer was disabled because it produced noisy vertical 2D cards.
- The product direction for this task is an original soft blue-white archive-room visual baseline, not third-party asset ingestion.

## Requirements

- Replace the visible placeholder floor/edge look with original tiles suitable for a soft blue-white dorm/archive room.
- Keep the map authored as Tiled assets: `.tmj` plus one or more original tilesheets under `public/assets/realm/tiled/`.
- Keep the first visual scope to floor, room edge/depth, and low wall/boundary treatment.
- Preserve the existing `realm_hotspots` point object layer and location IDs.
- Preserve `RealmMapViewModel` as the source of dynamic locations, agents, selected state, and event pulses.
- Preserve current Tiled load failure behavior: visible procedural fallback plus explicit canvas and DOM diagnostics.
- Add a Tiled validation script or testable command that checks the map shape, required layers, required location anchors, tileset image references, and disabled/visible layer assumptions.
- Keep committed art original/procedural and document that no third-party game, Honkai, Blue Archive, ripped, MMD, or fan-port assets are included.

## Acceptance Criteria

- [x] `realm-room.tmj` still loads through the existing Pixi/Tiled pipeline.
- [x] The visible map uses an original soft blue-white floor and room boundary/low-wall treatment instead of the checkerboard placeholder look.
- [x] No noisy vertical 2D wall-card layer is visible in the normal map screenshot.
- [x] All seven required hotspot anchors remain present in `realm_hotspots`: `atrium`, `garden`, `lounge`, `archives`, `training-hall`, `quarters`, `overlook`.
- [x] Existing Pixi overlays still render selectable location labels, agents, and event pulses from `RealmMapViewModel`.
- [x] DOM/text fallback and Tiled failure diagnostics remain present.
- [x] A Tiled validation command exists and passes.
- [x] `npm run typecheck` passes.
- [x] `npm run build:ui` passes.
- [x] Browser smoke screenshot is recorded under this task's `research/previews/` directory and approved or explicitly reviewed.

## Out of Scope

- Furniture, tall props, beds, desks, bookshelves, or decorative clutter.
- Character sprite replacement.
- Multi-room or multi-map routing.
- Tiled object-property-driven interactions beyond existing point anchors.
- Third-party asset ingestion.
- Backend projection or simulation rule changes.

## Planning Decisions

- Primary target: original visual baseline.
- Implementation style: Tiled tileset-based.
- Visual scope: floor, edge/depth, and low walls only.
- Style: soft blue-white archive room with restrained gold accents.
- Validation emphasis: add a Tiled validation script/command in addition to screenshot and existing checks.

## Open Questions

None blocking planning. Implementation should start only after explicit approval to enter execution.
