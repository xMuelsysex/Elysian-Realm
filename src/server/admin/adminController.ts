import type { AgentId, EventSource, InterventionKind } from "../../shared/domain/index.js";
import type { LlmOperationMetadata, PersonaSpec, SimulationEvent, SimulationInput, WorldSnapshot } from "../../shared/contracts/index.js";
import {
  CONVERSATION_TURN_PROMPT_SCHEMA_VERSION,
  CONVERSATION_TURN_SCHEMA,
  MAX_CONVERSATION_MESSAGE_LENGTH,
  createConversationTurnContext,
  createConversationTurnMessages,
  validateConversationTurnOperation,
  type GeneratedConversationTurnRecord,
} from "../conversation/index.js";
import { OpenAiCompatibleProvider, runLlmOperation, isLlmProviderError, type FetchLike, type LlmChatMessage, type OpenAiCompatibleApiMode } from "../llm/index.js";
import { pilotPersonas } from "../personas/index.js";
import {
  createReplaySummary,
  createSimulationEngine,
  projectTimelineEntry,
  queueSimulationInput,
  stepSimulationEngine,
  validateSimulationEvent,
  type EngineAgentTickDiagnostic,
  type EngineMemoryRecord,
  type EngineReflectionDiagnostic,
  type SimulationEngineState,
} from "../simulation/index.js";
import type {
  AdminDiagnostic,
  AdminLlmActionProposalRouteResult,
  AdminLlmConversationTurnRouteResult,
  AdminLlmRuntimeTestRouteResult,
  AdminRouteResult,
  AdminStateResponse,
  LlmActionProposalKind,
  LlmActionProposalPreview,
  LlmRuntimeApiMode,
  LlmRuntimeProviderSummary,
  SubmitAdminInputRequest,
  SubmitLlmActionProposalRequest,
  SubmitLlmConversationTurnRequest,
  SubmitLlmRuntimeTestRequest,
} from "./adminContracts.js";

const DEFAULT_INPUT_SOURCE: EventSource = "user";
const INTERVENTION_KINDS = new Set<InterventionKind>(["observerCommand", "realmEvent", "directPrivateMessage", "conversationTurn"]);
const EVENT_SOURCES = new Set<EventSource>(["system", "user", "agent", "llm", "test"]);
const LLM_RUNTIME_API_MODES = new Set<LlmRuntimeApiMode>(["chat_completions", "responses"]);
const ACTION_PROPOSAL_KINDS = new Set<LlmActionProposalKind>(["continue", "move", "wait", "performActivity", "reflect"]);
const DEFAULT_LLM_TEST_TIMEOUT_MS = 30_000;
interface RuntimeProviderConfigFields {
  baseUrl: string;
  model: string;
  apiKey: string;
  providerName?: string;
  apiMode?: LlmRuntimeApiMode;
  timeoutMs?: number;
}

const ACTION_PROPOSAL_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    action: { type: "string" },
    reason: { type: "string" },
    intent: { type: "string" },
    targetLocationId: { type: "string" },
    targetAgentId: { type: "string" },
  },
  required: ["action", "reason"],
  additionalProperties: false,
};

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
  proposeLlmAction(request: unknown): Promise<AdminLlmActionProposalRouteResult>;
  proposeConversationTurn(request: unknown): Promise<AdminLlmConversationTurnRouteResult>;
}

