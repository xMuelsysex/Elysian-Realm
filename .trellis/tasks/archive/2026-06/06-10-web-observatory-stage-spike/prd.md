# Web Observatory Stage Spike

## Goal

Replace the dead-end Unity observatory direction with a minimal web-native stage spike that renders the existing realm map projection in the current React admin dashboard.

## User Value

- Keeps the observatory prototype aligned with the project identity: multi-agent daily-life simulation, conversations, memory, relationships, and interventions.
- Tests a web rendering path before investing further in visual stage work.
- Preserves the current inspectable admin dashboard instead of making the visual stage the source of simulation truth.

## Confirmed Facts

- The current frontend is `React + TypeScript + Vite` under `src/app/**`.
- The current backend/admin API already returns `WorldSnapshot`, events, replay, diagnostics, personas, and typed projections.
- `RealmDashboard` renders a `map` tab using `createRealmMapViewModel`, `RealmMapPanel`, timeline, replay, agent detail, topology, and location board.
- Frontend specs require rendering backend projections and forbid reimplementing simulation rules in components.
- GitHub stack research points toward web-native 2D rendering for this project family, especially `Pixi.js` or `Phaser 3`, not Unity.

## Requirements

- Use a web rendering approach for the observatory stage and record the stack decision in this task.
- Keep backend projections as the only source of world/agent/location state.
- Render locations, links, agents, selection state, and recent event pulses from the existing `RealmMapViewModel`.
- Preserve the DOM text fallback and existing dashboard panels for accessibility and debugging.
- Do not add frontend-owned movement, conversation, memory, or relationship simulation rules.
- Avoid cleaning unrelated working-tree noise such as `.trellis/scripts/**`, `.playwright-mcp/`, generated workspace files, Unity cache, `.image-gen/`, or knowledge vault files.

## Acceptance Criteria

- [x] The task documents the web observatory stack decision and comparable GitHub references.
- [x] The map tab displays a web-rendered stage driven by `createRealmMapViewModel`.
- [x] Selecting a stage location or agent updates the existing dashboard selection callbacks.
- [x] A text/DOM fallback remains available for occupancy and accessibility.
- [x] The implementation does not introduce a second source of simulation state.
- [x] Validation records relevant git status, focused diffs, typecheck/build/test results that can run locally, and any limitations.

## Decisions

- Use `Pixi.js` for the first web observatory stage spike because it is a renderer over backend-owned state and fits the current React dashboard better than continuing Unity.
- Keep `React + TypeScript + Vite + Node/TypeScript` as the project foundation and avoid migration to Python/FastAPI/Convex for this spike.
- Treat `createRealmMapViewModel` as the stage contract; Pixi receives locations, links, agents, selection state, and pulses from that view model only.
- Preserve the DOM map controls as an accessible fallback while Pixi owns the visual canvas.

## Validation Notes

- `npm run typecheck` passed.
- `npm test` passed: 86 Node tests.
- `npm run build:ui` passed. Vite emitted the expected chunk-size warning after adding `pixi.js` (`index` chunk above 500 kB), which is acceptable for this spike and should be revisited if the stage remains.
- `python ./.trellis/scripts/task.py validate 06-10-web-observatory-stage-spike` passed.
- `git diff --check -- package.json package-lock.json src/app/realm/RealmMapPanel.tsx src/app/realm/RealmPixiStage.tsx src/app/styles.css tests/adminViewModels.test.ts .trellis/tasks/06-10-web-observatory-stage-spike` passed with only Git CRLF conversion warnings.
- `git status --short` still shows unrelated pre-existing workspace noise: `.trellis/scripts/**`, `.playwright-mcp/`, `.trellis/workspace/Muelsyse/generated/`, and `unity/`.

## Out of Scope

- Conversation system implementation.
- Replacing the dashboard with a full game UI.
- Backend persistence, vector memory, or LLM orchestration changes.
- Phaser/Pixi benchmarking beyond a minimal spike.
- Cleaning or committing unrelated workspace noise.
