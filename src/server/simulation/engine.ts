import type { InterventionCommand, PlanAction, SimulationInput, WorldSnapshot, SimulationEvent } from "../../shared/contracts/index.js";
import type { AgentId, AgentStatus, LocationId } from "../../shared/domain/index.js";
import { InMemoryMemoryStore } from "@elysian/simulation-agent";
import { createSimulationEvent, type EventFactoryContext } from "./events.js";
import { validateSimulationInput, type ReviewedLlmProposalPayload, type ValidSimulationInput } from "./inputs.js";
import { createDeterministicPrivateMessageResponse } from "./privateMessages.js";
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
  const reviewedProposalAgentIds = new Set<AgentId>();
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
    const acceptedEvent = createSimulationEvent(context, {
      id: createEventId(stepId, stepEvents.length + 1, "intervention_submitted"),
      kind: "realm.interventionSubmitted",
      source: result.value.input.source,
      targetIds: result.value.targetIds,
      causedByInputId: result.value.input.id,
      payload: createAcceptedInterventionPayload(result.value),
    });
    stepEvents.push(acceptedEvent);

    if (result.value.commandKind === "directPrivateMessage") {
      const directMessage = applyDirectPrivateMessage(
        nextSnapshot,
        nextAgentMemories,
        result.value,
        acceptedEvent,
        context,
        stepEvents.length + 1,
      );
      nextSnapshot = directMessage.snapshot;
      nextAgentMemories = directMessage.agentMemories;
      stepEvents.push(...directMessage.events);
    }

    if (result.value.reviewedLlmProposal) {
      reviewedProposalAgentIds.add(result.value.reviewedLlmProposal.agentId);
      nextAgentMemories = appendReviewedLlmProposalMemory(
        nextAgentMemories,
        nextSnapshot,
        result.value,
        result.value.reviewedLlmProposal,
        acceptedEvent,
        context,
      );
    }
  }

  const agentTickDiagnostics: EngineAgentTickDiagnostic[] = [];
  const reflectionDiagnostics: EngineReflectionDiagnostic[] = [];
  if (state.startupEmitted) {
    const routineProgress = progressAgentRoutines(nextSnapshot, context, stepEvents, nextAgentMemories, reviewedProposalAgentIds);
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
  if (input.reviewedLlmProposal) {
    return applyReviewedLlmProposalInput(snapshot, input);
  }

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

function applyReviewedLlmProposalInput(snapshot: WorldSnapshot, input: ValidSimulationInput): WorldSnapshot {
  const proposal = input.reviewedLlmProposal;
  if (!proposal) return snapshot;

  return {
    ...snapshot,
    agents: snapshot.agents.map((agent) => {
      if (agent.id !== proposal.agentId) return agent;
      const currentAction = createReviewedLlmPlanAction(input.input.id, proposal, agent.locationId, snapshot.currentTime);
      return {
        ...agent,
        status: createReviewedLlmAgentStatus(agent.status, proposal.proposalAction),
        locationId: createReviewedLlmAgentLocation(agent.locationId, proposal),
        currentPlanId: createReviewedLlmPlanId(input.input.id, proposal.agentId),
        currentAction,
      };
    }),
  };
}

function createAcceptedInterventionPayload(input: ValidSimulationInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    inputId: input.input.id,
    commandKind: input.commandKind,
    accepted: true,
    summary: input.summary,
  };

  if (input.reviewedLlmProposal) {
    payload.reviewedLlmProposal = cloneReviewedLlmProposalPayload(input.reviewedLlmProposal);
  }

  return payload;
}

