import type { EventSource, InterventionKind } from "../../shared/domain/index.js";
import type { LlmOperationMetadata, PersonaSpec, SimulationEvent, WorldSnapshot } from "../../shared/contracts/index.js";
import type { ReplaySummary, TimelineEntry } from "../simulation/index.js";

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

export interface LlmRuntimeTestResponse {
  provider: {
    name: string;
    model: string;
    baseUrl: string;
    apiMode: LlmRuntimeApiMode;
    timeoutMs: number;
  };
  operation: LlmOperationMetadata;
  outputText?: string;
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
