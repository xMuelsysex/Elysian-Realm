import {
  SimulationAgentRuntime,
  type CognitiveLoopDeps,
  type MemoryPort,
  type MemoryRecord,
  type MemoryRetrievalHit,
  type MemoryRetrievalQuery,
  type MemoryWrite,
  type PhaseDiagnostic,
  type PlanningPort,
  type ReflectionDiagnostic,
  type ReflectionPlanner,
  type ReflectionStatus,
  type ReflectionTrigger,
  type ReflectionTriggerKind,
} from "@elysian/simulation-agent";
import type { AgentRuntimeState, PersonaSpec, PlanAction, WorldSnapshot } from "../../shared/contracts/index.js";
import type { AgentId, AgentStatus, LocationId, OperationId, PersonaId } from "../../shared/domain/index.js";
import { pilotPersonas } from "../personas/index.js";
import { createRoutineAction, resolveRoutinePeriod, selectActiveRoutine, type ActiveRoutineSelection, type RoutinePeriod } from "./routines.js";

export interface AgentRoutinePerception {
  agentId: AgentId;
  personaId: PersonaId;
  status: AgentStatus;
  locationId: LocationId;
  period: RoutinePeriod;
  currentActionId?: string;
  inProgressOperationId?: OperationId;
  nearbyAgentIds: readonly AgentId[];
  activeRoutine?: ActiveRoutineSelection;
}

export interface AgentMemoryQuery {
  agentId: AgentId;
  locationId: LocationId;
  period: RoutinePeriod;
}

export type EngineMemorySource = "engine" | "seed";
export type EngineReflectionSource = "deterministic";

export interface EngineMemoryMetadata {
  stepId: string;
  source: EngineMemorySource;
  period?: RoutinePeriod;
  locationId?: LocationId;
  proposalKind?: string;
  planId?: string;
  llmOperationId?: string;
  reviewedBy?: string;
  proposalAction?: string;
  triggerKind?: ReflectionTriggerKind;
  reflectionSource?: EngineReflectionSource;
}

export type EngineMemoryRecord = MemoryRecord<EngineMemoryMetadata>;
export type AgentMemoryRetrievalQuery = MemoryRetrievalQuery;
export type AgentMemoryHit = MemoryRetrievalHit<EngineMemoryMetadata>;
export type AgentMemoryWrite = MemoryWrite<EngineMemoryMetadata>;

export interface EngineAgentTickDiagnostic {
  agentId: AgentId;
  phases: PhaseDiagnostic[];
  proposal?: PlanAction;
}

export interface EngineAgentTickResult extends EngineAgentTickDiagnostic {
  activeRoutine?: ActiveRoutineSelection;
}

export interface EngineReflectionDiagnostic {
  agentId: AgentId;
  status: ReflectionStatus;
  evidenceMemoryIds: string[];
  persistedMemoryIds: string[];
  diagnostics: ReflectionDiagnostic[];
  reason?: string;
  trigger?: ReflectionTrigger;
}

export interface EngineReflectionResult extends EngineReflectionDiagnostic {
  memoryWrites: readonly AgentMemoryWrite[];
}

export interface RunAgentCognitiveTickForEngineOptions {
  personas?: readonly PersonaSpec[];
  memory?: MemoryPort<AgentMemoryRetrievalQuery, AgentMemoryHit, AgentMemoryWrite>;
  stepId?: string;
  sourceIds?: readonly string[];
  planning?: PlanningPort<AgentRoutinePerception, AgentMemoryHit, PlanAction>;
}

export interface RunAgentReflectionForEngineOptions {
  stepId: string;
  now: string;
  evidence: readonly EngineMemoryRecord[];
  triggerSourceIds: readonly string[];
  reason: string;
  period?: RoutinePeriod;
  locationId?: LocationId;
  planner?: ReflectionPlanner<EngineMemoryMetadata, EngineMemoryMetadata>;
}

