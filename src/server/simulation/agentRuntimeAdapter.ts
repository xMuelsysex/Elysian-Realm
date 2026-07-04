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

export interface EngineMemoryMetadata {
  stepId: string;
  source: EngineMemorySource;
  period?: RoutinePeriod;
  locationId?: LocationId;
  proposalKind?: string;
  planId?: string;
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

export interface RunAgentCognitiveTickForEngineOptions {
  personas?: readonly PersonaSpec[];
  memory?: MemoryPort<AgentMemoryRetrievalQuery, AgentMemoryHit, AgentMemoryWrite>;
  stepId?: string;
  sourceIds?: readonly string[];
  planning?: PlanningPort<AgentRoutinePerception, AgentMemoryHit, PlanAction>;
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
