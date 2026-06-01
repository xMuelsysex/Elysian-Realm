import type { SimulationInput } from "../../shared/contracts/index.js";
import type { AgentId, EventSource, InterventionKind, LocationId, WorldId } from "../../shared/domain/index.js";

export type SupportedObserverAction = "step" | "pause" | "resume" | "setTimeScale";

export interface SimulationInputValidationContext {
  worldId: WorldId;
  agentIds: readonly AgentId[];
  locationIds: readonly LocationId[];
}

export interface ValidSimulationInput {
  input: SimulationInput;
  commandKind: InterventionKind;
  targetIds: string[];
  payload: Record<string, unknown>;
  summary: string;
}

export interface InvalidSimulationInput {
  input: SimulationInput;
  commandKind?: string;
  message: string;
}

export type SimulationInputValidationResult =
  | { ok: true; value: ValidSimulationInput }
  | { ok: false; error: InvalidSimulationInput };

const EVENT_SOURCES = new Set<EventSource>(["system", "user", "agent", "llm", "test"]);
const INTERVENTION_KINDS = new Set<InterventionKind>(["observerCommand", "realmEvent", "directPrivateMessage"]);
const OBSERVER_ACTIONS = new Set<SupportedObserverAction>(["step", "pause", "resume", "setTimeScale"]);

export function validateSimulationInput(input: SimulationInput, context: SimulationInputValidationContext): SimulationInputValidationResult {
  const baseError = validateInputEnvelope(input, context.worldId);
  if (baseError) {
    return { ok: false, error: { input, message: baseError } };
  }

  if (!isRecord(input.command)) {
    return { ok: false, error: { input, message: "input.command must be an object" } };
  }

  const command = input.command;
  const kind = command.kind;
  if (!isInterventionKind(kind)) {
    return {
      ok: false,
      error: {
        input,
        commandKind: typeof kind === "string" ? kind : undefined,
        message: "input.command.kind must be a supported intervention kind",
      },
    };
  }

  const targetIds = readTargetIds(command);
  if (!targetIds) {
    return {
      ok: false,
      error: { input, commandKind: kind, message: "input.command.targetIds must be a non-empty string array" },
    };
  }

  const payload = getPayload(command);
  if (kind === "observerCommand") {
    return validateObserverCommand(input, kind, targetIds, payload, context);
  }
  if (kind === "realmEvent") {
    return validateRealmEvent(input, kind, targetIds, payload, context);
  }
  return validateDirectPrivateMessage(input, kind, targetIds, payload, context);
}

function validateInputEnvelope(input: SimulationInput, expectedWorldId: WorldId): string | undefined {
  if (!input.id.trim()) return "input.id must be a non-empty string";
  if (input.worldId !== expectedWorldId) return "input.worldId must match the active world";
  if (!input.submittedAt.trim()) return "input.submittedAt must be a non-empty string";
  if (!EVENT_SOURCES.has(input.source)) return "input.source must be a supported event source";
  return undefined;
}

function validateObserverCommand(
  input: SimulationInput,
  kind: InterventionKind,
  targetIds: string[],
  payload: Record<string, unknown>,
  context: SimulationInputValidationContext,
): SimulationInputValidationResult {
  if (targetIds.some((targetId) => targetId !== context.worldId)) {
    return {
      ok: false,
      error: { input, commandKind: kind, message: "observerCommand targets must reference the active world" },
    };
  }

  const action = payload.action;
  if (typeof action !== "string" || !isSupportedObserverAction(action)) {
    return {
      ok: false,
      error: { input, commandKind: kind, message: "observerCommand.payload.action must be step, pause, resume, or setTimeScale" },
    };
  }

  if (action === "setTimeScale") {
    const timeScale = payload.timeScale;
    if (typeof timeScale !== "number" || !Number.isFinite(timeScale) || timeScale <= 0) {
      return {
        ok: false,
        error: { input, commandKind: kind, message: "observerCommand.payload.timeScale must be a positive number" },
      };
    }
  }

  return { ok: true, value: { input, commandKind: kind, targetIds: [...targetIds], payload, summary: `observerCommand:${action}` } };
}

function validateRealmEvent(
  input: SimulationInput,
  kind: InterventionKind,
  targetIds: string[],
  payload: Record<string, unknown>,
  context: SimulationInputValidationContext,
): SimulationInputValidationResult {
  if (targetIds.some((targetId) => !isKnownRealmTarget(targetId, context))) {
    return {
      ok: false,
      error: { input, commandKind: kind, message: "realmEvent targets must reference the active world, location, or agent" },
    };
  }

  if (typeof payload.eventKind !== "string" || payload.eventKind.trim() === "") {
    return {
      ok: false,
      error: { input, commandKind: kind, message: "realmEvent.payload.eventKind must be a non-empty string" },
    };
  }

  return { ok: true, value: { input, commandKind: kind, targetIds: [...targetIds], payload, summary: `realmEvent:${payload.eventKind}` } };
}

function validateDirectPrivateMessage(
  input: SimulationInput,
  kind: InterventionKind,
  targetIds: string[],
  payload: Record<string, unknown>,
  context: SimulationInputValidationContext,
): SimulationInputValidationResult {
  if (targetIds.length !== 1 || !context.agentIds.includes(targetIds[0])) {
    return {
      ok: false,
      error: { input, commandKind: kind, message: "directPrivateMessage targetIds must contain exactly one known agent id" },
    };
  }

  if (typeof payload.message !== "string" || payload.message.trim() === "") {
    return {
      ok: false,
      error: { input, commandKind: kind, message: "directPrivateMessage.payload.message must be a non-empty string" },
    };
  }

  return { ok: true, value: { input, commandKind: kind, targetIds: [...targetIds], payload, summary: "directPrivateMessage" } };
}

function getPayload(command: Record<string, unknown>): Record<string, unknown> {
  return isRecord(command.payload) ? { ...command.payload } : {};
}

function readTargetIds(command: Record<string, unknown>): string[] | undefined {
  const targetIds = command.targetIds;
  if (!Array.isArray(targetIds) || targetIds.length === 0) {
    return undefined;
  }
  if (targetIds.some((targetId) => typeof targetId !== "string" || targetId.trim() === "")) {
    return undefined;
  }
  return [...targetIds];
}

function isKnownRealmTarget(targetId: string, context: SimulationInputValidationContext): boolean {
  return targetId === context.worldId || context.agentIds.includes(targetId) || context.locationIds.includes(targetId);
}

function isInterventionKind(value: unknown): value is InterventionKind {
  return typeof value === "string" && INTERVENTION_KINDS.has(value as InterventionKind);
}

function isSupportedObserverAction(value: string): value is SupportedObserverAction {
  return OBSERVER_ACTIONS.has(value as SupportedObserverAction);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
