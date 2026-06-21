# Implementation Plan: Tiled visual baseline polish

## Preconditions

- Stay on the current route-2 feature branch unless the user requests a new branch.
- Do not start implementation until the user explicitly approves entering execution.
- Keep Trellis artifacts local unless the user asks to commit them.

## Checklist

1. Load development context
   - Read this task's `prd.md`, `design.md`, and current frontend specs.
   - Inspect the current `realm-room.tmj`, tilesheets, and `RealmIsometricStage` render path.

2. Add Tiled validation command
   - Add a focused script or test command for the `.tmj` contract.
   - Validate map orientation, dimensions, tile size, expected layers, hotspot anchors, and tileset image existence.
   - Wire it into an npm script if appropriate.

3. Create original visual tiles
   - Generate or author replacement original/procedural tilesheets for soft blue-white floor, edge/depth, and low-wall/boundary treatment.
   - Keep assets under `public/assets/realm/tiled/`.
   - Update `README.md` with source and scope notes.

4. Update Tiled map
   - Update `realm-room.tmj` tile layers to use the new tiles.
   - Keep `realm_hotspots` point anchors intact.
   - Keep noisy vertical wall cards hidden or replace them with a low-wall layer.

5. Runtime adjustment only if needed
   - Prefer asset/Tiled changes first.
   - If necessary, minimally adjust `RealmIsometricStage` so the Tiled room edge and existing overlays compose cleanly.
   - Keep load failure diagnostics unchanged.

6. Validate
   - Run the new Tiled validation command.
   - Run `npm run typecheck`.
   - Run `npm run build:ui`.
   - Run browser smoke and save a screenshot under `.trellis/tasks/06-21-tiled-visual-baseline/research/previews/`.
   - Confirm `.tmj` and tilesheet requests return 200.

7. Document evidence
   - Add implementation notes under this task's `research/previews/` or `research/` directory.
   - Record screenshot path, validation commands, and rollback steps.

## Risk Points

- Visual polish can regress readability if tile contrast competes with location labels.
- Low-wall tiles can recreate the previous vertical-card issue if they are too tall or repeated too densely.
- Tiled coordinate anchors must stay stable so dynamic overlays keep matching the map.
- Adding validation should stay focused on the map contract and avoid broad build-system churn.

## Rollback Points

- Before changing `realm-room.tmj`.
- Before replacing existing tilesheets.
- Before any runtime code changes in `RealmIsometricStage`.

## Completion Gate

Planning is ready when `prd.md`, `design.md`, and `implement.md` are reviewed and the user explicitly says to enter implementation.
