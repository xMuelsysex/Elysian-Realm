import type { EventSource, InterventionKind } from "../../shared/domain/index.js";
import type { PersonaSpec, SimulationEvent, SimulationInput } from "../../shared/contracts/index.js";
import { OpenAiCompatibleProvider, runLlmOperation, isLlmProviderError, type FetchLike, type OpenAiCompatibleApiMode } from "../llm/index.js";
import { pilotPersonas } from "../personas/index.js";
import {
  createReplaySummary,
  createSimulationEngine,
  projectTimelineEntry,
  queueSimulationInput,
  stepSimulationEngine,
  validateSimulationEvent,
  type SimulationEngineState,
} from "../simulation/index.js";
import type {
  AdminDiagnostic,
  AdminLlmRuntimeTestRouteResult,
  AdminRouteResult,
  AdminStateResponse,
  LlmRuntimeApiMode,
  SubmitAdminInputRequest,
  SubmitLlmRuntimeTestRequest,
} from "./adminContracts.js";

const DEFAULT_INPUT_SOURCE: EventSource = "user";
const INTERVENTION_KINDS = new Set<InterventionKind>(["observerCommand", "realmEvent", "directPrivateMessage"]);
const EVENT_SOURCES = new Set<EventSource>(["system", "user", "agent", "llm", "test"]);
const LLM_RUNTIME_API_MODES = new Set<LlmRuntimeApiMode>(["chat_completions", "responses"]);
const DEFAULT_LLM_TEST_TIMEOUT_MS = 30_000;

export interface AdminControllerOptions {
  fetchImpl?: FetchLike;
  now?: () => Date;
}

export interface AdminController {
  getState(): AdminStateResponse;
  step(): AdminStateResponse;
  reset(): AdminStateResponse;
  submitInput(request: unknown): AdminRouteResult;
  testLlmRuntimeConfig(request: unknown): Promise<AdminLlmRuntimeTestRouteResult>;
}

