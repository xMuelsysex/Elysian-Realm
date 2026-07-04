# Elysian Agent Memory Stream - Design

## 1. Boundary Objective

M12 connects package memory primitives to the real Elysian engine without moving world authority into memory. The engine owns the memory stream as runtime context/diagnostics. Replay-visible events remain the source for replay, while memory records become inspectable supporting state.

## 2. Backend Shape

Extend `SimulationEngineState` with a package memory store or serializable memory records. Prefer serializable records in state plus small helper functions over storing class instances in state:

```ts
interface SimulationEngineState {
  snapshot: WorldSnapshot;
  events: SimulationEvent[];
  stepCount: number;
  startupEmitted: boolean;
  agentMemories: MemoryRecord<EngineMemoryMetadata>[];
}
```

Reasons:

- `SimulationEngineState` is already plain data.
- Admin cloning is straightforward.
- Tests can assert exact deterministic records.
- Future persistence can store records directly.

Use `InMemoryMemoryStore` inside a single step as an adapter around the current records:

1. Rehydrate the store from existing records with stable IDs.
2. Run each agent tick with `store.toPort()`.
3. Collect the store's final records back into `nextState.agentMemories`.

Because `InMemoryMemoryStore` does not currently accept initial records, either add a small package-level factory/import method or build an engine-local memory port around package validation/retrieval helpers. Prefer a package-owned `createInMemoryMemoryStore(records?)`/constructor option if it stays generic and tested.

## 3. Memory Metadata

Add Elysian-local metadata for records written by the engine adapter:

```ts
interface EngineMemoryMetadata {
  stepId: string;
  source: "engine";
  period?: string;
  locationId?: string;
  proposalKind?: string;
  planId?: string;
}
```

Seed memories can use `kind: "observation"` and `sourceIds` pointing at deterministic seed identifiers. Tick memories can use `kind: "plan"` when a proposal is produced.

## 4. Adapter Changes

`runAgentCognitiveTickForEngine(...)` should accept a package memory port and build real memory queries/writes:

- query text from perception: agent, location, period, active routine intent;
- tags: `agentId`, `locationId`, `period`;
- write only when a proposal exists;
- content: concise plan/proposal summary;
- source IDs: current step ID and source event IDs available for the tick.

The adapter still returns diagnostics/proposal only. It does not apply actions or mutate snapshot directly.

## 5. Admin/UI Shape

Extend `AdminStateResponse`:

```ts
agentMemories: MemoryRecord<EngineMemoryMetadata>[];
```

Add a view model grouping memories by agent:

- agent id/name;
- memory id/kind/importance/visibility;
- content;
- source IDs;
- tags;
- created/last accessed time.

Render a read-only `AgentMemoryStreamPanel`, likely in overview/debug or agents page.

## 6. Tests

Backend:

- initial state has deterministic seed memories or an explicitly empty stream;
- after a proposal-producing step, memory count increases deterministically;
- retrieved memories affect the retrieve phase count;
- records are cloned in Admin responses;
- records do not appear in events/timeline/replay JSON.

View model:

- empty stream renders empty model;
- grouped rows include agent display names and memory metadata;
- source IDs/tags are preserved for display.

## 7. Non-Goals

- Reflection scheduling.
- LLM planner.
- Memory eviction/capacity.
- New replay event kinds.
