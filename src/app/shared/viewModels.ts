import type { AdminDiagnostic, AdminStateResponse, SubmitAdminInputRequest } from "../../server/admin/index.js";
import type { ReplaySummary, TimelineEntry } from "../../server/simulation/index.js";
import type {
  AgentRuntimeState,
  ConversationRecord,
  LocationRef,
  PersonaSpec,
  SimulationEvent,
  WorldSnapshot,
} from "../../shared/contracts/index.js";
import type { EventSource } from "../../shared/domain/index.js";
import {
  DEFAULT_LANGUAGE,
  formatAgentDisplayName,
  formatCommandKindLabel,
  formatCommandSummary,
  formatDiagnosticMessage,
  formatEventKindLabel,
  formatPayloadKeyLabel,
  formatPayloadStatusLabel,
  formatPersonaText,
  formatLocationName,
  formatSimulationText,
  type AppLanguage,
} from "./i18n.js";

export type TimelineDetailMode = "user" | "debug";

export interface LocationGroup {
  location: LocationRef;
  agents: AgentRuntimeState[];
}

export interface EventDebugFact {
  label: string;
  value: string;
}

export interface EventDetailViewModel {
  id: string;
  title: string;
  summary: string;
  debugFacts: EventDebugFact[];
  payload: Record<string, unknown>;
  relatedAgentIds: string[];
  targetIds: string[];
  source: EventSource;
  kind: string;
  time: string;
  stepId: string;
  causedByInputId?: string;
}

export interface TimelineItem {
  entry: TimelineEntry;
  event: SimulationEvent;
  title: string;
  detail: string;
  detailModel: EventDetailViewModel;
}

export interface TimelineFilters {
  agentId?: string;
  kind?: string;
  source?: EventSource;
  targetId?: string;
  keyword?: string;
  fromTime?: string;
  toTime?: string;
}

export type AgentDetailState = "empty" | "notFound" | "selected";

export interface CooldownEntry {
  key: string;
  value: string;
}

export interface ConfiguredFactItem {
  label: string;
  value: string;
  provenance: "configured";
}

export interface RuntimeMemoryIndexItem {
  eventId: string;
  time: string;
  summary: string;
  provenance: "generated" | "system" | "user";
}

export interface AgentDetailViewModel {
  state: AgentDetailState;
  selectedAgentId?: string;
  agent?: AgentRuntimeState;
  location?: LocationRef;
  persona?: PersonaSpec;
  configuredFacts: ConfiguredFactItem[];
  longTermGoals: string[];
  runtimeMoodIntent?: string;
  recentMemoryIndex: RuntimeMemoryIndexItem[];
  cooldownEntries: CooldownEntry[];
  relatedEvents: TimelineItem[];
}

export interface RelationshipRow {
  sourcePersonaId: string;
  sourceName: string;
  targetPersonaId: string;
  targetName: string;
  affinity: number;
  trust: number;
  tension: number;
  grouping: string;
  notes: string;
  interactionCount: number;
  recentInteractions: TimelineItem[];
}

export interface WorldInspectorViewModel {
  worldId: string;
  status: string;
  currentTime: string;
  timeScale: number;
  lastStepId: string;
  eventCount: number;
  timelineCount: number;
  replayFinalStepId: string;
  replayFinalTime: string;
  locationCount: number;
  agentCount: number;
  activeConversationCount: number;
  queuedInputCount: number;
  diagnosticCount: number;
  locations: LocationRef[];
  agents: AgentRuntimeState[];
  activeConversations: ConversationRecord[];
  queues: WorldSnapshot["queuedInputs"];
  diagnostics: AdminDiagnostic[];
}

export type ReceiptStatus = "none" | "accepted" | "rejected";

export interface InterventionReceiptViewModel {
  status: ReceiptStatus;
  input?: SubmitAdminInputRequest;
  reason?: string;
  resultingEvents: TimelineItem[];
  affectedObjectIds: string[];
}

export interface ReplayCursorViewModel {
  totalEvents: number;
  cursor: number;
  canPrevious: boolean;
  canNext: boolean;
  selected?: TimelineItem;
  summary: ReplaySummary;
}

export interface MemoryViewModel {
  configuredFacts: ConfiguredFactItem[];
  runtimeMemories: RuntimeMemoryIndexItem[];
}

export interface MessageThreadViewModel {
  id: string;
  title: string;
  participantIds: string[];
  events: TimelineItem[];
}

