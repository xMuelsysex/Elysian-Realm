# Frontend Realm Observation UX MVP

## Reference projects and borrowable frontend ideas

This task intentionally borrows UI/interaction ideas, not backend architecture, from similar multi-agent simulation projects.

## 1. AI Town

- URL: https://github.com/a16z-infra/ai-town
- Borrow: cozy pixel-town atmosphere, visible character markers, lightweight role cards, speech/activity bubbles, location occupancy clustering.
- Do not borrow now: Convex realtime backend, auth/deployment shape, multiplayer persistence.
- Fit for Elysian Realm: improve the existing CSS-based `RealmMapPanel` and view models while keeping backend snapshots authoritative.

## 2. ALICE_PROJECT / Generative Agents modern reproduction

- URL: https://github.com/jeffliulab/ALICE_PROJECT
- Borrow: replay-first controls such as play/pause, stepping, speed, progress, and event/time cursor.
- Do not borrow now: Python/FastAPI runtime, Phaser map rendering, full Smallville cognitive loop.
- Fit for Elysian Realm: enhance the current `ReplayPanel` over existing `AdminStateResponse.replay` + timeline items.

## 3. OpenStory

- URL: https://github.com/ZJU-LLMs/OpenStory
- Borrow: character dossier shape: current action, location, relationships, recent interactions/events, and story-readable character status.
- Do not borrow now: Ray/Agent-Kernel runtime or full story branching system.
- Fit for Elysian Realm: make the existing `AgentDetailPanel` feel more like an agent dossier without adding frontend-owned simulation rules.

## 4. Project-specific safety boundary to preserve

- Frontend renders backend-owned projections and submits typed inputs.
- Frontend must not patch `WorldSnapshot`, recompute simulation rules, or hide failed LLM operations.
- LLM proposals remain sandbox previews until user review submits through the existing admin input boundary.

## 5. Product direction for LLM proposal UX

- Current UI creates an editable raw JSON draft from a validated proposal.
- MVP direction: make a structured review/apply form primary for supported proposal fields, keep raw JSON under an advanced/debug affordance, and submit only through existing `onSubmitInput` / typed input helpers.
