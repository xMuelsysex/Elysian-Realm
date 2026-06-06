import type { LlmActionProposalPreview, LlmActionProposalResponse, SubmitAdminInputRequest } from "../../server/admin/index.js";

const DRAFT_EVENT_KIND_PREFIX = "llm.proposal";
const DRAFT_PROVENANCE = "user-reviewed-llm-proposal";

export type LlmProposalDraftParseError = "draftJson" | "draftShape";

export interface LlmProposalReviewDraftForm {
  targetIdsText: string;
  eventKind: string;
  description: string;
  reason: string;
  intent: string;
  targetLocationId: string;
  targetAgentId: string;
  agentId: string;
  proposalAction: string;
  llmOperationId: string;
  sandbox: boolean;
  provenance: string;
  reviewedBy: string;
  basePayload: Record<string, unknown>;
}

export function createLlmProposalInterventionDraft(result: LlmActionProposalResponse): SubmitAdminInputRequest | undefined {
  if (result.operation.status !== "completed" || !result.proposal) {
    return undefined;
  }

  const proposal = result.proposal;
  return {
    kind: "realmEvent",
    targetIds: createDraftTargetIds(result.agentId, proposal),
    source: "user",
    payload: {
      eventKind: `${DRAFT_EVENT_KIND_PREFIX}.${proposal.action}`,
      description: createDraftDescription(result.agentId, proposal),
      provenance: DRAFT_PROVENANCE,
      reviewedBy: "user",
      sandbox: result.sandbox,
      llmOperationId: result.operation.id,
      agentId: result.agentId,
      proposalAction: proposal.action,
      reason: proposal.reason,
      ...(proposal.intent ? { intent: proposal.intent } : {}),
      ...(proposal.targetLocationId ? { targetLocationId: proposal.targetLocationId } : {}),
      ...(proposal.targetAgentId ? { targetAgentId: proposal.targetAgentId } : {}),
    },
  };
}

export function parseLlmProposalDraftText(text: string): { ok: true; value: SubmitAdminInputRequest } | { ok: false; error: LlmProposalDraftParseError } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "draftJson" };
  }

  if (!isRecord(parsed) || parsed.kind !== "realmEvent" || !isStringArray(parsed.targetIds) || !isRecord(parsed.payload)) {
    return { ok: false, error: "draftShape" };
  }
  if (parsed.source !== undefined && parsed.source !== "user") {
    return { ok: false, error: "draftShape" };
  }

  return {
    ok: true,
    value: {
      kind: "realmEvent",
      targetIds: parsed.targetIds,
      payload: { ...parsed.payload },
      source: "user",
    },
  };
}

export function createLlmProposalReviewDraftForm(draft: SubmitAdminInputRequest): LlmProposalReviewDraftForm | undefined {
  if (draft.kind !== "realmEvent" || !isStringArray(draft.targetIds) || !isRecord(draft.payload) || (draft.source !== undefined && draft.source !== "user")) return undefined;
  const payload = sanitizeDraftPayload(draft.payload);
  return {
    targetIdsText: draft.targetIds.join("\n"),
    eventKind: readPayloadString(payload, "eventKind") ?? "",
    description: readPayloadString(payload, "description") ?? "",
    reason: readPayloadString(payload, "reason") ?? "",
    intent: readPayloadString(payload, "intent") ?? "",
    targetLocationId: readPayloadString(payload, "targetLocationId") ?? "",
    targetAgentId: readPayloadString(payload, "targetAgentId") ?? "",
    agentId: readPayloadString(payload, "agentId") ?? "",
    proposalAction: readPayloadString(payload, "proposalAction") ?? "",
    llmOperationId: readPayloadString(payload, "llmOperationId") ?? "",
    sandbox: payload.sandbox === true,
    provenance: readPayloadString(payload, "provenance") ?? DRAFT_PROVENANCE,
    reviewedBy: readPayloadString(payload, "reviewedBy") ?? "user",
    basePayload: { ...payload },
  };
}

export function createSubmitAdminInputFromLlmProposalReviewDraftForm(
  form: LlmProposalReviewDraftForm,
): { ok: true; value: SubmitAdminInputRequest } | { ok: false; error: LlmProposalDraftParseError } {
  const targetIds = uniqueStrings(form.targetIdsText.split(/[\s,]+/));
  const eventKind = form.eventKind.trim();
  const description = form.description.trim();
  const reason = form.reason.trim();
  if (targetIds.length === 0 || !eventKind || !description || !reason) {
    return { ok: false, error: "draftShape" };
  }

  const payload: Record<string, unknown> = {
    ...sanitizeDraftPayload(form.basePayload),
    eventKind,
    description,
    provenance: form.provenance || DRAFT_PROVENANCE,
    reviewedBy: form.reviewedBy || "user",
    sandbox: form.sandbox,
    llmOperationId: form.llmOperationId,
    agentId: form.agentId,
    proposalAction: form.proposalAction,
    reason,
  };
  assignOptionalString(payload, "intent", form.intent);
  assignOptionalString(payload, "targetLocationId", form.targetLocationId);
  assignOptionalString(payload, "targetAgentId", form.targetAgentId);

  return {
    ok: true,
    value: {
      kind: "realmEvent",
      targetIds,
      payload,
      source: "user",
    },
  };
}

function createDraftTargetIds(agentId: string, proposal: LlmActionProposalPreview): string[] {
  return uniqueStrings([agentId, proposal.targetLocationId, proposal.targetAgentId]);
}

function createDraftDescription(agentId: string, proposal: LlmActionProposalPreview): string {
  return [
    `LLM proposal for ${agentId}: ${proposal.action}.`,
    `Reason: ${proposal.reason}`,
    proposal.intent ? `Intent: ${proposal.intent}` : undefined,
    proposal.targetLocationId ? `Target location: ${proposal.targetLocationId}` : undefined,
    proposal.targetAgentId ? `Target agent: ${proposal.targetAgentId}` : undefined,
  ].filter(isString).join("\n");
}

function uniqueStrings(values: readonly (string | undefined)[]): string[] {
  return [...new Set(values.filter(isString).map((value) => value.trim()).filter(Boolean))];
}

function readPayloadString(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" ? value : undefined;
}

function assignOptionalString(payload: Record<string, unknown>, key: string, value: string): void {
  const trimmed = value.trim();
  if (trimmed) {
    payload[key] = trimmed;
    return;
  }
  delete payload[key];
}

function sanitizeDraftPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...payload };
  for (const key of ["apiKey", "authorization", "Authorization", "bearerToken", "providerSecret"]) {
    delete sanitized[key];
  }
  return sanitized;
}

function isString(value: string | undefined): value is string {
  return typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((entry) => typeof entry === "string" && entry.trim() !== "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
