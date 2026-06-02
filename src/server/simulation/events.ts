import type { AgentId, EventId, EventSource, InputId, LocationId, PersonaId, WorldId } from "../../shared/domain/index.js";
import type { SimulationEvent } from "../../shared/contracts/index.js";

export const SIMULATION_EVENT_KINDS = [
  "world.created",
  "agent.spawned",
  "world.timeAdvanced",
  "agent.startedRoutine",
  "agent.moved",
  "agent.continuedRoutine",
  "realm.interventionSubmitted",
  "simulation.inputRejected",
  "memory.seeded",
] as const;

export type SimulationEventKind = (typeof SIMULATION_EVENT_KINDS)[number];

export interface EventFactoryContext {
  worldId: WorldId;
  stepId: string;
  time: string;
}

export interface CreateSimulationEventOptions {
  id: EventId;
  kind: SimulationEventKind;
  source: EventSource;
  targetIds: string[];
  payload: Record<string, unknown>;
  actorId?: AgentId;
  causedByInputId?: InputId;
}

export interface WorldCreatedPayload {
  seedId: string;
  personaIds: PersonaId[];
  locationIds: LocationId[];
  initialStatus: string;
}

export interface AgentSpawnedPayload {
  personaId: PersonaId;
  locationId: LocationId;
  status: string;
}

export interface WorldTimeAdvancedPayload {
  from: string;
  to: string;
  timeScale: number;
  stepId: string;
}

export interface AgentStartedRoutinePayload {
  routineId: string;
  locationId: LocationId;
  intent: string;
  provenance: "configured";
}

export interface AgentMovedPayload {
  fromLocationId: LocationId;
  toLocationId: LocationId;
  reason: "routine";
  routineId: string;
  intent: string;
}

export interface AgentContinuedRoutinePayload {
  routineId: string;
  locationId: LocationId;
  intent: string;
  period: "morning" | "day" | "evening" | "night";
  provenance: "configured";
}

export interface RealmInterventionSubmittedPayload {
  inputId: InputId;
  commandKind: string;
  accepted: true;
  summary: string;
}

export interface SimulationInputRejectedPayload {
  inputId: InputId;
  code: "INVALID_SIMULATION_INPUT";
  message: string;
  commandKind?: string;
}

export interface MemorySeededPayload {
  seedBatchId: string;
  memoryIds: string[];
  provenance: "system";
  note: string;
}

export interface TimelineEntry {
  id: EventId;
  stepId: string;
  time: string;
  kind: SimulationEventKind;
  source: EventSource;
  actorId?: AgentId;
  targetIds: string[];
  causedByInputId?: InputId;
}

const EVENT_KIND_SET = new Set<string>(SIMULATION_EVENT_KINDS);

export function createSimulationEvent(context: EventFactoryContext, options: CreateSimulationEventOptions): SimulationEvent {
  return {
    id: options.id,
    worldId: context.worldId,
    stepId: context.stepId,
    time: context.time,
    kind: options.kind,
    actorId: options.actorId,
    targetIds: [...options.targetIds],
    payload: { ...options.payload },
    source: options.source,
    causedByInputId: options.causedByInputId,
  };
}

export function isSimulationEventKind(kind: string): kind is SimulationEventKind {
  return EVENT_KIND_SET.has(kind);
}

export function projectTimelineEntry(event: SimulationEvent): TimelineEntry {
  if (!isSimulationEventKind(event.kind)) {
    throw new Error(`Unsupported simulation event kind: ${event.kind}`);
  }

  return {
    id: event.id,
    stepId: event.stepId,
    time: event.time,
    kind: event.kind,
    source: event.source,
    actorId: event.actorId,
    targetIds: [...event.targetIds],
    causedByInputId: event.causedByInputId,
  };
}

export function validateSimulationEvent(event: SimulationEvent): string[] {
  const errors: string[] = [];

  if (!isSimulationEventKind(event.kind)) {
    errors.push(`event.kind must be one of: ${SIMULATION_EVENT_KINDS.join(", ")}`);
  }
  requireNonEmptyString(event.id, "event.id", errors);
  requireNonEmptyString(event.worldId, "event.worldId", errors);
  requireNonEmptyString(event.stepId, "event.stepId", errors);
  requireNonEmptyString(event.time, "event.time", errors);
  requireStringArray(event.targetIds, "event.targetIds", errors, { allowEmpty: false });
  if (!isRecord(event.payload)) {
    errors.push("event.payload must be an object");
    return errors;
  }

  if (isSimulationEventKind(event.kind)) {
    validateEventPayload(event.kind, event.payload, errors);
  }

  return errors;
}

