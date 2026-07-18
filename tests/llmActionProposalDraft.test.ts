import test from "node:test";
import assert from "node:assert/strict";

import {
  createLlmProposalInterventionDraft,
  createLlmProposalReviewDraftForm,
  createSubmitAdminInputFromLlmProposalReviewDraftForm,
  parseLlmProposalDraftText,
} from "../src/app/llm/actionProposalDraft.js";
import type { LlmActionProposalResponse } from "../src/server/admin/index.js";

const completedProposal: LlmActionProposalResponse = {
  provider: {
    name: "offline-provider",
    model: "offline-model",
    baseUrl: "https://example.test/v1",
    apiMode: "chat_completions",
    timeoutMs: 5000,
  },
  agentId: "agent_elysia",
  sandbox: true,
  provenance: "generated",
  operation: {
    id: "llm_action_proposal_step_001_agent_elysia",
    worldId: "world_elysian_observation_mvp",
    agentId: "agent_elysia",
    kind: "actionProposal",
    status: "completed",
    inputRef: "admin-action-proposal-sandbox",
    promptSchemaVersion: "admin-action-proposal-v1",
    provider: "offline-provider",
    model: "offline-model",
    startedAt: "2026-05-31T06:00:00.000Z",
    completedAt: "2026-05-31T06:00:01.000Z",
    diagnostics: {},
  },
  proposal: {
    action: "move",
    reason: "Elysia wants to greet the morning with a gentle walk.",
    intent: "Invite a calm encounter near the garden path.",
    targetLocationId: "garden",
    targetAgentId: "agent_kevin",
  },
};

test("maps a completed LLM action proposal into an editable admin input draft", () => {
  const draft = createLlmProposalInterventionDraft(completedProposal);

  assert.ok(draft);
  assert.equal(draft.kind, "realmEvent");
  assert.equal(draft.source, "user");
  assert.deepEqual(draft.targetIds, ["agent_elysia", "garden", "agent_kevin"]);
  assert.equal(draft.payload.eventKind, "llm.proposal.move");
  assert.equal(draft.payload.provenance, "user-reviewed-llm-proposal");
  assert.equal(draft.payload.reviewedBy, "user");
  assert.equal(draft.payload.sandbox, true);
  assert.equal(draft.payload.llmOperationId, "llm_action_proposal_step_001_agent_elysia");
  assert.equal(draft.payload.agentId, "agent_elysia");
  assert.equal(draft.payload.proposalAction, "move");
  assert.equal(draft.payload.reason, "Elysia wants to greet the morning with a gentle walk.");
  assert.equal(draft.payload.intent, "Invite a calm encounter near the garden path.");
  assert.equal(draft.payload.targetLocationId, "garden");
  assert.equal(draft.payload.targetAgentId, "agent_kevin");
  assert.match(String(draft.payload.description), /LLM proposal for agent_elysia: move/);
  assert.equal(JSON.stringify(draft).includes("apiKey"), false);
});

test("does not create drafts for failed or missing LLM proposals", () => {
  assert.equal(createLlmProposalInterventionDraft({ ...completedProposal, proposal: undefined }), undefined);
  assert.equal(
    createLlmProposalInterventionDraft({
      ...completedProposal,
      operation: {
        ...completedProposal.operation,
        status: "failed",
        error: { code: "LLM_ACTION_PROPOSAL_VALIDATION_ERROR", message: "Invalid target." },
      },
    }),
    undefined,
  );
});

test("deduplicates draft targets when proposal target matches selected agent", () => {
  const draft = createLlmProposalInterventionDraft({
    ...completedProposal,
    proposal: {
      action: "reflect",
      reason: "Pause before acting.",
      targetAgentId: "agent_elysia",
    },
  });

  assert.deepEqual(draft?.targetIds, ["agent_elysia"]);
  assert.equal(draft?.payload.eventKind, "llm.proposal.reflect");
});