function applyDirectPrivateMessage(
  snapshot: WorldSnapshot,
  records: readonly EngineMemoryRecord[],
  input: ValidSimulationInput,
  acceptedEvent: SimulationEvent,
  context: EventFactoryContext,
  firstEventOrder: number,
): { snapshot: WorldSnapshot; events: SimulationEvent[]; agentMemories: EngineMemoryRecord[] } {
  const targetAgentId = input.targetIds[0] as AgentId;
  const agent = snapshot.agents.find((candidate) => candidate.id === targetAgentId);
  if (!agent) {
    throw new Error(`Validated private message target ${targetAgentId} is missing from the snapshot`);
  }

  const message = input.payload.message;
  if (typeof message !== "string") {
    throw new Error(`Validated private message ${input.input.id} is missing its message`);
  }

  const response = createDeterministicPrivateMessageResponse(agent, message);
  const conversationId = createPrivateConversationId(agent.id);
  const existingConversation = snapshot.activeConversations.find((conversation) => conversation.id === conversationId);
  const incomingMessageIndex = (existingConversation?.messageCount ?? 0) + 1;
  const responseMessageIndex = incomingMessageIndex + 1;
  const incomingMessageId = createPrivateMessageId(acceptedEvent.id, "incoming");
  const responseMessageId = createPrivateMessageId(acceptedEvent.id, "response");
  const incomingMemoryId = createPrivateMessageMemoryId(incomingMessageId);
  const responseMemoryId = createPrivateMessageMemoryId(responseMessageId);
  const events: SimulationEvent[] = [];
  let nextEventOrder = firstEventOrder;

  if (!existingConversation) {
    events.push(
      createSimulationEvent(context, {
        id: createEventId(context.stepId, nextEventOrder, `${agent.id}_conversation_started`),
        kind: "conversation.started",
        source: input.input.source,
        targetIds: [agent.id],
        causedByInputId: input.input.id,
        payload: {
          conversationId,
          participantIds: [agent.id],
          locationId: agent.locationId,
          state: "participating",
        },
      }),
    );
    nextEventOrder += 1;
  }

  const incomingEvent = createSimulationEvent(context, {
    id: createEventId(context.stepId, nextEventOrder, `${agent.id}_private_message_incoming`),
    kind: "conversation.messageSent",
    source: input.input.source,
    targetIds: [agent.id],
    causedByInputId: input.input.id,
    payload: {
      conversationId,
      messageId: incomingMessageId,
      senderId: input.input.source,
      recipientId: agent.id,
      content: response.incomingMessage,
      direction: "incoming",
      messageIndex: incomingMessageIndex,
      memoryId: incomingMemoryId,
    },
  });
  events.push(incomingEvent);
  nextEventOrder += 1;

  const responseEvent = createSimulationEvent(context, {
    id: createEventId(context.stepId, nextEventOrder, `${agent.id}_private_message_response`),
    kind: "conversation.messageSent",
    source: "agent",
    actorId: agent.id,
    targetIds: [snapshot.id],
    causedByInputId: input.input.id,
    payload: {
      conversationId,
      messageId: responseMessageId,
      senderId: agent.id,
      recipientId: input.input.source,
      content: response.responseMessage,
      direction: "response",
      messageIndex: responseMessageIndex,
      memoryId: responseMemoryId,
      inReplyToMessageId: incomingMessageId,
    },
  });
  events.push(responseEvent);

  const nextConversation = existingConversation
    ? {
        ...existingConversation,
        participants: [...existingConversation.participants],
        state: "participating" as const,
        lastMessageAt: context.time,
        messageCount: responseMessageIndex,
      }
    : {
        id: conversationId,
        worldId: snapshot.id,
        participants: [agent.id],
        state: "participating" as const,
        locationId: agent.locationId,
        startedAt: context.time,
        lastMessageAt: context.time,
        messageCount: responseMessageIndex,
      };

  const activeConversations = existingConversation
    ? snapshot.activeConversations.map((conversation) => conversation.id === conversationId ? nextConversation : conversation)
    : [...snapshot.activeConversations, nextConversation];

  return {
    snapshot: { ...snapshot, activeConversations },
    events,
    agentMemories: [
      ...cloneEngineMemoryRecords(records),
      {
        id: incomingMemoryId,
        agentId: agent.id,
        kind: "intervention",
        content: `User wrote privately: ${response.incomingMessage}`,
        createdAt: context.time,
        lastAccessedAt: context.time,
        importance: 6,
        sourceIds: [incomingEvent.id, acceptedEvent.id, input.input.id],
        relatedMemoryIds: [],
        visibility: "user-authored",
        tags: [agent.id, agent.personaId, "conversation", "private", "incoming"],
        metadata: {
          stepId: context.stepId,
          source: "engine",
          locationId: agent.locationId,
          conversationId,
          messageId: incomingMessageId,
          inputId: input.input.id,
          messageRole: "incoming",
        },
      },
      {
        id: responseMemoryId,
        agentId: agent.id,
        kind: "conversation",
        content: response.responseMessage,
        createdAt: context.time,
        lastAccessedAt: context.time,
        importance: 5,
        sourceIds: [responseEvent.id, incomingEvent.id, acceptedEvent.id, input.input.id],
        relatedMemoryIds: [incomingMemoryId],
        visibility: "private",
        tags: [agent.id, agent.personaId, "conversation", "private", "response"],
        metadata: {
          stepId: context.stepId,
          source: "engine",
          locationId: agent.locationId,
          conversationId,
          messageId: responseMessageId,
          inputId: input.input.id,
          messageRole: "response",
        },
      },
    ],
  };
}

function createPrivateConversationId(agentId: AgentId): string {
  return `conversation_user_${agentId}`;
}

function createPrivateMessageId(acceptedEventId: string, role: "incoming" | "response"): string {
  return `message_${acceptedEventId}_${role}`;
}

function createPrivateMessageMemoryId(messageId: string): string {
  return `memory_${messageId}`;
}

function createReviewedLlmPlanId(inputId: string, agentId: AgentId): string {
  return `llm.${inputId}.${agentId}`;
}

function createReviewedLlmActionId(inputId: string, proposal: ReviewedLlmProposalPayload): string {
  return `${createReviewedLlmPlanId(inputId, proposal.agentId)}.${proposal.proposalAction}`;
}

