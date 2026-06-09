# Reference Visual Polish Research

## Existing task context

The archived `06-06-frontend-realm-observation-ux-mvp` task already identified relevant reference projects and implemented the first functional UX layer. This task should not repeat that architecture work; it should improve visual presentation and perceived quality.

## Similar project patterns to borrow

### AI Town / virtual town dashboards

Borrow:
- Miniature map atmosphere with a cozy, spatial board feel.
- Character markers that are visually distinct from locations.
- Speech/activity bubbles that make autonomous agents feel alive.
- Occupancy clustering and small status labels rather than only tables.

Avoid:
- Realtime multiplayer architecture.
- Convex-style data model assumptions.
- Pixel-perfect sprites or a new renderer.

### ALICE / Generative Agents replay UIs

Borrow:
- Replay as a prominent inspection mode.
- Strong progress/cursor affordance and current event highlight.
- Clear separation between live stepping and replay playback.

Avoid:
- Python/FastAPI runtime shape.
- Phaser/canvas map rendering.
- Full Smallville cognitive-loop UI complexity.

### OpenStory / agent narrative tools

Borrow:
- Dossier-like character cards with current action, location, relationships, and recent story events.
- Story-readable status summaries supported by structured detail sections.
- Strong provenance labels so generated narrative does not become immutable canon.

Avoid:
- Full story branching system.
- Agent-kernel runtime assumptions.

## Current visual opportunities in Elysian Realm

- `src/app/styles.css` already centralizes styles, so a token/theme pass can be low-risk.
- `RealmMapPanel` already renders locations, links, agents, bubbles, and pulses from `RealmMapViewModel`; polish can mostly be CSS plus small markup class refinements.
- `RealmDashboard` tabs and panel shells are functionally clear but visually generic.
- `AgentDetailPanel`, replay panel, timeline, and LLM review form already contain the necessary structure and should be styled rather than behaviorally rewritten.

## Recommended MVP visual direction

Primary: **glassy observatory + cozy miniature realm board**.

Rationale:
- Fits Elysian Realm's observation/debug framing.
- Keeps the developer dashboard credible while adding atmosphere.
- Lets the map borrow AI Town warmth without requiring pixel art assets.
- Supports provenance/debug cards with translucent surfaces and strong hierarchy.