function validateEventPayload(kind: SimulationEventKind, payload: Record<string, unknown>, errors: string[]): void {
  switch (kind) {
    case "world.created":
      requirePayloadString(payload, "seedId", errors);
      requirePayloadStringArray(payload, "personaIds", errors, { allowEmpty: false });
      requirePayloadStringArray(payload, "locationIds", errors, { allowEmpty: false });
      requirePayloadString(payload, "initialStatus", errors);
      return;
    case "agent.spawned":
      requirePayloadString(payload, "personaId", errors);
      requirePayloadString(payload, "locationId", errors);
      requirePayloadString(payload, "status", errors);
      return;
    case "world.timeAdvanced":
      requirePayloadString(payload, "from", errors);
      requirePayloadString(payload, "to", errors);
      requirePayloadPositiveNumber(payload, "timeScale", errors);
      requirePayloadString(payload, "stepId", errors);
      return;
    case "agent.startedRoutine":
      requirePayloadString(payload, "routineId", errors);
      requirePayloadString(payload, "locationId", errors);
      requirePayloadString(payload, "intent", errors);
      requirePayloadLiteral(payload, "provenance", "configured", errors);
      return;
    case "agent.moved":
      requirePayloadString(payload, "fromLocationId", errors);
      requirePayloadString(payload, "toLocationId", errors);
      requirePayloadLiteral(payload, "reason", "routine", errors);
      requirePayloadString(payload, "routineId", errors);
      requirePayloadString(payload, "intent", errors);
      return;
    case "agent.continuedRoutine":
      requirePayloadString(payload, "routineId", errors);
      requirePayloadString(payload, "locationId", errors);
      requirePayloadString(payload, "intent", errors);
      requirePayloadOneOf(payload, "period", ["morning", "day", "evening", "night"], errors);
      requirePayloadLiteral(payload, "provenance", "configured", errors);
      return;
    case "realm.interventionSubmitted":
      requirePayloadString(payload, "inputId", errors);
      requirePayloadString(payload, "commandKind", errors);
      requirePayloadLiteral(payload, "accepted", true, errors);
      requirePayloadString(payload, "summary", errors);
      return;
    case "simulation.inputRejected":
      requirePayloadString(payload, "inputId", errors);
      requirePayloadLiteral(payload, "code", "INVALID_SIMULATION_INPUT", errors);
      requirePayloadString(payload, "message", errors);
      if (payload.commandKind !== undefined) {
        requirePayloadString(payload, "commandKind", errors);
      }
      return;
    case "memory.seeded":
      requirePayloadString(payload, "seedBatchId", errors);
      requirePayloadStringArray(payload, "memoryIds", errors, { allowEmpty: true });
      requirePayloadLiteral(payload, "provenance", "system", errors);
      requirePayloadString(payload, "note", errors);
      return;
  }
}

function requirePayloadString(payload: Record<string, unknown>, key: string, errors: string[]): void {
  requireNonEmptyString(payload[key], `event.payload.${key}`, errors);
}

function requirePayloadStringArray(payload: Record<string, unknown>, key: string, errors: string[], options: { allowEmpty: boolean }): void {
  requireStringArray(payload[key], `event.payload.${key}`, errors, options);
}

function requirePayloadPositiveNumber(payload: Record<string, unknown>, key: string, errors: string[]): void {
  const value = payload[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    errors.push(`event.payload.${key} must be a positive number`);
  }
}

function requirePayloadLiteral(payload: Record<string, unknown>, key: string, expected: string | boolean, errors: string[]): void {
  if (payload[key] !== expected) {
    errors.push(`event.payload.${key} must be ${String(expected)}`);
  }
}

function requirePayloadOneOf(payload: Record<string, unknown>, key: string, allowed: readonly string[], errors: string[]): void {
  if (typeof payload[key] !== "string" || !allowed.includes(payload[key])) {
    errors.push(`event.payload.${key} must be one of: ${allowed.join(", ")}`);
  }
}

function requireNonEmptyString(value: unknown, path: string, errors: string[]): void {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${path} must be a non-empty string`);
  }
}

function requireStringArray(value: unknown, path: string, errors: string[], options: { allowEmpty: boolean }): void {
  if (!Array.isArray(value) || (!options.allowEmpty && value.length === 0) || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    errors.push(`${path} must be ${options.allowEmpty ? "a string array" : "a non-empty string array"}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
