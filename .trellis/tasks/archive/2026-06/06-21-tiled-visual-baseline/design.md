# Design: Tiled visual baseline polish

## Architecture Boundary

This task stays inside the existing frontend map rendering boundary:

```text
RealmMapViewModel -> RealmMapPanel -> RealmIsometricStage -> Pixi/Tiled static map + Pixi dynamic overlays
```

The static room base comes from Tiled files in `public/assets/realm/tiled/`. Dynamic locations, agents, selected state, and pulses continue to come from `RealmMapViewModel`.

## Visual Strategy

Use original/procedural Tiled tilesheets to replace the current pipeline placeholder floor with a coherent soft blue-white archive-room base.

The MVP visual vocabulary should include:

- soft blue-white floor tiles with subtle alternation and highlights;
- clear isometric room edge/depth treatment;
- low wall or boundary tiles that read as room perimeter without vertical clutter;
- restrained gold or cyan accent details;
- enough contrast for existing white location label boxes and chibi markers to remain readable.

Tall furniture and dense props are intentionally excluded because prior previews showed they can obscure hotspots and reduce map readability.

## Tiled Asset Shape

Keep the existing public asset root:

```text
public/assets/realm/tiled/
  README.md
  realm-room.tmj
  realm-floor-tiles.png
  realm-wall-tiles.png or replacement tilesheet(s)
```

The `.tmj` remains JSON-reviewable. The object layer remains named `realm_hotspots`, with point objects whose `name` matches the location IDs rendered by backend projections.

The noisy vertical wall placeholder can remain disabled as historical metadata or be replaced by a low-wall layer. The normal rendered state must not show the old vertical-card visual pattern.

## Runtime Rendering

`RealmIsometricStage` should continue to:

- fetch and parse the `.tmj`;
- load tileset textures through Pixi `Assets`;
- render the Tiled map as the static base;
- extract hotspot anchors from `realm_hotspots`;
- render location labels, agents, and pulses above the static map;
- show procedural fallback and diagnostics if Tiled loading fails.

If visual polish can be achieved by changing only `.tmj` and PNG tilesheets, prefer that over changing runtime code. Runtime changes are acceptable only to support low wall/edge readability or validation-visible diagnostics.

## Validation Design

Add a validation command that checks the Tiled map contract without opening the browser. The command should validate at least:

- `orientation === "isometric"`;
- map size is 10×8;
- expected tile size remains 76×38;
- required tile layers and `realm_hotspots` exist;
- all seven required anchors exist and are point objects;
- referenced tileset images exist under `public/assets/realm/tiled/`;
- the noisy vertical-card wall layer is not visible in the normal MVP state, unless replaced by a low-wall layer with documented intent.

A small TypeScript or Node script is acceptable. Prefer using project scripts or tests if that fits existing package conventions.

## Accessibility and Fallback

Canvas remains `aria-hidden`. `RealmMapPanel` DOM fallback continues to expose location and agent controls as text. Tiled loading failures continue to be shown both in the canvas and in DOM text.

## Rollback

Rollback should be possible by restoring:

- `public/assets/realm/tiled/realm-room.tmj`;
- the prior placeholder tilesheets;
- any changed validation script/package command;
- any minimal `RealmIsometricStage` changes.

The committed Tiled pipeline from `136ef0a` remains the baseline rollback point for the previous route-2 MVP.
