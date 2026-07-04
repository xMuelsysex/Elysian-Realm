import type { InterventionCommand, SimulationInput, WorldSnapshot, SimulationEvent } from "../../shared/contracts/index.js";
import { InMemoryMemoryStore } from "@elysian/simulation-agent";
import { createSimulationEvent, type EventFactoryContext } from "./events.js";
import { validateSimulationInput, type ValidSimulationInput } from "./inputs.js";
import { runAgentCognitiveTickForEngine, runAgentReflectionForEngine, type EngineAgentTickDiagnostic, type EngineAgentTickResult, type EngineMemoryMetadata, type EngineMemoryRecord, type EngineReflectionDiagnostic } from "./agentRuntimeAdapter.js";
import {
  createObservationMvpSnapshot,
  OBSERVATION_MVP_SEED_ID,
} from "./seeds/observationMvpSeed.js";

const STEP_MINUTES = 5;
const REFLECTION_EVIDENCE_LIMIT = 3;
export interface SimulationEngineState {
  snapshot: WorldSnapshot;
  events: SimulationEvent[];
  stepCount: number;
  startupEmitted: boolean;
  agentMemories: EngineMemoryRecord[];
}

export interface SimulationStepResult {
  state: SimulationEngineState;
  events: SimulationEvent[];
  agentTickDiagnostics: EngineAgentTickDiagnostic[];
  reflectionDiagnostics: EngineReflectionDiagnostic[];
}

export function createSimulationEngine(): SimulationEngineState {
  const snapshot = createObservationMvpSnapshot();
  return {
    snapshot,
    events: [],
    stepCount: 0,
    startupEmitted: false,
    agentMemories: createInitialAgentMemories(snapshot),
  };
}

export function queueSimulationInput(state: SimulationEngineState, input: SimulationInput): SimulationEngineState {
  return {
    ...state,
    agentMemories: cloneEngineMemoryRecords(state.agentMemories),
    snapshot: {
      ...state.snapshot,
      queuedInputs: [...state.snapshot.queuedInputs, cloneInput(input)],
    },
  };
}

export function stepSimulationEngine(state: SimulationEngineState): SimulationStepResult {
  const nextStepCount = state.stepCount + 1;
  const fromTime = state.snapshot.currentTime;
  const toTime = advanceIsoMinutes(fromTime, STEP_MINUTES);
  const stepId = createStepId(toTime, nextStepCount);
  const context: EventFactoryContext = {
    worldId: state.snapshot.id,
    stepId,
    time: toTime,
  };

  const stepEvents: SimulationEvent[] = [];
  let nextAgentMemories = cloneEngineMemoryRecords(state.agentMemories);
  let nextSnapshot: WorldSnapshot = {
    ...state.snapshot,
    currentTime: toTime,
    lastStepId: stepId,
    queuedInputs: [],
    locations: state.snapshot.locations.map((location) => ({ ...location })),
    agents: state.snapshot.agents.map((agent) => ({ ...agent, cooldowns: { ...agent.cooldowns }, relationshipRefs: [...agent.relationshipRefs] })),
    activeConversations: state.snapshot.activeConversations.map((conversation) => ({
      ...conversation,
      participants: [...conversation.participants],
    })),
  };

  if (!state.startupEmitted) {
    stepEvents.push(...createStartupEvents(context, state.snapshot, fromTime, toTime, stepId));
  } else {
    stepEvents.push(createTimeAdvancedEvent(context, fromTime, toTime, stepId, state.snapshot.timeScale));
  }

  const validationContext = createInputValidationContext(state.snapshot);
  for (const input of state.snapshot.queuedInputs) {
    const result = validateSimulationInput(input, validationContext);
    if (!result.ok) {
      stepEvents.push(
        createSimulationEvent(context, {
          id: createEventId(stepId, stepEvents.length + 1, "input_rejected"),
          kind: "simulation.inputRejected",
          source: "system",
          targetIds: [state.snapshot.id],
          causedByInputId: input.id,
          payload: {
            inputId: input.id,
            code: "INVALID_SIMULATION_INPUT",
            message: result.error.message,
            commandKind: result.error.commandKind,
          },
        }),
      );
      continue;
    }

    nextSnapshot = applyValidatedInput(nextSnapshot, result.value);
    stepEvents.push(
      createSimulationEvent(context, {
        id: createEventId(stepId, stepEvents.length + 1, "intervention_submitted"),
        kind: "realm.interventionSubmitted",
        source: result.value.input.source,
        targetIds: result.value.targetIds,
        causedByInputId: result.value.input.id,
        payload: {
          inputId: result.value.input.id,
          commandKind: result.value.commandKind,
          accepted: true,
          summary: result.value.summary,
        },
      }),
    );
  }

  const agentTickDiagnostics: EngineAgentTickDiagnostic[] = [];
  const reflectionDiagnostics: EngineReflectionDiagnostic[] = [];
  if (state.startupEmitted) {
    const routineProgress = progressAgentRoutines(nextSnapshot, context, stepEvents, nextAgentMemories);
    nextSnapshot = routineProgress.snapshot;
    nextAgentMemories = routineProgress.agentMemories;
    agentTickDiagnostics.push(...routineProgress.agentTickDiagnostics);
    reflectionDiagnostics.push(...routineProgress.reflectionDiagnostics);
  }

  const nextState: SimulationEngineState = {
    snapshot: nextSnapshot,
    events: [...state.events, ...stepEvents],
    stepCount: nextStepCount,
    startupEmitted: true,
    agentMemories: nextAgentMemories,
  };

  return { state: nextState, events: stepEvents, agentTickDiagnostics, reflectionDiagnostics };
}

