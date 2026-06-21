# Realm Isometric Stage Implementation Notes

## Implemented MVP

- Added `src/app/realm/RealmIsometricStage.tsx` as a PixiJS v8 real scene MVP.
- Switched `RealmMapPanel` from `RealmPixiStage` to `RealmIsometricStage`.
- Kept `RealmPixiStage` in the repository as the rollback path.
- Preserved `RealmMapViewModel` as the only map data input.
- Preserved DOM/text fallback in `RealmMapPanel`.

## Current Visual Scope

The implementation is procedural and uses no external image assets:

- pastel 2.5D room shell;
- isometric wall planes;
- thick floor slab;
- floor tile grid;
- semantic location zones;
- single-layer location labels;
- chibi-like agent markers with ground shadows;
- event pulse rings.

## Avoided From Preview Review

- No center furniture block.
- No duplicate location label layer.
- No abstract polygon furniture as primary visual language.
- No Blue Archive or Honkai shipped assets.
- No third-party asset pack committed.

## Validation

- `npm run typecheck` passed.
- `npm run build:ui` passed with Vite chunk-size warning.
- `npm test` passed: 86 tests.
- Local smoke screenshot: `realm-isometric-stage-smoke.png`.
- Post-Kenney rollback smoke screenshot: `realm-isometric-stage-rollback-smoke.png`.

## Rollback

Change `RealmMapPanel.tsx` import and JSX back from `RealmIsometricStage` to `RealmPixiStage`. The old component was not deleted.
