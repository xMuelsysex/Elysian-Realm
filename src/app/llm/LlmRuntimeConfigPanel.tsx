import { useState, type FormEvent } from "react";
import type {
  LlmActionProposalResponse,
  LlmRuntimeApiMode,
  LlmRuntimeTestResponse,
  SubmitAdminInputRequest,
  SubmitLlmActionProposalRequest,
  SubmitLlmRuntimeTestRequest,
} from "../../server/admin/index.js";
import { proposeLlmAction, testLlmRuntimeConfig } from "../adminApi.js";
import type { AppLanguage } from "../shared/i18n.js";
import {
  createLlmProposalInterventionDraft,
  createLlmProposalReviewDraftForm,
  createSubmitAdminInputFromLlmProposalReviewDraftForm,
  parseLlmProposalDraftText,
  type LlmProposalReviewDraftForm,
} from "./actionProposalDraft.js";

interface LlmRuntimeAgentOption {
  id: string;
  displayName: string;
}

interface LlmRuntimeConfigPanelProps {
  language: AppLanguage;
  disabled: boolean;
  agents: readonly LlmRuntimeAgentOption[];
  selectedAgentId?: string;
  onSelectAgent: (agentId: string) => void;
  onSubmitInput: (input: SubmitAdminInputRequest) => Promise<void>;
}

interface LlmRuntimeFormState {
  baseUrl: string;
  model: string;
  apiKey: string;
  providerName: string;
  apiMode: LlmRuntimeApiMode;
  timeoutMs: string;
  prompt: string;
}

const DEFAULT_FORM: LlmRuntimeFormState = {
  baseUrl: "https://api.openai.com/v1",
  model: "",
  apiKey: "",
  providerName: "openai-compatible",
  apiMode: "chat_completions",
  timeoutMs: "30000",
  prompt: "Reply with a short connectivity confirmation for the local Elysian Realm admin panel.",
};