function createStartupEvents(
  context: EventFactoryContext,
  snapshot: WorldSnapshot,
  fromTime: string,
  toTime: string,
  stepId: string,
): SimulationEvent[] {
  const events: SimulationEvent[] = [];

  events.push(
    createSimulationEvent(context, {
      id: createEventId(stepId, 1, "world_created"),
      kind: "world.created",
      source: "system",
      targetIds: [snapshot.id],
      payload: {
        seedId: OBSERVATION_MVP_SEED_ID,
        personaIds: snapshot.agents.map((agent) => agent.personaId),
        locationIds: snapshot.locations.map((location) => location.id),
        initialStatus: snapshot.status,
      },
    }),
  );

  snapshot.agents.forEach((agent) => {
    events.push(
      createSimulationEvent(context, {
        id: createEventId(stepId, events.length + 1, `${agent.id}_spawned`),
        kind: "agent.spawned",
        source: "system",
        actorId: agent.id,
        targetIds: [agent.locationId],
        payload: {
          personaId: agent.personaId,
          locationId: agent.locationId,
          status: agent.status,
        },
      }),
    );
  });

  events.push(createTimeAdvancedEvent(context, fromTime, toTime, stepId, snapshot.timeScale, events.length + 1));

  snapshot.agents.forEach((agent) => {
    events.push(
      createSimulationEvent(context, {
        id: createEventId(stepId, events.length + 1, `${agent.id}_started_routine`),
        kind: "agent.startedRoutine",
        source: "system",
        actorId: agent.id,
        targetIds: [agent.locationId],
        payload: {
          routineId: `${agent.personaId}.morning.0`,
          locationId: agent.locationId,
          intent: agent.currentAction?.intent ?? "start the configured morning routine",
          provenance: "configured",
        },
      }),
    );
  });

  events.push(
    createSimulationEvent(context, {
      id: createEventId(stepId, events.length + 1, "memory_seeded"),
      kind: "memory.seeded",
      source: "system",
      targetIds: snapshot.agents.map((agent) => agent.id),
      payload: {
        seedBatchId: `${OBSERVATION_MVP_SEED_ID}:memory-events-only`,
        memoryIds: snapshot.agents.map((agent) => `memory_seed_${agent.id}`),
        provenance: "system",
        note: "Memory seeding records are stored in the engine memory stream; this event records the seed batch only.",
      },
    }),
  );

  return events;
}

