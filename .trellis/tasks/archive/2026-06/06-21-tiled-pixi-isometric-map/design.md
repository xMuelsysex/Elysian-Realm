# Tiled Pixi Isometric Map Design

## Architecture Boundary

The change stays inside the frontend map renderer boundary:

```text
backend/admin state -> shared view model -> RealmMapPanel -> RealmIsometricStage
                                                     |-> DOM/text fallback
```

`RealmMapPanel` remains the component boundary that receives `RealmMapViewModel` and callbacks. `RealmIsometricStage` can be refactored internally to load a Tiled map, but it must not own simulation rules or mutate backend state.

## Proposed Rendering Stack

- Use PixiJS v8 as the canvas renderer.
- Use `pixi-tiledmap` for parsing/rendering Tiled `.tmj` maps because it targets PixiJS v8 and supports isometric orientation.
- Store Tiled map files and selected assets under a public static path, likely `public/assets/realm/tiled/`.
- Keep dynamic overlays in code so backend projections continue to drive state:
  - location label/hotspot containers;
  - agent marker containers;
  - event pulse graphics;
  - selected state rings and pointer handlers.

## Data Flow

### Static map data

```text
Tiled .tmj + tilesets + images -> Pixi Assets + pixi-tiledmap -> map container
```

### Dynamic realm data

```text
RealmMapViewModel.locations -> location anchors -> Pixi location overlays
RealmMapViewModel.agents -> location anchors + offsets -> Pixi agent overlays
RealmMapViewModel.pulses -> location anchors -> Pixi pulse overlays
```

## Location Anchor Strategy

Preferred first implementation: use point objects on a Tiled object layer named `realm_hotspots`.

Each point object should include:

- `name`: realm location ID such as `atrium`, `garden`, `lounge`, `archives`, `training-hall`, `quarters`, `overlook`.
- optional custom properties for label offset or overlay depth if needed.

The point object is only the anchor. Pixi overlay containers remain responsible for visual hotspot shape, pointer hit area, labels, agent markers, and pulses. Fallback behavior for unknown locations should remain deterministic, similar to current procedural fallback positioning.

## Visual Scope

First Tiled MVP should prove the pipeline and keep the map readable:

- pipeline-first placeholder quality is acceptable;
- first tileset is original/procedural and intentionally small;
- single 10×8 isometric room matching the current procedural stage dimensions;
- floor and wall layers for the authored static base;
- seven known realm location anchors;
- light blue/white UI-compatible palette where possible;
- dynamic labels and agents remain visually dominant over static decorative tiles;
- no dense furniture cluster that blocks labels.

## Asset Policy

Safe assets:

- original/procedural placeholder tiles created for this project;
- original assets created for this project;
- CC0/public-domain assets with source notes;
- assets with explicit redistribution and modification permission.

Avoid for committed/product assets:

- Blue Archive or Honkai official images/models;
- ripped/extracted game resources;
- MMD model or scene ports;
- fan assets without redistribution permission;
- asset packs that forbid redistribution.

## Branching Notes

Tiled work should be implemented on a dedicated git branch. The current working tree already contains uncommitted procedural map work, and the user chose to organize that work into a clean baseline before creating the Tiled branch.

## Failure Behavior

If Tiled map loading fails, `RealmIsometricStage` should keep rendering the current procedural scene and expose a clear diagnostic error. The failure path must not blank the map, silently hide the Tiled problem, or switch to a second renderer at runtime.

The same load error state should drive two surfaces:

- a Pixi/canvas diagnostic overlay for visual smoke testing;
- a DOM text diagnostic for accessibility, because the canvas is `aria-hidden`.

## Compatibility Notes

- Preserve React StrictMode-safe Pixi initialization and teardown behavior from the current `RealmIsometricStage`.
- Keep canvas `aria-hidden="true"`; accessible controls remain in the DOM fallback.
- Keep `RealmPixiStage` in the repo as a deeper rollback path if still present.
- Keep procedural `RealmIsometricStage` logic recoverable until the Tiled renderer proves stable.

## Rollback Strategy

Two rollback levels:

1. Revert `RealmIsometricStage` internals to the current procedural room renderer.
2. Switch `RealmMapPanel` back to `RealmPixiStage` if a complete map renderer rollback is needed.

## Main Risks

- Asset style mismatch can make the map look worse than the procedural version.
- Tiled file paths can break under Vite if relative image/tileset paths are not planned.
- Object-layer coordinates may need conversion/scaling to match overlay placement.
- Depth sorting can become complex if static furniture and dynamic agents need occlusion.

## Current Recommendation

For implementation reliability, start with a 10×8 original/procedural Tiled room that proves the map loader, object anchors, and dynamic overlay behavior. Treat third-party/CC0 art replacement and visual polish as later passes after the Tiled pipeline is stable.