export function createAdminController(initialState: SimulationEngineState = createSimulationEngine(), options: AdminControllerOptions = {}): AdminController {
  let state = initialState;
  let latestAgentTickDiagnostics: EngineAgentTickDiagnostic[] = [];
  let latestReflectionDiagnostics: EngineReflectionDiagnostic[] = [];
  let nextInputCounter = 1;
  let nextConversationOperationCounter = 1;
  const generatedConversationTurns = new Map<string, GeneratedConversationTurnRecord>();

  function getState(): AdminStateResponse {
    return createAdminStateResponse(state, latestAgentTickDiagnostics, latestReflectionDiagnostics);
  }

  function step(): AdminStateResponse {
    const result = stepSimulationEngine(state);
    state = result.state;
    latestAgentTickDiagnostics = result.agentTickDiagnostics;
    latestReflectionDiagnostics = result.reflectionDiagnostics;
    return getState();
  }

  function reset(): AdminStateResponse {
    state = createSimulationEngine();
    latestAgentTickDiagnostics = [];
    latestReflectionDiagnostics = [];
    nextInputCounter = 1;
    nextConversationOperationCounter = 1;
    generatedConversationTurns.clear();
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

    const conversationTurnRecord = request.value.kind === "conversationTurn"
      ? validateConversationTurnSubmission(request.value, generatedConversationTurns)
      : undefined;
    if (conversationTurnRecord && !conversationTurnRecord.ok) {
      return createLlmRequestError("INVALID_REVIEWED_CONVERSATION_TURN", conversationTurnRecord.message);
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

    const result = stepSimulationEngine(queueSimulationInput(state, input));
    state = result.state;
    latestAgentTickDiagnostics = result.agentTickDiagnostics;
    latestReflectionDiagnostics = result.reflectionDiagnostics;
    if (conversationTurnRecord?.ok && result.events.some((event) => (
      event.kind === "realm.interventionSubmitted" && event.causedByInputId === input.id
    ))) {
      conversationTurnRecord.value.consumed = true;
    }
    return { ok: true, status: 200, body: getState() };
  }

  async function testLlmRuntimeConfig(rawRequest: unknown): Promise<AdminLlmRuntimeTestRouteResult> {
    const request = parseSubmitLlmRuntimeTestRequest(rawRequest);
    if (!request.ok) {
      return createLlmRequestError("INVALID_LLM_RUNTIME_TEST_REQUEST", request.message);
    }

    try {
      const { provider, summary } = createRuntimeProvider(request.value, options.fetchImpl);
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
        timeoutMs: summary.timeoutMs,
        now: options.now,
      });

      return {
        ok: true,
        status: 200,
        body: {
          provider: summary,
          operation,
          outputText: typeof operation.result?.outputText === "string" ? operation.result.outputText : undefined,
        },
      };
    } catch (caught) {
      return createLlmProviderConfigError(caught);
    }
  }

  async function proposeLlmAction(rawRequest: unknown): Promise<AdminLlmActionProposalRouteResult> {
    const request = parseSubmitLlmActionProposalRequest(rawRequest, state.snapshot);
    if (!request.ok) {
      return createLlmRequestError("INVALID_LLM_ACTION_PROPOSAL_REQUEST", request.message);
    }

    try {
      const { provider, summary } = createRuntimeProvider(request.value, options.fetchImpl);
      const operation = await runLlmOperation({
        id: `llm_action_proposal_${state.snapshot.lastStepId}_${request.value.agentId}`,
        worldId: state.snapshot.id,
        agentId: request.value.agentId as AgentId,
        kind: "actionProposal",
        inputRef: "admin-action-proposal-sandbox",
        promptSchemaVersion: "admin-action-proposal-v1",
        provider,
        chat: {
          messages: createActionProposalMessages(state.snapshot, state.events, request.value.agentId),
          responseFormat: {
            type: "json_schema",
            jsonSchema: {
              name: "action_proposal",
              strict: true,
              schema: ACTION_PROPOSAL_SCHEMA,
            },
          },
          temperature: 0.2,
          maxTokens: 300,
        },
        structuredOutputSchema: ACTION_PROPOSAL_SCHEMA,
        timeoutMs: summary.timeoutMs,
        now: options.now,
      });
      const validation = operation.status === "completed" ? validateActionProposalOperation(operation, state.snapshot) : { operation };

      return {
        ok: true,
        status: 200,
        body: {
          provider: summary,
          agentId: request.value.agentId,
          sandbox: true,
          provenance: "generated",
          operation: validation.operation,
          proposal: validation.proposal,
        },
      };
    } catch (caught) {
      return createLlmProviderConfigError(caught);
    }
  }

  async function proposeConversationTurn(rawRequest: unknown): Promise<AdminLlmConversationTurnRouteResult> {
    const request = parseSubmitLlmConversationTurnRequest(rawRequest, state.snapshot);
    if (!request.ok) {
      return createLlmRequestError("INVALID_LLM_CONVERSATION_TURN_REQUEST", request.message);
    }

    const context = createConversationTurnContext(state, request.value.agentId, request.value.message);
    if (!context.ok) {
      return createLlmRequestError("INVALID_LLM_CONVERSATION_TURN_CONTEXT", context.message);
    }

    try {
      const { provider, summary } = createRuntimeProvider(request.value, options.fetchImpl);
      const operationId = [
        "llm_conversation_turn",
        state.snapshot.lastStepId,
        request.value.agentId,
        String(nextConversationOperationCounter).padStart(3, "0"),
      ].join("_");
      nextConversationOperationCounter += 1;
      const operation = await runLlmOperation({
        id: operationId,
        worldId: state.snapshot.id,
        agentId: request.value.agentId as AgentId,
        kind: "conversationTurn",
        inputRef: context.value.conversationId,
        promptSchemaVersion: CONVERSATION_TURN_PROMPT_SCHEMA_VERSION,
        provider,
        chat: {
          messages: createConversationTurnMessages(context.value),
          responseFormat: {
            type: "json_schema",
            jsonSchema: {
              name: "conversation_turn",
              strict: true,
              schema: CONVERSATION_TURN_SCHEMA,
            },
          },
          temperature: 0.5,
          maxTokens: 500,
        },
        structuredOutputSchema: CONVERSATION_TURN_SCHEMA,
        timeoutMs: summary.timeoutMs,
        now: options.now,
      });
      const validation = operation.status === "completed"
        ? validateConversationTurnOperation(
            operation,
            context.value.relevantMemories.map((memory) => memory.id),
          )
        : { operation };

      if (validation.operation.status === "completed" && validation.draft) {
        generatedConversationTurns.set(validation.operation.id, {
          operationId: validation.operation.id,
          agentId: request.value.agentId as AgentId,
          message: context.value.incomingMessage,
          draft: structuredClone(validation.draft),
          consumed: false,
        });
      }

      return {
        ok: true,
        status: 200,
        body: {
          provider: summary,
          agentId: request.value.agentId,
          message: context.value.incomingMessage,
          sandbox: true,
          provenance: "generated",
          operation: validation.operation,
          draft: validation.draft,
        },
      };
    } catch (caught) {
      return createLlmProviderConfigError(caught);
    }
  }

  return { getState, step, reset, submitInput, testLlmRuntimeConfig, proposeLlmAction, proposeConversationTurn };
}

