# Agent Tick Inspector - Design

## 1. Boundary Objective

The engine already produces `agentTickDiagnostics` as non-replay diagnostics. The admin layer should retain the most recent step's diagnostics and expose them as a read-only projection.

The backend owns:

- the current world snapshot;
- replay-visible events;
- latest agent tick diagnostics.

The frontend owns:

- local selection/filter state;
- read-only rendering of backend projections.

The frontend must not compute new simulation facts or mutate diagnostics/events.

## 2. Backend Shape

Extend `AdminStateResponse`:

```ts
interface AdminStateResponse {
  ...
  agentTickDiagnostics: EngineAgentTickDiagnostic[];
}
```

The controller should maintain a local `latestAgentTickDiagnostics` array per controller instance:

- initial state: `[]`;
- `step()`: store `stepSimulationEngine(state).agentTickDiagnostics`;
- `submitInput()`: store diagnostics from the immediate step after queuing input;
- `reset()`: clear to `[]`;
- `getState()`: return the latest stored diagnostics.

This avoids appending diagnostics to `SimulationEvent[]` while still exposing the last engine step.

## 3. Frontend View Model

Add an `AgentTickInspectorViewModel` in `shared/viewModels.ts`:

- rows keyed by `agentId`;
- optional display name from snapshot/personas;
- `phases`;
- optional `proposal`;
- related same-step events where `actorId === agentId` or `targetIds` includes `agentId`.

Same-step events should be derived from current `state.events` and the latest diagnostics. Because diagnostics have no explicit `stepId` today, choose the most recent `stepId` among events and match only events from that step. This is display-only and must be documented in the helper name/logic.

## 4. UI Panel

Add an `AgentTickInspectorPanel` to `ObservabilityPanels.tsx` and mount it in the existing observability stack in `RealmDashboard.tsx`.

The panel should:

- render an explicit empty state when no diagnostics exist;
- render compact phase badges/details;
- render proposal JSON using existing `JsonDetails`;
- render related same-step event IDs/kinds through projected `TimelineItem` labels when available.

## 5. Tests

Backend tests:

- initial admin response has `agentTickDiagnostics: []`;
- step response includes diagnostics after running agents;
- diagnostics do not appear as events/timeline/replay entries;
- reset clears diagnostics.

View-model tests:

- empty diagnostics produce empty-state model;
- diagnostic rows include phases/proposal;
- same-step events are associated with the correct agent.

## 6. Non-Goals

- No diagnostics history.
- No persisted memory/reflection stream.
- No new simulation events.
- No demo-data panel.
