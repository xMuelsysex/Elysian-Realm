import type { EventSource, InterventionKind } from "../../shared/domain/index.js";
import type { SimulationEvent, SimulationInput } from "../../shared/contracts/index.js";
import {
  createReplaySummary,
  createSimulationEngine,
  projectTimelineEntry,
  queueSimulationInput,
  stepSimulationEngine,
  validateSimulationEvent,
  type SimulationEngineState,
} from "../simulation/index.js";
import type { AdminDiagnostic, AdminRouteResult, AdminStateResponse, SubmitAdminInputRequest } from "./adminContracts.js";

const DEFAULT_INPUT_SOURCE: EventSource = "user";
const INTERVENTION_KINDS = new Set<InterventionKind>(["observerCommand", "realmEvent", "directPrivateMessage"]);
const EVENT_SOURCES = new Set<EventSource>(["system", "user", "agent", "llm", "test"]);

export interface AdminController {
  getState(): AdminStateResponse;
  step(): AdminStateResponse;
  reset(): AdminStateResponse;
  submitInput(request: unknown): AdminRouteResult;
}

export function createAdminController(initialState: SimulationEngineState = createSimulationEngine()): AdminController {
  let state = initialState;
  let nextInputCounter = 1;

  function getState(): AdminStateResponse {
    return createAdminStateResponse(state);
  }

  function step(): AdminStateResponse {
    state = stepSimulationEngine(state).state;
    return getState();
  }

  function reset(): AdminStateResponse {
    state = createSimulationEngine();
    nextInputCounter = 1;
    return getState();
  }

  function submitInput(rawRequest: unknown): AdminRouteResult {
    const request = parseSubmitAdminInputRequest(rawRequest);
    if (!request.ok) {
      return {
        ok: false,
        status: 400,
        body: {
          error: {
            code: "INVALID_ADMIN_INPUT_REQUEST",
            message: request.message,
          },
        },
      };
    }

    const input: SimulationInput = {
      id: `admin_input_${String(nextInputCounter).padStart(3, "0")}`,
      worldId: state.snapshot.id,
      submittedAt: state.snapshot.currentTime,
      source: request.value.source ?? DEFAULT_INPUT_SOURCE,
      command: {
        kind: request.value.kind,
        targetIds: request.value.targetIds,
        payload: request.value.payload,
      },
    };
    nextInputCounter += 1;

    state = stepSimulationEngine(queueSimulationInput(state, input)).state;
    return { ok: true, status: 200, body: getState() };
  }

  return { getState, step, reset, submitInput };
}

export function createAdminStateResponse(state: SimulationEngineState): AdminStateResponse {
  const events = state.events.map((event) => cloneEvent(event));
  const timeline = events.map(projectTimelineEntry);
  return {
    snapshot: cloneSnapshot(state.snapshot),
    events,
    timeline,
    replay: createReplaySummary(state.snapshot, state.events),
    diagnostics: createDiagnostics(events),
  };
}

function createDiagnostics(events: readonly SimulationEvent[]): AdminDiagnostic[] {
  const diagnostics: AdminDiagnostic[] = [];

  for (const event of events) {
    if (event.kind === "simulation.inputRejected") {
      diagnostics.push({
        id: createDiagnosticId(diagnostics.length + 1),
        level: "error",
        message: readString(event.payload.message) ?? "Simulation input was rejected.",
        eventId: event.id,
        inputId: readString(event.payload.inputId),
        details: { ...event.payload },
      });
    }

    for (const message of validateSimulationEvent(event)) {
      diagnostics.push({
        id: createDiagnosticId(diagnostics.length + 1),
        level: "error",
        message,
        eventId: event.id,
        details: {
          eventKind: event.kind,
          validationError: message,
        },
      });
    }
  }

  return diagnostics;
}

function createDiagnosticId(index: number): string {
  return `diagnostic_${String(index).padStart(3, "0")}`;
}

function parseSubmitAdminInputRequest(rawRequest: unknown): { ok: true; value: SubmitAdminInputRequest } | { ok: false; message: string } {
  if (!isRecord(rawRequest)) {
    return { ok: false, message: "request body must be an object" };
  }

  const kind = rawRequest.kind;
  if (typeof kind !== "string" || !INTERVENTION_KINDS.has(kind as InterventionKind)) {
    return { ok: false, message: "kind must be observerCommand, realmEvent, or directPrivateMessage" };
  }

  const targetIds = rawRequest.targetIds;
  if (!Array.isArray(targetIds) || targetIds.length === 0 || targetIds.some((targetId) => typeof targetId !== "string" || targetId.trim() === "")) {
    return { ok: false, message: "targetIds must be a non-empty string array" };
  }

  const payload = rawRequest.payload;
  if (!isRecord(payload)) {
    return { ok: false, message: "payload must be an object" };
  }

  const source = rawRequest.source;
  if (source !== undefined && (typeof source !== "string" || !EVENT_SOURCES.has(source as EventSource))) {
    return { ok: false, message: "source must be system, user, agent, llm, or test" };
  }

  return {
    ok: true,
    value: {
      kind: kind as InterventionKind,
      targetIds: [...targetIds],
      payload: { ...payload },
      source: source as EventSource | undefined,
    },
  };
}

function cloneSnapshot(snapshot: SimulationEngineState["snapshot"]): SimulationEngineState["snapshot"] {
  return {
    ...snapshot,
    locations: snapshot.locations.map((location) => ({ ...location })),
    agents: snapshot.agents.map((agent) => ({
      ...agent,
      cooldowns: { ...agent.cooldowns },
      relationshipRefs: [...agent.relationshipRefs],
      currentAction: agent.currentAction ? { ...agent.currentAction } : undefined,
    })),
    activeConversations: snapshot.activeConversations.map((conversation) => ({
      ...conversation,
      participants: [...conversation.participants],
    })),
    queuedInputs: snapshot.queuedInputs.map((input) => ({
      ...input,
      command: isRecord(input.command)
        ? {
            ...input.command,
            targetIds: Array.isArray(input.command.targetIds) ? [...input.command.targetIds] : input.command.targetIds,
            payload: isRecord(input.command.payload) ? { ...input.command.payload } : input.command.payload,
          }
        : input.command,
    })),
  };
}

function cloneEvent(event: SimulationEvent): SimulationEvent {
  return {
    ...event,
    targetIds: [...event.targetIds],
    payload: { ...event.payload },
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
