# Observability UI Feature Suite Design

## Boundaries

- Backend remains the source of truth for `WorldSnapshot`, events, replay, diagnostics, and loaded persona fixtures.
- Frontend local state is limited to selected ids, filters/search, open detail panels, replay cursor, auto-step, speed draft, template drafts, receipts, and export/diff UI.
- Components render typed DTOs/view models. Payload-specific extraction lives in `src/app/shared/viewModels.ts`.

## Data Flow

```text
Simulation engine -> AdminStateResponse -> UI shared view models -> feature panels
Intervention forms/templates -> SubmitAdminInputRequest -> admin controller -> engine -> AdminStateResponse
Previous AdminStateResponse + next AdminStateResponse -> state diff view model
Events/replay summary -> replay view / event detail / search / memory/message projections
Persona fixtures -> AdminStateResponse.personas -> agent detail / persona page / relationship network
```

## Contract Changes

- Extend `AdminStateResponse` with `personas: PersonaSpec[]` so the UI does not import fixture implementation directly.
- Clone persona fixtures in `createAdminStateResponse` to avoid exposing mutable references.
- Keep HTTP routes unchanged.
- Keep simulation event kinds unchanged for this MVP; message/memory/replay panels derive from existing events and typed payload projections.

## View Model Additions

Add centralized helpers in `src/app/shared/viewModels.ts` for:

- persona lookup and enhanced agent detail sections;
- relationship matrix/network rows from persona relationships plus interaction counts from timeline events;
- timeline filter/search model;
- event detail model with natural summary/debug facts/payload/related agents;
- world inspector model;
- intervention receipt derivation from previous/next event lists and diagnostics;
- replay cursor model;
- memory event/configured fact model;
- message stream model from direct/private/public event payloads;
- diagnostics center model;
- state diff model;
- action plan model;
- topology model;
- export model.

## UI Layout

- Keep the existing dashboard shell.
- Main column: location topology, location board, selected agent detail, relationship network, timeline/search/detail, replay, inspector, memory/messages/personas, diff.
- Side column: enhanced time controls/intervention templates, receipt panel, diagnostics center, export panel.
- Use semantic HTML cards/tables/lists instead of a graph dependency.

## Behavior Notes

- Jump-to-tick is UI replay selection by step/timeline index; it does not mutate the engine.
- Auto-step periodically calls the existing `onStep`; pause/resume still uses typed observer commands.
- Export uses browser download with a JSON blob and does not write files in the repository.
- State diff is derived from adjacent admin responses in the UI; it is not authoritative simulation logic.
- Memory view clearly labels configured facts versus runtime memory events because full `MemoryRecord` persistence is not implemented yet.

## Validation

- Extend Node tests for admin contract, view-model filtering/search/relationships/diff/export/receipt/replay projections.
- Run `npm run typecheck` and `npm test`.
