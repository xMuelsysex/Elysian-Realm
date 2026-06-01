import type { SimulationEvent, WorldSnapshot } from "../../shared/contracts/index.js";
import { projectTimelineEntry, type TimelineEntry } from "./events.js";

export interface ReplaySummary {
  worldId: string;
  finalStepId: string;
  finalTime: string;
  eventKinds: string[];
  timeline: TimelineEntry[];
}

export function createReplaySummary(snapshot: WorldSnapshot, events: readonly SimulationEvent[]): ReplaySummary {
  const timeline = events.map(projectTimelineEntry);
  return {
    worldId: snapshot.id,
    finalStepId: snapshot.lastStepId,
    finalTime: snapshot.currentTime,
    eventKinds: timeline.map((entry) => entry.kind),
    timeline,
  };
}

export function createEventKindTimeline(events: readonly SimulationEvent[]): string[] {
  return events.map((event) => projectTimelineEntry(event).kind);
}
