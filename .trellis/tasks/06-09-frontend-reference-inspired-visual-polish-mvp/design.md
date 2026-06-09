# Reference Inspired Frontend Visual Polish MVP Design

## Architecture and Boundaries

This task is frontend-only and presentation-focused. It should primarily update:

- `src/app/styles.css`
- Small JSX class/structure adjustments in `src/app/realm/**` and `src/app/agents/AgentDetailPanel.tsx` only if needed for styling hooks.
- `src/app/shared/viewModels.ts` only for small presentational derived labels if existing data is insufficient.
- Existing tests only when helper/view-model behavior changes.

Do not add new simulation state, new frontend-owned world facts, new rendering engines, or new API calls.

## Visual System

Use CSS custom properties at `:root` for:

- realm background gradients
- panel/surface colors
- borders and glow/elevation
- source/provenance colors
- spacing/radius/easing tokens

Recommended direction: glassy observatory dashboard with cozy miniature board accents.

## Data Flow

No data-flow changes are expected.

```text
AdminStateResponse -> shared typed view models -> existing React components -> CSS presentation
user action -> existing typed admin input/API boundary
```

If a component needs a new display-only value, derive it in `src/app/shared/viewModels.ts` and cover it with focused tests.

## Component Design Notes

### Dashboard shell and tabs

- Add stronger page backdrop and header treatment.
- Make tabs look like compact navigation cards with active state depth.
- Preserve `role=tablist`, `role=tab`, `aria-selected`, and `aria-controls`.

### Realm map

- Use layered radial/linear gradients for terrain/observatory ambience.
- Make location cards feel like map districts/islands.
- Keep links readable and non-interactive.
- Keep agent markers/button targets accessible and visible at mobile breakpoints.
- Keep text fallback visible below the map.

### Timeline and replay

- Use stronger selected event state and progress rail styling.
- Preserve IDs, event details, filters, debug toggle, and range/number cursor controls.

### Agent dossier

- Make current action/location/provenance the visual hero.
- Keep configured facts and runtime/generated memory visually separated.
- Do not hide provenance badges or debug/source labels.

### LLM review form

- Keep structured review primary and advanced JSON secondary.
- Improve spacing and scanability without changing submit semantics.

## Compatibility

- Must remain usable with existing Vite/React setup and no new dependencies.
- Must remain keyboard accessible and responsive at current breakpoints.
- Must respect `prefers-reduced-motion` if adding animations.

## Rollback

Presentation changes should be easy to revert by restoring `styles.css` and any small className changes. Avoid coupling visual polish to behavioral logic.
