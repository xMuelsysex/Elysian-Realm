# Reference Inspired Frontend Visual Polish MVP Implementation Plan

## Pre-Implementation Checklist

- [ ] Read task `prd.md`, `design.md`, and `research/reference-visual-polish.md`.
- [ ] Load frontend specs before editing:
  - `.trellis/spec/frontend/index.md`
  - `.trellis/spec/frontend/realm-interface.md`
  - `.trellis/spec/frontend/component-guidelines.md`
  - `.trellis/spec/frontend/state-management.md`
  - `.trellis/spec/frontend/type-safety.md`
  - `.trellis/spec/frontend/quality-guidelines.md`
- [ ] Confirm no backend or simulation-rule changes are needed.
- [ ] Confirm the chosen visual direction with the user before `task.py start`.

## Implementation Checklist

1. Add CSS theme tokens and baseline shell polish.
2. Polish dashboard tabs, page headings, panel surfaces, metrics, cards, badges, and focus states.
3. Polish `RealmMapPanel` presentation: board background, location/island cards, links, markers, bubbles, pulses, and mobile fallback.
4. Polish timeline/replay/status visual hierarchy while preserving all controls and debug details.
5. Polish agent dossier and LLM review form spacing/surfaces without changing submit behavior.
6. Add or update focused tests only if view-model/helper behavior changes.
7. Run validation commands.

## Validation Commands

```bash
npm run typecheck
npm test
npm run build
```

If `npm run build` is too broad for iteration, run `npm run build:ui` after typecheck/tests before final check.

## Review Gates

- [ ] Diff is frontend-focused and mostly presentation code.
- [ ] No new dependency, Canvas/WebGL/Pixi/Phaser, backend API, or simulation-state ownership is added.
- [ ] Provenance labels and operation errors remain visible.
- [ ] State-changing interactions still flow through existing typed admin input/API helpers.
- [ ] Responsive layout avoids horizontal overflow at narrow widths.
- [ ] Motion, if added, respects `prefers-reduced-motion`.

## Implementation Notes Completed 2026-06-09

- Applied the selected visual concept direction: glassy observatory command center plus cozy miniature realm board.
- Reworked the map tab layout into an observatory composition using existing components: event stream/world inspector left, central realm board plus replay controls, agent dossier/diagnostics right, topology/location fallback below.
- Added theme tokens, atmospheric surfaces, glow/elevation, stronger tab/header/card hierarchy, polished map board/markers/bubbles/pulses, and reduced-motion handling in `src/app/styles.css`.
- No backend, dependency, API, or view-model behavior changes were required.

## Validation Results 2026-06-09

```bash
npm run typecheck
npm run build:ui
npm test
npm run build
git diff --check
```

All commands passed.

## Concept Alignment Revision 2026-06-09

After comparing against `.image-gen/frontend-reference-inspired-visual-polish-concept.png`, tightened the implementation toward the generated image rather than only borrowing its palette:

- Combined `WorldHeader` and tabs into a top command-center frame.
- Made the map tab default to a selected agent so the right-side dossier resembles the concept image instead of an empty state.
- Reworked the map tab into the concept composition: left event stream/system overview, central observatory map stage with replay controls, right agent dossier/debug metrics.
- Styled the left event stream as compact icon-like event cards, the system overview as metric/sparkline cards, the right diagnostics as debug metric cards, and the map stage with observatory rings/crosshair treatment.
- Preserved the existing typed components and admin boundaries; no backend, dependency, or view-model behavior changes were introduced.

Validation after this revision:

```bash
npm run typecheck
npm run build:ui
npm test
git diff --check
```

All commands passed.

## Proportion Revision 2026-06-09

Adjusted the concept-alignment pass after the user noted the proportions were still off:

- Desktop observatory layout now uses a wider center stage with narrower left/right sidebars, closer to the reference image's 23/54/23 visual split.
- Replay panel is overlaid near the bottom of the central map stage instead of stacking as a separate tall block.
- Central map height uses viewport-aware clamps so the board dominates the page without forcing excessive vertical scroll on desktop.
- Support panels are visually demoted below the main observatory composition.

Validation after this revision:

```bash
npm run typecheck
npm run build:ui
npm test
git diff --check
```

All commands passed.

## Concept 1:1 Composition Revision 2026-06-09

After the user requested direct reconstruction from `.image-gen/frontend-reference-inspired-visual-polish-concept.png`, the map view was shifted from a generic inspired dashboard to a concept-composition match:

- The dashboard now opens on the map/observatory view by default for this visual MVP.
- Top command-center frame is split into left brand block, center icon-like tab rail, and right simulation status/tool cluster.
- Desktop map view uses fixed concept-style rows and columns: left sidebar, central map stage, right dossier/debug sidebar, and bottom replay timeline under the central stage.
- Support panels are hidden in the desktop concept composition to preserve the generated image's proportions; they remain available in non-concept tabs and responsive fallbacks.
- Replay controls are compressed into a bottom timeline bar with a central circular play control, matching the image's bottom panel role.
- Existing typed components, local replay state, event selection, agent selection, diagnostics, JSON/debug availability in other tabs, and admin command boundaries are preserved.

Validation after this revision:

```bash
npm run typecheck
npm run build:ui
npm test
git diff --check
```

All commands passed.