export interface DiagnosticsCenterViewModel {
  total: number;
  rejectedInputs: AdminDiagnostic[];
  validationErrors: AdminDiagnostic[];
  anomalies: AdminDiagnostic[];
  latest: AdminDiagnostic[];
}

export interface StateDiffEntry {
  scope: "world" | "agent" | "location" | "queue";
  id: string;
  field: string;
  before: string;
  after: string;
}

export interface AgentPlanViewModel {
  agentId: string;
  displayName: string;
  currentPlanId?: string;
  action?: {
    id: string;
    kind: string;
    intent: string;
    locationId?: string;
    targetAgentId?: string;
    window?: string;
  };
  operationStatus: string;
}

export interface TopologyLocationNode {
  location: LocationRef;
  agents: AgentRuntimeState[];
  connectedLocationIds: string[];
}

export interface MovementPathViewModel {
  eventId: string;
  actorId?: string;
  locationId: string;
  summary: string;
}

export interface TopologyViewModel {
  nodes: TopologyLocationNode[];
  movementPaths: MovementPathViewModel[];
}

export interface DebugExportViewModel {
  generatedAt: string;
  state: AdminStateResponse;
  events: SimulationEvent[];
  replay: ReplaySummary;
  timeline: TimelineItem[];
  diagnostics: DiagnosticsCenterViewModel;
  diffs: StateDiffEntry[];
}

const DEFAULT_RELATED_EVENT_LIMIT = 5;
const DEFAULT_MEMORY_EVENT_LIMIT = 6;

export function groupAgentsByLocation(locations: readonly LocationRef[], agents: readonly AgentRuntimeState[]): LocationGroup[] {
  return locations.map((location) => ({
    location,
    agents: agents.filter((agent) => agent.locationId === location.id),
  }));
}

export function findSelectedAgent(
  agents: readonly AgentRuntimeState[],
  selectedAgentId: string | undefined,
): AgentRuntimeState | undefined {
  if (!selectedAgentId) return undefined;
  return agents.find((agent) => agent.id === selectedAgentId);
}

export function findAgentLocation(
  locations: readonly LocationRef[],
  agent: AgentRuntimeState | undefined,
): LocationRef | undefined {
  if (!agent) return undefined;
  return locations.find((location) => location.id === agent.locationId);
}

export function getCooldownEntries(agent: AgentRuntimeState | undefined): CooldownEntry[] {
  if (!agent) return [];
  return Object.entries(agent.cooldowns).map(([key, value]) => ({ key, value }));
}

export function createPersonaLookup(personas: readonly PersonaSpec[]): Map<string, PersonaSpec> {
  return new Map(personas.map((persona) => [persona.id, persona]));
}

export function findPersonaForAgent(agent: AgentRuntimeState | undefined, personas: readonly PersonaSpec[]): PersonaSpec | undefined {
  if (!agent) return undefined;
  return createPersonaLookup(personas).get(agent.personaId);
}

export function filterRelatedTimelineItems(
  items: readonly TimelineItem[],
  selectedAgentId: string | undefined,
  limit = DEFAULT_RELATED_EVENT_LIMIT,
): TimelineItem[] {
  if (!selectedAgentId) return [];
  return items
    .filter((item) => item.event.actorId === selectedAgentId || item.event.targetIds.includes(selectedAgentId))
    .slice(0, limit);
}

export function createAgentDetailViewModel(
  snapshot: WorldSnapshot,
  selectedAgentId: string | undefined,
  timelineItems: readonly TimelineItem[],
  relatedEventLimit = DEFAULT_RELATED_EVENT_LIMIT,
  personas: readonly PersonaSpec[] = [],
  language: AppLanguage = DEFAULT_LANGUAGE,
): AgentDetailViewModel {
  if (!selectedAgentId) {
    return {
      state: "empty",
      configuredFacts: [],
      longTermGoals: [],
      recentMemoryIndex: [],
      cooldownEntries: [],
      relatedEvents: [],
    };
  }

  const agent = findSelectedAgent(snapshot.agents, selectedAgentId);
  if (!agent) {
    return {
      state: "notFound",
      selectedAgentId,
      configuredFacts: [],
      longTermGoals: [],
      recentMemoryIndex: [],
      cooldownEntries: [],
      relatedEvents: [],
    };
  }

  const persona = findPersonaForAgent(agent, personas);
  const relatedEvents = filterRelatedTimelineItems(timelineItems, agent.id, relatedEventLimit);

  return {
    state: "selected",
    selectedAgentId,
    agent,
    location: findAgentLocation(snapshot.locations, agent),
    persona,
    configuredFacts: persona ? createConfiguredFacts(persona, language) : [],
    longTermGoals: persona?.profile.longTermGoals.map((goal) => formatPersonaText(language, persona.id, goal)) ?? [],
    runtimeMoodIntent: agent.currentAction?.intent ?? `${formatPayloadStatusLabel(language, agent.status)} / ${formatLocationName(language, agent.locationId, agent.locationId)}`,
    recentMemoryIndex: createRuntimeMemoryIndex(timelineItems, agent.id, DEFAULT_MEMORY_EVENT_LIMIT),
    cooldownEntries: getCooldownEntries(agent),
    relatedEvents,
  };
}

