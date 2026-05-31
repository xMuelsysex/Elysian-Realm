# Frontend Quality Guidelines

> Quality standards for the Elysian Realm frontend.

## Core Quality Bar

The frontend should make the simulation inspectable, replayable, and honest about generated content and failures. It should not hide complexity by moving backend rules into UI code.

## Required Patterns

- Render from backend projections and shared contracts.
- Show provenance for configured, generated, user-authored, and system content.
- Preserve loading, empty, and error states.
- Submit typed commands for all user interventions.
- Show operation failures and diagnostics in debug/development views.
- Keep replay independent from live model calls.
- Use accessible text labels for status, provenance, and playback controls.

## Forbidden Patterns

- Direct mutation of agent/world/conversation state in UI code.
- Raw `event.payload` casts in components.
- Generated memories displayed as canon/base persona facts.
- Suppressed LLM/provider errors.
- Global stores that mirror the entire backend world.
- 2D map-first work before text timeline, profile, intervention, and replay contracts are stable.

## Testing Requirements

When a frontend stack exists, add targeted tests for:

- `RealmTimeline` loading, empty, error, and normal states;
- agent profile configured-vs-generated separation;
- intervention form validation and pending/error display;
- conversation view active and archived states;
- provenance badges across all narrative content;
- replay controls with deterministic fixture data;
- operation failure panel rendering.

## Review Checklist

Before approving frontend changes:

- [ ] Does the UI import shared projections/validators instead of redefining payload types?
- [ ] Are all user actions submitted as typed commands?
- [ ] Is generated content clearly labeled?
- [ ] Are backend failures visible to the user/developer?
- [ ] Are loading, empty, not-found, and error states covered?
- [ ] Does any code duplicate simulation rules that belong in the backend?

## MVP UX Priority

The recommended order is:

1. world clock and timeline;
2. agent cards and profile panels;
3. active/archived conversation view;
4. intervention form;
5. replay controls;
6. debug diagnostics;
7. optional 2D map later.

Do not optimize for visual map fidelity before the text-first simulation can be understood and replayed.
