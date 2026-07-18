import type { SimulationInput } from "../../shared/contracts/index.js";
import type { AgentId, EventSource, InterventionKind, LocationId, WorldId } from "../../shared/domain/index.js";

export type SupportedObserverAction = "step" | "pause" | "resume" | "setTimeScale";
export type ReviewedLlmProposalAction = "continue" | "move" | "wait" | "performActivity" | "reflect";

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
  reviewedLlmProposal?: ReviewedLlmProposalPayload;
}

export interface InvalidSimulationInput {
  input: SimulationInput;
  commandKind?: string;
  message: string;
}

export interface ReviewedLlmProposalPayload {
  eventKind: string;
  provenance: "user-reviewed-llm-proposal";
  sandbox: true;
  agentId: AgentId;
  proposalAction: ReviewedLlmProposalAction;
  reason: string;
  intent: string;
  llmOperationId: string;
  reviewedBy: string;
  targetLocationId?: LocationId;
  targetAgentId?: AgentId;
}

export type SimulationInputValidationResult =
  | { ok: true; value: ValidSimulationInput }
  | { ok: false; error: InvalidSimulationInput };

const EVENT_SOURCES = new Set<EventSource>(["system", "user", "agent", "llm", "test"]);
const INTERVENTION_KINDS = new Set<InterventionKind>(["observerCommand", "realmEvent", "directPrivateMessage"]);
const OBSERVER_ACTIONS = new Set<SupportedObserverAction>(["step", "pause", "resume", "setTimeScale"]);
const REVIEWED_LLM_PROPOSAL_ACTIONS = new Set<ReviewedLlmProposalAction>(["continue", "move", "wait", "performActivity", "reflect"]);
const REVIEWED_LLM_PROPOSAL_PROVENANCE = "user-reviewed-llm-proposal";
const LLM_PROPOSAL_EVENT_KIND_PREFIX = "llm.proposal.";

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

  let reviewedLlmProposal: ReviewedLlmProposalPayload | undefined;
  if (isReviewedLlmProposalLike(payload)) {
    if (input.source !== "user") {
      return {
        ok: false,
        error: { input, commandKind: kind, message: "reviewed LLM proposal input source must be user" },
      };
    }

    const reviewed = parseReviewedLlmProposalPayload(payload, targetIds, context);
    if (!reviewed.ok) {
      return {
        ok: false,
        error: { input, commandKind: kind, message: reviewed.message },
      };
    }
    reviewedLlmProposal = reviewed.value;
  }

  return {
    ok: true,
    value: {
      input,
      commandKind: kind,
      targetIds: [...targetIds],
      payload,
      summary: `realmEvent:${payload.eventKind}`,
      ...(reviewedLlmProposal ? { reviewedLlmProposal } : {}),
    },
  };
}

function validateDirectPrivateMessage(
  input: SimulationInput,
  kind: InterventionKind,
  targetIds: string[],
  payload: Record<string, unknown>,
  context: SimulationInputValidationContext,
): SimulationInputValidationResult {
  if (input.source !== "user") {
    return {
      ok: false,
      error: { input, commandKind: kind, message: "directPrivateMessage input source must be user" },
    };
  }

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

export function parseReviewedLlmProposalPayload(
  payload: Record<string, unknown>,
  targetIds: readonly string[],
  context: SimulationInputValidationContext,
): { ok: true; value: ReviewedLlmProposalPayload } | { ok: false; message: string } {
  const eventKind = readNonEmptyString(payload.eventKind);
  if (!eventKind?.startsWith(LLM_PROPOSAL_EVENT_KIND_PREFIX)) {
    return { ok: false, message: "reviewed LLM proposal eventKind must start with llm.proposal." };
  }

  if (payload.provenance !== REVIEWED_LLM_PROPOSAL_PROVENANCE) {
    return { ok: false, message: "reviewed LLM proposal provenance must be user-reviewed-llm-proposal" };
  }
  if (payload.sandbox !== true) {
    return { ok: false, message: "reviewed LLM proposal sandbox must be true" };
  }

  const agentId = readNonEmptyString(payload.agentId);
  if (!agentId || !context.agentIds.includes(agentId)) {
    return { ok: false, message: "reviewed LLM proposal agentId must reference a known agent" };
  }
  if (!targetIds.includes(agentId)) {
    return { ok: false, message: "reviewed LLM proposal targetIds must include agentId" };
  }

  const proposalAction = readNonEmptyString(payload.proposalAction);
  if (!proposalAction || !REVIEWED_LLM_PROPOSAL_ACTIONS.has(proposalAction as ReviewedLlmProposalAction)) {
    return { ok: false, message: "reviewed LLM proposal action must be continue, move, wait, performActivity, or reflect" };
  }
  if (eventKind !== `${LLM_PROPOSAL_EVENT_KIND_PREFIX}${proposalAction}`) {
    return { ok: false, message: "reviewed LLM proposal eventKind must match proposalAction" };
  }

  const reason = readNonEmptyString(payload.reason);
  if (!reason) {
    return { ok: false, message: "reviewed LLM proposal reason must be a non-empty string" };
  }
  const llmOperationId = readNonEmptyString(payload.llmOperationId);
  if (!llmOperationId) {
    return { ok: false, message: "reviewed LLM proposal llmOperationId must be a non-empty string" };
  }

  const targetLocationId = readOptionalKnownLocation(payload.targetLocationId, context);
  if (!targetLocationId.ok) return targetLocationId;
  const targetAgentId = readOptionalKnownAgent(payload.targetAgentId, context);
  if (!targetAgentId.ok) return targetAgentId;
  if (proposalAction === "move" && !targetLocationId.value) {
    return { ok: false, message: "reviewed LLM move proposal must include targetLocationId" };
  }

  return {
    ok: true,
    value: {
      eventKind,
      provenance: REVIEWED_LLM_PROPOSAL_PROVENANCE,
      sandbox: true,
      agentId,
      proposalAction: proposalAction as ReviewedLlmProposalAction,
      reason,
      intent: readNonEmptyString(payload.intent) ?? `${proposalAction}: ${reason}`,
      llmOperationId,
      reviewedBy: readNonEmptyString(payload.reviewedBy) ?? "user",
      ...(targetLocationId.value ? { targetLocationId: targetLocationId.value } : {}),
      ...(targetAgentId.value ? { targetAgentId: targetAgentId.value } : {}),
    },
  };
}

function isReviewedLlmProposalLike(payload: Record<string, unknown>): boolean {
  return (
    (typeof payload.eventKind === "string" && payload.eventKind.startsWith(LLM_PROPOSAL_EVENT_KIND_PREFIX)) ||
    payload.provenance === REVIEWED_LLM_PROPOSAL_PROVENANCE
  );
}

function readOptionalKnownLocation(
  value: unknown,
  context: SimulationInputValidationContext,
): { ok: true; value?: LocationId } | { ok: false; message: string } {
  const locationId = readNonEmptyString(value);
  if (!locationId) return { ok: true };
  if (!context.locationIds.includes(locationId)) {
    return { ok: false, message: "reviewed LLM proposal targetLocationId must reference a known location" };
  }
  return { ok: true, value: locationId };
}

function readOptionalKnownAgent(
  value: unknown,
  context: SimulationInputValidationContext,
): { ok: true; value?: AgentId } | { ok: false; message: string } {
  const agentId = readNonEmptyString(value);
  if (!agentId) return { ok: true };
  if (!context.agentIds.includes(agentId)) {
    return { ok: false, message: "reviewed LLM proposal targetAgentId must reference a known agent" };
  }
  return { ok: true, value: agentId };
}

function readNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
