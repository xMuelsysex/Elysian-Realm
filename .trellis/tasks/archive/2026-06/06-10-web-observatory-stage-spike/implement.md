# Web Observatory Stage Spike Implementation Plan

## Checklist

1. Create planning artifacts and save the GitHub technology-stack research in the task.
2. Configure Trellis context for frontend implementation and checks.
3. Add the minimal `Pixi.js` dependency.
4. Add a focused stage component that renders `RealmMapViewModel` without owning simulation state.
5. Integrate the stage into `RealmMapPanel` while preserving DOM accessibility fallback.
6. Add or update focused tests for the stage view-model contract where useful.
7. Validate with typecheck, tests, build, and focused git diff review.

## Validation Commands

- `git status --short`
- `git diff -- package.json package-lock.json src/app/realm src/app/shared tests .trellis/tasks/06-10-web-observatory-stage-spike`
- `npm run typecheck`
- `npm test`
- `npm run build:ui`
- `python ./.trellis/scripts/task.py validate 06-10-web-observatory-stage-spike`

## Review Gates

- Do not mutate backend simulation state from the frontend stage.
- Do not parse raw event payloads in React/Pixi components.
- Do not remove timeline, replay, diagnostics, or text fallback visibility.
- Do not include unrelated Unity, `.image-gen/`, `knowledge/`, `.playwright-mcp/`, generated workspace, or `.trellis/scripts/**` noise in the task diff.

## Rollback Points

- The Pixi stage component is isolated from the shared projection and can be removed independently.
- `RealmMapPanel` integration should keep the previous DOM fallback path available.
- Dependency changes are limited to `pixi.js` unless implementation proves a different renderer is necessary.
