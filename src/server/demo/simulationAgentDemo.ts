import { fileURLToPath } from "node:url";

import {
  InMemoryMemoryStore,
  SimulationAgentRuntime,
  type CognitiveTickResult,
  type MemoryRecord,
  type MemoryRetrievalHit,
  type MemoryRetrievalQuery,
  type MemoryWrite,
  type PhaseDiagnostic,
  type ReflectionPlanner,
  type RuntimeReflectionResult,
} from "@elysian/simulation-agent";

const AGENT_ID = "agent_demo";
const TICK_TIME = "2026-07-04T10:00:00.000Z";
const REFLECTION_TIME = "2026-07-04T10:30:00.000Z";

interface DemoMetadata {
  topic?: string;
}

interface DemoPerception {
  agentId: string;
  now: string;
  eventId: string;
  observation: string;
}

interface DemoProposal {
  kind: "visit";
  summary: string;
  evidenceMemoryIds: readonly string[];
}

type DemoHit = MemoryRetrievalHit<DemoMetadata>;
type DemoWrite = MemoryWrite<DemoMetadata>;

export interface SimulationAgentDemoResult {
  agentId: string;
  observation: string;
  retrievedMemories: readonly MemoryRecord<DemoMetadata>[];
  tick: CognitiveTickResult<DemoProposal>;
  submittedProposal?: DemoProposal;
  memoriesAfterTick: readonly MemoryRecord<DemoMetadata>[];
  reflection: RuntimeReflectionResult<DemoMetadata>;
  memoriesAfterReflection: readonly MemoryRecord<DemoMetadata>[];
}

export async function runSimulationAgentDemo(): Promise<SimulationAgentDemoResult> {
  const store = createSeededStore();
  const submitted: DemoProposal[] = [];
  let observation = "";
  let retrievedDuringTick: DemoHit[] = [];
  const storePort = store.toPort();

  const runtime = new SimulationAgentRuntime<
    DemoPerception,
    MemoryRetrievalQuery,
    DemoHit,
    DemoWrite,
    DemoProposal,
    DemoMetadata
  >(
    {
      perception: {
        perceive: (agentId, now) => {
          observation = "The garden has gone quiet after rehearsal, and Eden lingers near the fountain.";
          return {
            agentId,
            now,
            eventId: "event_garden_after_rehearsal",
            observation,
          };
        },
      },
      memory: {
        retrieve: (agentId, query) => {
          const hits = storePort.retrieve(agentId, query);
          retrievedDuringTick = [...hits];
          return hits;
        },
        remember: (agentId, write) => {
          storePort.remember(agentId, write);
        },
      },
      planning: {
        plan: ({ memories }) => ({
          source: "deterministic",
          reason: `Use ${memories.length} retrieved memories to choose a gentle check-in.`,
          proposal: {
            kind: "visit",
            summary: "Visit the garden and ask Eden whether she wants a quieter rehearsal space.",
            evidenceMemoryIds: memories.map((hit) => hit.record.id),
          },
        }),
      },
      actionSink: {
        submit: (_agentId, proposal) => {
          submitted.push(proposal);
        },
      },
      buildMemoryQuery: (perception) => ({
        text: perception.observation,
        now: perception.now,
        topK: 2,
        weights: { relevance: 0.6, recency: 0.1, importance: 0.3 },
      }),
      buildMemoryWrite: (perception, plan) => ({
        kind: "plan",
        content: `Plan proposed after observing: ${perception.observation}`,
        createdAt: perception.now,
        importance: 4,
        sourceIds: [perception.eventId],
        relatedMemoryIds: plan.proposal?.evidenceMemoryIds ?? [],
        tags: ["plan", "garden", "eden"],
        metadata: { topic: "plan" },
      }),
      reflectionMemory: store,
    },
    { persistReflectionWrites: true },
  );

  const tick = runtime.tickSync(AGENT_ID, TICK_TIME);
  const memoriesAfterTick = store.list(AGENT_ID);
  const evidence = store.retrieve(AGENT_ID, {
    text: "garden eden rehearsal plan",
    now: REFLECTION_TIME,
    topK: 3,
  }).hits;
  const reflection = await runtime.reflect(
    {
      agentId: AGENT_ID,
      trigger: {
        kind: "scheduled",
        reason: "Demo reflection after one observed plan.",
        now: REFLECTION_TIME,
        sourceIds: ["event_demo_reflection"],
      },
      evidence: evidence.map((hit) => hit.record),
    },
    createDemoReflectionPlanner(),
  );

  return {
    agentId: AGENT_ID,
    observation,
    retrievedMemories: retrievedDuringTick.map((hit) => hit.record),
    tick,
    ...(submitted[0] ? { submittedProposal: submitted[0] } : {}),
    memoriesAfterTick,
    reflection,
    memoriesAfterReflection: store.list(AGENT_ID),
  };
}

