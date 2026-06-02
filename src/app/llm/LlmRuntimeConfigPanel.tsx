import { useState, type FormEvent } from "react";
import type { LlmRuntimeApiMode, LlmRuntimeTestResponse, SubmitLlmRuntimeTestRequest } from "../../server/admin/index.js";
import { testLlmRuntimeConfig } from "../adminApi.js";
import type { AppLanguage } from "../shared/i18n.js";

interface LlmRuntimeConfigPanelProps {
  language: AppLanguage;
  disabled: boolean;
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

export function LlmRuntimeConfigPanel({ language, disabled }: LlmRuntimeConfigPanelProps) {
  const [form, setForm] = useState<LlmRuntimeFormState>(DEFAULT_FORM);
  const [importText, setImportText] = useState("");
  const [result, setResult] = useState<LlmRuntimeTestResponse>();
  const [formError, setFormError] = useState<string>();
  const [testing, setTesting] = useState(false);

  const copy = createCopy(language);

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
          disabled={disabled || testing}
          placeholder={copy.importPlaceholder}
          onChange={(event) => setImportText(event.target.value)}
        />
        <button type="button" className="secondary-button" disabled={disabled || testing || !importText.trim()} onClick={importConfig}>
          {copy.importButton}
        </button>
      </details>

      <form className="stacked-form" onSubmit={submitTest}>
        <label htmlFor="llm-base-url">{copy.baseUrl}</label>
        <input id="llm-base-url" value={form.baseUrl} disabled={disabled || testing} onChange={(event) => updateField("baseUrl", event.target.value)} />

        <label htmlFor="llm-model">{copy.model}</label>
        <input id="llm-model" value={form.model} disabled={disabled || testing} placeholder="gpt-4o-mini" onChange={(event) => updateField("model", event.target.value)} />

        <label htmlFor="llm-api-key">{copy.apiKey}</label>
        <div className="inline-form-row">
          <input
            id="llm-api-key"
            type="password"
            value={form.apiKey}
            disabled={disabled || testing}
            autoComplete="off"
            placeholder="sk-..."
            onChange={(event) => updateField("apiKey", event.target.value)}
          />
          <button type="button" className="secondary-button" disabled={disabled || testing || !form.apiKey} onClick={clearSecret}>
            {copy.clearKey}
          </button>
        </div>

        <div className="llm-runtime-grid">
          <label htmlFor="llm-provider-name">
            {copy.providerName}
            <input id="llm-provider-name" value={form.providerName} disabled={disabled || testing} onChange={(event) => updateField("providerName", event.target.value)} />
          </label>
          <label htmlFor="llm-api-mode">
            {copy.apiMode}
            <select id="llm-api-mode" value={form.apiMode} disabled={disabled || testing} onChange={(event) => updateField("apiMode", event.target.value as LlmRuntimeApiMode)}>
              <option value="chat_completions">chat_completions</option>
              <option value="responses">responses</option>
            </select>
          </label>
          <label htmlFor="llm-timeout-ms">
            {copy.timeoutMs}
            <input id="llm-timeout-ms" type="number" min="1000" step="1000" value={form.timeoutMs} disabled={disabled || testing} onChange={(event) => updateField("timeoutMs", event.target.value)} />
          </label>
        </div>

        <label htmlFor="llm-test-prompt">{copy.prompt}</label>
        <textarea id="llm-test-prompt" rows={4} value={form.prompt} disabled={disabled || testing} onChange={(event) => updateField("prompt", event.target.value)} />

        <button type="submit" disabled={disabled || testing}>{testing ? copy.testing : copy.testButton}</button>
      </form>

      {result ? <LlmRuntimeResult language={language} result={result} /> : null}
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

function createRequest(form: LlmRuntimeFormState): { ok: true; value: SubmitLlmRuntimeTestRequest } | { ok: false; error: "baseUrl" | "model" | "apiKey" | "prompt" | "timeoutMs" } {
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
      status: "状态",
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
    status: "Status",
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