function createTimeAdvancedEvent(
  context: EventFactoryContext,
  fromTime: string,
  toTime: string,
  stepId: string,
  timeScale: number,
  order = 1,
): SimulationEvent {
  return createSimulationEvent(context, {
    id: createEventId(stepId, order, "time_advanced"),
    kind: "world.timeAdvanced",
    source: "system",
    targetIds: [context.worldId],
    payload: {
      from: fromTime,
      to: toTime,
      timeScale,
      stepId,
    },
  });
}

function applyValidatedInput(snapshot: WorldSnapshot, input: ValidSimulationInput): WorldSnapshot {
  if (input.commandKind !== "observerCommand") {
    return snapshot;
  }

  const action = input.payload.action;
  if (action === "pause") {
    return { ...snapshot, status: "paused" };
  }
  if (action === "resume") {
    return { ...snapshot, status: "running" };
  }
  if (action === "setTimeScale" && typeof input.payload.timeScale === "number") {
    return { ...snapshot, timeScale: input.payload.timeScale };
  }
  return snapshot;
}

function progressAgentRoutines(
  snapshot: WorldSnapshot,
  context: EventFactoryContext,
  stepEvents: SimulationEvent[],
  agentMemories: readonly EngineMemoryRecord[],
): { snapshot: WorldSnapshot; agentTickDiagnostics: EngineAgentTickDiagnostic[]; reflectionDiagnostics: EngineReflectionDiagnostic[]; agentMemories: EngineMemoryRecord[] } {
  let nextEventOrder = stepEvents.length + 1;
  const agentTickDiagnostics: EngineAgentTickDiagnostic[] = [];
  const memoryStore = new InMemoryMemoryStore<EngineMemoryMetadata>(agentMemories);
  const agents = snapshot.agents.map((agent) => {
    const tick = runAgentCognitiveTickForEngine(snapshot, agent, {
      memory: memoryStore.toPort(),
      stepId: context.stepId,
      sourceIds: [context.stepId],
    });
    agentTickDiagnostics.push(toAgentTickDiagnostic(tick));

    const routine = tick.activeRoutine;
    const proposal = tick.proposal;
    if (!routine || !proposal) {
      return agent;
    }

    if (agent.locationId !== routine.locationId) {
      stepEvents.push(
        createSimulationEvent(context, {
          id: createEventId(context.stepId, nextEventOrder, `${agent.id}_moved`),
          kind: "agent.moved",
          source: "system",
          actorId: agent.id,
          targetIds: [routine.locationId],
          payload: {
            fromLocationId: agent.locationId,
            toLocationId: routine.locationId,
            reason: "routine",
            routineId: routine.routineId,
            intent: routine.intent,
          },
        }),
      );
      nextEventOrder += 1;
    }

    stepEvents.push(
      createSimulationEvent(context, {
        id: createEventId(context.stepId, nextEventOrder, `${agent.id}_continued_routine`),
        kind: "agent.continuedRoutine",
        source: "system",
        actorId: agent.id,
        targetIds: [routine.locationId],
        payload: {
          routineId: routine.routineId,
          locationId: routine.locationId,
          intent: routine.intent,
          period: routine.period,
          provenance: "configured",
        },
      }),
    );
    nextEventOrder += 1;

    return {
      ...agent,
      status: "idle" as const,
      locationId: routine.locationId,
      currentPlanId: routine.planId,
      currentAction: proposal,
    };
  });

  const updatedSnapshot = { ...snapshot, agents };
  const reflectionDiagnostics = runReflectionPolicy(updatedSnapshot, context, memoryStore);

  return {
    snapshot: updatedSnapshot,
    agentTickDiagnostics,
    reflectionDiagnostics,
    agentMemories: listEngineMemories(memoryStore, updatedSnapshot),
  };
}

function toAgentTickDiagnostic(tick: EngineAgentTickResult): EngineAgentTickDiagnostic {
  return {
    agentId: tick.agentId,
    phases: tick.phases,
    ...(tick.proposal ? { proposal: tick.proposal } : {}),
  };
}

