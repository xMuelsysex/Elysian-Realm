import type { EventSource, InterventionKind } from "../../shared/domain/index.js";
import type { LlmOperationMetadata, PersonaSpec, SimulationEvent, WorldSnapshot } from "../../shared/contracts/index.js";
import type { EngineAgentTickDiagnostic, EngineMemoryRecord, EngineReflectionDiagnostic, ReplaySummary, TimelineEntry } from "../simulation/index.js";
import type { ConversationTurnDraft } from "../conversation/index.js";

export interface AdminDiagnostic {
  id: string;
  level: "info" | "warning" | "error";
  message: string;
  eventId?: string;
  inputId?: string;
  details?: Record<string, unknown>;
}

export interface AdminStateResponse {
  snapshot: WorldSnapshot;
  events: SimulationEvent[];
  timeline: TimelineEntry[];
  replay: ReplaySummary;
  diagnostics: AdminDiagnostic[];
  agentTickDiagnostics: EngineAgentTickDiagnostic[];
  reflectionDiagnostics: EngineReflectionDiagnostic[];
  agentMemories: EngineMemoryRecord[];
  personas: PersonaSpec[];
}

export interface SubmitAdminInputRequest {
  kind: InterventionKind;
  targetIds: string[];
  payload: Record<string, unknown>;
  source?: EventSource;
}

export type LlmRuntimeApiMode = "chat_completions" | "responses";

export interface SubmitLlmRuntimeTestRequest {
  baseUrl: string;
  model: string;
  apiKey: string;
  prompt: string;
  providerName?: string;
  apiMode?: LlmRuntimeApiMode;
  timeoutMs?: number;
}

export interface LlmRuntimeProviderSummary {
  name: string;
  model: string;
  baseUrl: string;
  apiMode: LlmRuntimeApiMode;
  timeoutMs: number;
}

export interface LlmRuntimeTestResponse {
  provider: LlmRuntimeProviderSummary;
  operation: LlmOperationMetadata;
  outputText?: string;
}

export type LlmActionProposalKind = "continue" | "move" | "wait" | "performActivity" | "reflect";

export interface LlmActionProposalPreview {
  action: LlmActionProposalKind;
  reason: string;
  intent?: string;
  targetLocationId?: string;
  targetAgentId?: string;
}

export interface SubmitLlmActionProposalRequest {
  baseUrl: string;
  model: string;
  apiKey: string;
  agentId: string;
  providerName?: string;
  apiMode?: LlmRuntimeApiMode;
  timeoutMs?: number;
}

export interface LlmActionProposalResponse {
  provider: LlmRuntimeProviderSummary;
  agentId: string;
  sandbox: true;
  provenance: "generated";
  operation: LlmOperationMetadata;
  proposal?: LlmActionProposalPreview;
}

export interface SubmitLlmConversationTurnRequest {
  baseUrl: string;
  model: string;
  apiKey: string;
  agentId: string;
  message: string;
  providerName?: string;
  apiMode?: LlmRuntimeApiMode;
  timeoutMs?: number;
}

export interface LlmConversationTurnResponse {
  provider: LlmRuntimeProviderSummary;
  agentId: string;
  message: string;
  sandbox: true;
  provenance: "generated";
  operation: LlmOperationMetadata;
  draft?: ConversationTurnDraft;
}

export interface AdminErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type AdminRouteResult =
  | { ok: true; status: number; body: AdminStateResponse }
  | { ok: false; status: number; body: AdminErrorResponse };

export type AdminLlmRuntimeTestRouteResult =
  | { ok: true; status: number; body: LlmRuntimeTestResponse }
  | { ok: false; status: number; body: AdminErrorResponse };

export type AdminLlmActionProposalRouteResult =
  | { ok: true; status: number; body: LlmActionProposalResponse }
  | { ok: false; status: number; body: AdminErrorResponse };

export type AdminLlmConversationTurnRouteResult =
  | { ok: true; status: number; body: LlmConversationTurnResponse }
  | { ok: false; status: number; body: AdminErrorResponse };
