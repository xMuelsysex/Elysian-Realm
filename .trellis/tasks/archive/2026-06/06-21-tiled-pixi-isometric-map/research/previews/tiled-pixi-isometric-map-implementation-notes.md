# Tiled Pixi Isometric Map Implementation Notes

## Implemented Scope

- Added a first-pass Tiled pipeline MVP using `pixi-tiledmap` and PixiJS v8.
- Added `public/assets/realm/tiled/realm-room.tmj` as a 10×8 isometric map.
- Added original/procedural placeholder tilesheets:
  - `realm-floor-tiles.png`
  - `realm-wall-tiles.png`
- Added Tiled point anchors on object layer `realm_hotspots`; object names match realm location IDs.
- Kept `RealmMapViewModel` as the dynamic source for locations, agents, selected state, and pulses.
- Kept procedural room rendering as the visible fallback if the Tiled map fails to load.
- Added dual diagnostics for Tiled load errors:
  - Pixi/canvas overlay for visual debugging;
  - DOM text status in `RealmMapPanel` for accessibility.

## Asset Notes

The first-pass tiles are original/procedural placeholders created for this project. No third-party game, Blue Archive, Honkai, ripped, MMD, or fan-port assets are included.

## Validation

- `npm run typecheck` passed.
- `npm run build:ui` passed with the existing Vite chunk-size warning.
- `npm test` passed: 86 tests.
- Browser smoke confirmed:
  - `/assets/realm/tiled/realm-room.tmj` returned 200;
  - `/assets/realm/tiled/realm-floor-tiles.png` returned 200;
  - `/assets/realm/tiled/realm-wall-tiles.png` returned 200;
  - console had only `favicon.ico` 404 and WebGL ReadPixels performance warnings.
- Failure-path smoke intercepted `/assets/realm/tiled/realm-room.tmj`; DOM diagnostic appeared with fallback wording, then disappeared after reloading with the asset available.

## Smoke Evidence

- Initial screenshot: `tiled-pixi-isometric-map-smoke.png`
- Clean screenshot after disabling noisy placeholder wall layer: `tiled-pixi-isometric-map-smoke-clean.png`

## Visual Adjustment

The first Tiled wall placeholder layer created many vertical 2D cards that looked like clutter. The layer remains in the `.tmj` as disabled placeholder metadata, while the current MVP renders the Tiled floor layer plus a light Pixi-drawn room edge for depth.

## Rollback

- Remove `pixi-tiledmap` from `package.json` / `package-lock.json`.
- Remove `public/assets/realm/tiled/`.
- Remove `src/app/realm/realmTiledMapAssets.ts`.
- Restore `src/app/realm/RealmIsometricStage.tsx` to the procedural-only renderer from baseline commit `7bff97a`.
- Remove the DOM diagnostic state/styling from `RealmMapPanel.tsx` and `styles.css`.
