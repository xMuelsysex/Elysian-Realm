# Reference Inspired Frontend Visual Polish MVP

## Goal

Improve the visual quality and perceived product polish of the existing local Elysian Realm frontend by borrowing presentation patterns from similar multi-agent simulation projects, while preserving the current backend-owned simulation boundary and the recently completed UX controls.

## User Value

- Make the realm feel more like a living multi-agent world instead of a generic dark admin dashboard.
- Keep debugging and review workflows readable for the developer while making the default experience more atmospheric and easier to scan.
- Build on the existing AI Town / ALICE / OpenStory-inspired UX without introducing a new rendering engine or second simulation state.

## Confirmed Facts

- Current UI is a Vite + React dashboard under `src/app/**` with CSS in `src/app/styles.css`.
- The previous task already implemented the first MVP layer: CSS-based realm map, replay controls, agent dossier, and structured LLM proposal review.
- Existing specs require backend projections, typed view models, explicit provenance, visible errors, keyboard-accessible controls, and no direct `WorldSnapshot` mutation from the frontend.
- Prior research identified borrowable ideas:
  - AI Town: cozy map atmosphere, character markers, speech/activity bubbles, occupancy clustering.
  - ALICE / Generative Agents reproductions: replay-first controls and event/time cursor clarity.
  - OpenStory: character dossier presentation and story-readable status panels.
- Current visual style is functional but still admin-heavy: flat dark panels, dense grids, limited atmospheric layering, and limited visual hierarchy across map / timeline / dossier views.

## Requirements

1. Add a cohesive visual theme layer for the local realm dashboard using design tokens, atmospheric surfaces, and consistent depth/spacing.
2. Improve the map tab presentation so it feels more like a miniature realm board while staying CSS/DOM-based and driven by `RealmMapViewModel`.
3. Improve dashboard scanability with stronger hierarchy for page headers, panels, timeline/replay status, and selected states.
4. Improve agent dossier visual storytelling without blending configured persona facts, generated/runtime memory, user input, or system diagnostics.
5. Preserve all existing typed admin interactions, replay behavior, LLM proposal review behavior, diagnostics, errors, empty states, and accessibility affordances.
6. Keep changes frontend-only unless an existing typed view model needs a small presentation-only derived field.

## Acceptance Criteria

- [ ] The dashboard has a cohesive reference-inspired visual style with reusable CSS tokens for surfaces, borders, glow/elevation, typography scale, and realm accent colors.
- [ ] Map tab receives the strongest polish: atmospheric board background, clearer location clusters, readable links, agent markers/bubbles, pulse styling, selected states, and responsive fallback remain accessible.
- [ ] Overview/timeline/replay panels have clearer visual hierarchy and status affordances without hiding IDs, errors, diagnostics, or debug JSON sections.
- [ ] Agent detail remains a dossier-style view with clear configured/runtime/generated/user/system provenance separation.
- [ ] UI remains responsive at existing breakpoints with no horizontal overflow on narrow screens.
- [ ] All state-changing UI still calls existing typed admin input/API boundaries; frontend does not mutate `WorldSnapshot` directly.
- [ ] Existing validation commands pass: `npm run typecheck`, `npm test`, and `npm run build` or at minimum `npm run build:ui` after typecheck/tests.
- [ ] No new production dependencies, rendering engines, Canvas/WebGL/Pixi/Phaser, or network calls are added for this visual polish MVP.

## Out of Scope

- Replacing the CSS/DOM map with Canvas, WebGL, Pixi, Phaser, or a tile engine.
- Adding backend simulation behavior, new LLM operations, persistence, multiplayer, or auth.
- Redesigning the whole information architecture or removing debug/developer affordances.
- Hiding raw JSON/debug details that are required by existing specs; they may only become visually secondary.
- Pixel-perfect cloning of any reference project.

## Open Question

- Which visual direction should be primary for this polish pass: cozy pixel-town board, glassy observatory dashboard, or storybook dossier interface?
