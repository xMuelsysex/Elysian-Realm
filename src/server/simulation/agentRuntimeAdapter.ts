import { runCognitiveTickSync, type CognitiveLoopDeps, type PhaseDiagnostic, type PlanningPort } from "../../agent-core/index.js";
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

export interface AgentMemoryHit {
  id: string;
  score: number;
  content: string;
}

export interface AgentMemoryWrite {
  note: string;
}

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
  planning?: PlanningPort<AgentRoutinePerception, AgentMemoryHit, PlanAction>;
}

export function runAgentCognitiveTickForEngine(
  snapshot: WorldSnapshot,
  agent: AgentRuntimeState,
  options: RunAgentCognitiveTickForEngineOptions = {},
): EngineAgentTickResult {
  const perception = createAgentRoutinePerception(snapshot, agent, options.personas ?? pilotPersonas);
  const submitted: PlanAction[] = [];
  const deps: CognitiveLoopDeps<AgentRoutinePerception, AgentMemoryQuery, AgentMemoryHit, AgentMemoryWrite, PlanAction> = {
    perception: {
      perceive: () => perception,
    },
    memory: createMemoryStub(),
    planning: options.planning ?? createDeterministicRoutinePlanner(snapshot.currentTime),
    actionSink: {
      submit: (_agentId, proposal) => {
        submitted.push(proposal);
      },
    },
    buildMemoryQuery: (projected) => ({
      agentId: projected.agentId,
      locationId: projected.locationId,
      period: projected.period,
    }),
  };

  const result = runCognitiveTickSync(agent.id, snapshot.currentTime, deps);
  const proposal = result.proposal ?? submitted[0];
  return {
    agentId: agent.id,
    phases: result.phases,
    ...(proposal ? { proposal } : {}),
    ...(proposal && perception.activeRoutine ? { activeRoutine: perception.activeRoutine } : {}),
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

function createMemoryStub(): {
  retrieve(agentId: string, query: AgentMemoryQuery): readonly AgentMemoryHit[];
  remember(agentId: string, write: AgentMemoryWrite): void;
} {
  return {
    retrieve: () => [],
    remember: () => undefined,
  };
}