export function createAdminStateResponse(
  state: SimulationEngineState,
  agentTickDiagnostics: readonly EngineAgentTickDiagnostic[] = [],
  reflectionDiagnostics: readonly EngineReflectionDiagnostic[] = [],
): AdminStateResponse {
  const events = state.events.map((event) => cloneEvent(event));
  const timeline = events.map(projectTimelineEntry);
  return {
    snapshot: cloneSnapshot(state.snapshot),
    events,
    timeline,
    replay: createReplaySummary(state.snapshot, state.events),
    diagnostics: createDiagnostics(events),
    agentTickDiagnostics: cloneAgentTickDiagnostics(agentTickDiagnostics),
    reflectionDiagnostics: cloneReflectionDiagnostics(reflectionDiagnostics),
    agentMemories: cloneAgentMemories(state.agentMemories),
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
    return { ok: false, message: "kind must be observerCommand, realmEvent, directPrivateMessage, or conversationTurn" };
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

function parseSubmitLlmActionProposalRequest(rawRequest: unknown, snapshot: WorldSnapshot): { ok: true; value: SubmitLlmActionProposalRequest } | { ok: false; message: string } {
  if (!isRecord(rawRequest)) {
    return { ok: false, message: "request body must be an object" };
  }

  const baseUrl = readRequiredString(rawRequest.baseUrl, "baseUrl");
  if (!baseUrl.ok) return baseUrl;
  const model = readRequiredString(rawRequest.model, "model");
  if (!model.ok) return model;
  const apiKey = readRequiredString(rawRequest.apiKey, "apiKey");
  if (!apiKey.ok) return apiKey;
  const agentId = readRequiredString(rawRequest.agentId, "agentId");
  if (!agentId.ok) return agentId;
  if (!snapshot.agents.some((agent) => agent.id === agentId.value)) {
    return { ok: false, message: "agentId must reference a known agent" };
  }

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
      agentId: agentId.value,
      providerName: providerName?.value,
      apiMode: apiMode as LlmRuntimeApiMode,
      timeoutMs,
    },
  };
}

