# Reference Exact Reconstruction MVP

## Goal

Reconstruct the local observatory frontend to match the generated reference image as closely as possible, starting with a fixed desktop viewport and explicit visual regression criteria.

## Reference Image

- Source image: `.image-gen/frontend-reference-inspired-visual-polish-concept.png`
- Source image dimensions: `1024 × 1024`
- Reference coordinate system: `1024 × 1024` portable stage
- Target first-pass browser viewport: `1600 × 1000`, rendering the square stage centered and automatically scaled to fit
- Secondary responsive smoke widths: `1280`, `980`, `560`

## Problem

The current observatory UI is stylistically inspired by the reference, but it is still DOM-card based: the central map uses location cards, the side rails use existing panels, and the top bar uses text-hidden icon tabs. The reference image contains a cinematic sci-fi command center with a star dome, floating islands, glowing bridges, circular agent beacons, dense iconography, and dashboard widgets that cannot be replicated exactly with the current card-only CSS approach.

## Requirements

- Reconstruct the default observatory/map page around a `1024 × 1024` reference stage that automatically scales to fit the available browser viewport.
- Preserve backend-owned simulation state and typed frontend view-model boundaries.
- Keep all existing user-facing data available: timeline, world status, selected agent dossier, replay controls, diagnostics, and map occupancy/provenance.
- Use real backend-projected data in the reference stage; QA may reset to the deterministic seed for stable screenshots, but the task should not add a frozen/demo data mode.
- Add a reference-like central realm board using an SVG/CSS stage, image-backed stage, lightweight 2D renderer, or reviewed Unity-rendered center stage; if a rendering dependency/engine is added, it must be scoped to the center `1024 × 1024` stage and preserve the React/admin shell boundary.
- Keep keyboard-accessible controls and textual provenance labels; decorative iconography must not replace required text-only diagnostics.
- Add a lightweight visual smoke mechanism or documented manual QA that compares the fixed desktop output to the reference and verifies responsive fallback widths.

## Non-Goals

- No heavy game engine across the whole app. Unity is approved only as a center-stage candidate under review and must not replace React DOM side rails/forms, typed command forms, or textual diagnostics.
- No backend simulation rule changes.
- No fake success, hidden provider fallback, frozen demo state, or mutation of simulation state from the UI.
- No requirement for true pixel-perfect identity across all viewport sizes; exactness is scoped to the `1024 × 1024` reference stage rendered inside the desktop viewport.
- No large dependency or Unity project addition without explicit implementation review; any renderer/engine path must have a clear rollback path to SVG/CSS or image-backed stage.

## Acceptance Criteria

- [ ] The `1600 × 1000` observatory screenshot clearly shows a centered, auto-scaled `1024 × 1024` stage that matches the reference composition: top command bar, left event stream/system rail, central star-dome/floating-realm board, right dossier/debug rail, and bottom replay timeline.
- [ ] The central board no longer looks like plain rectangular DOM cards; it includes a reference-like illustrated realm surface, connecting paths/bridges, agent beacons, and glow layers.
- [ ] The left and right rails use compact reference-like cards, icons, progress/sparkline motifs, and remain readable at the target viewport.
- [ ] Existing data provenance and debug information remain visible as text somewhere in the UI.
- [ ] Responsive widths `1280`, `980`, and `560` have no document-level horizontal overflow and keep critical controls reachable.
- [ ] Validation passes: `npm run typecheck`, `npm test`, `npm run build`, `git diff --check`, and `task.py validate frontend-reference-exact-reconstruction-mvp`.
- [ ] Browser QA screenshots are recorded under this task's `research/` directory.

## Open Questions

- Confirmed direction: use a portable `1024 × 1024` reference coordinate system that can later be reused by a desktop shell.
- Confirmed direction: use a portable stage with live backend data. SVG/CSS and PixiJS-style prototypes looked insufficient; the user selected Unity for a standalone URP center-stage visual prototype first, before any WebGL embed decision.
- Should visual regression be manual QA only for this task, or should this task add a reusable script for future tasks?
