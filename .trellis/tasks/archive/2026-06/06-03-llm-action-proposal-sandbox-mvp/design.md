# LLM Action Proposal Sandbox MVP Design

## Architecture

Add a second one-shot admin LLM route next to the runtime connection test:

```text
Frontend session-only config + selected agent
  -> POST /api/admin/llm/action-proposal
  -> admin controller builds prompt from current snapshot + persona + recent events
  -> OpenAiCompatibleProvider + runLlmOperation(structuredOutputSchema)
  -> validate parsed proposal references
  -> return operation + proposal preview
```

The route never queues simulation input and never patches `WorldSnapshot`.

## Structured Output

MVP proposal schema:

```json
{
  "action": "continue | move | wait | performActivity | reflect",
  "reason": "short explanation",
  "intent": "optional intended activity",
  "targetLocationId": "optional known location id",
  "targetAgentId": "optional known agent id"
}
```

Validation rules:

- action must be one of `continue`, `move`, `wait`, `performActivity`, `reflect`.
- `move` requires a known `targetLocationId`.
- any supplied `targetLocationId` must exist in the current snapshot.
- any supplied `targetAgentId` must exist in the current snapshot.
- failed validation returns operation metadata with `status: failed`; no fake success.

## Prompt Context

Include only minimal typed context:

- world id/time/status;
- selected agent id/displayName/status/location/current action;
- persona archetype, values, goals, preferences, relationships;
- valid locations and agents;
- recent timeline event kind/source/actor/targets summaries.

## Frontend

Extend `LlmRuntimeConfigPanel` with an action proposal section:

- agent selector, defaulting to selected dashboard agent or first agent;
- generate action proposal button;
- generated/sandbox result card;
- operation metadata details.

The panel remains in the Control tab. It receives current `snapshot`, `personas`, `events`, `timeline`, and optional selected agent id from `RealmDashboard`.

## Tests

- Backend controller success path with fake fetch returning valid JSON.
- Backend invalid target id path returns failed operation and does not mutate snapshot.
- HTTP route uses fake fetch and redacts/does not return API key.
- Existing runtime test still works.
