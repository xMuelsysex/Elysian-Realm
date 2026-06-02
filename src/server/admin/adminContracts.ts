import type { EventSource, InterventionKind } from "../../shared/domain/index.js";
import type { PersonaSpec, SimulationEvent, WorldSnapshot } from "../../shared/contracts/index.js";
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
