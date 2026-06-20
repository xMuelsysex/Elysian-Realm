# Implementation Plan: Reference Exact Reconstruction MVP

## Phase 0: Setup

- [ ] Read frontend specs via `trellis-before-dev`.
- [ ] Confirm active branch is `feature/reference-exact-reconstruction-mvp`.
- [ ] Start the task with `task.py start frontend-reference-exact-reconstruction-mvp` only after planning review.

## Phase 1: Reference Analysis

- [ ] Capture current app at `1600 × 1000`.
- [ ] Compare against `.image-gen/frontend-reference-inspired-visual-polish-concept.png` as a `1024 × 1024` reference stage.
- [ ] Record a component-by-component target map in stage coordinates: top bar, left rail, center board, right rail, bottom replay.
- [ ] Review `research/unity-urp-prototype-plan.md` and `research/unity-csharp-api-design.md` before generating Unity C# files.

## Phase 2: Central Board Reconstruction

- [ ] Add or refactor a scale-to-fit `1024 × 1024` stage shell for the map tab.
- [ ] Prototype the standalone Unity URP center-stage scene according to `research/unity-urp-prototype-plan.md` and `research/unity-csharp-api-design.md`, loading `Assets/QA/stage-snapshot.example.json` to drive star dome, floating islands, emissive bridges, beacon effects, particles, waterfalls, and stage coordinates.
- [ ] Preserve existing location and agent interactions as live semantic DOM controls or mirrored accessible controls when Unity owns pointer hit areas.
- [ ] Keep text fallback and provenance/debug data available.

## Phase 3: Rails and Timeline Density

- [ ] Tighten top command bar icon composition.
- [ ] Restyle left event stream and system overview as reference-like telemetry cards.
- [ ] Restyle right dossier/debug rail with avatar, status bars, chips, and compact metric cards.
- [ ] Ensure side rails can scroll internally where density exceeds the fixed viewport.

## Phase 4: Responsive Fallback

- [ ] Verify `1280`, `980`, and `560` widths.
- [ ] Keep no document-level horizontal overflow.
- [ ] Preserve critical controls: language toggle, tabs, map, replay, selected agent dossier, event timeline.

## Phase 5: QA and Validation

- [ ] Save before/final screenshots in `research/`, including the scaled `1024 × 1024` stage inside the `1600 × 1000` browser viewport.
- [ ] Use the Unity Editor capture script to save the final `1024 × 1024` prototype screenshot.
- [ ] Record browser/Unity findings in `research/reference-exact-reconstruction-qa.md`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check`.
- [ ] Run `python3 ./.trellis/scripts/task.py validate frontend-reference-exact-reconstruction-mvp`.

## Rollback Plan

- Keep the reconstruction as a scoped center-stage module around existing typed projections.
- If Unity scope becomes too large, fallback to PixiJS, SVG/CSS, or a static decorative `1024 × 1024` board background with live markers layered above it.
- If visual density harms accessibility, keep exact layout only at `1600 × 1000` and use the previous responsive layout below that breakpoint.