export function LlmRuntimeConfigPanel({ language, disabled, agents, selectedAgentId, onSelectAgent, onSubmitInput }: LlmRuntimeConfigPanelProps) {
  const [form, setForm] = useState<LlmRuntimeFormState>(DEFAULT_FORM);
  const [importText, setImportText] = useState("");
  const [result, setResult] = useState<LlmRuntimeTestResponse>();
  const [proposal, setProposal] = useState<LlmActionProposalResponse>();
  const [reviewDraft, setReviewDraft] = useState<LlmProposalReviewDraftForm>();
  const [advancedDraftText, setAdvancedDraftText] = useState("");
  const [formError, setFormError] = useState<string>();
  const [testing, setTesting] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [submittingDraft, setSubmittingDraft] = useState(false);

  const copy = createCopy(language);
  const busy = testing || proposing || submittingDraft;
  const proposalAgentId = selectedAgentId ?? agents[0]?.id ?? "";
  const proposalDraft = proposal ? createLlmProposalInterventionDraft(proposal) : undefined;

  const updateField = <Key extends keyof LlmRuntimeFormState>(key: Key, value: LlmRuntimeFormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const importConfig = () => {
    setFormError(undefined);
    try {
      const parsed = JSON.parse(importText) as unknown;
      if (!isRecord(parsed)) {
        setFormError(copy.importObjectError);
        return;
      }
      setForm((current) => ({
        ...current,
        baseUrl: readString(parsed.baseUrl) ?? current.baseUrl,
        model: readString(parsed.model) ?? current.model,
        apiKey: readString(parsed.apiKey) ?? current.apiKey,
        providerName: readString(parsed.providerName) ?? current.providerName,
        apiMode: readApiMode(parsed.apiMode) ?? current.apiMode,
        timeoutMs: readTimeout(parsed.timeoutMs) ?? current.timeoutMs,
        prompt: readString(parsed.prompt) ?? current.prompt,
      }));
      setImportText("");
    } catch {
      setFormError(copy.invalidJsonError);
    }
  };

  const clearSecret = () => {
    setForm((current) => ({ ...current, apiKey: "" }));
    setResult(undefined);
    setProposal(undefined);
    setReviewDraft(undefined);
    setAdvancedDraftText("");
  };

  const submitTest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    setResult(undefined);

    const request = createRequest(form);
    if (!request.ok) {
      setFormError(copy.errors[request.error]);
      return;
    }

    setTesting(true);
    try {
      setResult(await testLlmRuntimeConfig(request.value));
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : copy.unknownError);
    } finally {
      setTesting(false);
    }
  };

  const submitProposal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    setProposal(undefined);
    setReviewDraft(undefined);
    setAdvancedDraftText("");

    const request = createProposalRequest(form, proposalAgentId);
    if (!request.ok) {
      setFormError(copy.errors[request.error]);
      return;
    }

    setProposing(true);
    try {
      setProposal(await proposeLlmAction(request.value));
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : copy.unknownError);
    } finally {
      setProposing(false);
    }
  };

  const createDraft = () => {
    setFormError(undefined);
    if (!proposalDraft) {
      setFormError(copy.draftUnavailableError);
      return;
    }
    const nextReviewDraft = createLlmProposalReviewDraftForm(proposalDraft);
    if (!nextReviewDraft) {
      setFormError(copy.errors.draftShape);
      return;
    }
    setReviewDraft(nextReviewDraft);
    setAdvancedDraftText("");
  };

  const updateReviewDraftField = <Key extends keyof LlmProposalReviewDraftForm>(key: Key, value: LlmProposalReviewDraftForm[Key]) => {
    setReviewDraft((current) => current ? { ...current, [key]: value } : current);
  };

  const clearDraft = () => {
    setFormError(undefined);
    setReviewDraft(undefined);
    setAdvancedDraftText("");
  };

  const submitDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    if (!reviewDraft) {
      setFormError(copy.draftUnavailableError);
      return;
    }
    const parsed = createSubmitAdminInputFromLlmProposalReviewDraftForm(reviewDraft);
    if (!parsed.ok) {
      setFormError(copy.errors[parsed.error]);
      return;
    }

    setSubmittingDraft(true);
    try {
      await onSubmitInput(parsed.value);
      setReviewDraft(undefined);
      setAdvancedDraftText("");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : copy.unknownError);
    } finally {
      setSubmittingDraft(false);
    }
  };

  const copyStructuredDraftToJson = () => {
    setFormError(undefined);
    if (!reviewDraft) return;
    const parsed = createSubmitAdminInputFromLlmProposalReviewDraftForm(reviewDraft);
    if (!parsed.ok) {
      setFormError(copy.errors[parsed.error]);
      return;
    }
    setAdvancedDraftText(JSON.stringify(parsed.value, null, 2));
  };

  const submitAdvancedDraft = async () => {
    setFormError(undefined);
    const parsed = parseLlmProposalDraftText(advancedDraftText);
    if (!parsed.ok) {
      setFormError(copy.errors[parsed.error]);
      return;
    }

    setSubmittingDraft(true);
    try {
      await onSubmitInput(parsed.value);
      setReviewDraft(undefined);
      setAdvancedDraftText("");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : copy.unknownError);
    } finally {
      setSubmittingDraft(false);
    }
  };

  return (
    <section className="panel llm-runtime-panel" aria-labelledby="llm-runtime-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2 id="llm-runtime-heading">{copy.title}</h2>
        </div>
        <span className="realm-map-mode">{copy.sessionOnlyBadge}</span>
      </div>

      <p className="muted">{copy.description}</p>
      <p className="secret-note">{copy.secretNote}</p>
      {formError ? <p className="form-error" role="alert">{formError}</p> : null}

      <details className="json-details llm-import-details">
        <summary>{copy.importSummary}</summary>
        <textarea
          rows={5}
          value={importText}
          disabled={disabled || busy}
          placeholder={copy.importPlaceholder}
          onChange={(event) => setImportText(event.target.value)}
        />
        <button type="button" className="secondary-button" disabled={disabled || busy || !importText.trim()} onClick={importConfig}>
          {copy.importButton}
        </button>
      </details>

      <form className="stacked-form" onSubmit={submitTest}>
        <label htmlFor="llm-base-url">{copy.baseUrl}</label>
        <input id="llm-base-url" value={form.baseUrl} disabled={disabled || busy} onChange={(event) => updateField("baseUrl", event.target.value)} />

        <label htmlFor="llm-model">{copy.model}</label>
        <input id="llm-model" value={form.model} disabled={disabled || busy} placeholder="gpt-4o-mini" onChange={(event) => updateField("model", event.target.value)} />

        <label htmlFor="llm-api-key">{copy.apiKey}</label>
        <div className="inline-form-row">
          <input
            id="llm-api-key"
            type="password"
            value={form.apiKey}
            disabled={disabled || busy}
            autoComplete="off"
            placeholder="sk-..."
            onChange={(event) => updateField("apiKey", event.target.value)}
          />
          <button type="button" className="secondary-button" disabled={disabled || busy || !form.apiKey} onClick={clearSecret}>
            {copy.clearKey}
          </button>
        </div>

        <div className="llm-runtime-grid">
          <label htmlFor="llm-provider-name">
            {copy.providerName}
            <input id="llm-provider-name" value={form.providerName} disabled={disabled || busy} onChange={(event) => updateField("providerName", event.target.value)} />
          </label>
          <label htmlFor="llm-api-mode">
            {copy.apiMode}
            <select id="llm-api-mode" value={form.apiMode} disabled={disabled || busy} onChange={(event) => updateField("apiMode", event.target.value as LlmRuntimeApiMode)}>
              <option value="chat_completions">chat_completions</option>
              <option value="responses">responses</option>
            </select>
          </label>
          <label htmlFor="llm-timeout-ms">
            {copy.timeoutMs}
            <input id="llm-timeout-ms" type="number" min="1000" step="1000" value={form.timeoutMs} disabled={disabled || busy} onChange={(event) => updateField("timeoutMs", event.target.value)} />
          </label>
        </div>

        <label htmlFor="llm-test-prompt">{copy.prompt}</label>
        <textarea id="llm-test-prompt" rows={4} value={form.prompt} disabled={disabled || busy} onChange={(event) => updateField("prompt", event.target.value)} />

        <button type="submit" disabled={disabled || busy}>{testing ? copy.testing : copy.testButton}</button>
      </form>

      {result ? <LlmRuntimeResult language={language} result={result} /> : null}

      <form className="stacked-form llm-proposal-form" onSubmit={submitProposal}>
        <div>
          <h3>{copy.proposalTitle}</h3>
          <p className="muted">{copy.proposalDescription}</p>
        </div>
        <label htmlFor="llm-proposal-agent">{copy.proposalAgent}</label>
        <select
          id="llm-proposal-agent"
          value={proposalAgentId}
          disabled={disabled || busy || agents.length === 0}
          onChange={(event) => onSelectAgent(event.target.value)}
        >
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>{agent.displayName}</option>
          ))}
        </select>
        <button type="submit" disabled={disabled || busy || agents.length === 0}>{proposing ? copy.proposing : copy.proposeButton}</button>
      </form>

      {proposal ? <LlmActionProposalResult language={language} result={proposal} draftAvailable={Boolean(proposalDraft)} disabled={disabled || busy} onCreateDraft={createDraft} /> : null}

      {reviewDraft ? (
        <>
          <form className="stacked-form llm-apply-draft-form llm-proposal-review-form" onSubmit={submitDraft}>
            <div>
              <h3>{copy.reviewTitle}</h3>
              <p className="muted">{copy.reviewDescription}</p>
            </div>
            <div className="llm-review-grid">
              <label htmlFor="llm-review-targets">
                {copy.reviewTargetIds}
                <textarea
                  id="llm-review-targets"
                  rows={3}
                  value={reviewDraft.targetIdsText}
                  disabled={disabled || busy}
                  onChange={(event) => updateReviewDraftField("targetIdsText", event.target.value)}
                />
              </label>
              <label htmlFor="llm-review-event-kind">
                {copy.draftEventKind}
                <input
                  id="llm-review-event-kind"
                  value={reviewDraft.eventKind}
                  disabled={disabled || busy}
                  onChange={(event) => updateReviewDraftField("eventKind", event.target.value)}
                />
              </label>
              <label htmlFor="llm-review-description" className="llm-review-wide">
                {copy.draftDescriptionField}
                <textarea
                  id="llm-review-description"
                  rows={4}
                  value={reviewDraft.description}
                  disabled={disabled || busy}
                  onChange={(event) => updateReviewDraftField("description", event.target.value)}
                />
              </label>
              <label htmlFor="llm-review-reason" className="llm-review-wide">
                {copy.reason}
                <textarea
                  id="llm-review-reason"
                  rows={3}
                  value={reviewDraft.reason}
                  disabled={disabled || busy}
                  onChange={(event) => updateReviewDraftField("reason", event.target.value)}
                />
              </label>
              <label htmlFor="llm-review-intent">
                {copy.intent}
                <input id="llm-review-intent" value={reviewDraft.intent} disabled={disabled || busy} onChange={(event) => updateReviewDraftField("intent", event.target.value)} />
              </label>
              <label htmlFor="llm-review-location">
                {copy.targetLocation}
                <input id="llm-review-location" value={reviewDraft.targetLocationId} disabled={disabled || busy} onChange={(event) => updateReviewDraftField("targetLocationId", event.target.value)} />
              </label>
              <label htmlFor="llm-review-agent">
                {copy.targetAgent}
                <input id="llm-review-agent" value={reviewDraft.targetAgentId} disabled={disabled || busy} onChange={(event) => updateReviewDraftField("targetAgentId", event.target.value)} />
              </label>
            </div>
            <dl className="compact-metrics llm-review-audit" aria-label={copy.reviewAuditLabel}>
              <div><dt>{copy.provenance}</dt><dd>{reviewDraft.provenance}</dd></div>
              <div><dt>{copy.reviewedBy}</dt><dd>{reviewDraft.reviewedBy}</dd></div>
              <div><dt>{copy.sandbox}</dt><dd>{String(reviewDraft.sandbox)}</dd></div>
              <div><dt>{copy.operation}</dt><dd><code>{reviewDraft.llmOperationId}</code></dd></div>
              <div><dt>{copy.action}</dt><dd>{reviewDraft.proposalAction}</dd></div>
              <div><dt>{copy.proposalAgent}</dt><dd><code>{reviewDraft.agentId}</code></dd></div>
            </dl>
            <div className="button-row">
              <button type="submit" disabled={disabled || busy}>{submittingDraft ? copy.submittingDraft : copy.applyReviewedProposal}</button>
              <button type="button" className="secondary-button" disabled={disabled || busy} onClick={clearDraft}>{copy.clearDraft}</button>
            </div>
          </form>
          <details className="json-details llm-advanced-draft">
            <summary>{copy.advancedDraftTitle}</summary>
            <p className="muted">{copy.advancedDraftDescription}</p>
            <textarea
              id="llm-proposal-draft-json"
              rows={12}
              value={advancedDraftText}
              disabled={disabled || busy}
              placeholder={copy.advancedDraftPlaceholder}
              onChange={(event) => setAdvancedDraftText(event.target.value)}
            />
            <div className="button-row">
              <button type="button" className="secondary-button" disabled={disabled || busy || !reviewDraft} onClick={copyStructuredDraftToJson}>{copy.copyStructuredToJson}</button>
              <button type="button" disabled={disabled || busy || !advancedDraftText.trim()} onClick={() => void submitAdvancedDraft()}>{submittingDraft ? copy.submittingDraft : copy.submitAdvancedJson}</button>
            </div>
          </details>
        </>
      ) : null}
    </section>
  );
}

