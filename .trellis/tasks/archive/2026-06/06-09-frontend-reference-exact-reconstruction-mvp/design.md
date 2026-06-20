# Design: Reference Exact Reconstruction MVP

## Design Intent

The reference image is closer to a composed sci-fi illustration than a normal dashboard skin. The MVP should therefore add an explicit visual composition layer while keeping the existing React/admin data model intact.

The selected approach is a portable `1024 × 1024` reference stage. The web UI scales this square stage to fit the available viewport today; a future Electron/Tauri or native desktop shell can reuse the same coordinates and assets.

## Boundaries

### Keep

- `src/app/shared/viewModels.ts` as the single projection source for frontend display data.
- Existing admin API and command submission flow.
- Existing panels and accessibility semantics where possible.
- CSS/SVG-first implementation unless a scoped center-stage renderer or Unity center-stage module is approved.
- A stage coordinate model based on the reference image's `1024 × 1024` dimensions.

### Change

- Replace the current central rectangular map styling with an illustrated `1024 × 1024` command-center stage.
- Add CSS/SVG decorative layers for star dome, floating islands, bridges, beacons, glass rails, and telemetry motifs.
- Add component-level wrapper hooks/classes only if CSS cannot target the needed regions cleanly.
- Add browser QA artifacts for exact-reference comparison.

## Proposed Implementation Shape

### 1. Reference Stage Layer

Use a new visual shell around `RealmMapPanel` or inside it:

- Star dome background layer.
- Central floating realm platform layer.
- Location/island nodes using CSS/SVG shapes rather than plain cards.
- Bridge/link layer that uses existing `RealmMapViewModel.links` data.
- Agent beacon layer using existing agent marker data.

Preferred path after preview review: a hybrid center-stage renderer if approved, with React DOM still owning the shell, side rails, forms, and accessible controls. Positions should be expressed in the `1024 × 1024` stage coordinate system or normalized percentages derived from it, not ad-hoc viewport offsets.

Renderer candidate now under review: Unity URP as a center-stage module. Unity can render the floating islands, bridges, particles, waterfalls, bloom, camera, and post-processing much closer to the reference image than CSS/SVG or PixiJS. The React app should still own data fetching, text panels, command forms, provenance labels, and debug diagnostics; Unity should receive a display-only stage snapshot derived from existing view models.

Selected delivery path:

- Build a standalone Unity URP center-stage prototype for visual validation first.
- Follow `research/unity-urp-prototype-plan.md` for module layout, scene layers, data contract, milestones, and review gates.
- Defer Unity WebGL embedding until the prototype proves the floating-island scene can match the reference closely enough.
- Keep any future React integration behind a narrow bridge where React passes a display-only stage snapshot to Unity.

Fallback path: use SVG/CSS, PixiJS, or a generated/reference-like PNG/SVG board asset as a decorative background, then position live interactive markers on top.

### 2. Compact Rail Components

Keep existing timeline, world inspector, agent dossier, and diagnostics components, but add reference-specific CSS classes and wrappers to:

- Render left event stream as compact stacked telemetry cards.
- Render system overview as metric widgets with sparklines and a stability ring.
- Render right dossier as avatar, status bars, trait chips, provenance graph, objective/effects, and debug metrics.
- Preserve text details in collapsible/scrollable sections.

### 3. Fixed Desktop First

The exact reconstruction target is the `1024 × 1024` stage rendered inside a `1600 × 1000` browser viewport:

- Scale the stage with `scale = min(containerWidth / 1024, containerHeight / 1024)` or CSS equivalent.
- Center the stage in the browser viewport and allow surrounding safe-area background where the viewport is not square.
- Prefer explicit stage coordinates for reference-critical elements.
- Avoid hiding required data entirely; collapse into scrollable internal areas when density is high.
- Treat `1280`, `980`, and `560` as responsive fallback checks for reachability, not pixel-exact targets.

### 4. Visual QA

Record screenshots in `research/` for:

- Reference image.
- Current before screenshot at `1600 × 1000`.
- Final screenshot at `1600 × 1000`.
- Responsive smoke screenshots at `1280`, `980`, `560`.

If a script is added, it should be lightweight and local-only. It should not require network access beyond the local dev server.

## Data Flow

```text
Admin API -> shared typed view models -> existing React components -> stage display snapshot -> Unity/Pixi/SVG center-stage renderer
```

No simulation facts should be derived from layout code.

## Desktop Portability

The stage should be portable to future desktop shells:

- Keep reference-critical visual positions in stage-relative coordinates.
- Keep assets under repository paths that can be bundled by Vite and later by Electron/Tauri, or under a clearly scoped Unity project/module if Unity is selected.
- Avoid browser-window-specific assumptions for the central composition beyond the scale-to-fit wrapper.
- Keep live controls as semantic DOM today; if a native renderer is introduced later, the same coordinate map should be reusable.

## Accessibility

- Decorative layers must use `aria-hidden="true"`.
- Interactive markers keep button semantics and labels.
- Icon-only controls must preserve accessible names.
- Text labels for status/provenance remain visible or available in details.

## Risks

- True pixel-perfect output is not feasible with purely live DOM and dynamic data unless content and viewport are frozen.
- Static background assets can look exact but may drift from live data positions.
- CSS/SVG-only island illustration may take longer but remains more maintainable.
- Large screenshot assets can bloat task commits; only keep before/final and essential references.
- Renderer dependencies can increase bundle size and testing complexity; keep any engine scoped to a single center-stage component.
- Unity WebGL may produce a large build and requires an asset/build pipeline separate from normal Vite frontend validation.

## Review Gate

Before implementation starts, decide:

1. Which minimal Unity project/module layout should hold the standalone URP prototype.
2. Which stage data contract React will eventually pass to Unity and how Unity exposes selected-agent/location events back to React.
3. Which decorative pieces become Unity layers versus React/CSS/DOM overlays.
4. Whether to add a reusable visual smoke script in this task.
5. Which live data should appear in the exact stage and which diagnostics may move to scrollable details.
