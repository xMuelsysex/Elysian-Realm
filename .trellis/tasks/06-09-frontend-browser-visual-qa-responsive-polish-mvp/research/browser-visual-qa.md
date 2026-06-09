# Browser Visual QA Notes

Findings recorded from a real browser with Playwright MCP against `http://127.0.0.1:5173/` while the admin API was available at `4317` through the Vite proxy.

## Reference

- Concept image: `.image-gen/frontend-reference-inspired-visual-polish-concept.png`
- Archived task copy: `.trellis/tasks/archive/2026-06/06-09-frontend-reference-inspired-visual-polish-mvp/research/frontend-visual-polish-concept.png`

## Screenshots

- `research/browser-qa-1600.png`
- `research/browser-qa-1280.png`
- `research/browser-qa-980.png`
- `research/browser-qa-560.png`

## Viewports inspected

- 1600 × 1000 desktop wide
- 1280 × 900 desktop medium
- 980 × 900 tablet-ish
- 560 × 900 mobile narrow

## Initial findings

- 1600px: overall composition matches the command-center concept closely: top command bar, left event/system rail, large center map, right dossier/debug rail, and bottom replay dock are all present. No document-level horizontal overflow.
- 1280px: no document-level horizontal overflow, but the layout crosses the desktop reconstruction breakpoint and compresses the three-column composition. Left system metrics and right dossier text are visibly clipped, and replay control buttons internally overflow because icon-only sizing relies on hidden text.
- 980px: no document-level horizontal overflow. Responsive stacking keeps the map, dossier, event stream, and replay reachable, but the map remains too tall because the stage-shell `min-height: 700px` override wins over the earlier responsive map rule. Map agent markers report internal overflow.
- 560px: no document-level horizontal overflow. Core controls remain reachable, but the map is excessively tall and agent cards/bubbles stack awkwardly inside location cards; dossier hero also reports internal overflow.
- Console: only a `favicon.ico` 404 was reported; no runtime application error affected QA.

## Fix plan

- Keep the visual task frontend-only and CSS-focused.
- Preserve the concept-like three-column observatory down to 1280px, but allow the page to grow vertically instead of clipping critical sidebars.
- Add icon-only replay control sizing so hidden button text does not create internal overflow while accessible labels/text remain in the DOM.
- Add later, more-specific `max-width: 980px`/`560px` overrides for the map stage shell and agent markers so responsive map cards are compact and readable.
- Tighten dossier hero wrapping/min-width rules so long generated actions and IDs do not cause hidden internal overflow.

## Final verification findings

- Final screenshots captured:
  - `research/browser-qa-1600-final.png`
  - `research/browser-qa-1280-final.png`
  - `research/browser-qa-980-final.png`
  - `research/browser-qa-560-final.png`
- 1600px and 1280px retain the concept composition: command bar, left event/system rail, center map, right dossier/debug rail, and replay dock.
- 980px and 560px use a stacked responsive fallback where map, replay, dossier, event stream, topology, and location/agent panels remain reachable.
- Final Playwright metrics reported no document-level horizontal overflow for 1600, 1280, 980, or 560 widths.
- Final Playwright metrics no longer report horizontal overflow for the command center, side rails, map board, replay panel, or dossier hero. Remaining overflow reports are expected scrollable JSON `<pre>` blocks and internal measurements from absolutely positioned desktop map markers.
- Console remained clean except for the non-blocking `favicon.ico` 404.