export function formatSimulationAgentDemo(result: SimulationAgentDemoResult): string {
  const lines = [
    "Simulation Agent Demo",
    `Agent: ${result.agentId}`,
    `Observation: ${result.observation}`,
    "",
    "Retrieved memories:",
    ...formatMemories(result.retrievedMemories),
    "",
    "Tick phases:",
    ...formatPhases(result.tick.phases),
    "",
    "Proposal:",
    result.submittedProposal
      ? `- ${result.submittedProposal.kind}: ${result.submittedProposal.summary}`
      : "- none",
    "",
    "Memories after tick:",
    ...formatMemories(result.memoriesAfterTick),
    "",
    "Reflection:",
    `- status: ${result.reflection.status}`,
    ...result.reflection.memoryWrites.map((write) => `- insight: ${write.content}`),
    "",
    "Persisted reflection memories:",
    ...formatMemories(result.reflection.persistedRecords),
  ];

  return `${lines.join("\n")}\n`;
}

function createSeededStore(): InMemoryMemoryStore<DemoMetadata> {
  const store = new InMemoryMemoryStore<DemoMetadata>();
  store.remember(AGENT_ID, {
    id: "memory_garden_quiet",
    kind: "observation",
    content: "Eden often stays in the garden when she wants a quieter space after rehearsal.",
    createdAt: "2026-07-04T08:45:00.000Z",
    importance: 6,
    sourceIds: ["event_prior_garden"],
    tags: ["garden", "eden", "rehearsal"],
    metadata: { topic: "observation" },
  });
  store.remember(AGENT_ID, {
    id: "memory_rehearsal_promise",
    kind: "conversation",
    content: "The agent promised to check whether Eden prefers softer rehearsal arrangements.",
    createdAt: "2026-07-04T09:15:00.000Z",
    importance: 7,
    sourceIds: ["event_prior_promise"],
    relatedMemoryIds: ["memory_garden_quiet"],
    tags: ["eden", "promise", "rehearsal"],
    metadata: { topic: "conversation" },
  });
  return store;
}

function createDemoReflectionPlanner(): ReflectionPlanner<DemoMetadata, DemoMetadata> {
  return {
    reflect: (input) => ({
      source: "deterministic",
      reason: "The evidence repeatedly links Eden, rehearsal, and quiet garden context.",
      insights: [
        {
          content: "Eden may appreciate being approached gently after rehearsal, especially in the garden.",
          evidenceMemoryIds: input.evidence.map((memory) => memory.id),
          importance: 7,
          tags: ["reflection", "garden", "eden"],
          metadata: { topic: "reflection" },
        },
      ],
    }),
  };
}

function formatMemories(memories: readonly MemoryRecord<DemoMetadata>[]): string[] {
  if (memories.length === 0) {
    return ["- none"];
  }
  return memories.map(
    (memory) =>
      `- ${memory.id} [${memory.kind}, importance=${memory.importance}]: ${memory.content}`,
  );
}

function formatPhases(phases: readonly PhaseDiagnostic[]): string[] {
  return phases.map((phase) => `- ${phase.phase}: ${phase.status} (${phase.detail})`);
}

function isMainModule(): boolean {
  return process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];
}

if (isMainModule()) {
  runSimulationAgentDemo()
    .then((result) => {
      process.stdout.write(formatSimulationAgentDemo(result));
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`simulation agent demo failed: ${message}\n`);
      process.exitCode = 1;
    });
}
