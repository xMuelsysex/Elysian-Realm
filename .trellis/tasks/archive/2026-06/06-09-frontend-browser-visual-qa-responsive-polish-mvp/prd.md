# Browser Visual QA and Responsive Polish MVP

## Goal

Validate the newly polished Elysian Realm frontend in a real browser and fix layout, proportion, overflow, readability, and responsive issues that are only visible at runtime.

## User Value

- Ensure the concept-inspired observatory UI actually works in the browser, not only in static code/build output.
- Catch visual regressions introduced by the 1:1 concept reconstruction pass before more product work builds on top of it.
- Preserve developer/debug usability while making the default map observatory page presentable.

## Confirmed Facts

- The previous task `06-09-frontend-reference-inspired-visual-polish-mvp` was archived after implementing a concept-inspired visual reconstruction.
- The default dashboard tab now opens on the map/observatory view.
- The visual implementation heavily changed `src/app/styles.css`, `src/app/realm/RealmDashboard.tsx`, `src/app/realm/WorldHeader.tsx`, and `src/app/realm/ObservabilityPanels.tsx`.
- Automated checks passed, but no browser screenshot QA has been performed yet after the final 1:1 composition revision.
- WSL may complicate inline image review, so browser screenshots or Windows-opened previews should be treated as the source of visual truth.

## Requirements

1. Run the frontend in a real browser and inspect the default map observatory page at representative viewport widths.
2. Compare the browser result against `.image-gen/frontend-reference-inspired-visual-polish-concept.png` and the archived task reference image.
3. Fix visible layout issues: wrong proportions, horizontal overflow, excessive clipping, unreadable controls/text, broken stacking, or hidden critical controls.
4. Verify responsive behavior for desktop, tablet-ish, and narrow mobile widths.
5. Preserve typed frontend boundaries, debug access in non-map tabs, provenance labels, and error/empty states.
6. Keep changes frontend-only and focused on visual/runtime polish.

## Acceptance Criteria

- [ ] Desktop observatory map page is visually close to the concept composition: top command bar, left event/system sidebar, large center map, right dossier/debug sidebar, bottom replay timeline.
- [ ] No horizontal overflow at desktop, tablet-ish, or mobile widths tested.
- [ ] Core controls remain visible and usable: tab rail, language toggle, map location/agent buttons, replay controls, event selection, and debug tabs.
- [ ] Text remains readable enough for development use; no critical IDs/errors/provenance are hidden without an alternate accessible path.
- [ ] Responsive fallback keeps map, dossier, event stream, and replay usable when the 1:1 desktop composition cannot fit.
- [ ] Validation passes: `npm run typecheck`, `npm test`, `npm run build`, and `git diff --check`.

## Out of Scope

- New product functionality, backend changes, simulation logic, or LLM behavior.
- Pixel-perfect recreation of the generated concept image beyond layout/proportion and visual hierarchy.
- Adding visual regression testing infrastructure unless a tiny script is clearly justified.
- Deleting existing local `.image-gen/`, `knowledge/`, or workspace generated files.
