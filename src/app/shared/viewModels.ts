import type { AdminDiagnostic } from "../../server/admin/index.js";
import type { AgentRuntimeState, LocationRef, SimulationEvent } from "../../shared/contracts/index.js";
import type { TimelineEntry } from "../../server/simulation/index.js";
import { DEFAULT_LANGUAGE, formatEventKindLabel, formatPayloadKeyLabel, type AppLanguage } from "./i18n.js";

export interface LocationGroup {
  location: LocationRef;
  agents: AgentRuntimeState[];
}

export interface TimelineItem {
  entry: TimelineEntry;
  event: SimulationEvent;
  title: string;
  detail: string;
}

export function groupAgentsByLocation(locations: readonly LocationRef[], agents: readonly AgentRuntimeState[]): LocationGroup[] {
  return locations.map((location) => ({
    location,
    agents: agents.filter((agent) => agent.locationId === location.id),
  }));
}

export function createTimelineItems(
  events: readonly SimulationEvent[],
  timeline: readonly TimelineEntry[],
  language: AppLanguage = DEFAULT_LANGUAGE,
): TimelineItem[] {
  const eventsById = new Map(events.map((event) => [event.id, event]));
  return timeline
    .map((entry) => {
      const event = eventsById.get(entry.id);
      if (!event) return undefined;
      return {
        entry,
        event,
        title: formatEventTitle(event, language),
        detail: formatPayloadSummary(event.payload, language),
      } satisfies TimelineItem;
    })
    .filter((item): item is TimelineItem => item !== undefined)
    .reverse();
}

export function latestDiagnostics(diagnostics: readonly AdminDiagnostic[]): AdminDiagnostic[] {
  return [...diagnostics].slice(-8).reverse();
}

export function formatPayloadSummary(payload: Record<string, unknown>, language: AppLanguage = DEFAULT_LANGUAGE): string {
  const values = Object.entries(payload).map(([key, value]) => `${formatPayloadKeyLabel(language, key)}: ${formatValue(value)}`);
  return values.length > 0 ? values.join(" · ") : noPayloadLabel(language);
}

function formatEventTitle(event: SimulationEvent, language: AppLanguage): string {
  const label = formatEventKindLabel(language, event.kind);
  return event.actorId ? `${label} · ${event.actorId}` : label;
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value);
}

function noPayloadLabel(language: AppLanguage): string {
  return language === "zh" ? "无 payload 详情" : "No payload details";
}