test("maps a structured proposal review form back to a typed admin input", () => {
  const draft = createLlmProposalInterventionDraft(completedProposal);
  assert.ok(draft);
  const form = createLlmProposalReviewDraftForm(draft);
  assert.ok(form);

  const parsed = createSubmitAdminInputFromLlmProposalReviewDraftForm({
    ...form,
    targetIdsText: "agent_elysia, garden\nagent_kevin",
    description: "User reviewed and softened the movement proposal.",
    reason: "Keep the morning greeting gentle.",
    intent: "Walk slowly toward the garden path.",
    basePayload: {
      ...form.basePayload,
      customDebugNote: "preserved for advanced review",
      apiKey: "sk-should-not-survive",
    },
  });

  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.value.kind, "realmEvent");
  assert.equal(parsed.value.source, "user");
  assert.deepEqual(parsed.value.targetIds, ["agent_elysia", "garden", "agent_kevin"]);
  assert.equal(parsed.value.payload.description, "User reviewed and softened the movement proposal.");
  assert.equal(parsed.value.payload.eventKind, "llm.proposal.move");
  assert.equal(parsed.value.payload.reason, "Keep the morning greeting gentle.");
  assert.equal(parsed.value.payload.intent, "Walk slowly toward the garden path.");
  assert.equal(parsed.value.payload.provenance, "user-reviewed-llm-proposal");
  assert.equal(parsed.value.payload.reviewedBy, "user");
  assert.equal(parsed.value.payload.sandbox, true);
  assert.equal(parsed.value.payload.llmOperationId, "llm_action_proposal_step_001_agent_elysia");
  assert.equal(parsed.value.payload.agentId, "agent_elysia");
  assert.equal(parsed.value.payload.proposalAction, "move");
  assert.equal(parsed.value.payload.targetLocationId, "garden");
  assert.equal(parsed.value.payload.customDebugNote, "preserved for advanced review");
  assert.equal("apiKey" in parsed.value.payload, false);
  assert.equal(JSON.stringify(parsed.value).includes("apiKey"), false);
});

test("rejects structured proposal review forms without typed targets or required review fields", () => {
  const draft = createLlmProposalInterventionDraft(completedProposal);
  assert.ok(draft);
  const form = createLlmProposalReviewDraftForm(draft);
  assert.ok(form);

  assert.deepEqual(createSubmitAdminInputFromLlmProposalReviewDraftForm({ ...form, targetIdsText: "" }), { ok: false, error: "draftShape" });
  assert.deepEqual(createSubmitAdminInputFromLlmProposalReviewDraftForm({ ...form, eventKind: "" }), { ok: false, error: "draftShape" });
  assert.deepEqual(createSubmitAdminInputFromLlmProposalReviewDraftForm({ ...form, description: "" }), { ok: false, error: "draftShape" });
  assert.deepEqual(createSubmitAdminInputFromLlmProposalReviewDraftForm({ ...form, reason: "" }), { ok: false, error: "draftShape" });
});

test("parses edited draft JSON as an explicit user realm event", () => {
  const draft = createLlmProposalInterventionDraft(completedProposal);
  assert.ok(draft);

  const parsed = parseLlmProposalDraftText(JSON.stringify({
    ...draft,
    source: undefined,
    payload: {
      ...draft.payload,
      description: "User edited the proposal before submitting.",
    },
  }));

  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.value.kind, "realmEvent");
  assert.equal(parsed.value.source, "user");
  assert.equal(parsed.value.payload.description, "User edited the proposal before submitting.");
});

test("rejects malformed draft JSON and non-user draft sources", () => {
  assert.deepEqual(parseLlmProposalDraftText("not json"), { ok: false, error: "draftJson" });
  assert.deepEqual(parseLlmProposalDraftText(JSON.stringify({ kind: "observerCommand", targetIds: ["world"], payload: { action: "step" } })), { ok: false, error: "draftShape" });
  assert.deepEqual(parseLlmProposalDraftText(JSON.stringify({ kind: "realmEvent", targetIds: ["agent_elysia"], source: "llm", payload: { eventKind: "llm.proposal.wait" } })), { ok: false, error: "draftShape" });
});