function createReviewedLlmPlanAction(
  inputId: string,
  proposal: ReviewedLlmProposalPayload,
  fallbackLocationId: LocationId,
  startsAt: string,
): PlanAction {
  const actionKind = proposal.proposalAction === "continue" ? "performActivity" : proposal.proposalAction;
  return {
    id: createReviewedLlmActionId(inputId, proposal),
    kind: actionKind,
    startsAt,
    locationId: createReviewedLlmActionLocation(fallbackLocationId, proposal),
    ...(proposal.targetAgentId ? { targetAgentId: proposal.targetAgentId } : {}),
    intent: proposal.intent,
  };
}

function createReviewedLlmAgentStatus(currentStatus: AgentStatus, action: ReviewedLlmProposalPayload["proposalAction"]): AgentStatus {
  switch (action) {
    case "move":
      return "moving";
    case "wait":
      return "waiting";
    case "reflect":
      return "reflecting";
    case "performActivity":
      return "idle";
    case "continue":
      return currentStatus === "waiting" ? "idle" : currentStatus;
  }
}

function createReviewedLlmAgentLocation(
  currentLocationId: LocationId,
  proposal: ReviewedLlmProposalPayload,
): LocationId {
  if (proposal.proposalAction === "move" && proposal.targetLocationId) {
    return proposal.targetLocationId;
  }
  if (proposal.proposalAction === "performActivity" && proposal.targetLocationId) {
    return proposal.targetLocationId;
  }
  return currentLocationId;
}

function createReviewedLlmActionLocation(
  fallbackLocationId: LocationId,
  proposal: ReviewedLlmProposalPayload,
): LocationId {
  return proposal.targetLocationId ?? fallbackLocationId;
}

function appendReviewedLlmProposalMemory(
  records: readonly EngineMemoryRecord[],
  snapshot: WorldSnapshot,
  input: ValidSimulationInput,
  proposal: ReviewedLlmProposalPayload,
  acceptedEvent: SimulationEvent,
  context: EventFactoryContext,
): EngineMemoryRecord[] {
  const agent = snapshot.agents.find((candidate) => candidate.id === proposal.agentId);
  if (!agent) return cloneEngineMemoryRecords(records);

  return [
    ...cloneEngineMemoryRecords(records),
    {
      id: createReviewedLlmProposalMemoryId(context.stepId, proposal.agentId, input.input.id),
      agentId: proposal.agentId,
      kind: "plan",
      content: `${agent.displayName} accepted a reviewed LLM ${proposal.proposalAction} proposal: ${proposal.intent}`,
      createdAt: context.time,
      lastAccessedAt: context.time,
      importance: 5,
      sourceIds: [acceptedEvent.id, input.input.id],
      relatedMemoryIds: [],
      visibility: "user-authored",
      tags: [proposal.agentId, proposal.proposalAction, "llm", "user-reviewed"],
      metadata: {
        stepId: context.stepId,
        source: "engine",
        locationId: agent.locationId,
        proposalKind: proposal.proposalAction,
        planId: createReviewedLlmPlanId(input.input.id, proposal.agentId),
        llmOperationId: proposal.llmOperationId,
        reviewedBy: proposal.reviewedBy,
        proposalAction: proposal.proposalAction,
      },
    },
  ];
}

function createReviewedLlmProposalMemoryId(stepId: string, agentId: AgentId, inputId: string): string {
  return `memory_${stepId}_${agentId}_${inputId}_llm_proposal`.replace(/[^a-z0-9_]+/gi, "_").toLowerCase();
}

function cloneReviewedLlmProposalPayload(proposal: ReviewedLlmProposalPayload): Record<string, unknown> {
  return {
    eventKind: proposal.eventKind,
    provenance: proposal.provenance,
    sandbox: proposal.sandbox,
    agentId: proposal.agentId,
    proposalAction: proposal.proposalAction,
    reason: proposal.reason,
    intent: proposal.intent,
    llmOperationId: proposal.llmOperationId,
    reviewedBy: proposal.reviewedBy,
    ...(proposal.targetLocationId ? { targetLocationId: proposal.targetLocationId } : {}),
    ...(proposal.targetAgentId ? { targetAgentId: proposal.targetAgentId } : {}),
  };
}

function progressAgentRoutines(
  snapshot: WorldSnapshot,
  context: EventFactoryContext,
  stepEvents: SimulationEvent[],
  agentMemories: readonly EngineMemoryRecord[],
  skipAgentIds: ReadonlySet<AgentId> = new Set(),
): { snapshot: WorldSnapshot; agentTickDiagnostics: EngineAgentTickDiagnostic[]; reflectionDiagnostics: EngineReflectionDiagnostic[]; agentMemories: EngineMemoryRecord[] } {
  let nextEventOrder = stepEvents.length + 1;
  const agentTickDiagnostics: EngineAgentTickDiagnostic[] = [];
  const memoryStore = new InMemoryMemoryStore<EngineMemoryMetadata>(agentMemories);
  const agents = snapshot.agents.map((agent) => {
    if (skipAgentIds.has(agent.id)) {
      return agent;
    }

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
  return memory.kind === "plan" && memory.metadata.source === "engine" && memory.metadata.stepId === stepId && memory.metadata.llmOperationId === undefined;
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
