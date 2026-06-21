# Implement Tiled Pixi Isometric Map

## Goal

Implement route 2: replace the current procedural 2.5D map background with a Tiled-authored isometric room/map rendered through PixiJS, while keeping the existing backend-owned `RealmMapViewModel` and accessible DOM fallback.

## User Value

- Make the realm map area feel like a real authored 2.5D room/map instead of a purely procedural sketch.
- Establish a maintainable Tiled map pipeline for future room layout iteration.
- Preserve the current admin dashboard interactions: location selection, agent selection, event pulses, and text fallback.

## Confirmed Facts

- Current frontend stack is React 19, TypeScript, Vite, and PixiJS 8.19.0.
- `src/app/realm/RealmMapPanel.tsx` renders `RealmIsometricStage` and keeps DOM/text fallback controls after the canvas.
- `src/app/realm/RealmIsometricStage.tsx` already owns a Pixi v8 `Application` lifecycle and renders a procedural 2.5D scene from `RealmMapViewModel`.
- `RealmMapViewModel` remains the source for locations, agents, event pulses, selected IDs, labels, and summary text.
- Frontend spec requires rendering backend projections and forbids moving simulation rules into components.
- Prior research identified `riebel/pixi-tiledmap` as the best PixiJS v8 Tiled renderer candidate.

## Decisions

- First implementation uses a pipeline-first placeholder visual baseline: prove Tiled loading, object-layer anchors, Pixi overlays, and rollback before investing in final art polish.
- Tiled work must happen on a dedicated git branch separate from `main`.
- Before creating the Tiled branch, the existing procedural map work in the current dirty working tree must be organized into a clean baseline.
- Clean baseline policy: commit only the product procedural map baseline; keep Trellis artifacts, generated screenshots, image-gen outputs, and local knowledge files uncommitted.
- Tiled MVP map format is `.tmj` so object layers and anchors stay JSON-reviewable and easy to load from Vite public assets.
- First Tiled MVP uses a small original/procedural tileset created for this project; third-party/CC0 art replacement is deferred until the pipeline is proven.
- First Tiled map is a single 10×8 isometric room, matching the current procedural `RealmIsometricStage` room dimensions.
- Location anchors use point objects on a Tiled object layer named `realm_hotspots`; each object `name` matches a realm location ID.
- Tiled rendering uses `pixi-tiledmap` to validate the real Tiled-to-Pixi pipeline instead of hand-written tile-layer parsing.
- If Tiled map loading fails, the UI shows the current procedural `RealmIsometricStage` scene plus an explicit error message instead of blanking or silently falling back.
- Tiled load errors must be visible both inside the Pixi canvas for visual debugging and in DOM text for accessibility because the canvas is `aria-hidden`.

## Requirements

- Use a Tiled-authored isometric map as the visual base for the realm map.
- Keep `RealmMapViewModel` as the single dynamic data source for map locations, agents, selection, and pulses.
- Keep `RealmMapPanel` DOM/text fallback accessible and functionally unchanged.
- Render dynamic Pixi overlays above the Tiled map: location hotspots, labels, agent markers, selection state, and event pulses.
- Define a stable mapping from known realm location IDs to Tiled object-layer anchors or equivalent map coordinates.
- Keep rollback to the existing procedural `RealmIsometricStage` practical and documented.
- Commit only assets that are safe for a public repository: first-pass original/procedural tiles, later CC0 assets, or assets with explicit redistribution permission.
- Avoid Blue Archive, Honkai, ripped game assets, official MMD assets, and fan ports as shippable resources.

## Acceptance Criteria

- [x] A Tiled map asset exists in the repo and can be loaded by the UI without network-only external dependencies.
- [x] The map renders in PixiJS v8 inside the current realm map panel.
- [x] The UI still renders all current `RealmMapViewModel.locations` as selectable map hotspots.
- [x] Agent markers and event pulses still render and update from `RealmMapViewModel`.
- [x] DOM/text fallback remains present after the canvas and keeps location/agent controls accessible.
- [x] Asset credits/license notes are included for any committed third-party assets.
- [x] `npm run typecheck` passes.
- [x] `npm run build:ui` passes.
- [x] A browser smoke screenshot is recorded under this task's `research/previews/` directory.

## Out Of Scope For First Implementation

- Tiled-based pathfinding or agent movement animation.
- User-editable maps inside the app.
- Multi-room navigation.
- Full furniture interaction.
- Three.js/React Three Fiber integration.
- Phaser integration.
- Copying or bundling proprietary game art.

## Open Product Questions

None before branch creation. The user chose to commit only the product procedural map baseline and keep Trellis/generated/local knowledge files uncommitted.
