import type { AdminDiagnostic } from "../../server/admin/index.js";
import type { AgentRuntimeState, LocationRef, SimulationEvent } from "../../shared/contracts/index.js";
import type { TimelineEntry } from "../../server/simulation/index.js";
import {
  DEFAULT_LANGUAGE,
  formatEventKindLabel,
  formatPayloadKeyLabel,
  formatPayloadStatusLabel,
  type AppLanguage,
} from "./i18n.js";

export type TimelineDetailMode = "user" | "debug";

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
  detailMode: TimelineDetailMode = "user",
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
        detail: projectEventDetail(event, language, detailMode),
      } satisfies TimelineItem;
    })
    .filter((item): item is TimelineItem => item !== undefined)
    .reverse();
}

export function latestDiagnostics(diagnostics: readonly AdminDiagnostic[]): AdminDiagnostic[] {
  return [...diagnostics].slice(-8).reverse();
}

export function projectEventDetail(
  event: SimulationEvent,
  language: AppLanguage = DEFAULT_LANGUAGE,
  detailMode: TimelineDetailMode = "user",
): string {
  const detail = projectKnownEventDetail(event, language, detailMode);
  return detail ?? formatPayloadSummary(event.payload, language);
}

export function formatPayloadSummary(payload: Record<string, unknown>, language: AppLanguage = DEFAULT_LANGUAGE): string {
  const values = Object.entries(payload).map(([key, value]) => `${formatPayloadKeyLabel(language, key)}: ${formatValue(value)}`);
  return values.length > 0 ? values.join(" · ") : noPayloadLabel(language);
}

function projectKnownEventDetail(event: SimulationEvent, language: AppLanguage, detailMode: TimelineDetailMode): string | undefined {
  switch (event.kind) {
    case "world.created":
      return projectWorldCreatedDetail(event.payload, language, detailMode);
    case "agent.spawned":
      return projectAgentSpawnedDetail(event.payload, language, detailMode);
    case "world.timeAdvanced":
      return projectWorldTimeAdvancedDetail(event.payload, language, detailMode);
    case "agent.startedRoutine":
      return projectAgentStartedRoutineDetail(event.payload, language, detailMode);
    case "realm.interventionSubmitted":
      return projectRealmInterventionSubmittedDetail(event.payload, language, detailMode);
    case "simulation.inputRejected":
      return projectSimulationInputRejectedDetail(event.payload, language, detailMode);
    case "memory.seeded":
      return projectMemorySeededDetail(event.payload, language, detailMode);
    default:
      return undefined;
  }
}

function projectWorldCreatedDetail(payload: Record<string, unknown>, language: AppLanguage, detailMode: TimelineDetailMode): string {
  const seedId = readString(payload, "seedId");
  const personaCount = readStringArray(payload, "personaIds").length;
  const locationCount = readStringArray(payload, "locationIds").length;
  const status = readString(payload, "initialStatus");
  const statusLabel = formatPayloadStatusLabel(language, fallback(status, language));

  if (language === "zh") {
    const sentence = `一个新的世界已经启动，${personaCount} 位角色将在 ${locationCount} 个地点展开行动，世界当前为${statusLabel}状态。`;
    return withDebugFacts(sentence, detailMode, [
      ["种子", seedId],
      ["角色数", personaCount],
      ["位置数", locationCount],
      ["初始状态", status],
    ]);
  }

  const sentence = `A new world has started with ${personaCount} personas across ${locationCount} locations, and the world is currently ${statusLabel}.`;
  return withDebugFacts(sentence, detailMode, [
    ["seed", seedId],
    ["personas", personaCount],
    ["locations", locationCount],
    ["initialStatus", status],
  ]);
}

function projectAgentSpawnedDetail(payload: Record<string, unknown>, language: AppLanguage, detailMode: TimelineDetailMode): string {
  const personaId = readString(payload, "personaId");
  const locationId = readString(payload, "locationId");
  const status = readString(payload, "status");
  const statusLabel = formatPayloadStatusLabel(language, fallback(status, language));

  if (language === "zh") {
    const sentence = `一位角色已经出现在世界中，当前状态为${statusLabel}。`;
    return withDebugFacts(sentence, detailMode, [
      ["人格", personaId],
      ["位置", locationId],
      ["状态", status],
    ]);
  }

  const sentence = `A persona appeared in the world and is currently ${statusLabel}.`;
  return withDebugFacts(sentence, detailMode, [
    ["persona", personaId],
    ["location", locationId],
    ["status", status],
  ]);
}

function projectWorldTimeAdvancedDetail(payload: Record<string, unknown>, language: AppLanguage, detailMode: TimelineDetailMode): string {
  const from = readString(payload, "from");
  const to = readString(payload, "to");
  const timeScale = readNumber(payload, "timeScale");
  const stepId = readString(payload, "stepId");

  if (language === "zh") {
    const sentence = "世界时间向前推进了一段。";
    return withDebugFacts(sentence, detailMode, [
      ["从", from],
      ["到", to],
      ["时间倍率", timeScale],
      ["步进", stepId],
    ]);
  }

  const sentence = "World time advanced.";
  return withDebugFacts(sentence, detailMode, [
    ["from", from],
    ["to", to],
    ["timeScale", timeScale],
    ["step", stepId],
  ]);
}