export function runAgentCognitiveTickForEngine(
  snapshot: WorldSnapshot,
  agent: AgentRuntimeState,
  options: RunAgentCognitiveTickForEngineOptions = {},
): EngineAgentTickResult {
  const perception = createAgentRoutinePerception(snapshot, agent, options.personas ?? pilotPersonas);
  const submitted: PlanAction[] = [];
  const deps: CognitiveLoopDeps<AgentRoutinePerception, AgentMemoryRetrievalQuery, AgentMemoryHit, AgentMemoryWrite, PlanAction> = {
    perception: {
      perceive: () => perception,
    },
    memory: options.memory ?? createMemoryStub(),
    planning: options.planning ?? createDeterministicRoutinePlanner(snapshot.currentTime),
    actionSink: {
      submit: (_agentId, proposal) => {
        submitted.push(proposal);
      },
    },
    buildMemoryQuery: (projected) => ({
      text: [
        projected.agentId,
        projected.personaId,
        projected.status,
        projected.locationId,
        projected.period,
        projected.activeRoutine?.intent,
      ].filter(isString).join(" "),
      now: snapshot.currentTime,
      topK: 3,
      tags: [projected.agentId, projected.personaId, projected.locationId, projected.period],
    }),
  };
  if (options.memory) {
    deps.buildMemoryWrite = (projected, plan) => buildEnginePlanMemoryWrite(projected, plan, snapshot.currentTime, options.stepId ?? snapshot.lastStepId, options.sourceIds ?? [options.stepId ?? snapshot.lastStepId]);
  }

  const runtime = new SimulationAgentRuntime(deps);
  const result = runtime.tickSync(agent.id, snapshot.currentTime);
  const proposal = result.proposal ?? submitted[0];
  return {
    agentId: agent.id,
    phases: result.phases,
    ...(proposal ? { proposal } : {}),
    ...(proposal && perception.activeRoutine ? { activeRoutine: perception.activeRoutine } : {}),
  };
}

export function runAgentReflectionForEngine(
  agent: AgentRuntimeState,
  options: RunAgentReflectionForEngineOptions,
): EngineReflectionResult {
  const evidenceMemoryIds = options.evidence.map((memory) => memory.id);
  const trigger: ReflectionTrigger = {
    kind: "importance-threshold",
    reason: options.reason,
    now: options.now,
    sourceIds: [...new Set([options.stepId, ...options.triggerSourceIds])],
  };
  const runtime = createReflectionRuntime();
  const result = runtime.reflectSync(
    {
      agentId: agent.id,
      trigger,
      evidence: options.evidence,
      maxInsights: 1,
    },
    options.planner ?? createDeterministicReflectionPlanner(agent, {
      stepId: options.stepId,
      period: options.period,
      locationId: options.locationId ?? agent.locationId,
    }),
    { persistWrites: false },
  );

  return {
    agentId: agent.id,
    status: result.status,
    evidenceMemoryIds,
    persistedMemoryIds: [],
    memoryWrites: result.memoryWrites,
    diagnostics: cloneReflectionDiagnostics(result.diagnostics),
    reason: result.diagnostics[0]?.message ?? options.reason,
    trigger,
  };
}

function buildEnginePlanMemoryWrite(
  perception: AgentRoutinePerception,
  plan: { source: string; proposal?: PlanAction },
  now: string,
  stepId: string,
  sourceIds: readonly string[],
): AgentMemoryWrite | undefined {
  const proposal = plan.proposal;
  if (!proposal) return undefined;

  return {
    id: `memory_${stepId}_${perception.agentId}_plan`.replace(/[^a-z0-9_]+/gi, "_").toLowerCase(),
    kind: "plan",
    content: `${perception.agentId} planned ${proposal.kind}: ${proposal.intent}`,
    createdAt: now,
    importance: 4,
    sourceIds,
    visibility: "system",
    tags: [perception.agentId, perception.personaId, perception.locationId, perception.period, proposal.kind],
    metadata: {
      stepId,
      source: "engine",
      period: perception.period,
      locationId: proposal.locationId ?? perception.locationId,
      proposalKind: proposal.kind,
      planId: proposal.id,
    },
  };
}

