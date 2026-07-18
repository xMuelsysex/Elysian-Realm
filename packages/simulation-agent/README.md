# @elysian/simulation-agent

`@elysian/simulation-agent` is an in-repo simulation-agent framework package. It owns generic agent-loop primitives, deterministic memory utilities, reflection validation, and a thin runtime facade. Host applications still own world state, action application, provider configuration, persistence, and scheduling policy.

## Boundary

The package owns:

- cognitive loop orchestration: perceive, retrieve, plan, act, remember, reflect diagnostics;
- generic ports and phase diagnostics;
- deterministic in-memory memory records and retrieval scoring;
- reflection input/output contracts and evidence validation;
- `SimulationAgentRuntime`, a thin facade over the primitives.

The host owns:

- authoritative world state and all mutations;
- perception projection shape;
- action proposal schema and approval/application semantics;
- production memory persistence, embeddings, and vector search;
- LLM provider configuration, retries, budgets, secrets, and cancellation;
- reflection trigger policy and evidence selection.

Do not import package internals from a host application. Use the public entrypoint:

```ts
import { SimulationAgentRuntime } from "@elysian/simulation-agent";
```

## Quick Start

Use the runtime facade when a host wants a compact integration surface. The host provides ports; the facade delegates to the canonical loop and reflection primitives.

```ts
import {
  InMemoryMemoryStore,
  SimulationAgentRuntime,
  type MemoryRetrievalQuery,
  type MemoryRetrievalHit,
  type MemoryWrite,
  type ReflectionPlanner,
} from "@elysian/simulation-agent";

interface Perception {
  agentId: string;
  now: string;
  eventId: string;
  observation: string;
}

interface Proposal {
  kind: "visit";
  summary: string;
  evidenceMemoryIds: readonly string[];
}

interface Metadata {
  topic?: string;
}

const agentId = "agent_demo";
const store = new InMemoryMemoryStore<Metadata>();
const submitted: Proposal[] = [];

store.remember(agentId, {
  kind: "observation",
  content: "The agent noticed a quiet garden conversation.",
  createdAt: "2026-07-04T09:00:00.000Z",
  importance: 5,
  sourceIds: ["event_garden"],
  tags: ["garden"],
  metadata: { topic: "observation" },
});

const runtime = new SimulationAgentRuntime<
  Perception,
  MemoryRetrievalQuery,
  MemoryRetrievalHit<Metadata>,
  MemoryWrite<Metadata>,
  Proposal,
  Metadata
>(
  {
    perception: {
      perceive: (id, now) => ({
        agentId: id,
        now,
        eventId: "event_current",
        observation: "The garden is quiet again.",
      }),
    },
    memory: store.toPort(),
    planning: {
      plan: ({ memories }) => ({
        source: "deterministic",
        reason: `retrieved ${memories.length} relevant memory hit(s)`,
        proposal: {
          kind: "visit",
          summary: "Visit the garden gently.",
          evidenceMemoryIds: memories.map((hit) => hit.record.id),
        },
      }),
    },
    actionSink: {
      submit: (_id, proposal) => {
        submitted.push(proposal);
      },
    },
    buildMemoryQuery: (perception) => ({
      text: perception.observation,
      now: perception.now,
      topK: 3,
    }),
    buildMemoryWrite: (perception, plan) => ({
      kind: "plan",
      content: `Plan created from observation: ${perception.observation}`,
      createdAt: perception.now,
      importance: 4,
      sourceIds: [perception.eventId],
      relatedMemoryIds: plan.proposal?.evidenceMemoryIds ?? [],
      tags: ["plan"],
      metadata: { topic: "plan" },
    }),
    reflectionMemory: store,
  },
  { persistReflectionWrites: true },
);

const tick = runtime.tickSync(agentId, "2026-07-04T10:00:00.000Z");
```

`tickSync` is for deterministic synchronous hosts. If a planner returns a Promise, `tickSync` fails the plan phase visibly. Use `tick` or a host-owned async operation boundary for LLM-backed planners.

## Explicit Reflection

Reflection is deliberately not automatic. The host decides when reflection should run and which memories count as evidence.

```ts
const evidence = store.retrieve(agentId, {
  text: "garden quiet plan",
  now: "2026-07-04T10:30:00.000Z",
  topK: 3,
}).hits;

const planner: ReflectionPlanner<Metadata, Metadata> = {
  reflect: (input) => ({
    source: "deterministic",
    reason: "The evidence repeats a garden preference pattern.",
    insights: [
      {
        content: "The agent may prefer gentle visits when the garden is quiet.",
        evidenceMemoryIds: input.evidence.map((memory) => memory.id),
        importance: 6,
        tags: ["reflection", "garden"],
        metadata: { topic: "reflection" },
      },
    ],
  }),
};

const reflection = await runtime.reflect(
  {
    agentId,
    trigger: {
      kind: "scheduled",
      reason: "Daily reflection window.",
      now: "2026-07-04T10:30:00.000Z",
      sourceIds: ["event_reflection_window"],
    },
    evidence: evidence.map((hit) => hit.record),
  },
  planner,
);
```

Dry-run reflection is the default unless `persistReflectionWrites` or per-call `persistWrites` is enabled. Persistence uses `reflectionMemory`, not the generic loop memory port, so host-specific memory write types stay separated from reflection memory writes.

## Facade vs Primitives

Use `SimulationAgentRuntime` when the host wants one configured object for normal ticks and explicit reflection calls.

Use primitives directly when the host needs tighter control:

- `runCognitiveTick` for async planners;
- `runCognitiveTickSync` for deterministic synchronous hosts;
- `InMemoryMemoryStore` and retrieval helpers for memory experiments;
- `runReflection` for one-off reflection operations without a runtime facade.

The facade must stay thin. If behavior differs between the facade and primitive functions, treat that as a bug.

## Testing Helpers

The package exports small deterministic helpers for host and package tests:

- `createStaticPerceptionPort` for fixed or factory-backed perception;
- `createStaticPlanningPort` for fixed or factory-backed plan results;
- `createMemoryPortStub` for recording retrieval and remember calls;
- `createActionCollector` for capturing submitted proposals.

These helpers are test utilities only. They do not apply proposals, schedule reflection, call providers, or persist production memory.

## Testing Expectations

Core package tests should be offline and deterministic. Use fake planners/providers and assert failed outputs remain visible diagnostics. Host applications should also keep boundary scans green:

```bash
rg -n "src/server|src/shared|src/app|\\.\\./\\.\\./src" packages/simulation-agent/src
rg -n "packages/simulation-agent/src|@elysian/simulation-agent/src" src tests
```
