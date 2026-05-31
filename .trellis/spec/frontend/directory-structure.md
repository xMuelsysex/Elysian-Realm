# Frontend Directory Structure

> Planned frontend organization for the Elysian Realm text/timeline-first UI.

## Status

No frontend source code exists yet. This file defines the target structure for the first implementation after the stack decision is made.

## Core Rule

The frontend renders backend-owned projections and submits typed commands. It must not own simulation rules, memory ranking, conversation lifecycle, or agent state transitions.

## Required Layout

The chosen primary product stack is TypeScript full-stack with a TypeScript/React-style web frontend. Use feature-oriented folders:

```text
src/
├── app/ or client/
│   ├── realm/             # world clock, event timeline, replay controls
│   ├── agents/            # agent cards, profile panels, relationship views
│   ├── conversations/     # active/archived conversation views
│   ├── interventions/     # user command forms
│   ├── diagnostics/       # operation, retrieval, prompt/debug panels
│   ├── shared/
│   │   ├── components/    # reusable visual components only
│   │   ├── hooks/         # generic UI hooks, not simulation rules
│   │   ├── view-models/   # UI formatting from shared projections
│   │   └── styles/        # theme and layout primitives
│   └── routes/            # route/page composition if the framework uses routes
└── shared/
    └── contracts/         # shared with backend; do not duplicate locally
```

If using a framework with `app/` routes, keep feature modules under route segments or `src/features/`, but preserve the same ownership boundaries.

## Feature Ownership

- `realm` owns timeline, world status, playback controls, and replay shell.
- `agents` owns profile displays and relationship/memory/reflection presentation.
- `conversations` owns transcript and summary rendering.
- `interventions` owns forms that submit typed user commands.
- `diagnostics` owns developer/debug views for operation failures, retrieval scores, and decision traces.
- `shared/contracts` owns DTOs, event projections, validators, and command schemas imported by both backend and frontend.

## File Naming

Use explicit domain names:

- `RealmTimeline.tsx`
- `AgentProfilePanel.tsx`
- `ConversationTranscript.tsx`
- `InterventionForm.tsx`
- `MemoryProvenanceBadge.tsx`
- `useRealmProjection.ts`
- `useSendRealmCommand.ts`
- `eventViewModels.ts`

Avoid vague files such as `utils.ts`, `data.ts`, `helpers.ts`, or `Card.tsx` unless they live in a clearly scoped folder.

## Shared Component Boundary

Only move components to `shared/components` when they are domain-neutral, such as:

- badges;
- loading/error panels;
- tabs;
- empty states;
- timeline layout primitives.

Domain components such as agent cards, memory lists, and conversation summaries should stay in their feature folder.

## Anti-Patterns

- A component importing database table types directly.
- A feature folder defining its own copy of event payload types.
- `realm` components calculating memory retrieval or conversation lifecycle rules.
- A global store that mirrors the entire backend world state.
- Map/animation folders added before text timeline and replay contracts are stable.

## Verification

When frontend source exists, check:

- feature folders depend on shared contracts, not backend internals;
- command forms submit shared command types;
- raw event payload parsing is centralized;
- generated/configured/user/system provenance components are reused consistently.
