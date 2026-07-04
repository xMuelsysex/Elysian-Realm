# Elysian LLM Planner Integration Path - Design

## 1. Boundary Objective

M14 does not make the engine call an LLM during normal ticks. It completes the review-gated path:

```text
Admin provider call -> validated action proposal -> user-reviewed realmEvent input -> deterministic engine application
```

The LLM result influences state only after becoming a typed user input. This matches the LLM operation spec: operation results submit typed inputs back to the simulation and do not patch world state directly.

## 2. Reviewed Proposal Contract

Existing drafts use:

- `kind: "realmEvent"`
- `source: "user"`
- `payload.eventKind`: `llm.proposal.<action>`
- `payload.provenance`: `user-reviewed-llm-proposal`
- `payload.agentId`
- `payload.proposalAction`
- optional `payload.intent`
- optional `payload.targetLocationId`
- optional `payload.targetAgentId`
- `payload.llmOperationId`

Add a backend parser/validator for this payload at the simulation boundary. It should accept only:

- known agent ID matching a target ID;
- proposal action in the already supported LLM action set;
- known target location/agent IDs when present;
- move requires `targetLocationId`;
- intent defaults to a concise reviewed action label if missing.

## 3. Engine Application

When a reviewed proposal is accepted, `applyValidatedInput(...)` should update the target agent:

- `move`: location becomes `targetLocationId`, status `moving`, currentAction kind `move`.
- `performActivity`: status `idle`, currentAction kind `performActivity`, location from targetLocationId if present.
- `wait`: status `waiting`, currentAction kind `wait`.
- `reflect`: status `reflecting`, currentAction kind `reflect`.
- `continue`: status unchanged unless it was `waiting`; currentAction kind `performActivity` with reviewed intent.

Use deterministic IDs:

- plan ID: `llm.<inputId>.<agentId>`
- action ID: `llm.<inputId>.<agentId>.<proposalAction>`
- memory ID: `memory_<stepId>_<agentId>_llm_proposal`

Do not add a new event kind. The existing accepted intervention event remains the replay-visible source.

## 4. Memory Write

After the accepted intervention event is emitted, append a package memory record:

- kind: `plan`
- visibility: `user-authored`
- sourceIds: accepted event ID and input ID
- tags: agent ID, action, `llm`, `user-reviewed`
- metadata extends `EngineMemoryMetadata` with `llmOperationId`, `reviewedBy`, and `proposalAction`.

This keeps generated/reviewed provenance visible in the memory stream without making memory authoritative.

## 5. Tests

- input validation accepts valid reviewed proposal payloads and rejects bad action/targets;
- submitting a reviewed move proposal changes agent location/action and creates a memory;
- invalid proposal input emits `simulation.inputRejected`;
- action proposal draft tests preserve sanitized review payloads;
- Admin controller fake-provider path remains sandboxed until review submission;
- default deterministic ticks still pass unchanged.

## 6. UI Copy

Update the LLM panel copy from "preview-only and does not mutate" to "preview-only until reviewed and applied". Keep API keys session-only and never persisted.