function parseSubmitLlmConversationTurnRequest(
  rawRequest: unknown,
  snapshot: WorldSnapshot,
): { ok: true; value: SubmitLlmConversationTurnRequest } | { ok: false; message: string } {
  if (!isRecord(rawRequest)) {
    return { ok: false, message: "request body must be an object" };
  }

  const baseUrl = readRequiredString(rawRequest.baseUrl, "baseUrl");
  if (!baseUrl.ok) return baseUrl;
  const model = readRequiredString(rawRequest.model, "model");
  if (!model.ok) return model;
  const apiKey = readRequiredString(rawRequest.apiKey, "apiKey");
  if (!apiKey.ok) return apiKey;
  const agentId = readRequiredString(rawRequest.agentId, "agentId");
  if (!agentId.ok) return agentId;
  if (!snapshot.agents.some((agent) => agent.id === agentId.value)) {
    return { ok: false, message: "agentId must reference a known agent" };
  }
  const message = readRequiredString(rawRequest.message, "message");
  if (!message.ok) return message;
  if (message.value.length > MAX_CONVERSATION_MESSAGE_LENGTH) {
    return { ok: false, message: `message must be at most ${MAX_CONVERSATION_MESSAGE_LENGTH} characters` };
  }

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
      agentId: agentId.value,
      message: message.value,
      providerName: providerName?.value,
      apiMode: apiMode as LlmRuntimeApiMode,
      timeoutMs,
    },
  };
}

