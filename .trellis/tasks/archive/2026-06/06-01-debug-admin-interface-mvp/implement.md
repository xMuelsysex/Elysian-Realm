# Debug Admin Interface MVP - Implementation Plan

## Review Gate

Do not start code changes until the user explicitly approves implementation after reviewing `prd.md` and `design.md`.

## Ordered Checklist

### 1. Pre-development context

- [ ] Read `prd.md`, `design.md`, and this `implement.md`.
- [ ] Read backend specs: simulation, directory structure, error handling, quality.
- [ ] Read frontend specs: realm interface, directory structure, component guidelines, state management, type safety, quality.
- [ ] Read UI/UX Pro Max guidance for dashboard/admin UI priorities.
- [ ] Confirm scope: Vite + React frontend, Node `http` backend API, local/dev-only, no Express, no DB, no auth.

### 2. Install/update dependencies

- [ ] Add required frontend dev dependencies:
  - `vite`
  - `react`
  - `react-dom`
  - `@vitejs/plugin-react`
  - `@types/react`
  - `@types/react-dom`
- [ ] Update `package.json` scripts for dev/build workflow.
- [ ] Keep existing `typecheck`, `test`, and Node tests working.

### 3. Backend admin API

- [ ] Create `src/server/admin/**`.
- [ ] Implement typed admin contracts and structured error shape.
- [ ] Implement in-memory admin controller around the simulation engine.
- [ ] Implement Node `http` server with JSON helpers and route handlers.
- [ ] Supported routes:
  - `GET /api/admin/state`
  - `POST /api/admin/step`
  - `POST /api/admin/reset`
  - `POST /api/admin/input`
- [ ] Ensure state changes call simulation APIs only.
- [ ] Ensure invalid request bodies return structured errors.

### 4. Frontend Vite + React shell

- [ ] Add Vite config and HTML entry.
- [ ] Add React entry under `src/app/**`.
- [ ] Add `adminApi.ts` for typed fetch calls.
- [ ] Add central view-model helpers for event/timeline display.
- [ ] Implement panels:
  - world header;
  - location board;
  - event timeline;
  - controls;
  - realm/direct-message intervention forms;
  - diagnostics/debug panel.
- [ ] Use accessible labels, visible loading/error states, and non-color-only status indicators.

### 5. Tests

- [ ] Add backend/admin tests with Node test runner.
- [ ] Add frontend view-model tests if view-model helpers are non-trivial.
- [ ] Existing persona and simulation tests must continue passing.
- [ ] Avoid tests requiring browser automation unless a test runner is explicitly introduced.

### 6. Documentation

- [ ] Update README with local start commands and expected URLs.
- [ ] Mention local/dev-only scope.
- [ ] Document that API state is in-memory and resettable.

### 7. Validation

Run, in order:

```bash
npm run typecheck
npm test
npm run build
python3 ./.trellis/scripts/task.py validate 06-01-debug-admin-interface-mvp
git diff --check
```

If `dev` scripts are added, smoke-check that startup command reaches the expected local ports where practical. Stop any local dev process after smoke testing.

## Scope Guardrails

Do not add:

- Express or backend framework;
- database or persistence;
- auth/accounts/permissions;
- public deployment config;
- live LLM/provider calls;
- full memory store/retrieval;
- conversation transcript system;
- 2D map animation;
- persona roster migration;
- official dialogue/story/assets.

## Risky Files / Rollback Points

Likely touched:

- `package.json`
- `package-lock.json`
- `tsconfig.json` and/or Vite config
- `index.html`
- `src/server/admin/**`
- `src/app/**`
- `tests/admin*.test.ts` or equivalent
- `README.md`

Rollback should be possible by removing the admin/frontend directories, Vite config, added scripts/dependencies, and admin tests.

## Final Review Checklist

- [ ] Frontend renders backend-owned state only.
- [ ] No component directly mutates simulation state.
- [ ] User actions submit typed admin requests.
- [ ] Event payload display uses centralized formatting/projection, not repeated local casts.
- [ ] Backend handlers call simulation engine APIs for state changes.
- [ ] Invalid inputs/requests stay visible and diagnostic.
- [ ] Generated/configured/user/system provenance remains visible where relevant.
- [ ] Quality gate passes.