function LlmRuntimeResult({ language, result }: { language: AppLanguage; result: LlmRuntimeTestResponse }) {
  const copy = createCopy(language);
  const status = result.operation.status;
  return (
    <div className={status === "completed" ? "llm-runtime-result llm-runtime-result--success" : "llm-runtime-result llm-runtime-result--error"}>
      <h3>{copy.resultTitle}</h3>
      <dl className="compact-metrics">
        <div>
          <dt>{copy.status}</dt>
          <dd>{status}</dd>
        </div>
        <div>
          <dt>{copy.providerName}</dt>
          <dd>{result.provider.name}</dd>
        </div>
        <div>
          <dt>{copy.model}</dt>
          <dd>{result.provider.model}</dd>
        </div>
      </dl>
      {result.outputText ? <p>{result.outputText}</p> : null}
      {result.operation.error ? <p className="form-error">{result.operation.error.code}: {result.operation.error.message}</p> : null}
      <details className="json-details">
        <summary>{copy.operationJson}</summary>
        <pre>{JSON.stringify(result.operation, null, 2)}</pre>
      </details>
    </div>
  );
}

function LlmActionProposalResult({
  language,
  result,
  draftAvailable,
  disabled,
  onCreateDraft,
}: {
  language: AppLanguage;
  result: LlmActionProposalResponse;
  draftAvailable: boolean;
  disabled: boolean;
  onCreateDraft: () => void;
}) {
  const copy = createCopy(language);
  const status = result.operation.status;
  return (
    <div className={status === "completed" && result.proposal ? "llm-runtime-result llm-runtime-result--success" : "llm-runtime-result llm-runtime-result--error"}>
      <h3>{copy.proposalResultTitle}</h3>
      <dl className="compact-metrics">
        <div>
          <dt>{copy.status}</dt>
          <dd>{status}</dd>
        </div>
        <div>
          <dt>{copy.sandbox}</dt>
          <dd>{String(result.sandbox)}</dd>
        </div>
        <div>
          <dt>{copy.provenance}</dt>
          <dd>{result.provenance}</dd>
        </div>
      </dl>
      {result.proposal ? (
        <dl className="llm-proposal-preview">
          <div>
            <dt>{copy.action}</dt>
            <dd>{result.proposal.action}</dd>
          </div>
          <div>
            <dt>{copy.reason}</dt>
            <dd>{result.proposal.reason}</dd>
          </div>
          {result.proposal.intent ? (
            <div>
              <dt>{copy.intent}</dt>
              <dd>{result.proposal.intent}</dd>
            </div>
          ) : null}
          {result.proposal.targetLocationId ? (
            <div>
              <dt>{copy.targetLocation}</dt>
              <dd>{result.proposal.targetLocationId}</dd>
            </div>
          ) : null}
          {result.proposal.targetAgentId ? (
            <div>
              <dt>{copy.targetAgent}</dt>
              <dd>{result.proposal.targetAgentId}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="muted">{copy.noProposal}</p>
      )}
      <button type="button" disabled={disabled || !draftAvailable} onClick={onCreateDraft}>{copy.copyToDraft}</button>
      {!draftAvailable ? <p className="muted">{copy.invalidProposalCannotDraft}</p> : null}
      {result.operation.error ? <p className="form-error">{result.operation.error.code}: {result.operation.error.message}</p> : null}
      <details className="json-details">
        <summary>{copy.operationJson}</summary>
        <pre>{JSON.stringify(result.operation, null, 2)}</pre>
      </details>
    </div>
  );
}

type LlmRuntimeValidationError = "baseUrl" | "model" | "apiKey" | "prompt" | "timeoutMs" | "agentId" | "draftJson" | "draftShape";

function createRequest(form: LlmRuntimeFormState): { ok: true; value: SubmitLlmRuntimeTestRequest } | { ok: false; error: LlmRuntimeValidationError } {
  const baseUrl = form.baseUrl.trim();
  const model = form.model.trim();
  const apiKey = form.apiKey.trim();
  const prompt = form.prompt.trim();
  const timeoutMs = Number(form.timeoutMs);

  if (!baseUrl) return { ok: false, error: "baseUrl" };
  if (!model) return { ok: false, error: "model" };
  if (!apiKey) return { ok: false, error: "apiKey" };
  if (!prompt) return { ok: false, error: "prompt" };
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return { ok: false, error: "timeoutMs" };

  return {
    ok: true,
    value: {
      baseUrl,
      model,
      apiKey,
      prompt,
      providerName: form.providerName.trim() || undefined,
      apiMode: form.apiMode,
      timeoutMs,
    },
  };
}

function createProposalRequest(form: LlmRuntimeFormState, agentId: string): { ok: true; value: SubmitLlmActionProposalRequest } | { ok: false; error: LlmRuntimeValidationError } {
  const baseUrl = form.baseUrl.trim();
  const model = form.model.trim();
  const apiKey = form.apiKey.trim();
  const timeoutMs = Number(form.timeoutMs);
  const trimmedAgentId = agentId.trim();

  if (!baseUrl) return { ok: false, error: "baseUrl" };
  if (!model) return { ok: false, error: "model" };
  if (!apiKey) return { ok: false, error: "apiKey" };
  if (!trimmedAgentId) return { ok: false, error: "agentId" };
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return { ok: false, error: "timeoutMs" };

  return {
    ok: true,
    value: {
      baseUrl,
      model,
      apiKey,
      agentId: trimmedAgentId,
      providerName: form.providerName.trim() || undefined,
      apiMode: form.apiMode,
      timeoutMs,
    },
  };
}

function createCopy(language: AppLanguage) {
  if (language === "zh") {
    return {
      eyebrow: "模型连接",
      title: "LLM API 会话配置",
      sessionOnlyBadge: "仅本次会话",
      description: "在这里临时导入 OpenAI-compatible API 配置，不需要修改 .env。测试调用不会改变模拟世界状态。",
      secretNote: "安全提示：API Key 只保存在当前页面内存中，刷新后丢失；不会写入 localStorage、sessionStorage 或 .env，也不会从后端响应返回。",
      importSummary: "从 JSON 导入配置",
      importPlaceholder: '{"baseUrl":"https://api.openai.com/v1","model":"gpt-4o-mini","apiKey":"sk-...","apiMode":"chat_completions"}',
      importButton: "导入到表单",
      baseUrl: "Base URL",
      model: "模型",
      apiKey: "API Key",
      providerName: "Provider 名称",
      apiMode: "API 模式",
      timeoutMs: "超时毫秒",
      prompt: "测试提示词",
      clearKey: "清除 key",
      testButton: "测试 LLM 连接",
      testing: "测试中…",
      resultTitle: "测试结果",
      proposalTitle: "行动建议 Sandbox",
      proposalDescription: "为选中的角色生成一条结构化行动建议。结果只用于预览，不会提交干预、推进步进或修改世界状态。",
      proposalAgent: "建议对象",
      proposeButton: "生成行动建议",
      proposing: "生成中…",
      proposalResultTitle: "行动建议结果",
      status: "状态",
      sandbox: "沙盒",
      provenance: "来源",
      action: "行动",
      reason: "理由",
      intent: "意图",
      targetLocation: "目标地点",
      targetAgent: "目标角色",
      noProposal: "没有可显示的行动建议；请查看 Operation 错误元数据。",
      copyToDraft: "审阅为结构化干预",
      invalidProposalCannotDraft: "只有已完成且通过校验的行动建议才能创建草稿。失败元数据仅供查看，不会应用。",
      reviewTitle: "结构化行动建议审阅",
      reviewDescription: "先审阅目标、描述、理由与意图；提交后仍然走现有 typed admin input 边界。",
      reviewTargetIds: "目标 ID（每行或逗号分隔）",
      reviewAuditLabel: "行动建议审计元数据",
      reviewedBy: "审阅者",
      operation: "Operation",
      draftEventKind: "事件类型",
      draftDescriptionField: "用户审阅描述",
      applyReviewedProposal: "应用已审阅建议",
      advancedDraftTitle: "高级：JSON 草稿",
      advancedDraftDescription: "仅用于调试或特殊编辑；普通流程请使用上方结构化表单。提交仍会校验为 user realmEvent。",
      advancedDraftPlaceholder: "点击“复制结构化草稿为 JSON”后再编辑。",
      copyStructuredToJson: "复制结构化草稿为 JSON",
      submitAdvancedJson: "提交高级 JSON",
      draftTitle: "行动建议干预草稿",
      draftDescription: "这是本地可编辑 JSON 草稿。只有点击提交草稿后，才会通过现有管理输入路径发送到后端。",
      draftJson: "干预草稿 JSON",
      submitDraft: "提交草稿",
      submittingDraft: "提交中…",
      clearDraft: "清除草稿",
      draftUnavailableError: "当前没有可应用的有效行动建议。",
      operationJson: "Operation 元数据",
      invalidJsonError: "导入内容必须是合法 JSON。",
      importObjectError: "导入 JSON 必须是对象。",
      unknownError: "未知 LLM 测试错误。",
      errors: {
        baseUrl: "Base URL 不能为空。",
        model: "模型不能为空。",
        apiKey: "API Key 不能为空。",
        prompt: "测试提示词不能为空。",
        timeoutMs: "超时必须是正数。",
        agentId: "请先选择一个角色。",
        draftJson: "草稿必须是合法 JSON。",
        draftShape: "草稿必须是用户来源的 realmEvent，并包含合法 targetIds 和 payload。",
      },
    };
  }

  return {
    eyebrow: "Model connection",
    title: "LLM API session config",
    sessionOnlyBadge: "Session only",
    description: "Temporarily import OpenAI-compatible API settings here without editing .env. Test calls do not change simulation world state.",
    secretNote: "Security: the API key stays only in this page's memory and is lost on refresh; it is not written to localStorage, sessionStorage, or .env, and is not returned by backend responses.",
    importSummary: "Import config from JSON",
    importPlaceholder: '{"baseUrl":"https://api.openai.com/v1","model":"gpt-4o-mini","apiKey":"sk-...","apiMode":"chat_completions"}',
    importButton: "Import into form",
    baseUrl: "Base URL",
    model: "Model",
    apiKey: "API key",
    providerName: "Provider name",
    apiMode: "API mode",
    timeoutMs: "Timeout ms",
    prompt: "Test prompt",
    clearKey: "Clear key",
    testButton: "Test LLM connection",
    testing: "Testing…",
    resultTitle: "Test result",
    proposalTitle: "Action proposal sandbox",
    proposalDescription: "Generate one structured action proposal for the selected agent. The result is preview-only and does not submit intervention, step time, or mutate world state.",
    proposalAgent: "Proposal agent",
    proposeButton: "Generate action proposal",
    proposing: "Generating…",
    proposalResultTitle: "Action proposal result",
    status: "Status",
    sandbox: "Sandbox",
    provenance: "Provenance",
    action: "Action",
    reason: "Reason",
    intent: "Intent",
    targetLocation: "Target location",
    targetAgent: "Target agent",
    noProposal: "No action proposal is available; inspect operation error metadata.",
    copyToDraft: "Review as structured intervention",
    invalidProposalCannotDraft: "Only completed and validated action proposals can create drafts. Failed metadata is display-only and will not be applied.",
    reviewTitle: "Structured action proposal review",
    reviewDescription: "Review targets, description, reason, and intent first; apply still goes through the existing typed admin input boundary.",
    reviewTargetIds: "Target IDs (one per line or comma-separated)",
    reviewAuditLabel: "Action proposal audit metadata",
    reviewedBy: "Reviewed by",
    operation: "Operation",
    draftEventKind: "Event kind",
    draftDescriptionField: "User-reviewed description",
    applyReviewedProposal: "Apply reviewed proposal",
    advancedDraftTitle: "Advanced: JSON draft",
    advancedDraftDescription: "Use only for debugging or unusual edits; the normal path is the structured form above. Submission is still validated as a user realmEvent.",
    advancedDraftPlaceholder: "Click “Copy structured draft to JSON” before editing.",
    copyStructuredToJson: "Copy structured draft to JSON",
    submitAdvancedJson: "Submit advanced JSON",
    draftTitle: "Action proposal intervention draft",
    draftDescription: "This is a local editable JSON draft. It is sent through the existing admin input path only after you submit it.",
    draftJson: "Intervention draft JSON",
    submitDraft: "Submit draft",
    submittingDraft: "Submitting…",
    clearDraft: "Clear draft",
    draftUnavailableError: "There is no valid action proposal to apply.",
    operationJson: "Operation metadata",
    invalidJsonError: "Imported content must be valid JSON.",
    importObjectError: "Imported JSON must be an object.",
    unknownError: "Unknown LLM test error.",
    errors: {
      baseUrl: "Base URL is required.",
      model: "Model is required.",
      apiKey: "API key is required.",
      prompt: "Test prompt is required.",
      timeoutMs: "Timeout must be a positive number.",
      agentId: "Select an agent first.",
      draftJson: "Draft must be valid JSON.",
      draftShape: "Draft must be a user-sourced realmEvent with valid targetIds and payload.",
    },
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readApiMode(value: unknown): LlmRuntimeApiMode | undefined {
  return value === "chat_completions" || value === "responses" ? value : undefined;
}

function readTimeout(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return String(value);
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