function validateConversationTurnSubmission(
  request: SubmitAdminInputRequest,
  generatedConversationTurns: ReadonlyMap<string, GeneratedConversationTurnRecord>,
): { ok: true; value: GeneratedConversationTurnRecord } | { ok: false; message: string } {
  if ((request.source ?? DEFAULT_INPUT_SOURCE) !== "user") {
    return { ok: false, message: "reviewed conversation turn source must be user" };
  }
  if (request.targetIds.length !== 1) {
    return { ok: false, message: "reviewed conversation turn must target exactly one agent" };
  }

  const llmOperationId = readNonEmptyString(request.payload.llmOperationId);
  if (!llmOperationId) {
    return { ok: false, message: "reviewed conversation turn llmOperationId must be a non-empty string" };
  }
  const generated = generatedConversationTurns.get(llmOperationId);
  if (!generated) {
    return { ok: false, message: "reviewed conversation turn must reference a generated conversation operation" };
  }
  if (generated.consumed) {
    return { ok: false, message: "reviewed conversation turn operation has already been applied" };
  }

  const agentId = readNonEmptyString(request.payload.agentId);
  if (!agentId || agentId !== generated.agentId || request.targetIds[0] !== generated.agentId) {
    return { ok: false, message: "reviewed conversation turn agent must match the generated operation" };
  }
  const message = readNonEmptyString(request.payload.message);
  if (!message || message !== generated.message) {
    return { ok: false, message: "reviewed conversation turn message must match the generated operation" };
  }

  const referencedMemoryIds = readStringArray(request.payload.referencedMemoryIds);
  if (!referencedMemoryIds || !equalStringSets(referencedMemoryIds, generated.draft.referencedMemoryIds)) {
    return { ok: false, message: "reviewed conversation turn referencedMemoryIds must match the generated operation" };
  }

  return { ok: true, value: generated };
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

function createRuntimeProvider(config: RuntimeProviderConfigFields, fetchImpl: FetchLike | undefined): { provider: OpenAiCompatibleProvider; summary: LlmRuntimeProviderSummary } {
  const apiMode = config.apiMode ?? "chat_completions";
  const timeoutMs = config.timeoutMs ?? DEFAULT_LLM_TEST_TIMEOUT_MS;
  const provider = new OpenAiCompatibleProvider(
    {
      baseUrl: config.baseUrl,
      model: config.model,
      apiKey: config.apiKey,
      timeoutMs,
      providerName: config.providerName,
      apiMode: toProviderApiMode(apiMode),
    },
    fetchImpl,
  );
  return {
    provider,
    summary: {
      name: provider.name,
      model: provider.model,
      baseUrl: config.baseUrl,
      apiMode,
      timeoutMs,
    },
  };
}

function createLlmRequestError(code: string, message: string) {
  return {
    ok: false,
    status: 400,
    body: {
      error: { code, message },
    },
  } as const;
}

function createLlmProviderConfigError(caught: unknown) {
  const message = caught instanceof Error ? caught.message : "Invalid LLM runtime provider configuration.";
  return createLlmRequestError(isLlmProviderError(caught) ? caught.code : "INVALID_LLM_RUNTIME_PROVIDER_CONFIG", message);
}

function createActionProposalMessages(snapshot: WorldSnapshot, events: readonly SimulationEvent[], agentId: string): LlmChatMessage[] {
  const agent = snapshot.agents.find((candidate) => candidate.id === agentId);
  const persona = agent ? pilotPersonas.find((candidate) => candidate.id === agent.personaId) : undefined;
  const location = agent ? snapshot.locations.find((candidate) => candidate.id === agent.locationId) : undefined;
  const context = {
    world: {
      id: snapshot.id,
      status: snapshot.status,
      currentTime: snapshot.currentTime,
      lastStepId: snapshot.lastStepId,
    },
    selectedAgent: agent ? {
      id: agent.id,
      displayName: agent.displayName,
      personaId: agent.personaId,
      status: agent.status,
      locationId: agent.locationId,
      locationName: location?.displayName,
      currentPlanId: agent.currentPlanId,
      currentAction: agent.currentAction,
      cooldowns: agent.cooldowns,
      relationshipRefs: agent.relationshipRefs,
    } : undefined,
    persona: persona ? {
      id: persona.id,
      displayName: persona.displayName,
      archetype: persona.profile.archetype,
      values: persona.profile.values,
      longTermGoals: persona.profile.longTermGoals,
      preferences: persona.preferences,
      relationships: persona.relationships,
      contentBoundaries: persona.contentBoundaries,
    } : undefined,
    validLocationIds: snapshot.locations.map((candidate) => candidate.id),
    validAgentIds: snapshot.agents.map((candidate) => candidate.id),
    recentEvents: events.slice(-8).map((event) => ({
      id: event.id,
      time: event.time,
      kind: event.kind,
      source: event.source,
      actorId: event.actorId,
      targetIds: event.targetIds,
    })),
  };

  return [
    {
      role: "system",
      content: [
        "You propose one original daily-life action for a selected simulation agent.",
        "Return only JSON that matches the provided schema.",
        "This is a sandbox preview: do not claim to mutate world state or execute the action.",
        "Allowed actions: continue, move, wait, performActivity, reflect.",
        "Use only valid targetLocationId and targetAgentId values from context.",
      ].join("\n"),
    },
    {
      role: "user",
      content: `Context JSON:\n${JSON.stringify(context, null, 2)}`,
    },
  ];
}

function validateActionProposalOperation(operation: LlmOperationMetadata, snapshot: WorldSnapshot): { operation: LlmOperationMetadata; proposal?: LlmActionProposalPreview } {
  const parsed = operation.result?.parsed;
  if (!isRecord(parsed)) {
    return { operation: failActionProposalOperation(operation, "LLM action proposal did not include parsed structured output.", { parsed }) };
  }

  const action = readNonEmptyString(parsed.action);
  const reason = readNonEmptyString(parsed.reason);
  if (!action || !ACTION_PROPOSAL_KINDS.has(action as LlmActionProposalKind)) {
    return { operation: failActionProposalOperation(operation, "LLM action proposal action must be continue, move, wait, performActivity, or reflect.", { action }) };
  }
  if (!reason) {
    return { operation: failActionProposalOperation(operation, "LLM action proposal reason must be a non-empty string.", { reason: parsed.reason }) };
  }

  const targetLocationId = readNonEmptyString(parsed.targetLocationId);
  const targetAgentId = readNonEmptyString(parsed.targetAgentId);
  if (action === "move" && !targetLocationId) {
    return { operation: failActionProposalOperation(operation, "Move proposals must include targetLocationId.", { action }) };
  }
  if (targetLocationId && !snapshot.locations.some((location) => location.id === targetLocationId)) {
    return { operation: failActionProposalOperation(operation, "targetLocationId must reference a known location.", { targetLocationId }) };
  }
  if (targetAgentId && !snapshot.agents.some((agent) => agent.id === targetAgentId)) {
    return { operation: failActionProposalOperation(operation, "targetAgentId must reference a known agent.", { targetAgentId }) };
  }

  return {
    operation,
    proposal: {
      action: action as LlmActionProposalKind,
      reason,
      intent: readNonEmptyString(parsed.intent),
      targetLocationId,
      targetAgentId,
    },
  };
}

function failActionProposalOperation(operation: LlmOperationMetadata, message: string, raw: unknown): LlmOperationMetadata {
  return {
    ...operation,
    status: "failed",
    error: {
      code: "LLM_ACTION_PROPOSAL_VALIDATION_ERROR",
      message,
      raw,
    },
  };
}

function readNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  if (value.some((item) => typeof item !== "string" || item.trim() === "")) return undefined;
  return [...new Set(value.map((item) => item.trim()))];
}

