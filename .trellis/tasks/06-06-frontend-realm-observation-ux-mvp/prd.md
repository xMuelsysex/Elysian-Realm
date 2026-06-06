# Frontend Realm Observation UX MVP

## Goal

Improve the local React/Vite admin dashboard into a more legible realm observation interface by borrowing frontend interaction patterns from AI Town, ALICE_PROJECT, and OpenStory, while preserving Elysian Realm's current safety boundary: frontend views backend-owned projections and submits typed inputs only.

## User Value

The user should be able to watch the realm as a living multi-agent space instead of reading mostly debug panels: see where agents are, what they appear to be doing, replay what happened, inspect one character, and review LLM proposals through a product-like form before applying them.

## Confirmed Facts

- Current frontend is under `src/app/**` and uses Vite + React.
- `RealmDashboard` already owns local UI state for selected agent/location/event, timeline filters, replay cursor, auto-step, and active dashboard tab.
- `RealmMapPanel` already renders a backend snapshot projection with locations, agents, links, and non-system event pulses.
- `ReplayPanel` already supports previous/next event, numeric cursor jump, and auto-step, but does not yet provide a polished play/pause/speed/progress experience.
- `AgentDetailPanel` already shows runtime state, configured persona facts, current action, relationships, cooldowns, recent memory index, and related timeline events.
- `LlmRuntimeConfigPanel` already requests sandbox action proposals, previews validated proposals, creates a raw JSON draft, parses draft JSON, and submits through `onSubmitInput`.
- Frontend specs require typed view models, visible provenance, explicit loading/empty/error states, and no frontend ownership of simulation rules or `WorldSnapshot` mutation.

## Prioritized Requirements

1. AI Town-inspired map atmosphere:
   - Improve the map tab presentation with clearer role/agent cards, activity or speech-like bubbles derived from existing timeline/view-model data, and stronger location clustering/occupancy cues.
   - Keep the map as a backend snapshot projection; do not add Pixi/Phaser or a second simulation engine in this MVP.

2. ALICE-inspired replay controls:
   - Upgrade replay controls to include play/pause semantics, single-step controls, speed selection, progress/cursor feedback, and jump-to-event behavior.
   - Replay state remains local viewing state over existing timeline/replay data and must not create simulation events or call LLM providers.

3. OpenStory-inspired agent dossier:
   - Make the selected agent panel read like a character dossier with prominent current action, current location, relationship refs, recent related events, and provenance-separated configured facts/runtime memory indicators.
   - Avoid treating generated/runtime content as immutable configured persona facts.

4. Preserve the frontend safety boundary:
   - All state-changing UI paths must submit typed admin inputs or use existing admin API calls.
   - No component should directly patch backend-owned `WorldSnapshot` fields or duplicate simulation rules.
   - LLM operation failures and rejected inputs must remain visible.

5. Structured LLM proposal review form:
   - Turn the current raw JSON proposal draft flow into a product-like structured review/apply flow for the existing proposal shape.
   - Keep raw JSON available only as an advanced/debug escape hatch if needed.
   - Submission must continue through the existing typed input boundary and preserve review/audit metadata.

## Acceptance Criteria

- [ ] Map tab shows improved agent/location presentation that covers role cards or agent chips, activity/speech-like bubbles, and readable location clustering.
- [ ] Replay UI supports play/pause, previous/next or single-step, speed control, progress/cursor display, and jump-to-event behavior using local replay state.
- [ ] Agent detail UI prominently shows current action, location, relationships, recent related events, and clearly separated configured/runtime/generated/user/system provenance.
- [ ] LLM proposal review has a structured form path for applying a validated proposal without requiring normal users to edit raw JSON.
- [ ] Raw JSON proposal details, if retained, are clearly advanced/debug and not the primary apply path.
- [ ] All state-changing interactions still call existing typed admin input/API boundaries; no frontend code mutates `WorldSnapshot` directly.
- [ ] Existing operation errors, input rejections, loading states, empty states, and diagnostics remain visible.
- [ ] View-model or helper tests cover any new derived UI behavior and proposal draft/form mapping.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

## Out of Scope

- Replacing the map with Phaser, Pixi, Canvas, WebGL, or a new rendering engine.
- Adding Convex, realtime multiplayer infrastructure, persistence, auth, deployment, or production hardening.
- Implementing a new backend memory store, conversation engine, or agent cognitive loop.
- Letting LLM proposals apply directly without user review.
- Rewriting the whole dashboard navigation beyond the MVP panels needed for the above priorities.

## Open Questions

- Final visual style details can be decided during implementation from the existing CSS system; no product decision blocks task creation.
- If structured proposal forms expose only currently supported proposal fields, future proposal action kinds may still need follow-up tasks.
