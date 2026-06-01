# Debug Admin Interface MVP - Technical Design

## Scope

Build a local development-only debug/admin interface around the deterministic simulation engine.

Confirmed decisions:

- Frontend: Vite + React + TypeScript.
- Backend API: Node built-in `http` with typed handlers; no Express in this MVP.
- Persistence: in-memory only.
- Simulation authority: existing `src/server/simulation/**` remains the only owner of active `WorldSnapshot` transitions.
- Product scope: debugging/inspection, not public production UI.

## Architecture

### Runtime shape

Use two local dev processes:

```text
Vite dev server (frontend)
  -> fetch /api/admin/* via Vite proxy
Node admin API server
  -> owns one in-memory SimulationEngineState
  -> calls simulation engine APIs only
```

Recommended ports:

- Vite UI: `http://localhost:5173`
- Admin API: `http://localhost:4317`

The exact ports may be configurable, but the MVP can use stable defaults.

### Backend layout

Planned backend files:

```text
src/server/admin/
├── adminServer.ts       # Node http server factory/start function
├── adminController.ts   # typed command handlers around simulation engine
├── adminContracts.ts    # request/response DTOs for local API
└── index.ts             # exports
```

Rules:

- `adminController` may hold an in-memory `SimulationEngineState`.
- `adminController` must call `createSimulationEngine`, `queueSimulationInput`, and `stepSimulationEngine` for state changes.
- Admin API handlers must not patch `snapshot.status`, `snapshot.timeScale`, `snapshot.agents`, or `events` directly.
- Invalid requests return structured JSON errors and should not create fake accepted events.

### Frontend layout

Use feature-oriented React folders under `src/app/**`:

```text
src/app/
├── main.tsx
├── App.tsx
├── styles.css
├── adminApi.ts
├── realm/
│   ├── RealmDashboard.tsx
│   ├── WorldHeader.tsx
│   ├── LocationBoard.tsx
│   └── EventTimeline.tsx
├── interventions/
│   └── InterventionPanel.tsx
├── diagnostics/
│   └── DebugPanel.tsx
└── shared/
    ├── Badge.tsx
    ├── JsonDetails.tsx
    └── viewModels.ts
```

Rules:

- Components render typed admin DTOs and view models.
- Components do not cast `event.payload` to interpret simulation rules.
- Event formatting/projection should be centralized in `viewModels.ts` or backend DTOs.
- Form submissions call `adminApi.ts` functions; components do not construct ad-hoc fetch bodies in many places.

## API Contract

Base path: `/api/admin`.

### GET `/state`

Returns current admin state:

```ts
interface AdminStateResponse {
  snapshot: WorldSnapshot;
  events: SimulationEvent[];
  timeline: TimelineEntry[];
  replay: ReplaySummary;
  diagnostics: AdminDiagnostic[];
}
```

### POST `/step`

Runs one simulation step and returns `AdminStateResponse`.

### POST `/reset`

Resets in-memory simulation state to deterministic seed and returns `AdminStateResponse`.

### POST `/input`

Body:

```ts
interface SubmitAdminInputRequest {
  kind: InterventionKind;
  targetIds: string[];
  payload: Record<string, unknown>;
  source?: EventSource; // defaults to user
}
```

Behavior:

1. Server creates a deterministic/local input ID.
2. Server builds `SimulationInput` with active world ID.
3. Server queues the input and runs one step or returns queued state according to implementation design.
4. MVP recommended behavior: queue and immediately step, so the UI sees accepted/rejected outcome immediately.
5. Return `AdminStateResponse`.

### Error shape

```ts
interface AdminErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

## UI Design

Use a data-dense but minimal dashboard style:

- dark or neutral shell optional, but contrast must meet accessible text standards;
- clear status badges, not color-only meaning;
- timeline and JSON details remain selectable/copyable;
- controls use text labels and disabled/loading states;
- forms show validation errors near fields.

Required panels:

1. **World header**: world ID, status, current time, time scale, last step ID, event count.
2. **Location board**: locations with agents grouped by `locationId`.
3. **Event timeline**: latest events with kind/source badges, actor/targets, step/time, payload details.
4. **Controls**: step, reset, pause, resume, set time scale.
5. **Interventions**: realm event and direct private message forms.
6. **Diagnostics**: rejected input/event validation messages and raw state/replay summary.

## Data Flow

```text
React component action
  -> adminApi typed request
  -> Node http handler
  -> adminController validates request shape
  -> queueSimulationInput / stepSimulationEngine
  -> AdminStateResponse
  -> React refreshes server-owned projection
```

Frontend state is limited to:

- loading/error state;
- selected event/agent/panel;
- form drafts;
- timeline filters.

It must not mirror backend world state in a global store.

## Dependencies

Expected new dev dependencies:

- `vite`
- `react`
- `react-dom`
- `@vitejs/plugin-react`
- `@types/react`
- `@types/react-dom`

No Express dependency in this MVP.

## Build and Scripts

Expected package scripts:

- `dev`: run backend admin API and Vite UI concurrently if possible.
- `dev:api`: run built or TypeScript-compiled admin server.
- `dev:ui`: run Vite dev server.
- `build`: compile TypeScript and build Vite assets, or split into `build:server`/`build:ui` if cleaner.
- Existing `typecheck` and `test` must continue working.

Because the project currently builds with `tsc`, implementation must ensure Vite/React source is included in TypeScript checks without breaking NodeNext server imports.

## Testing Strategy

Backend tests:

- admin controller initial state returns deterministic snapshot and timeline;
- step endpoint/handler advances state via engine API;
- reset returns deterministic seed;
- submit input returns accepted/rejected event outcomes;
- invalid request returns structured error.

Frontend tests for this MVP can be lightweight due to no existing browser test runner:

- typecheck React components;
- test view-model/formatting functions with Node test runner where practical;
- optionally test that production build emits frontend assets.

Full DOM/component testing can be introduced in a later frontend testing slice.

## Compatibility and Rollback

Rollback files should be concentrated in:

- `src/server/admin/**`
- `src/app/**`
- Vite config / HTML entry files
- package scripts and dependencies
- admin tests

Avoid changes to core simulation contracts unless the admin API reveals a missing projection need; if that happens, add tests and update specs.

## Risks

- Introducing Vite/React increases dependency and build complexity.
- Running two dev processes may require a small helper script or `concurrently`-like tooling; prefer avoiding extra tooling if a simple Node script can spawn both.
- Browser UI must not become a second simulation authority.
- Admin API is local/dev-only and should not be mistaken for production deployment or security boundary.
