import type {
  AdminErrorResponse,
  AdminStateResponse,
  LlmActionProposalResponse,
  LlmConversationTurnResponse,
  LlmRuntimeTestResponse,
  SubmitAdminInputRequest,
  SubmitLlmActionProposalRequest,
  SubmitLlmConversationTurnRequest,
  SubmitLlmRuntimeTestRequest,
} from "../server/admin/index.js";

const ADMIN_BASE_PATH = "/api/admin";

export async function fetchAdminState(): Promise<AdminStateResponse> {
  return requestJson<AdminStateResponse>(`${ADMIN_BASE_PATH}/state`, { method: "GET" });
}

export async function stepAdminSimulation(): Promise<AdminStateResponse> {
  return requestJson<AdminStateResponse>(`${ADMIN_BASE_PATH}/step`, { method: "POST" });
}

export async function resetAdminSimulation(): Promise<AdminStateResponse> {
  return requestJson<AdminStateResponse>(`${ADMIN_BASE_PATH}/reset`, { method: "POST" });
}

export async function submitAdminInput(input: SubmitAdminInputRequest): Promise<AdminStateResponse> {
  return requestJson<AdminStateResponse>(`${ADMIN_BASE_PATH}/input`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function testLlmRuntimeConfig(input: SubmitLlmRuntimeTestRequest): Promise<LlmRuntimeTestResponse> {
  return requestJson<LlmRuntimeTestResponse>(`${ADMIN_BASE_PATH}/llm/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function proposeLlmAction(input: SubmitLlmActionProposalRequest): Promise<LlmActionProposalResponse> {
  return requestJson<LlmActionProposalResponse>(`${ADMIN_BASE_PATH}/llm/action-proposal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function proposeLlmConversationTurn(input: SubmitLlmConversationTurnRequest): Promise<LlmConversationTurnResponse> {
  return requestJson<LlmConversationTurnResponse>(`${ADMIN_BASE_PATH}/llm/conversation-turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = (await response.json()) as T | AdminErrorResponse;
  if (!response.ok) {
    const error = body as AdminErrorResponse;
    throw new Error(error.error?.message ?? `Request failed with ${response.status}`);
  }
  return body as T;
}