function createDeterministicReflectionPlanner(
  agent: AgentRuntimeState,
  context: { stepId: string; period?: RoutinePeriod; locationId?: LocationId },
): ReflectionPlanner<EngineMemoryMetadata, EngineMemoryMetadata> {
  return {
    reflect: (input) => {
      const evidenceIds = input.evidence.map((memory) => memory.id);
      const plan = input.evidence.find((memory) => memory.kind === "plan");
      const importance = Math.min(9, Math.max(6, ...input.evidence.map((memory) => memory.importance + 1)));
      return {
        source: "deterministic",
        reason: `bounded engine reflection over ${evidenceIds.length} memory record(s)`,
        insights: [
          {
            content: `${agent.displayName} reflected on ${plan?.content ?? "recent memory evidence"} and kept the pattern available for future planning.`,
            evidenceMemoryIds: evidenceIds,
            importance,
            tags: [agent.id, agent.personaId, "reflection", context.period, context.locationId].filter(isString),
            metadata: {
              stepId: context.stepId,
              source: "engine",
              period: context.period,
              locationId: context.locationId,
              triggerKind: input.trigger.kind,
              reflectionSource: "deterministic",
            },
          },
        ],
      };
    },
  };
}

function createReflectionRuntime(): SimulationAgentRuntime<
  AgentRoutinePerception,
  AgentMemoryRetrievalQuery,
  AgentMemoryHit,
  AgentMemoryWrite,
  PlanAction,
  EngineMemoryMetadata
> {
  return new SimulationAgentRuntime<
    AgentRoutinePerception,
    AgentMemoryRetrievalQuery,
    AgentMemoryHit,
    AgentMemoryWrite,
    PlanAction,
    EngineMemoryMetadata
  >({
    perception: {
      perceive: () => {
        throw new Error("reflection-only runtime should not perceive");
      },
    },
    memory: createMemoryStub(),
    planning: {
      plan: () => ({ source: "skipped", reason: "reflection-only runtime does not plan" }),
    },
    actionSink: {
      submit: () => undefined,
    },
    buildMemoryQuery: () => ({
      text: "",
      now: new Date(0).toISOString(),
      topK: 1,
    }),
  });
}

function cloneReflectionDiagnostics(diagnostics: readonly ReflectionDiagnostic[]): ReflectionDiagnostic[] {
  return diagnostics.map((diagnostic) => ({
    ...diagnostic,
    evidenceMemoryIds: diagnostic.evidenceMemoryIds ? [...diagnostic.evidenceMemoryIds] : undefined,
  }));
}

export function createAgentRoutinePerception(
  snapshot: WorldSnapshot,
  agent: AgentRuntimeState,
  personas: readonly PersonaSpec[] = pilotPersonas,
): AgentRoutinePerception {
  const period = resolveRoutinePeriod(snapshot.currentTime);
  const persona = personas.find((candidate) => candidate.id === agent.personaId);
  const activeRoutine = persona ? selectActiveRoutine(agent.personaId, period, persona.routines[period]) : undefined;
  const nearbyAgentIds = snapshot.agents
    .filter((candidate) => candidate.id !== agent.id && candidate.locationId === agent.locationId)
    .map((candidate) => candidate.id);

  return {
    agentId: agent.id,
    personaId: agent.personaId,
    status: agent.status,
    locationId: agent.locationId,
    period,
    currentActionId: agent.currentAction?.id,
    inProgressOperationId: agent.inProgressOperationId,
    nearbyAgentIds,
    ...(activeRoutine ? { activeRoutine } : {}),
  };
}

export function createDeterministicRoutinePlanner(
  startsAt: string,
): PlanningPort<AgentRoutinePerception, AgentMemoryHit, PlanAction> {
  return {
    plan: ({ perception }) => {
      if (perception.inProgressOperationId) {
        return {
          source: "skipped",
          reason: `agent already has in-flight operation ${perception.inProgressOperationId}`,
        };
      }

      const routine = perception.activeRoutine;
      if (!routine) {
        return { source: "skipped", reason: "no configured routine for current period" };
      }

      if (perception.currentActionId === routine.routineId && perception.locationId === routine.locationId) {
        return { source: "skipped", reason: "agent is already following the active routine" };
      }

      return {
        source: "deterministic",
        proposal: createRoutineAction(routine, startsAt),
        reason: "configured routine fallback",
      };
    },
  };
}

function createMemoryStub(): MemoryPort<AgentMemoryRetrievalQuery, AgentMemoryHit, AgentMemoryWrite> {
  return {
    retrieve: () => [],
    remember: () => undefined,
  };
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}