function projectAgentStartedRoutineDetail(payload: Record<string, unknown>, language: AppLanguage, detailMode: TimelineDetailMode): string {
  const routineId = readString(payload, "routineId");
  const locationId = readString(payload, "locationId");
  const intent = readString(payload, "intent");
  const provenance = readString(payload, "provenance");

  if (language === "zh") {
    const sentence = "角色开始执行预设日程。";
    return withDebugFacts(sentence, detailMode, [
      ["日程", routineId],
      ["位置", locationId],
      ["意图", intent],
      ["来源", provenance],
    ]);
  }

  const sentence = "The agent started a configured routine.";
  return withDebugFacts(sentence, detailMode, [
    ["routine", routineId],
    ["location", locationId],
    ["intent", intent],
    ["provenance", provenance],
  ]);
}

function projectRealmInterventionSubmittedDetail(payload: Record<string, unknown>, language: AppLanguage, detailMode: TimelineDetailMode): string {
  const inputId = readString(payload, "inputId");
  const commandKind = readString(payload, "commandKind");
  const accepted = readBoolean(payload, "accepted");
  const summary = readString(payload, "summary");

  if (language === "zh") {
    const sentence = "用户干预已被系统接受。";
    return withDebugFacts(sentence, detailMode, [
      ["命令", commandKind],
      ["输入", inputId],
      ["已接受", accepted],
      ["摘要", summary],
    ]);
  }

  const sentence = "The user intervention was accepted.";
  return withDebugFacts(sentence, detailMode, [
    ["command", commandKind],
    ["input", inputId],
    ["accepted", accepted],
    ["summary", summary],
  ]);
}

function projectSimulationInputRejectedDetail(payload: Record<string, unknown>, language: AppLanguage, detailMode: TimelineDetailMode): string {
  const inputId = readString(payload, "inputId");
  const message = readString(payload, "message");
  const commandKind = readString(payload, "commandKind");

  if (language === "zh") {
    const sentence = `这次输入被拒绝：${fallback(message, language)}。`;
    return withDebugFacts(sentence, detailMode, [
      ["输入", inputId],
      ["命令", commandKind],
      ["原因", message],
    ]);
  }

  const sentence = `The input was rejected: ${fallback(message, language)}.`;
  return withDebugFacts(sentence, detailMode, [
    ["input", inputId],
    ["command", commandKind],
    ["reason", message],
  ]);
}

function projectMemorySeededDetail(payload: Record<string, unknown>, language: AppLanguage, detailMode: TimelineDetailMode): string {
  const seedBatchId = readString(payload, "seedBatchId");
  const memoryCount = readStringArray(payload, "memoryIds").length;
  const note = readString(payload, "note");
  const provenance = readString(payload, "provenance");

  if (language === "zh") {
    const sentence = "记忆种子已记录为事件，实际 MemoryRecord 存储仍然延后。";
    return withDebugFacts(sentence, detailMode, [
      ["批次", seedBatchId],
      ["记忆数", memoryCount],
      ["来源", provenance],
      ["备注", note],
    ]);
  }

  const sentence = "Memory seeding was recorded as an event only; MemoryRecord storage is still deferred.";
  return withDebugFacts(sentence, detailMode, [
    ["batch", seedBatchId],
    ["memories", memoryCount],
    ["provenance", provenance],
    ["note", note],
  ]);
}

function formatEventTitle(event: SimulationEvent, language: AppLanguage): string {
  const label = formatEventKindLabel(language, event.kind);
  return event.actorId ? `${label} · ${event.actorId}` : label;
}

function withDebugFacts(sentence: string, detailMode: TimelineDetailMode, facts: readonly (readonly [string, unknown])[]): string {
  if (detailMode === "user") return sentence;
  const renderedFacts = facts
    .map(([label, value]) => formatFact(label, value))
    .filter((fact) => fact !== undefined);
  return renderedFacts.length > 0 ? `${sentence} ${renderedFacts.join(" · ")}` : sentence;
}

function formatFact(label: string, value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return `${label}: ${formatValue(value)}`;
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value);
}

function readString(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function readNumber(payload: Record<string, unknown>, key: string): number | undefined {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readBoolean(payload: Record<string, unknown>, key: string): boolean | undefined {
  const value = payload[key];
  return typeof value === "boolean" ? value : undefined;
}

function readStringArray(payload: Record<string, unknown>, key: string): string[] {
  const value = payload[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "") : [];
}

function fallback(value: string | number | boolean | undefined, language: AppLanguage): string {
  return value === undefined ? (language === "zh" ? "未知" : "unknown") : String(value);
}

function noPayloadLabel(language: AppLanguage): string {
  return language === "zh" ? "无 payload 详情" : "No payload details";
}
