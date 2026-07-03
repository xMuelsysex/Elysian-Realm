# Map interaction polish

## Goal

Improve the Pixi isometric realm map interaction feedback so the current Tiled visual baseline is easier to inspect and use without changing backend-owned simulation state.

## Requirements

- Preserve `RealmMapViewModel` as the only source of map locations, agents, pulses, labels, and selection state.
- Keep `RealmMapPanel` DOM/text fallback intact for accessible inspection.
- Add visible local interaction feedback for map hotspots and agent markers: hover affordance, pointer cursor, and concise contextual detail.
- Link Pixi hover and DOM fallback focus through one local inspected item state.
- Prioritize the inspected item for visual feedback and detail cards, then fall back to the selected view-model item, then hide the card.
- Render contextual cards only from existing short view-model fields:
  - location: `displayName`, `occupancyLabel`, `activityLabel`, `description`;
  - agent: `displayName`, `roleLabel`, `status`, `currentIntent ?? activityText`, `relationshipCount`.
- Use three static feedback layers: hover/focus glow and slight scale, selected stable gold outline/glow, and distinct location-vs-agent highlight geometry.
- Treat hover/focus as inspection only; selection occurs only through existing click/keyboard activation callbacks.
- On Pixi click, update the inspected item immediately before calling the existing selection callback; the stable selected state still comes from the returned view model.
- Anchor the contextual card near the target and clamp it inside the Pixi canvas bounds.
- Keep DOM focus visibility intact while also updating the Pixi inspected item.
- Keep Tiled loading diagnostics and the procedural rollback path intact, with the same interaction feedback in both paths.
- Defer ticker/tween animation to `map-animation-polish`; this task only adds static feedback.
- Avoid adding new simulation rules, movement prediction, global client state, component tests, or command payloads.

## Acceptance Criteria

- [ ] Hovering Pixi locations and agents makes the target visually distinct without changing selection.
- [ ] Focusing DOM fallback locations and agents updates the Pixi target highlight and contextual card.
- [ ] Selecting a location or agent keeps an obvious selected state in the Pixi stage after inspection ends.
- [ ] The Pixi stage displays a small contextual card for the hovered, focused, clicked, or selected map item using existing view-model fields.
- [ ] The card stays within the Pixi stage bounds and works for both Tiled success and procedural fallback rendering.
- [ ] Tiled validation, TypeScript check, and existing tests pass.

## Notes

- This is a lightweight implementation task; PRD-only is sufficient.
- Follow `.trellis/spec/frontend` rules: render typed projections, keep failures visible, and keep UI state local to interaction affordances.
- Validation strategy: do not add component tests in this pass; run `npm run validate:tiled-map`, `npm run typecheck`, `npm test`, and a browser smoke check if available.
