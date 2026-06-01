# Event Detail Projection Optimization - Design

## Scope

Improve the frontend admin timeline event details by adding a central projection layer that turns known `SimulationEvent` payloads into concise bilingual display text with two local display modes:

- **User mode**: pure natural sentence details for easier reading.
- **Debug mode**: sentence plus key facts, with raw payload JSON available for inspection.

This is a frontend display projection change. The simulation engine, admin API routes, event emission, and stored event payloads should remain unchanged.

## Current Data Flow

```text
Simulation engine -> SimulationEvent[] -> AdminStateResponse.events
SimulationEvent[] + TimelineEntry[] -> createTimelineItems()
TimelineItem.title/detail -> EventTimeline render
EventTimeline -> raw payload JsonDetails for debugging
```

## Proposed Data Flow

```text
SimulationEvent payload + language + detail mode -> central event detail projector -> localized TimelineItem.detail
TimelineItem + debug mode -> EventTimeline render + optional payload JSON inspector
```

## Ownership and Boundaries

- `src/server/simulation/events.ts` remains the source of truth for event kinds and payload contracts.
- `src/app/shared/viewModels.ts` (or a sibling shared helper) owns display projection for timeline items.
- React components render `TimelineItem` fields and must not inspect `event.payload` for business meaning.
- `src/app/shared/i18n.ts` owns static labels and phrasing fragments for Chinese/English UI text.
- Tests in `tests/adminViewModels.test.ts` assert projection behavior against deterministic engine/admin events.

## Projection Shape

Prefer keeping the existing `TimelineItem` surface and pass display mode into projection:

```ts
type TimelineDetailMode = "user" | "debug";

interface TimelineItem {
  entry: TimelineEntry;
  event: SimulationEvent;
  title: string;
  detail: string;
}

function createTimelineItems(
  events: readonly SimulationEvent[],
  timeline: readonly TimelineEntry[],
  language: AppLanguage,
  detailMode: TimelineDetailMode,
): TimelineItem[];
```

The projector should prefer event-kind-specific detail strings. User mode returns natural sentences. Debug mode returns a readable sentence plus key facts embedded in the detail string. Fallback should use a generic payload summary so future event kinds remain visible.

## Event Kind Coverage

Known MVP event kinds to cover:

- `world.created`
- `agent.spawned`
- `world.timeAdvanced`
- `agent.startedRoutine`
- `realm.interventionSubmitted`
- `simulation.inputRejected`
- `memory.seeded`

## Runtime Safety

Event payload validators exist on the backend, but the UI should still avoid unsafe assumptions. Projection helpers should read payload values through small runtime readers such as `readString`, `readNumber`, `readStringArray`, or equivalent. Missing fields should degrade to clear fallback tokens instead of throwing.

## Localization

- Default Chinese mode should show natural Chinese detail sentences.
- English mode should show natural English detail sentences.
- User mode should avoid debug-style key/value lists unless the natural sentence needs a value to make sense.
- Debug mode should preserve raw IDs, step IDs, input IDs, command kinds, seed IDs, counts, statuses, time scale, batch IDs, and raw payload JSON.

## Compatibility

No backend API shape changes are planned. Existing `AdminStateResponse` consumers should keep working. Frontend component props may gain local UI-only `debugMode` / `onToggleDebugMode` fields, but no server DTO changes are needed.

## Trade-offs

- User-mode natural sentences are easiest for non-debug reading.
- Debug-mode sentence + key facts keeps engineering diagnostics one click away without making the default timeline noisy.
- Structured fact chips would be more flexible for filtering later, but would require a larger UI/data model change.
- Backend-provided projection could ensure full contract ownership, but would add API surface area before persistence/replay contracts stabilize.

## Risks

- Duplicating backend payload assumptions in frontend. Mitigation: keep one projector and test each known kind.
- Over-localizing raw IDs or debug values. Mitigation: translate labels and sentences only; preserve raw identifiers in debug mode.
- Hiding important diagnostics in user mode. Mitigation: keep a visible debug-mode toggle near the timeline and preserve diagnostics panel behavior.
- Hidden failures for malformed events. Mitigation: fallback detail text and retain raw JSON inspector in debug mode.