export function createTimelineItems(
  events: readonly SimulationEvent[],
  timeline: readonly TimelineEntry[],
  language: AppLanguage = DEFAULT_LANGUAGE,
  detailMode: TimelineDetailMode = "user",
): TimelineItem[] {
  const eventsById = new Map(events.map((event) => [event.id, event]));
  return timeline
    .map((entry) => {
      const event = eventsById.get(entry.id);
      if (!event) return undefined;
      const detailModel = createEventDetailViewModel(event, language, detailMode);
      return {
        entry,
        event,
        title: detailModel.title,
        detail: detailModel.summary,
        detailModel,
      } satisfies TimelineItem;
    })
    .filter((item): item is TimelineItem => item !== undefined)
    .reverse();
}

export function filterTimelineItems(items: readonly TimelineItem[], filters: TimelineFilters): TimelineItem[] {
  const keyword = filters.keyword?.trim().toLocaleLowerCase();
  return items.filter((item) => {
    if (filters.agentId && item.event.actorId !== filters.agentId && !item.event.targetIds.includes(filters.agentId)) return false;
    if (filters.kind && item.event.kind !== filters.kind) return false;
    if (filters.source && item.event.source !== filters.source) return false;
    if (filters.targetId && !item.event.targetIds.includes(filters.targetId)) return false;
    if (filters.fromTime && item.event.time < filters.fromTime) return false;
    if (filters.toTime && item.event.time > filters.toTime) return false;
    if (keyword) {
      const haystack = [item.title, item.detail, item.event.id, item.event.kind, item.event.actorId, ...item.event.targetIds, formatPayloadSummary(item.event.payload)]
        .filter((value): value is string => typeof value === "string")
        .join(" ")
        .toLocaleLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    return true;
  });
}

export function latestDiagnostics(diagnostics: readonly AdminDiagnostic[]): AdminDiagnostic[] {
  return [...diagnostics].slice(-8).reverse();
}

export function createEventDetailViewModel(
  event: SimulationEvent,
  language: AppLanguage = DEFAULT_LANGUAGE,
  detailMode: TimelineDetailMode = "debug",
): EventDetailViewModel {
  const projection = projectKnownEvent(event, language, detailMode) ?? {
    summary: formatPayloadSummary(event.payload, language),
    debugFacts: createPayloadDebugFacts(event.payload, language),
  };
  return {
    id: event.id,
    title: formatEventTitle(event, language),
    summary: projection.summary,
    debugFacts: projection.debugFacts,
    payload: { ...event.payload },
    relatedAgentIds: [...new Set([event.actorId, ...event.targetIds.filter((targetId) => targetId.startsWith("agent_"))].filter(isString))],
    targetIds: [...event.targetIds],
    source: event.source,
    kind: event.kind,
    time: event.time,
    stepId: event.stepId,
    causedByInputId: event.causedByInputId,
  };
}

export function projectEventDetail(
  event: SimulationEvent,
  language: AppLanguage = DEFAULT_LANGUAGE,
  detailMode: TimelineDetailMode = "user",
): string {
  return createEventDetailViewModel(event, language, detailMode).summary;
}

export function formatPayloadSummary(payload: Record<string, unknown>, language: AppLanguage = DEFAULT_LANGUAGE): string {
  const values = Object.entries(payload).map(([key, value]) => `${formatPayloadKeyLabel(language, key)}: ${formatValue(value)}`);
  return values.length > 0 ? values.join(" · ") : noPayloadLabel(language);
}

export function createRelationshipNetworkViewModel(
  personas: readonly PersonaSpec[],
  snapshot: WorldSnapshot,
  timelineItems: readonly TimelineItem[],
  language: AppLanguage = DEFAULT_LANGUAGE,
): RelationshipRow[] {
  const personasById = createPersonaLookup(personas);
  const agentIdByPersonaId = new Map(snapshot.agents.map((agent) => [agent.personaId, agent.id]));

  return personas.flatMap((persona) =>
    persona.relationships.map((relationship) => {
      const sourceAgentId = agentIdByPersonaId.get(persona.id);
      const targetAgentId = agentIdByPersonaId.get(relationship.targetPersonaId);
      const interactions = timelineItems.filter((item) => isBetweenAgents(item.event, sourceAgentId, targetAgentId));
      const recentInteractions = interactions.slice(0, 5);
      return {
        sourcePersonaId: persona.id,
        sourceName: formatAgentDisplayName(language, persona.id, persona.displayName),
        targetPersonaId: relationship.targetPersonaId,
        targetName: formatAgentDisplayName(language, relationship.targetPersonaId, personasById.get(relationship.targetPersonaId)?.displayName ?? relationship.targetPersonaId),
        affinity: relationship.affinity,
        trust: relationship.trust,
        tension: relationship.tension,
        grouping: relationship.tension >= 7 ? "tense" : relationship.trust >= 7 ? "trusted" : "developing",
        notes: formatPersonaText(language, persona.id, relationship.notes),
        interactionCount: interactions.length,
        recentInteractions,
      } satisfies RelationshipRow;
    }),
  );
}

export function createWorldInspectorViewModel(state: AdminStateResponse): WorldInspectorViewModel {
  return {
    worldId: state.snapshot.id,
    status: state.snapshot.status,
    currentTime: state.snapshot.currentTime,
    timeScale: state.snapshot.timeScale,
    lastStepId: state.snapshot.lastStepId,
    eventCount: state.events.length,
    timelineCount: state.timeline.length,
    replayFinalStepId: state.replay.finalStepId,
    replayFinalTime: state.replay.finalTime,
    locationCount: state.snapshot.locations.length,
    agentCount: state.snapshot.agents.length,
    activeConversationCount: state.snapshot.activeConversations.length,
    queuedInputCount: state.snapshot.queuedInputs.length,
    diagnosticCount: state.diagnostics.length,
    locations: state.snapshot.locations,
    agents: state.snapshot.agents,
    activeConversations: state.snapshot.activeConversations,
    queues: state.snapshot.queuedInputs,
    diagnostics: state.diagnostics,
  };
}

export function createInterventionReceiptViewModel(
  previous: AdminStateResponse | undefined,
  current: AdminStateResponse,
  input: SubmitAdminInputRequest | undefined,
  timelineItems: readonly TimelineItem[],
  language: AppLanguage = DEFAULT_LANGUAGE,
): InterventionReceiptViewModel {
  if (!previous || !input) {
    return { status: "none", resultingEvents: [], affectedObjectIds: [] };
  }

  const previousEventIds = new Set(previous.events.map((event) => event.id));
  const newItems = timelineItems.filter((item) => !previousEventIds.has(item.event.id));
  const rejected = newItems.find((item) => item.event.kind === "simulation.inputRejected") ??
    timelineItems.find((item) => item.event.kind === "simulation.inputRejected" && item.event.causedByInputId === latestInputId(current.events));
  const accepted = newItems.find((item) => item.event.kind === "realm.interventionSubmitted");
  const affectedObjectIds = [...new Set(newItems.flatMap((item) => [item.event.actorId, ...item.event.targetIds]).filter(isString))];

  if (rejected) {
    return {
      status: "rejected",
      input,
      reason: formatDiagnosticMessage(language, readString(rejected.event.payload, "message") ?? rejected.detail),
      resultingEvents: newItems,
      affectedObjectIds,
    };
  }

  if (accepted || newItems.length > 0) {
    return {
      status: "accepted",
      input,
      reason: accepted ? formatCommandSummary(language, readString(accepted.event.payload, "summary")) : undefined,
      resultingEvents: newItems,
      affectedObjectIds,
    };
  }

  return { status: "none", input, resultingEvents: [], affectedObjectIds: [] };
}

export function createReplayCursorViewModel(summary: ReplaySummary, timelineItems: readonly TimelineItem[], cursor: number): ReplayCursorViewModel {
  const totalEvents = timelineItems.length;
  const normalizedCursor = totalEvents === 0 ? 0 : Math.min(Math.max(cursor, 0), totalEvents - 1);
  const chronologicalItems = [...timelineItems].reverse();
  return {
    totalEvents,
    cursor: normalizedCursor,
    canPrevious: normalizedCursor > 0,
    canNext: normalizedCursor < totalEvents - 1,
    selected: chronologicalItems[normalizedCursor],
    summary,
  };
}

export function createMemoryViewModel(personas: readonly PersonaSpec[], timelineItems: readonly TimelineItem[], selectedAgentId?: string, language: AppLanguage = DEFAULT_LANGUAGE): MemoryViewModel {
  const agentPersonaId = selectedAgentId?.replace(/^agent_/, "");
  const configuredFacts = personas
    .filter((persona) => !agentPersonaId || persona.id === agentPersonaId)
    .flatMap((persona) => createConfiguredFacts(persona, language));
  return {
    configuredFacts,
    runtimeMemories: createRuntimeMemoryIndex(timelineItems, selectedAgentId, 12),
  };
}

export function createMessageStreamViewModel(timelineItems: readonly TimelineItem[], language: AppLanguage = DEFAULT_LANGUAGE): MessageThreadViewModel[] {
  const messageItems = timelineItems.filter((item) => isMessageLikeEvent(item.event));
  const threads = new Map<string, TimelineItem[]>();
  for (const item of messageItems) {
    const participants = item.event.targetIds.filter((targetId) => targetId.startsWith("agent_"));
    const key = participants.length > 0 ? participants.sort().join("+") : "realm-public";
    threads.set(key, [...(threads.get(key) ?? []), item]);
  }
  return [...threads.entries()].map(([id, events]) => ({
    id,
    title: id === "realm-public" ? (language === "zh" ? "公开领域消息" : "Public realm messages") : (language === "zh" ? `会话 ${id}` : `Conversation ${id}`),
    participantIds: id === "realm-public" ? [] : id.split("+"),
    events,
  }));
}

export function createDiagnosticsCenterViewModel(diagnostics: readonly AdminDiagnostic[]): DiagnosticsCenterViewModel {
  const newest = latestDiagnostics(diagnostics);
  const newestFirst = [...diagnostics].reverse();
  return {
    total: diagnostics.length,
    rejectedInputs: newestFirst.filter((diagnostic) => diagnostic.inputId !== undefined),
    validationErrors: newestFirst.filter((diagnostic) => diagnostic.message.includes("event.payload") || diagnostic.message.includes("event.")),
    anomalies: newestFirst.filter((diagnostic) => diagnostic.level !== "info" && diagnostic.inputId === undefined),
    latest: newest,
  };
}

export function createStateDiffViewModel(previous: AdminStateResponse | undefined, current: AdminStateResponse): StateDiffEntry[] {
  if (!previous) return [];
  const diffs: StateDiffEntry[] = [];
  pushDiff(diffs, "world", current.snapshot.id, "status", previous.snapshot.status, current.snapshot.status);
  pushDiff(diffs, "world", current.snapshot.id, "currentTime", previous.snapshot.currentTime, current.snapshot.currentTime);
  pushDiff(diffs, "world", current.snapshot.id, "timeScale", previous.snapshot.timeScale, current.snapshot.timeScale);
  pushDiff(diffs, "queue", current.snapshot.id, "queuedInputs", previous.snapshot.queuedInputs.length, current.snapshot.queuedInputs.length);

  const previousAgents = new Map(previous.snapshot.agents.map((agent) => [agent.id, agent]));
  for (const agent of current.snapshot.agents) {
    const before = previousAgents.get(agent.id);
    if (!before) {
      diffs.push({ scope: "agent", id: agent.id, field: "created", before: "missing", after: agent.status });
      continue;
    }
    pushDiff(diffs, "agent", agent.id, "status", before.status, agent.status);
    pushDiff(diffs, "agent", agent.id, "locationId", before.locationId, agent.locationId);
    pushDiff(diffs, "agent", agent.id, "currentPlanId", before.currentPlanId, agent.currentPlanId);
    pushDiff(diffs, "agent", agent.id, "currentAction", before.currentAction?.intent, agent.currentAction?.intent);
  }

  const previousLocations = new Set(previous.snapshot.locations.map((location) => location.id));
  for (const location of current.snapshot.locations) {
    if (!previousLocations.has(location.id)) {
      diffs.push({ scope: "location", id: location.id, field: "created", before: "missing", after: location.displayName });
    }
  }

  return diffs;
}

export function createAgentPlanViewModels(snapshot: WorldSnapshot, language: AppLanguage = DEFAULT_LANGUAGE): AgentPlanViewModel[] {
  return snapshot.agents.map((agent) => ({
    agentId: agent.id,
    displayName: formatAgentDisplayName(language, agent.id, agent.displayName),
    currentPlanId: agent.currentPlanId,
    action: agent.currentAction
      ? {
          id: agent.currentAction.id,
          kind: agent.currentAction.kind,
          intent: formatSimulationText(language, agent.currentAction.intent) ?? agent.currentAction.intent,
          locationId: agent.currentAction.locationId,
          targetAgentId: agent.currentAction.targetAgentId,
          window: [agent.currentAction.startsAt, agent.currentAction.endsAt].filter(isString).join(" → ") || undefined,
        }
      : undefined,
    operationStatus: agent.inProgressOperationId ? `${formatSimulationText(language, "in progress")}: ${agent.inProgressOperationId}` : (formatSimulationText(language, "idle / no operation") ?? "idle / no operation"),
  }));
}

export function createTopologyViewModel(snapshot: WorldSnapshot, timelineItems: readonly TimelineItem[]): TopologyViewModel {
  const groups = groupAgentsByLocation(snapshot.locations, snapshot.agents);
  const nodes = groups.map((group, index) => ({
    location: group.location,
    agents: group.agents,
    connectedLocationIds: [snapshot.locations[index - 1]?.id, snapshot.locations[index + 1]?.id].filter(isString),
  }));
  const movementPaths = timelineItems
    .filter((item) => item.event.kind === "agent.startedRoutine" || item.event.kind === "agent.spawned")
    .map((item) => ({
      eventId: item.event.id,
      actorId: item.event.actorId,
      locationId: readString(item.event.payload, "locationId") ?? item.event.targetIds[0] ?? "unknown",
      summary: item.detail,
    }));
  return { nodes, movementPaths };
}

export function createDebugExportViewModel(
  state: AdminStateResponse,
  timelineItems: readonly TimelineItem[],
  diagnostics: DiagnosticsCenterViewModel,
  diffs: readonly StateDiffEntry[],
): DebugExportViewModel {
  return {
    generatedAt: new Date().toISOString(),
    state,
    events: [...state.events],
    replay: state.replay,
    timeline: [...timelineItems],
    diagnostics,
    diffs: [...diffs],
  };
}

function createConfiguredFacts(persona: PersonaSpec, language: AppLanguage = DEFAULT_LANGUAGE): ConfiguredFactItem[] {
  const displayName = formatAgentDisplayName(language, persona.id, persona.displayName);
  return [
    { label: `${displayName} archetype`, value: formatPersonaText(language, persona.id, persona.profile.archetype), provenance: "configured" },
    ...persona.profile.values.map((value) => ({ label: `${displayName} value`, value: formatPersonaText(language, persona.id, value), provenance: "configured" as const })),
    ...persona.personality.traits.map((value) => ({ label: `${displayName} trait`, value: formatPersonaText(language, persona.id, value), provenance: "configured" as const })),
  ];
}

function createRuntimeMemoryIndex(timelineItems: readonly TimelineItem[], selectedAgentId: string | undefined, limit: number): RuntimeMemoryIndexItem[] {
  return timelineItems
    .filter((item) => item.event.kind === "memory.seeded" || item.event.kind === "realm.interventionSubmitted")
    .filter((item) => !selectedAgentId || item.event.targetIds.includes(selectedAgentId) || item.event.actorId === selectedAgentId)
    .slice(0, limit)
    .map((item) => ({
      eventId: item.event.id,
      time: item.event.time,
      summary: item.detail,
      provenance: item.event.source === "user" ? "user" : item.event.kind === "memory.seeded" ? "system" : "generated",
    }));
}

function projectKnownEvent(
  event: SimulationEvent,
  language: AppLanguage,
  detailMode: TimelineDetailMode,
): { summary: string; debugFacts: EventDebugFact[] } | undefined {
  switch (event.kind) {
    case "world.created":
      return projectWorldCreated(event.payload, language, detailMode);
    case "agent.spawned":
      return projectAgentSpawned(event.payload, language, detailMode);
    case "world.timeAdvanced":
      return projectWorldTimeAdvanced(event.payload, language, detailMode);
    case "agent.startedRoutine":
      return projectAgentStartedRoutine(event.payload, language, detailMode);
    case "realm.interventionSubmitted":
      return projectRealmInterventionSubmitted(event.payload, language, detailMode);
    case "simulation.inputRejected":
      return projectSimulationInputRejected(event.payload, language, detailMode);
    case "memory.seeded":
      return projectMemorySeeded(event.payload, language, detailMode);
    default:
      return undefined;
  }
}

function projectWorldCreated(payload: Record<string, unknown>, language: AppLanguage, detailMode: TimelineDetailMode) {
  const seedId = readString(payload, "seedId");
  const personaCount = readStringArray(payload, "personaIds").length;
  const locationCount = readStringArray(payload, "locationIds").length;
  const status = readString(payload, "initialStatus");
  const statusLabel = formatPayloadStatusLabel(language, fallback(status, language));
  const sentence = language === "zh"
    ? `一个新的世界已经启动，${personaCount} 位角色将在 ${locationCount} 个地点展开行动，世界当前为${statusLabel}状态。`
    : `A new world has started with ${personaCount} personas across ${locationCount} locations, and the world is currently ${statusLabel}.`;
  return withProjection(sentence, detailMode, language === "zh" ? [["种子", seedId], ["角色数", personaCount], ["位置数", locationCount], ["初始状态", status]] : [["seed", seedId], ["personas", personaCount], ["locations", locationCount], ["initialStatus", status]]);
}

function projectAgentSpawned(payload: Record<string, unknown>, language: AppLanguage, detailMode: TimelineDetailMode) {
  const personaId = readString(payload, "personaId");
  const locationId = readString(payload, "locationId");
  const status = readString(payload, "status");
  const statusLabel = formatPayloadStatusLabel(language, fallback(status, language));
  const sentence = language === "zh" ? `一位角色已经出现在世界中，当前状态为${statusLabel}。` : `A persona appeared in the world and is currently ${statusLabel}.`;
  return withProjection(sentence, detailMode, language === "zh" ? [["人格", personaId], ["位置", locationId], ["状态", status]] : [["persona", personaId], ["location", locationId], ["status", status]]);
}

function projectWorldTimeAdvanced(payload: Record<string, unknown>, language: AppLanguage, detailMode: TimelineDetailMode) {
  const from = readString(payload, "from");
  const to = readString(payload, "to");
  const timeScale = readNumber(payload, "timeScale");
  const stepId = readString(payload, "stepId");
  const sentence = language === "zh" ? "世界时间向前推进了一段。" : "World time advanced.";
  return withProjection(sentence, detailMode, language === "zh" ? [["从", from], ["到", to], ["时间倍率", timeScale], ["步进", stepId]] : [["from", from], ["to", to], ["timeScale", timeScale], ["step", stepId]]);
}

function projectAgentStartedRoutine(payload: Record<string, unknown>, language: AppLanguage, detailMode: TimelineDetailMode) {
  const routineId = readString(payload, "routineId");
  const locationId = readString(payload, "locationId");
  const intent = formatSimulationText(language, readString(payload, "intent"));
  const provenance = readString(payload, "provenance");
  const sentence = language === "zh" ? "角色开始执行预设日程。" : "The agent started a configured routine.";
  return withProjection(sentence, detailMode, language === "zh" ? [["日程", routineId], ["位置", locationId], ["意图", intent], ["来源", provenance]] : [["routine", routineId], ["location", locationId], ["intent", intent], ["provenance", provenance]]);
}

function projectRealmInterventionSubmitted(payload: Record<string, unknown>, language: AppLanguage, detailMode: TimelineDetailMode) {
  const inputId = readString(payload, "inputId");
  const commandKind = formatCommandKindLabel(language, readString(payload, "commandKind"));
  const accepted = readBoolean(payload, "accepted");
  const summary = formatCommandSummary(language, readString(payload, "summary"));
  const sentence = language === "zh" ? "用户干预已被系统接受。" : "The user intervention was accepted.";
  return withProjection(sentence, detailMode, language === "zh" ? [["命令", commandKind], ["输入", inputId], ["已接受", accepted], ["摘要", summary]] : [["command", commandKind], ["input", inputId], ["accepted", accepted], ["summary", summary]]);
}

function projectSimulationInputRejected(payload: Record<string, unknown>, language: AppLanguage, detailMode: TimelineDetailMode) {
  const inputId = readString(payload, "inputId");
  const message = formatDiagnosticMessage(language, readString(payload, "message") ?? "");
  const commandKind = formatCommandKindLabel(language, readString(payload, "commandKind"));
  const sentence = language === "zh" ? `这次输入被拒绝：${fallback(message, language)}。` : `The input was rejected: ${fallback(message, language)}.`;
  return withProjection(sentence, detailMode, language === "zh" ? [["输入", inputId], ["命令", commandKind], ["原因", message]] : [["input", inputId], ["command", commandKind], ["reason", message]]);
}

function projectMemorySeeded(payload: Record<string, unknown>, language: AppLanguage, detailMode: TimelineDetailMode) {
  const seedBatchId = readString(payload, "seedBatchId");
  const memoryCount = readStringArray(payload, "memoryIds").length;
  const note = formatSimulationText(language, readString(payload, "note"));
  const provenance = readString(payload, "provenance");
  const sentence = language === "zh" ? "记忆种子已记录为事件，实际记忆记录存储仍然延后。" : "Memory seeding was recorded as an event only; MemoryRecord storage is still deferred.";
  return withProjection(sentence, detailMode, language === "zh" ? [["批次", seedBatchId], ["记忆数", memoryCount], ["来源", provenance], ["备注", note]] : [["batch", seedBatchId], ["memories", memoryCount], ["provenance", provenance], ["note", note]]);
}

function withProjection(sentence: string, detailMode: TimelineDetailMode, facts: readonly (readonly [string, unknown])[]): { summary: string; debugFacts: EventDebugFact[] } {
  const debugFacts = facts
    .map(([label, value]) => (value === undefined ? undefined : { label, value: formatValue(value) }))
    .filter((fact): fact is EventDebugFact => fact !== undefined);
  return {
    summary: detailMode === "user" || debugFacts.length === 0 ? sentence : `${sentence} ${debugFacts.map((fact) => `${fact.label}: ${fact.value}`).join(" · ")}`,
    debugFacts,
  };
}

function createPayloadDebugFacts(payload: Record<string, unknown>, language: AppLanguage): EventDebugFact[] {
  return Object.entries(payload).map(([key, value]) => ({ label: formatPayloadKeyLabel(language, key), value: formatValue(value) }));
}

function formatEventTitle(event: SimulationEvent, language: AppLanguage): string {
  const label = formatEventKindLabel(language, event.kind);
  return event.actorId ? `${label} · ${event.actorId}` : label;
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value);
}

