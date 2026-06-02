# Observability UI Feature Suite Implementation Plan

## Ordered Checklist

1. Extend admin read model with read-only `personas` fixture data and tests.
2. Expand centralized frontend view models for filtering/search, event detail, agent detail, relationships, inspector, receipts, replay, memory/messages, diagnostics, diffs, plans, topology, and export.
3. Update dashboard state management to track selected event, previous state, receipts, replay cursor, auto-step, filters, and export status.
4. Add/extend presentational panels:
   - enhanced AgentDetailPanel;
   - RelationshipNetwork;
   - EventTimeline filters/detail;
   - WorldInspector;
   - TimeControls/intervention templates/receipts;
   - ReplayPanel;
   - PersonaReadOnlyPanel;
   - MemoryView;
   - MessageStreamPanel;
   - DiagnosticsCenter;
   - StateDiffPanel;
   - AgentPlanPanel;
   - LocationTopology;
   - DebugExportPanel.
5. Update copy and CSS.
6. Add targeted tests for new view-model behavior and admin contract changes.
7. Run `npm run typecheck` and `npm test`.
8. Requirement-by-requirement audit before completion.

## Rollback Points

- If backend contract extension causes issues, revert `personas` field and replace with a frontend fixture import only as a last resort.
- If UI becomes too large in one component, split panels into `src/app/realm/**`, `src/app/agents/**`, `src/app/diagnostics/**`, and `src/app/interventions/**` while keeping projection logic centralized.

## Review Gates

- No component should cast raw event payloads for business meaning.
- No frontend code mutates `WorldSnapshot`.
- No hidden fallback for rejected inputs or diagnostics.
- Generated/runtime memory-like events must not be blended with configured persona facts.
