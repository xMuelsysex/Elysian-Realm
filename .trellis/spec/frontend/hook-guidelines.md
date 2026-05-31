# Frontend Hook Guidelines

> Hook rules for querying realm projections, submitting commands, and building typed view models.

## Core Principle

Hooks may fetch data, submit commands, and shape typed view models for components. Hooks must not implement backend simulation rules or duplicate event payload parsing.

## Hook Categories

Use hooks for these concerns only:

- **Projection hooks**: subscribe to backend world/timeline/agent/conversation projections.
- **Command hooks**: submit typed user interventions and simulation controls.
- **View-model hooks**: compose projections into component-friendly structures.
- **Replay hooks**: control local replay cursor, speed, and selected event.
- **Debug hooks**: load diagnostics such as operation errors and retrieval scores.

## Naming Conventions

Use explicit names:

- `useRealmProjection`
- `useRealmTimeline`
- `useAgentProfile`
- `useConversationView`
- `useSendRealmCommand`
- `useReplayControls`
- `useDecisionDiagnostics`

Avoid generic names such as `useData`, `useStore`, `useAgent`, or `useEvents` outside a clearly scoped feature folder.

## Data Fetching Pattern

Recommended flow:

```text
backend projection/query -> feature hook -> typed view model -> component props
```

Rules:

- Fetch backend projections, not raw database rows, when possible.
- Keep loading/error states in the hook return value.
- Preserve IDs needed for navigation and debugging.
- Do not merge generated content into configured persona facts.

## Command Submission Pattern

Recommended flow:

```text
form state -> shared command schema validation -> command hook -> backend command boundary -> input status/result
```

MVP intervention commands include:

- observer commands: pause/resume/step/speed/debug/reflection requests;
- realm events: gatherings, location events, schedule nudges, anomalies, invitations, or environmental prompts;
- direct private messages: typed user messages to one agent.

Rules:

- Observer commands and realm events are the primary intervention modes.
- Direct private messages are allowed but should remain one command type, not the dominant UI model.
- Validate required command fields before submit.
- Expose pending/success/error states to components.
- Return or expose the created input/command ID when available.
- Do not optimistically mutate authoritative world state.

Optimistic UI may show local pending status for a submitted command, but final state must come from backend events/projections.

## Event Projection Rule

Raw event payload parsing must be centralized in shared contract/projection code.

Allowed:

```text
useRealmTimeline() imports projectEventToTimelineItem(event)
```

Forbidden:

```text
const actor = (event.payload as any).actor
```

If a hook needs a new event field, add it to the shared event projection and update tests.

## Replay Hooks

Replay hooks own local playback UI state only:

- current replay cursor;
- speed;
- selected event/step;
- paused/running mode.

They must not fabricate event results or call live LLM providers. Replay content comes from persisted events/snapshots.

## Common Mistakes

- Mirroring the whole world snapshot in local hook state.
- Hiding backend operation failures by returning empty arrays.
- Combining multiple event kinds with ad-hoc `if` chains in a hook.
- Making hooks depend on provider/model internals.
- Auto-scrolling timeline updates in a way that steals user focus.

## Testing Expectations

When hooks are implemented, tests should cover:

- loading/error returns;
- command validation failures;
- command pending and server rejection states;
- event projection shape per event kind;
- replay controls independent from live backend/model calls.