function readString(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function readNumber(payload: Record<string, unknown>, key: string): number | undefined {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readBoolean(payload: Record<string, unknown>, key: string): boolean | undefined {
  const value = payload[key];
  return typeof value === "boolean" ? value : undefined;
}

function readStringArray(payload: Record<string, unknown>, key: string): string[] {
  const value = payload[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "") : [];
}

function fallback(value: string | number | boolean | undefined, language: AppLanguage): string {
  return value === undefined ? (language === "zh" ? "未知" : "unknown") : String(value);
}

function noPayloadLabel(language: AppLanguage): string {
  return language === "zh" ? "无载荷详情" : "No payload details";
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isBetweenAgents(event: SimulationEvent, sourceAgentId: string | undefined, targetAgentId: string | undefined): boolean {
  if (!sourceAgentId || !targetAgentId || !event.actorId) return false;
  const targetIds = new Set(event.targetIds);
  return (
    (event.actorId === sourceAgentId && targetIds.has(targetAgentId)) ||
    (event.actorId === targetAgentId && targetIds.has(sourceAgentId))
  );
}

function isMessageLikeEvent(event: SimulationEvent): boolean {
  if (event.kind === "realm.interventionSubmitted") {
    const commandKind = readString(event.payload, "commandKind");
    const summary = readString(event.payload, "summary");
    return commandKind === "directPrivateMessage" || summary === "directPrivateMessage";
  }
  return event.kind.includes("message") || event.kind.includes("conversation");
}

function latestInputId(events: readonly SimulationEvent[]): string | undefined {
  return [...events].reverse().map((event) => event.causedByInputId).find(isString);
}

function pushDiff(
  diffs: StateDiffEntry[],
  scope: StateDiffEntry["scope"],
  id: string,
  field: string,
  beforeValue: unknown,
  afterValue: unknown,
): void {
  const before = beforeValue === undefined ? "—" : formatValue(beforeValue);
  const after = afterValue === undefined ? "—" : formatValue(afterValue);
  if (before !== after) {
    diffs.push({ scope, id, field, before, after });
  }
}
