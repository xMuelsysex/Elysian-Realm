# Tiled visual baseline implementation notes

## Implemented Scope

- Added `npm run validate:tiled-map` through `scripts/validate-realm-tiled-map.mjs`.
- Replaced the first-pass checker/placeholder tilesheets with original soft blue-white floor and low-boundary tiles.
- Updated `realm-room.tmj` to use the new floor palette and keep the `low_walls` contract layer as an empty non-bumpy boundary layer.
- Preserved `realm_hotspots` point anchors for all seven location IDs.
- Kept dynamic Pixi overlays for locations, agents, and event pulses from `RealmMapViewModel`.
- Kept Tiled load failure behavior: procedural fallback plus canvas and DOM diagnostics.
- Adjusted the Pixi Tiled-stage shell to use the actual Tiled tile footprint for back walls and slab geometry, with a subtle contact shadow to avoid a floating-platform read.

## User Review

Approved screenshot:

- `tiled-visual-baseline-smoke-no-bumps.png`

Earlier rejected screenshots documented useful constraints:

- avoid black/white tile artifacts from SVG/ImageMagick conversion;
- avoid dense X/bar tile decoration;
- avoid Tiled/Pixi footprint mismatch;
- avoid raised low-wall tiles that read as bumps;
- keep the original back-wall room read.

## Validation

- `npm run validate:tiled-map` passed.
- `npm run typecheck` passed.
- `npm run build:ui` passed with the existing Vite chunk-size warning.
- Browser smoke confirmed:
  - `/assets/realm/tiled/realm-room.tmj` returned 200;
  - `/assets/realm/tiled/realm-floor-tiles.png` returned 200;
  - `/assets/realm/tiled/realm-wall-tiles.png` returned 200;
  - console had only `favicon.ico` 404 and WebGL ReadPixels warnings from screenshot capture.
- Failure-path smoke intercepted `/assets/realm/tiled/realm-room.tmj`; DOM diagnostic appeared with fallback wording, then disappeared after reloading with the asset available.

## Asset Notes

The committed Tiled PNG assets are original/procedural project assets. No third-party game, Honkai, Blue Archive, ripped, MMD, or fan-port assets are included.

## Rollback

- Restore `public/assets/realm/tiled/realm-room.tmj` and PNG tilesheets from commit `136ef0a`.
- Remove `scripts/validate-realm-tiled-map.mjs` and the `validate:tiled-map` npm script if the validation command is rolled back.
- Restore the Tiled shell geometry in `src/app/realm/RealmIsometricStage.tsx` from commit `136ef0a` if runtime alignment changes need reverting.