function runReflectionPolicy(
  snapshot: WorldSnapshot,
  context: EventFactoryContext,
  memoryStore: InMemoryMemoryStore<EngineMemoryMetadata>,
): EngineReflectionDiagnostic[] {
  return snapshot.agents.map((agent) => {
    const records = memoryStore.list(agent.id).map(cloneEngineMemoryRecord);
    const currentPlanMemories = records.filter((memory) => isCurrentStepPlanMemory(memory, context.stepId));
    if (currentPlanMemories.length === 0) {
      return createSkippedReflectionDiagnostic(agent.id, "no current-step plan memory");
    }

    if (records.some((memory) => isCurrentStepReflectionMemory(memory, context.stepId))) {
      return createSkippedReflectionDiagnostic(agent.id, "reflection already recorded for current step");
    }

    const evidence = selectReflectionEvidence(records, currentPlanMemories);
    if (evidence.length === 0) {
      return createSkippedReflectionDiagnostic(agent.id, "no eligible non-reflection evidence");
    }

    const result = runAgentReflectionForEngine(agent, {
      stepId: context.stepId,
      now: context.time,
      evidence,
      triggerSourceIds: currentPlanMemories.flatMap((memory) => memory.sourceIds),
      reason: "current step produced a plan memory that crossed the reflection threshold",
      period: currentPlanMemories[0]?.metadata.period,
      locationId: currentPlanMemories[0]?.metadata.locationId ?? agent.locationId,
    });
    if (result.status !== "completed") {
      return toReflectionDiagnostic(result);
    }

    const persistedMemoryIds: string[] = [];
    try {
      result.memoryWrites.forEach((write, index) => {
        const persisted = memoryStore.remember(agent.id, {
          ...write,
          id: createReflectionMemoryId(context.stepId, agent.id, index),
        });
        persistedMemoryIds.push(persisted.id);
      });
    } catch (error) {
      return {
        ...toReflectionDiagnostic(result),
        status: "failed",
        persistedMemoryIds,
        diagnostics: [
          ...result.diagnostics,
          {
            status: "failed",
            phase: "output",
            message: `reflection persistence failed: ${errorMessage(error)}`,
            evidenceMemoryIds: result.evidenceMemoryIds,
          },
        ],
      };
    }

    return toReflectionDiagnostic(result, persistedMemoryIds);
  });
}

function toReflectionDiagnostic(
  result: ReturnType<typeof runAgentReflectionForEngine>,
  persistedMemoryIds = result.persistedMemoryIds,
): EngineReflectionDiagnostic {
  return {
    agentId: result.agentId,
    status: result.status,
    evidenceMemoryIds: [...result.evidenceMemoryIds],
    persistedMemoryIds: [...persistedMemoryIds],
    diagnostics: result.diagnostics.map((diagnostic) => ({
      ...diagnostic,
      evidenceMemoryIds: diagnostic.evidenceMemoryIds ? [...diagnostic.evidenceMemoryIds] : undefined,
    })),
    reason: result.reason,
    trigger: result.trigger
      ? {
          ...result.trigger,
          sourceIds: [...result.trigger.sourceIds],
        }
      : undefined,
  };
}

function selectReflectionEvidence(
  records: readonly EngineMemoryRecord[],
  currentPlanMemories: readonly EngineMemoryRecord[],
): EngineMemoryRecord[] {
  const selectedIds = new Set(currentPlanMemories.map((memory) => memory.id));
  const supplemental = records
    .filter((memory) => memory.kind !== "reflection" && !selectedIds.has(memory.id))
    .sort(compareReflectionEvidence)
    .slice(0, Math.max(0, REFLECTION_EVIDENCE_LIMIT - currentPlanMemories.length));
  return [...currentPlanMemories, ...supplemental].slice(0, REFLECTION_EVIDENCE_LIMIT).map(cloneEngineMemoryRecord);
}

function compareReflectionEvidence(left: EngineMemoryRecord, right: EngineMemoryRecord): number {
  const importanceDelta = right.importance - left.importance;
  if (importanceDelta !== 0) return importanceDelta;
  const createdDelta = Date.parse(right.createdAt) - Date.parse(left.createdAt);
  if (createdDelta !== 0) return createdDelta;
  return left.id.localeCompare(right.id);
}

