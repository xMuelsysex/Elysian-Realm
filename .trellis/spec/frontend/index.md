# Frontend Development Guidelines

> Frontend rules for the Elysian Realm multi-agent daily-life simulation.

---

## Overview

The repository currently has no application source code. These frontend specs define the baseline for a text/timeline-first realm UI that renders backend-owned simulation state, supports replay/debug, and distinguishes configured facts from generated content.

Frontend work should subscribe to backend projections, render typed view models, and submit typed commands. It must not own simulation rules.

---

## Pre-Development Checklist

Before writing frontend code:

- [ ] Read [Realm Interface](./realm-interface.md) for screens, provenance labels, and replay/debug requirements.
- [ ] Read [State Management](./state-management.md) before introducing client state stores.
- [ ] Read [Type Safety](./type-safety.md) before parsing events, commands, or projections.
- [ ] Confirm every state-changing interaction maps to a shared backend command/input schema.
- [ ] Confirm generated, configured, user-authored, and system content have visible provenance in the UI.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Planned frontend feature folders and shared boundary | Planning baseline |
| [Realm Interface](./realm-interface.md) | Realm timeline, profile, conversation, replay, intervention UI | Planning baseline |
| [Component Guidelines](./component-guidelines.md) | Component composition, props, provenance, accessibility | Planning baseline |
| [Hook Guidelines](./hook-guidelines.md) | Query/command hooks, view-model hooks, replay hooks | Planning baseline |
| [State Management](./state-management.md) | Server state, local UI state, replay state, forbidden ownership | Planning baseline |
| [Type Safety](./type-safety.md) | Shared contracts, event projections, runtime validation | Planning baseline |
| [Quality Guidelines](./quality-guidelines.md) | Frontend tests, review checklist, anti-patterns | Planning baseline |

---

## Quality Check

Before frontend work is considered ready for review:

- [ ] Components render loading, empty, and error states.
- [ ] UI imports shared projections/validators instead of parsing raw payloads locally.
- [ ] User interventions submit typed commands and show resulting `source: user` events.
- [ ] Agent profile separates configured persona facts from generated memories/reflections.
- [ ] Replay/debug views use persisted events/snapshots, not live model calls.

---

**Language**: All documentation should be written in **English**.
