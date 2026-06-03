import type { LlmActionProposalPreview, LlmActionProposalResponse, SubmitAdminInputRequest } from "../../server/admin/index.js";

const DRAFT_EVENT_KIND_PREFIX = "llm.proposal";
const DRAFT_PROVENANCE = "user-reviewed-llm-proposal";

export type LlmProposalDraftParseError = "draftJson" | "draftShape";

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

function isString(value: string | undefined): value is string {
  return typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((entry) => typeof entry === "string" && entry.trim() !== "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
