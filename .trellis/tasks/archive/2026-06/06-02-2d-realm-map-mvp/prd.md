# 2D Realm Map MVP

## Goal

Add a 2D visual realm map to the local admin dashboard so users can understand locations, agent placement, proximity, and recent simulation activity at a glance, while preserving backend-owned simulation state and the existing text/timeline/debug views.

## User Value

The dashboard already exposes world state through location cards, topology cards, agent detail panels, and timelines. A 2D semantic map will make the realm feel more alive and easier to scan: users can see where characters are, who shares a space, what recently happened, and click into existing agent/location/timeline details without reading raw tables first.

## Confirmed Facts

- The app is a local Vite + React admin dashboard under `src/app/**`.
- `RealmDashboard` currently renders, in order, `LocationTopology`, `LocationBoard`, `AgentDetailPanel`, relationship/timeline/replay/inspector/memory/message/debug panels.
- Local UI state already includes `selectedAgentId`, `selectedEventId`, `timelineFilters`, `timelineDetailMode`, replay state, auto-step, and export timestamp.
- `LocationBoard` already supports accessible agent selection through `selectedAgentId` and `onSelectAgent`.
- `createTopologyViewModel(snapshot, timelineItems)` already derives topology nodes and movement path summaries from backend snapshot/timeline projections.
- `groupAgentsByLocation(snapshot.locations, snapshot.agents)` already derives agent groups by backend-owned `locationId`.
- `TimelineFilters` already supports `targetId`, so location selection can reuse existing timeline filtering instead of inventing a new filter path.
- Frontend specs allow 2D map work only after text timeline/profile/intervention/replay/debug contracts are stable; those already exist in the current dashboard.
- Frontend specs forbid direct UI mutation of agent/world/conversation state and forbid component-level raw `event.payload` parsing.
- Current engine has deterministic startup/routine events but limited movement after startup; map MVP must work even when positions are static.

## Requirements

1. Add a 2D semantic map panel to the main dashboard above or near the current location/topology panels.
2. Render every backend `LocationRef` as a positioned map node/room.
3. Render every `AgentRuntimeState` as an agent marker inside the node matching its backend `locationId`.
4. Click or keyboard-selecting an agent marker must update the existing `selectedAgentId` and reuse the existing `AgentDetailPanel` behavior.
5. Click or keyboard-selecting a location node must maintain local `selectedLocationId` UI state and apply a timeline target filter using the existing `TimelineFilters.targetId` path.
6. Show recent map event pulses/callouts from centralized timeline/event projections, not component-level payload parsing.
7. Show at least:
   - selected agent highlight;
   - selected location highlight;
   - agent status labels/badges;
   - location occupancy count or agent group;
   - recent event pulse(s) for user interventions, rejected inputs, startup/routine/spawn events, or memory seed events.
8. Use a static frontend layout map for visual coordinates only. It must not become authoritative world state.
9. Preserve accessibility:
   - map locations and agent markers are buttons or keyboard-focusable controls;
   - selected state is textual/ARIA-visible, not color-only;
   - map has a text fallback/summary for screen readers.
10. Preserve responsive layout on narrow screens.
11. Add focused view-model tests for map node/agent marker/pulse derivation and location filter behavior.
12. Do not add Canvas/WebGL/game-loop/pathfinding/drag-and-drop in this MVP.

## Acceptance Criteria

- [x] The dashboard displays a 2D realm map panel with all current locations.
- [x] Each agent appears in the location matching `snapshot.agents[].locationId`.
- [x] Selecting an agent marker updates the existing agent detail panel.
- [x] Selecting a location highlights that location and filters the timeline by that location id.
- [x] Clearing or changing timeline filters remains possible through the existing timeline controls.
- [x] Recent event pulses/callouts are derived from existing `TimelineItem`/event projections and include source/status text.
- [x] The map does not directly mutate `WorldSnapshot`, agent locations, world time, conversations, plans, or memories.
- [x] Components do not parse raw `event.payload` locally.
- [x] Map interactions are keyboard accessible and selected states are not color-only.
- [x] `npm run typecheck` passes.
- [x] `npm test` passes.
- [x] `npm run build` passes.
- [x] `git diff --check` passes.
- [x] `python3 ./.trellis/scripts/task.py validate 06-02-2d-realm-map-mvp` passes.

## Out of Scope

- Backend simulation changes.
- True real-time character movement or animation driven by a game loop.
- Dragging agents or locations.
- Frontend-owned movement/pathfinding/collision.
- Canvas, WebGL, Pixi, Phaser, or map editor tooling.
- Conversation lifecycle implementation.
- New LLM calls.
- New persistence or database layer.
- Extracted/datamined game assets, proprietary dialogue, or web-sourced assets whose public posting does not include explicit compatible reuse/redistribution terms. Official public assets may be committed only when their accompanying terms/media kit/fan-content policy allow this repository's non-commercial use and attribution is recorded. Optional local-only asset overrides can still be considered for user-owned assets that are gitignored and not required for tests/builds.

## Product Decision

Use a **pixel/chibi board** visual direction for the first 2D map.

Constraints for MVP:

- Use CSS/HTML/React only; no Canvas/WebGL/game-loop engine.
- Default implementation uses original placeholder/chibi-style markers made from initials, icons, colors, or simple shapes.
- Committable visual assets are allowed only when they are original project-created assets, third-party assets with explicit redistribution permission such as CC0/CC-BY/MIT, or official publicly released assets whose accompanying terms/media kit/fan-content policy explicitly allow this repository's non-commercial redistribution/use.
- Any committed third-party or official public asset must include source URL, access date, license/terms summary, and attribution in repository documentation or a nearby asset manifest.
- Do not commit extracted/datamined assets, proprietary assets without explicit reuse terms, or web-sourced files where public visibility is not accompanied by clear redistribution/use permission.
- The UI may be designed with asset slots so a developer can optionally point to locally provided, gitignored assets they have rights to use; placeholders must remain the default and tests must not depend on local assets.
- Keep map positions derived from backend `locationId` and static frontend layout coordinates only.
- Keep text labels, badges, and existing location board as accessible fallbacks.

## Open Question

None blocking for planning. Implementation can start after user approval.
