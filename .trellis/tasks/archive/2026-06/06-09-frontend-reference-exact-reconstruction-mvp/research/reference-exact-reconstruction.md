# Reference Exact Reconstruction Research

## User Intent

The user asked whether the frontend can completely replicate this generated reference image:

`\\wsl.localhost\Ubuntu-24.04\code\github\Elysian-Realm\.image-gen\frontend-reference-inspired-visual-polish-concept.png`

They clarified that the goal is complete replication, not merely inspiration.

## Technical Reality

A truly identical UI requires one of these approaches:

1. Use the reference image as a full-screen background and overlay transparent/live hotspots. This is visually closest but least maintainable as a real UI.
2. Split/recreate the reference image into reusable assets and layer live UI on top. This is high fidelity and still maintainable.
3. Build a custom rendering layer with SVG/Canvas/WebGL and visual regression tests. This is most flexible but higher scope.

For this project, the confirmed invariant is a `1024 × 1024` portable reference stage with live backend data and React-owned diagnostics/provenance. SVG/CSS and PixiJS-style prototypes were judged too simple by the user, and the user selected a standalone Unity URP center-stage visual prototype as the next direction before any WebGL embed decision. A static decorative board image may be used only as a fallback/reference layer.

## What Must Be Added For Exactness

- A fixed reference coordinate system (`1024 × 1024`) scaled into the browser viewport.
- A browser QA target viewport (`1600 × 1000` first).
- A visual composition layer for the central board.
- Asset or SVG treatment for star dome, floating islands, bridges, beacons, icon rails, telemetry panels, and glow effects.
- Reference screenshots and browser QA artifacts.
- Optional visual smoke script for screenshot capture and overflow checks.

## Constraints From Frontend Specs

- Backend projections remain source of truth.
- Components must not reimplement simulation rules.
- Provenance and operation/debug failures must remain visible.
- Replay uses persisted events/snapshots, not live model calls.
- User interventions remain typed commands.

## Rendering Options After Review

The first SVG/CSS-only preview looked too simple compared with the reference. More capable options:

### PixiJS / @pixi/react

- Best fit for a rich 2D stage with sprites, particles, glow filters, bridges, animated beacons, and layered island art.
- AI Town-style projects commonly use React UI plus PixiJS for the simulation world renderer.
- Keeps DOM side rails and controls in React while rendering only the `1024 × 1024` center/reference stage in canvas.
- Good future desktop portability through Electron/Tauri because the same canvas renderer can be embedded in a desktop shell.

### Phaser 3

- Strong for game-like scenes, maps, cameras, input, and sprite animation.
- Heavier and more game-framework-shaped than this MVP needs because the project does not need pathfinding, physics, scenes, or tile maps yet.
- Better if the product direction becomes a true interactive game world.

### Rive

- Excellent for polished vector animation and state-machine-driven HUD elements.
- Not ideal for dynamically placing many live backend-projected islands, links, and agent markers unless custom `.riv` assets are authored.

### Unity URP

- Best fit if the goal is to approach the reference as a real 2.5D/3D scene rather than a flat web illustration.
- Can handle floating-island meshes, emissive bridge materials, particles, waterfalls, camera framing, bloom, and post-processing.
- Strong future desktop path and can also export WebGL, but WebGL bundle size and React integration complexity are higher than PixiJS.
- Should be scoped to a center-stage module that receives display-only data from React/backend projections.

### Image-backed Stage

- Fastest way to look close to the generated reference: use the reference or generated derivative as a background, then overlay live DOM/canvas markers.
- Weakest for live data integrity because background islands/bridges can drift from actual live marker positions.

## Updated Recommended Direction

Evaluate Unity as a standalone URP center-stage prototype first:

- Keep the full dashboard shell, side rails, provenance text, replay controls, and forms in React DOM.
- Use Unity first as a standalone center-stage prototype for the `1024 × 1024` visual composition; defer WebGL embedding until the scene direction is validated.
- Feed any future Unity integration a display-only stage snapshot derived from existing typed `RealmMapViewModel` data: locations, links, markers, pulses.
- Use Unity layers/assets for star dome, island meshes, emissive bridges, particles, waterfall effects, bloom, and beacon animation.
- Keep live DOM controls or accessible mirrored controls for keyboard selection and provenance text.
- Use responsive fallback below the exact stage breakpoint.
- Add QA notes and screenshots under this task.
