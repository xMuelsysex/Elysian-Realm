# Frontend State Management

> State ownership rules for the realm UI.

## Core Principle

Backend projections are the source of truth for simulation state. Frontend state should be limited to UI concerns, form drafts, filters, and replay controls.

## State Categories

### Server State

Owned by backend and accessed through queries/subscriptions:

- world status and current time;
- active agents and current actions;
- event timeline;
- active/archived conversations;
- memory summaries and reflections;
- operation diagnostics;
- replay snapshots.

Rules:

- Do not duplicate server state into global client stores.
- Do not mutate server-derived data locally except for display formatting.
- Refresh through backend projection updates or query invalidation, depending on stack.

### Local UI State

Owned by components or feature hooks:

- selected agent/conversation/event;
- open/closed panels;
- timeline filters;
- replay cursor and speed;
- debug mode toggle;
- form drafts.

### URL State

Use URL state for shareable filters or selections when the chosen framework supports it:

- selected world/run;
- selected agent;
- selected event/step;
- timeline filters.

### Pending Command State

A submitted user intervention may have local pending state, but the final outcome must come from backend input status and events.

## Global State Rule

Only introduce global client state for cross-route UI preferences or session-level selections that are not authoritative simulation data.

Allowed examples:

- theme;
- debug panel visibility;
- selected world/run ID;
- user UI preferences.

Forbidden examples:

- global copy of all agents;
- global relationship graph that updates independently from backend;
- local memory retrieval cache used as truth;
- local conversation lifecycle state.

## Derived State

Derived frontend state should be pure formatting or grouping:

- group events by simulated day/hour;
- format memory score labels;
- sort already-projected timeline rows;
- compute display badges from provenance fields.

Do not derive new business facts such as relationship changes, memory importance, agent eligibility to talk, or replay outcomes.

## Replay State

Replay UI state may control how persisted events are viewed:

- play/pause;
- speed;
- selected step;
- viewport position.

Replay state must not create new simulation events or call providers.

## Common Mistakes

- Optimistically moving an agent in the UI before the engine emits movement/state events.
- Treating a generated reflection as an update to base persona state.
- Recomputing memory retrieval ranking in the browser.
- Letting filters permanently hide operation errors.
- Mixing form draft state with submitted command status.

## Verification

When implementation exists, review:

- all authoritative state comes from backend projections;
- command forms show pending/error/success states;
- no global store mirrors the full world snapshot;
- replay works from persisted data and offline fixtures.
