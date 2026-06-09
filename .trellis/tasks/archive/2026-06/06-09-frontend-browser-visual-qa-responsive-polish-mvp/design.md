# Browser Visual QA and Responsive Polish MVP Design

## Scope

This task is a validation-and-polish pass over the current Vite React frontend. It should only change frontend presentation or small presentational markup required to fix browser-observed issues.

Likely files:

- `src/app/styles.css`
- `src/app/realm/RealmDashboard.tsx`
- `src/app/realm/WorldHeader.tsx`
- `src/app/realm/ObservabilityPanels.tsx`
- `src/app/realm/RealmMapPanel.tsx` only if browser QA proves a markup hook is needed

## Browser QA Method

1. Start the app with `npm run dev` or a server command suitable for the repo.
2. Open the app through Playwright/browser tooling or manual browser access.
3. Capture/inspect representative widths:
   - desktop wide: around 1440-1600px
   - desktop medium: around 1280px
   - tablet-ish: around 980px
   - mobile narrow: around 560px
4. Compare the default map tab with the concept reference and record findings.

## Design Constraints

- Preserve backend-owned state and typed command boundaries.
- Do not hide failures/diagnostics entirely; if the map concept view visually demotes details, ensure other tabs retain full access.
- Favor CSS fixes over component rewrites.
- Avoid new dependencies or test infrastructure unless necessary.
- Respect `prefers-reduced-motion` and accessible focus states.

## Rollback

CSS-only fixes should be easy to revert. If a markup hook causes unexpected behavior, revert it and use existing classes where possible.