function isCurrentStepPlanMemory(memory: EngineMemoryRecord, stepId: string): boolean {
  return memory.kind === "plan" && memory.metadata.source === "engine" && memory.metadata.stepId === stepId;
}

function isCurrentStepReflectionMemory(memory: EngineMemoryRecord, stepId: string): boolean {
  return memory.kind === "reflection" && memory.metadata.source === "engine" && memory.metadata.stepId === stepId;
}

function createSkippedReflectionDiagnostic(agentId: string, reason: string): EngineReflectionDiagnostic {
  return {
    agentId,
    status: "skipped",
    reason,
    evidenceMemoryIds: [],
    persistedMemoryIds: [],
    diagnostics: [],
  };
}

function createReflectionMemoryId(stepId: string, agentId: string, index: number): string {
  const suffix = index === 0 ? "reflection" : `reflection_${index + 1}`;
  return `memory_${stepId}_${agentId}_${suffix}`.replace(/[^a-z0-9_]+/gi, "_").toLowerCase();
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "unknown error";
}

function createInputValidationContext(snapshot: WorldSnapshot) {
  return {
    worldId: snapshot.id,
    agentIds: snapshot.agents.map((agent) => agent.id),
    locationIds: snapshot.locations.map((location) => location.id),
  };
}

function createStepId(time: string, stepCount: number): string {
  const date = new Date(time);
  return `step_${String(date.getUTCHours()).padStart(2, "0")}${String(date.getUTCMinutes()).padStart(2, "0")}_${String(stepCount).padStart(3, "0")}`;
}

function createEventId(stepId: string, order: number, summary: string): string {
  return `evt_${stepId.replace(/^step_/, "")}_${String(order).padStart(3, "0")}_${summary.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`;
}

function advanceIsoMinutes(time: string, minutes: number): string {
  const date = new Date(time);
  date.setUTCMinutes(date.getUTCMinutes() + minutes);
  return date.toISOString();
}

function cloneInput(input: SimulationInput): SimulationInput {
  if (!isRecord(input.command)) {
    return { ...input };
  }

  return {
    ...input,
    command: cloneCommand(input.command),
  };
}

function createInitialAgentMemories(snapshot: WorldSnapshot): EngineMemoryRecord[] {
  return snapshot.agents.map((agent) => ({
    id: `memory_seed_${agent.id}`,
    agentId: agent.id,
    kind: "observation",
    content: `${agent.displayName} starts in ${agent.locationId} with the configured morning routine.`,
    createdAt: snapshot.currentTime,
    lastAccessedAt: snapshot.currentTime,
    importance: 5,
    sourceIds: [`${OBSERVATION_MVP_SEED_ID}:${agent.id}:initial-memory`],
    relatedMemoryIds: [],
    visibility: "system",
    tags: [agent.id, agent.personaId, agent.locationId, "morning", "seed"],
    metadata: {
      stepId: snapshot.lastStepId,
      source: "seed",
      period: "morning",
      locationId: agent.locationId,
      proposalKind: agent.currentAction?.kind,
      planId: agent.currentAction?.id,
    },
  }));
}

function listEngineMemories(
  memoryStore: InMemoryMemoryStore<EngineMemoryMetadata>,
  snapshot: WorldSnapshot,
): EngineMemoryRecord[] {
  return snapshot.agents.flatMap((agent) => memoryStore.list(agent.id).map(cloneEngineMemoryRecord));
}

function cloneEngineMemoryRecords(records: readonly EngineMemoryRecord[]): EngineMemoryRecord[] {
  return records.map(cloneEngineMemoryRecord);
}

function cloneEngineMemoryRecord(record: EngineMemoryRecord): EngineMemoryRecord {
  return {
    ...record,
    sourceIds: [...record.sourceIds],
    relatedMemoryIds: [...record.relatedMemoryIds],
    tags: [...record.tags],
    metadata: { ...record.metadata },
  };
}

function cloneCommand(command: Record<string, unknown> | InterventionCommand): Record<string, unknown> {
  return {
    ...command,
    targetIds: Array.isArray(command.targetIds) ? [...command.targetIds] : command.targetIds,
    payload: isRecord(command.payload) ? { ...command.payload } : command.payload,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