export function createAdminController(initialState: SimulationEngineState = createSimulationEngine(), options: AdminControllerOptions = {}): AdminController {
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

  async function testLlmRuntimeConfig(rawRequest: unknown): Promise<AdminLlmRuntimeTestRouteResult> {
    const request = parseSubmitLlmRuntimeTestRequest(rawRequest);
    if (!request.ok) {
      return {
        ok: false,
        status: 400,
        body: {
          error: {
            code: "INVALID_LLM_RUNTIME_TEST_REQUEST",
            message: request.message,
          },
        },
      };
    }

    try {
      const provider = new OpenAiCompatibleProvider(
        {
          baseUrl: request.value.baseUrl,
          model: request.value.model,
          apiKey: request.value.apiKey,
          timeoutMs: request.value.timeoutMs ?? DEFAULT_LLM_TEST_TIMEOUT_MS,
          providerName: request.value.providerName,
          apiMode: toProviderApiMode(request.value.apiMode ?? "chat_completions"),
        },
        options.fetchImpl,
      );
      const operation = await runLlmOperation({
        id: `llm_test_${state.snapshot.lastStepId}`,
        worldId: state.snapshot.id,
        kind: "reflection",
        inputRef: "admin-runtime-llm-test",
        promptSchemaVersion: "admin-llm-test-v1",
        provider,
        chat: {
          messages: [
            {
              role: "system",
              content: "You are an LLM connectivity test for a local debug admin panel. Reply briefly and do not claim to mutate simulation state.",
            },
            { role: "user", content: request.value.prompt },
          ],
          temperature: 0,
          maxTokens: 200,
        },
        timeoutMs: request.value.timeoutMs ?? DEFAULT_LLM_TEST_TIMEOUT_MS,
        now: options.now,
      });

      return {
        ok: true,
        status: 200,
        body: {
          provider: {
            name: provider.name,
            model: provider.model,
            baseUrl: request.value.baseUrl,
            apiMode: request.value.apiMode ?? "chat_completions",
            timeoutMs: request.value.timeoutMs ?? DEFAULT_LLM_TEST_TIMEOUT_MS,
          },
          operation,
          outputText: typeof operation.result?.outputText === "string" ? operation.result.outputText : undefined,
        },
      };
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Invalid LLM runtime provider configuration.";
      return {
        ok: false,
        status: 400,
        body: {
          error: {
            code: isLlmProviderError(caught) ? caught.code : "INVALID_LLM_RUNTIME_PROVIDER_CONFIG",
            message,
          },
        },
      };
    }
  }

  return { getState, step, reset, submitInput, testLlmRuntimeConfig };
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
    personas: clonePersonas(pilotPersonas),
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

function parseSubmitLlmRuntimeTestRequest(rawRequest: unknown): { ok: true; value: SubmitLlmRuntimeTestRequest } | { ok: false; message: string } {
  if (!isRecord(rawRequest)) {
    return { ok: false, message: "request body must be an object" };
  }

  const baseUrl = readRequiredString(rawRequest.baseUrl, "baseUrl");
  if (!baseUrl.ok) return baseUrl;
  const model = readRequiredString(rawRequest.model, "model");
  if (!model.ok) return model;
  const apiKey = readRequiredString(rawRequest.apiKey, "apiKey");
  if (!apiKey.ok) return apiKey;
  const prompt = readRequiredString(rawRequest.prompt, "prompt");
  if (!prompt.ok) return prompt;

  const providerName = rawRequest.providerName === undefined ? undefined : readOptionalString(rawRequest.providerName, "providerName");
  if (providerName && !providerName.ok) return providerName;

  const apiMode = rawRequest.apiMode ?? "chat_completions";
  if (typeof apiMode !== "string" || !LLM_RUNTIME_API_MODES.has(apiMode as LlmRuntimeApiMode)) {
    return { ok: false, message: "apiMode must be chat_completions or responses" };
  }

  const timeoutMs = rawRequest.timeoutMs === undefined ? undefined : Number(rawRequest.timeoutMs);
  if (timeoutMs !== undefined && (!Number.isFinite(timeoutMs) || timeoutMs <= 0)) {
    return { ok: false, message: "timeoutMs must be a positive number" };
  }

  return {
    ok: true,
    value: {
      baseUrl: baseUrl.value,
      model: model.value,
      apiKey: apiKey.value,
      prompt: prompt.value,
      providerName: providerName?.value,
      apiMode: apiMode as LlmRuntimeApiMode,
      timeoutMs,
    },
  };
}

function readRequiredString(value: unknown, field: string): { ok: true; value: string } | { ok: false; message: string } {
  if (typeof value !== "string" || value.trim() === "") {
    return { ok: false, message: `${field} must be a non-empty string` };
  }
  return { ok: true, value: value.trim() };
}

function readOptionalString(value: unknown, field: string): { ok: true; value: string | undefined } | { ok: false; message: string } {
  if (typeof value !== "string") {
    return { ok: false, message: `${field} must be a string` };
  }
  const trimmed = value.trim();
  return { ok: true, value: trimmed || undefined };
}

function toProviderApiMode(apiMode: LlmRuntimeApiMode): OpenAiCompatibleApiMode {
  return apiMode === "responses" ? "responses" : "chatCompletions";
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

function clonePersonas(personas: readonly PersonaSpec[]): PersonaSpec[] {
  return personas.map((persona) => ({
    ...persona,
    aliases: [...persona.aliases],
    profile: {
      ...persona.profile,
      values: [...persona.profile.values],
      longTermGoals: [...persona.profile.longTermGoals],
      constraints: [...persona.profile.constraints],
    },
    speech: {
      ...persona.speech,
      preferredAddressForms: [...persona.speech.preferredAddressForms],
      tabooTopics: [...persona.speech.tabooTopics],
      tabooPhrases: [...persona.speech.tabooPhrases],
    },
    personality: {
      ...persona.personality,
      traits: [...persona.personality.traits],
      strengths: [...persona.personality.strengths],
      flaws: [...persona.personality.flaws],
      emotionalTriggers: [...persona.personality.emotionalTriggers],
    },
    routines: {
      morning: persona.routines.morning.map((activity) => ({ ...activity })),
      day: persona.routines.day.map((activity) => ({ ...activity })),
      evening: persona.routines.evening.map((activity) => ({ ...activity })),
      night: persona.routines.night.map((activity) => ({ ...activity })),
      specialDayOverrides: persona.routines.specialDayOverrides.map((override) => ({
        ...override,
        activities: override.activities.map((activity) => ({ ...activity })),
      })),
    },
    preferences: {
      locations: [...persona.preferences.locations],
      activities: [...persona.preferences.activities],
      likes: [...persona.preferences.likes],
      dislikes: [...persona.preferences.dislikes],
    },
    relationships: persona.relationships.map((relationship) => ({ ...relationship })),
    contentBoundaries: {
      canonFidelity: [...persona.contentBoundaries.canonFidelity],
      legal: [...persona.contentBoundaries.legal],
      safety: [...persona.contentBoundaries.safety],
    },
  }));
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
