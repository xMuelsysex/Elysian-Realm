# Map animation polish

## Goal

Add lightweight animation polish to the Pixi isometric realm map after static interaction feedback is stable.

## Requirements

- Build on the static interaction affordances from `map-interaction-polish`.
- Keep animation local to visual feedback such as hover glow, selection pulse, card easing, or marker bounce.
- Preserve `RealmMapViewModel` as the only source of simulation state.
- Avoid movement prediction, simulated paths, or new command payloads.
- Keep Pixi lifecycle cleanup explicit if ticker/tween logic is introduced.

## Acceptance Criteria

- [x] Hover/focus/selected feedback includes subtle animation without obscuring map readability.
- [x] Animations stop and clean up when the stage unmounts or rerenders.
- [x] Tiled success and procedural fallback paths behave consistently.
- [x] Tiled validation, TypeScript check, and existing tests pass.

## Notes

- Placeholder planning task only.
- Do not implement this scope during `map-interaction-polish`.
