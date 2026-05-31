import type {
  AgentId,
  ConversationId,
  EventId,
  EventSource,
  InputId,
  InterventionKind,
  LocationId,
  MemoryId,
  MemoryType,
  MemoryVisibility,
  OperationId,
  OperationKind,
  OperationStatus,
  PersonaId,
  PlanId,
  PlanItemKind,
  WorldId,
  WorldStatus,
  AgentStatus,
  ConversationState,
} from "../domain/index.js";

export interface LocationRef {
  id: LocationId;
  displayName: string;
  description: string;
}

export interface WorldSnapshot {
  id: WorldId;
  status: WorldStatus;
  currentTime: string;
  timeScale: number;
  locations: LocationRef[];
  agents: AgentRuntimeState[];
  activeConversations: ConversationRecord[];
  queuedInputs: SimulationInput[];
  lastStepId: string;
}

export interface AgentRuntimeState {
  id: AgentId;
  personaId: PersonaId;
  displayName: string;
  status: AgentStatus;
  locationId: LocationId;
  currentPlanId?: PlanId;
  currentAction?: PlanAction;
  inProgressOperationId?: OperationId;
  cooldowns: Record<string, string>;
  relationshipRefs: PersonaId[];
}

export interface PlanRecord {
  id: PlanId;
  worldId: WorldId;
  agentId: AgentId;
  createdAt: string;
  supersededByPlanId?: PlanId;
  items: PlanAction[];
  sourceMemoryIds: MemoryId[];
}

export interface PlanAction {
  id: string;
  kind: PlanItemKind;
  startsAt?: string;
  endsAt?: string;
  locationId?: LocationId;
  targetAgentId?: AgentId;
  intent: string;
}

export interface SimulationEvent {
  id: EventId;
  worldId: WorldId;
  stepId: string;
  time: string;
  kind: string;
  actorId?: AgentId;
  targetIds: string[];
  payload: Record<string, unknown>;
  source: EventSource;
  causedByInputId?: InputId;
}

export interface MemoryRecord {
  id: MemoryId;
  worldId: WorldId;
  agentId: AgentId;
  type: MemoryType;
  content: string;
  createdAt: string;
  lastAccessedAt: string;
  importance: number;
  embeddingRef?: string;
  sourceEventIds: EventId[];
  relatedMemoryIds: MemoryId[];
  visibility: MemoryVisibility;
  metadata: Record<string, unknown>;
}

export interface ConversationRecord {
  id: ConversationId;
  worldId: WorldId;
  participants: AgentId[];
  state: ConversationState;
  locationId: LocationId;
  startedAt: string;
  endedAt?: string;
  lastMessageAt?: string;
  messageCount: number;
}

export interface InterventionCommand {
  kind: InterventionKind;
  targetIds: string[];
  payload: Record<string, unknown>;
}

export interface SimulationInput {
  id: InputId;
  worldId: WorldId;
  submittedAt: string;
  source: EventSource;
  command: InterventionCommand | Record<string, unknown>;
}

export interface LlmOperationMetadata {
  id: OperationId;
  worldId: WorldId;
  agentId?: AgentId;
  kind: OperationKind;
  status: OperationStatus;
  inputRef?: string;
  promptSchemaVersion: string;
  provider: string;
  model: string;
  startedAt: string;
  completedAt?: string;
  result?: Record<string, unknown>;
  error?: { code: string; message: string; raw?: unknown };
  diagnostics: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    costUsd?: number;
    latencyMs?: number;
  };
}