function equalStringSets(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const rightValues = new Set(right);
  return left.every((value) => rightValues.has(value));
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
    payload: structuredClone(event.payload),
  };
}

function cloneAgentTickDiagnostics(diagnostics: readonly EngineAgentTickDiagnostic[]): EngineAgentTickDiagnostic[] {
  return diagnostics.map((diagnostic) => ({
    agentId: diagnostic.agentId,
    phases: diagnostic.phases.map((phase) => ({ ...phase })),
    ...(diagnostic.proposal ? { proposal: { ...diagnostic.proposal } } : {}),
  }));
}

function cloneAgentMemories(memories: readonly EngineMemoryRecord[]): EngineMemoryRecord[] {
  return memories.map((memory) => ({
    ...memory,
    sourceIds: [...memory.sourceIds],
    relatedMemoryIds: [...memory.relatedMemoryIds],
    tags: [...memory.tags],
    metadata: { ...memory.metadata },
  }));
}

function cloneReflectionDiagnostics(diagnostics: readonly EngineReflectionDiagnostic[]): EngineReflectionDiagnostic[] {
  return diagnostics.map((diagnostic) => ({
    ...diagnostic,
    evidenceMemoryIds: [...diagnostic.evidenceMemoryIds],
    persistedMemoryIds: [...diagnostic.persistedMemoryIds],
    diagnostics: diagnostic.diagnostics.map((entry) => ({
      ...entry,
      evidenceMemoryIds: entry.evidenceMemoryIds ? [...entry.evidenceMemoryIds] : undefined,
    })),
    trigger: diagnostic.trigger
      ? {
          ...diagnostic.trigger,
          sourceIds: [...diagnostic.trigger.sourceIds],
        }
      : undefined,
  }));
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
