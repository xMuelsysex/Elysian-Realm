# Observability UI Feature Suite PRD

## Problem

The local admin dashboard needs to grow from a basic world/timeline debug view into a complete inspection surface for the deterministic simulation. The UI must make agents, relationships, events, world state, replay, interventions, diagnostics, memory seeds, messages, diffs, plans, location topology, personas, and export state visible without moving simulation ownership into the frontend.

## Scope

Implement an MVP for all requested local debug/admin observability features:

1. Enhanced Agent detail panel with configured persona summary, long-term goals, runtime mood/intent, and recent memory index.
2. Agent relationship network view with affinity/trust/tension/faction-like grouping and interaction history.
3. Main timeline filtering by agent, event kind, source, and target.
4. Clickable event detail drawer/panel with natural summary, debug facts, payload, and related agents.
5. World state inspector for `WorldSnapshot` time, status, locations, agents, queues, and diagnostics.
6. Visual time controls for pause/resume, single step, speed, jump-to-tick, and auto-step toggle.
7. Reusable intervention templates for observer commands, realm events, and direct/private messages.
8. Input result receipts showing accepted/rejected status, reason, resulting events, and affected objects.
9. Replay UI using replay summary/events for step-by-step event playback.
10. Event search by keyword, kind, agent id, and time range.
11. Read-only persona page for loaded pilot persona fixtures.
12. Memory view MVP showing memory seed/events and separating runtime memories from configured facts.
13. Conversation/message stream panel for direct/private/public message-like events grouped by agent conversation.
14. Enhanced diagnostics center aggregating validation errors, rejected inputs, anomalies, and links to events/locations/agents.
15. State diff view after each state update showing status, time, agent, location, and queue changes.
16. Agent action plan view for `currentPlanId`, `currentAction`, and operation placeholder/status.
17. Location topology view showing location graph, agent distribution, and observed movement/action paths.
18. Local debug export of current state, events, timeline, replay, diagnostics, and derived diffs as JSON.

## Out of Scope

- Editing personas or persistence.
- Real MemoryRecord storage beyond existing memory events and configured facts.
- New LLM/provider calls.
- Production auth/deployment.
- Full graph-rendering libraries; a semantic CSS topology/matrix is acceptable.

## Requirements

- Keep backend simulation state authoritative.
- User interventions must continue through typed admin input contracts.
- Event payload interpretation must remain centralized in shared view-model/projection helpers, not repeated in components.
- Generated/runtime memory-like event content must be clearly separated from configured persona facts.
- New UI states must be inspectable and accessible with text labels.
- Tests must cover the new projection helpers and critical UI-derived models.

## Acceptance Criteria

- `npm run typecheck` passes.
- `npm test` passes.
- Each of the 18 requested capabilities has a visible UI panel or control in the local dashboard.
- The dashboard can still load the deterministic seed, step, submit inputs, reset, and display diagnostics.
- The final implementation audit maps every requested numbered item to an implemented file/path.
