# Debug Admin Interface MVP

## Goal

Build a local-only frontend and backend management interface that makes the Elysian Realm simulation easier to inspect and debug during development.

The MVP should expose the current deterministic offline simulation engine through a small backend control surface and a browser-based admin/debug UI. It should help the developer view the world snapshot, event timeline, agents, locations, queued inputs, and step/replay behavior without writing one-off Node snippets.

## User Value

- Start the project locally and inspect the simulation state in a browser.
- Step the deterministic world forward and see generated events immediately.
- Submit validated debug commands such as pause, resume, step, set time scale, realm event, and direct private message.
- Debug event/input validation failures without digging through test output.
- Establish a safe management surface before adding LLMs, memory store, conversations, or richer UI.

## Confirmed Facts From Repository Inspection

- The repo is currently a TypeScript ESM project with scripts: `build`, `typecheck`, and `test`.
- There is no existing frontend framework, HTTP server, router, or dev server.
- Current dependencies are minimal: TypeScript and `@types/node` only.
- The existing deterministic simulation engine is exported from `src/server/simulation/index.ts`.
- Current engine API includes:
  - `createSimulationEngine()`
  - `queueSimulationInput(state, input)`
  - `stepSimulationEngine(state)`
  - `validateSimulationEvent(event)`
  - `validateSimulationInput(input, context)`
  - `createReplaySummary(snapshot, events)`
- Current seed uses world `world_elysian_observation_mvp`, agents `agent_elysia`, `agent_kevin`, `agent_eden`, and locations `atrium`, `garden`, `lounge`, `archives`, `training-hall`, `overlook`, `quarters`.
- Frontend spec requires UI to render backend-owned projections, submit typed commands, show provenance/source labels, and avoid parsing raw `event.payload` in multiple components.
- Backend spec requires one authoritative simulation owner; UI and API handlers must not directly patch world state.
- The newly installed `ui-ux-pro-max` skill recommends data-dense / real-time monitoring / minimal dashboard patterns for debug/admin dashboards, with accessible controls, visible feedback, keyboard navigation, and no color-only status.

## MVP Requirements

### R1. Local backend management surface

- Add a local backend entry point that can run from an npm script.
- Maintain an in-memory `SimulationEngineState` for local development.
- Provide endpoints or equivalent command handlers to:
  - read current world snapshot;
  - read event log / timeline summary;
  - run one simulation step;
  - reset to deterministic seed;
  - submit supported `SimulationInput` commands;
  - inspect validation errors for rejected inputs/events.
- The backend management surface must use the existing simulation engine API and must not directly mutate snapshot internals outside engine functions.

### R2. Browser-based debug/admin UI

- Add a local browser UI that can be opened during development.
- Minimum visible panels:
  - world header: world ID, status, current time, time scale, last step ID;
  - agent/location overview: agents grouped by current location, status, relationship refs;
  - event timeline: event ID, time, kind, source, actor, targets, and payload/details;
  - control panel: step, reset, pause, resume, set time scale;
  - intervention panel: submit realm event or direct private message through typed inputs;
  - validation/debug panel: show rejected inputs/events and messages.
- UI must show source/provenance badges for `system`, `user`, `agent`, `llm`, and `test` where available.
- UI must not implement simulation rules; it should call backend commands and render returned projections.

### R3. Typed contracts and validation

- Reuse shared `SimulationInput`, `WorldSnapshot`, and `SimulationEvent` contracts.
- Add narrow admin-specific response types if needed.
- Keep event/input validation centralized in backend/shared helpers.
- Invalid form submissions should show clear error feedback and should not be converted into fake accepted events.

### R4. Developer workflow

- Add npm script(s) for local usage, e.g. `npm run dev` or `npm run admin`.
- Document how to start the admin interface in README or task notes.
- The interface is development-only and local-first; no production auth, deployment, accounts, or public hosting in this MVP.

### R5. Tests and verification

- Add backend tests for admin command handlers/endpoints.
- Add at least one smoke test for rendered frontend assets or HTML generation if using a zero-dependency UI.
- Existing simulation/persona tests must continue passing.
- Required verification: `npm run typecheck`, `npm test`, `npm run build`, Trellis task validation, and `git diff --check`.

## Acceptance Criteria

- [ ] A developer can run one npm command to start a local admin/debug interface.
- [ ] Browser UI displays current world snapshot with agents, locations, time, status, and last step ID.
- [ ] Browser UI displays event timeline with event kind/source/IDs and expandable or readable payload details.
- [ ] Step and reset controls work through backend command handling, not frontend state patches.
- [ ] Pause/resume/set time scale commands submit typed simulation inputs and show resulting events or validation errors.
- [ ] Realm event and direct private message forms validate target IDs/payload before or during backend submission and surface clear errors.
- [ ] Backend tests prove admin commands use engine APIs and preserve simulation authority boundaries.
- [ ] UI does not parse event payload logic in multiple places; projection/formatting is centralized.
- [ ] The feature remains local/dev-only and does not add production auth/deployment scope.
- [ ] `npm run typecheck`, `npm test`, and `npm run build` pass.

## Out of Scope

- Production deployment or public hosting.
- User accounts, authentication, permissions, or secret management.
- Persistent database/storage.
- Live LLM provider integration.
- Full memory store/retrieval UI beyond event-only diagnostics.
- Full conversation transcript system.
- 2D map movement or animation.
- Migration from `elysia/kevin/eden` to `elysia/pardofelis/hua`.
- Official dialogue, story text, subtitles, images, audio, video frames, or extracted assets.

## Decisions

1. Frontend stack: use Vite + React for the admin/debug interface.
2. Backend API stack: use Node built-in `http` with typed handlers; do not introduce Express in this MVP.

Reason: the user wants a usable frontend and backend management interface for debugging. Vite + React provides clearer component boundaries and a better path toward the later observation-terminal UI. Keeping the backend on Node `http` limits backend dependency churn and preserves the current small TypeScript baseline. The trade-off is hand-written routing/JSON handling for a small local API.

## Open Decision

None blocking planning.
