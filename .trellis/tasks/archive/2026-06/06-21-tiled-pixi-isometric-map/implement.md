# Tiled Pixi Isometric Map Implementation Plan

## Preconditions

- Stay in planning until the user approves this plan.
- Before coding, load `trellis-before-dev` and re-read relevant frontend specs.
- Organize the existing procedural map working-tree changes into a clean product baseline before creating the Tiled branch; do not commit Trellis artifacts, generated screenshots, image-gen outputs, or local knowledge files as part of that baseline.
- Create or switch to a dedicated Tiled implementation branch before modifying implementation files.
- Do not start implementation with `task.py start` until PRD/design/implementation plan are reviewed.

## Implementation Checklist

1. Add Tiled renderer dependency
   - Use `pixi-tiledmap` as the Tiled renderer.
   - Confirm package version, import/API, and PixiJS v8 compatibility with docs or installed types before wiring it into `RealmIsometricStage`.

2. Add minimal Tiled asset directory
   - Create a public static asset directory for the MVP map.
   - Add a 10×8 single-room `.tmj` isometric map.
   - Add a small original/procedural placeholder tileset created for this project.
   - Keep third-party/CC0 asset replacement out of the first implementation.

3. Build map loading boundary
   - Add a typed map manifest for asset paths and source metadata.
   - Load map assets during Pixi initialization.
   - Surface load failures clearly while preserving the current procedural scene as the visible fallback.
   - Show the same load error in both a Pixi diagnostic overlay and accessible DOM text.

4. Refactor `RealmIsometricStage`
   - Keep existing Pixi lifecycle and resize behavior.
   - Render Tiled map base layer/container.
   - Render current dynamic location, agent, and pulse overlays above the map.
   - Keep selection callbacks unchanged.

5. Implement location anchors
   - Read point-object anchors from the `realm_hotspots` Tiled object layer if available.
   - Map object names to `RealmMapLocationNode.id`.
   - Keep Pixi overlay hit areas independent from Tiled point objects.
   - Provide deterministic fallback anchors for unknown locations.

6. Validate interaction and accessibility
   - Confirm location selection and agent selection still work.
   - Confirm DOM/text fallback remains in `RealmMapPanel`.
   - Confirm no backend or view-model contract changes are introduced.

7. Record smoke evidence
   - Run typecheck and UI build.
   - Run a browser smoke test.
   - Capture a screenshot under `research/previews/`.
   - Document rollback steps and asset license notes.

## Validation Commands

```bash
npm run typecheck
npm run build:ui
npm test
```

Browser smoke:

```bash
npm run dev:api
npm run dev:ui
# open http://127.0.0.1:5173/ and capture the realm map panel
```

## Risky Files / Rollback Points

- `src/app/realm/RealmIsometricStage.tsx`: primary renderer refactor.
- `src/app/realm/RealmMapPanel.tsx`: should only change if renderer component name changes.
- `public/assets/realm/tiled/`: new static map and asset files.
- `package.json` / `package-lock.json`: dependency additions.

Rollback:

- Remove Tiled dependency and static assets.
- Restore `RealmIsometricStage.tsx` to the current procedural renderer.
- If needed, switch `RealmMapPanel.tsx` back to `RealmPixiStage`.

## Review Gates Before Implementation

- Product procedural map baseline commit exists before branch creation; Trellis/generated/local files remain uncommitted.
- User accepts Tiled map files and original/procedural placeholder tiles being committed.
- User accepts that first pass excludes pathfinding, movement animation, and in-app map editing.
