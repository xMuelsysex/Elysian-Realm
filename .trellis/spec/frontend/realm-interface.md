# Realm Interface Frontend Spec

> UI rules for the Elysian Realm multi-agent daily-life simulation.

## Evidence Base

Reference patterns:

- `a16z-infra/ai-town` renders server-owned game state in a browser UI and submits inputs back to the engine.
- `microsoft/TinyTroupe` emphasizes inspectable simulations, generated outputs, extraction, and validation.
- `joonspk-research/generative_agents` supports replay and demo views for saved simulations.

## Frontend Responsibility Boundary

The frontend renders backend projections and submits typed commands.

Allowed responsibilities:

- display world clock, active agents, timeline, conversations, memories, relationships, and replay state
- submit user interventions and control commands through shared command contracts
- visualize generated-vs-configured-vs-user-authored content
- show diagnostics such as memory retrieval scores and operation failures

Forbidden responsibilities:

- reimplementing simulation rules in components
- directly mutating agent state, world time, conversations, plans, or memories
- parsing raw untyped event payloads in multiple components
- hiding backend operation failures as normal agent behavior

## Core Screens

### Realm Timeline

Purpose: show what happened in the realm.

Required UI elements:

- current world time and playback status
- event stream grouped by simulated time
- filters by agent, event kind, location, and source
- badges for `system`, `user`, `agent`, `llm`, and `test` sources
- links from events to related conversation, memory, plan, or operation records

Rules:

- Render events from shared typed projections.
- Do not infer event meaning from string matching.
- Empty/loading/error states must be explicit.

### Agent Profile

Purpose: inspect one character agent.

Required UI sections:

- base persona facts from configuration
- current status, location, plan, and active operation
- recent private/shared memories
- reflections with evidence memory links
- directed relationships to other agents
- conversation history summaries
- diagnostics for last decision/retrieval when debug mode is enabled

Rules:

- Clearly separate configured persona facts from generated memories/reflections.
- Mark generated content and user-authored interventions.
- Do not let generated content appear as immutable canon facts.

### Conversation View

Purpose: inspect active and archived conversations.

Required UI elements:

- participants and lifecycle state
- message list or streaming transcript
- start/end time, location, message count
- per-participant generated summaries after completion
- relationship or memory effects when available

Rules:

- Conversation transcript rendering can use paginated/high-volume message queries.
- Active world state should only show lightweight conversation metadata.

### Replay / Debug View

Purpose: reproduce and debug a simulation run.

Required UI elements:

- replay controls: start, pause, step, speed, jump to time/event
- event IDs and step IDs
- selected agent decision trace
- memory retrieval candidates and scores
- operation status and errors

Rules:

- Replay uses persisted event/snapshot data, not live model calls.
- Debug views can be hidden in normal mode but must remain available for development.

### User Intervention Panel

Purpose: let the user influence the realm without turning the product into a pure chatroom.

MVP intervention model:

- **Observer commands**: pause/resume/step simulation, change speed, request debug traces, request reflection.
- **Realm events**: introduce gatherings, location events, schedule nudges, anomalies, invitations, or environmental prompts.
- **Direct private messages**: optional typed command for speaking to one agent; this creates user-sourced events/memories rather than bypassing the world model.

Rules:

- Observer commands and realm events are the primary intervention modes.
- Direct messages are allowed, but they must remain one typed command among others, not the dominant UI model.
- Every intervention submits a typed command.
- The resulting event must show `source: user`.
- Intervention forms must validate required target IDs and payload shape before submit.
- UI copy should preserve the feeling that the user is observing and influencing a living realm, not operating a standard chatbot.

## Component Data Flow

```text
backend projection/query -> feature hook -> typed view model -> component render
component form -> shared command schema -> backend command boundary
```

Rules:

- Feature hooks may compose queries and transform into view models.
- Components should not know database schemas or internal memory/vector structures.
- Components should receive typed props and avoid optional-field chains over raw payloads.
- Any event kind projection should be implemented once and reused.

## Content Provenance UI

Every displayed narrative item should indicate provenance:

- `configured`: base persona or location config
- `generated`: LLM-created memory, dialogue, reflection, or plan
- `user`: user intervention or authored persona content
- `system`: deterministic engine event or diagnostic

Use badges, labels, or separate sections. Do not blend official-inspired base summaries and generated output without provenance.

## Accessibility and Interaction Rules

- Timeline and conversation lists must be keyboard navigable.
- Agent status and operation errors must be readable as text, not only color.
- Playback controls must have accessible labels.
- Long generated text should preserve paragraph breaks and support copy/debug inspection.
- Auto-updating timelines should not steal focus.

## Implemented Debug Admin Dashboard MVP Contract

### 1. Scope / Trigger

The first browser UI is a local-only Vite + React dashboard under `src/app/**`. Future frontend debug/admin work must preserve this contract because it is the first implementation of backend-owned simulation projections, typed intervention forms, and diagnostics rendering.

### 2. Signatures

Current source paths:

- `src/app/main.tsx`
- `src/app/App.tsx`
- `src/app/adminApi.ts`
- `src/app/realm/**`
- `src/app/agents/AgentDetailPanel.tsx`
- `src/app/interventions/InterventionPanel.tsx`
- `src/app/diagnostics/DebugPanel.tsx`
- `src/app/shared/viewModels.ts`
- `tests/adminViewModels.test.ts`

Current API helper signatures:

```ts
export function fetchAdminState(): Promise<AdminStateResponse>;
export function stepAdminSimulation(): Promise<AdminStateResponse>;
export function resetAdminSimulation(): Promise<AdminStateResponse>;
export function submitAdminInput(
  input: SubmitAdminInputRequest,
): Promise<AdminStateResponse>;
```

Current view-model helper signatures:

```ts
export function groupAgentsByLocation(
  locations: readonly LocationRef[],
  agents: readonly AgentRuntimeState[],
): LocationGroup[];

export function findSelectedAgent(
  agents: readonly AgentRuntimeState[],
  selectedAgentId: string | undefined,
): AgentRuntimeState | undefined;

export function findAgentLocation(
  locations: readonly LocationRef[],
  agent: AgentRuntimeState | undefined,
): LocationRef | undefined;

export function filterRelatedTimelineItems(
  items: readonly TimelineItem[],
  selectedAgentId: string | undefined,
  limit?: number,
): TimelineItem[];

export function createAgentDetailViewModel(
  snapshot: WorldSnapshot,
  selectedAgentId: string | undefined,
  timelineItems: readonly TimelineItem[],
  relatedEventLimit?: number,
  personas?: readonly PersonaSpec[],
): AgentDetailViewModel;

export type TimelineDetailMode = "user" | "debug";

export function createTimelineItems(
  events: readonly SimulationEvent[],
  timeline: readonly TimelineEntry[],
  language?: AppLanguage,
  detailMode?: TimelineDetailMode,
): TimelineItem[];

export function latestDiagnostics(
  diagnostics: readonly AdminDiagnostic[],
): AdminDiagnostic[];

export function filterTimelineItems(
  items: readonly TimelineItem[],
  filters: TimelineFilters,
): TimelineItem[];

export function createRelationshipNetworkViewModel(
  personas: readonly PersonaSpec[],
  snapshot: WorldSnapshot,
  timelineItems: readonly TimelineItem[],
): RelationshipRow[];

export function createWorldInspectorViewModel(
  state: AdminStateResponse,
): WorldInspectorViewModel;

export function createInterventionReceiptViewModel(
  previous: AdminStateResponse | undefined,
  current: AdminStateResponse,
  input: SubmitAdminInputRequest | undefined,
  timelineItems: readonly TimelineItem[],
): InterventionReceiptViewModel;

export function createReplayCursorViewModel(
  summary: ReplaySummary,
  timelineItems: readonly TimelineItem[],
  cursor: number,
): ReplayCursorViewModel;

export function createMemoryViewModel(
  personas: readonly PersonaSpec[],
  timelineItems: readonly TimelineItem[],
  selectedAgentId?: string,
): MemoryViewModel;

export function createMessageStreamViewModel(
  timelineItems: readonly TimelineItem[],
): MessageThreadViewModel[];

export function createDiagnosticsCenterViewModel(
  diagnostics: readonly AdminDiagnostic[],
): DiagnosticsCenterViewModel;

export function createStateDiffViewModel(
  previous: AdminStateResponse | undefined,
  current: AdminStateResponse,
): StateDiffEntry[];

export function createAgentPlanViewModels(
  snapshot: WorldSnapshot,
): AgentPlanViewModel[];

export function createTopologyViewModel(
  snapshot: WorldSnapshot,
  timelineItems: readonly TimelineItem[],
): TopologyViewModel;

export function createDebugExportViewModel(
  state: AdminStateResponse,
  timelineItems: readonly TimelineItem[],
  diagnostics: DiagnosticsCenterViewModel,
  diffs: readonly StateDiffEntry[],
): DebugExportViewModel;
```

### 3. Contracts

- The UI reads `AdminStateResponse` from `/api/admin/state` and replaces its server state only with backend responses.
- Local React state is limited to loading/error flags, form drafts, selected agent/event ids, timeline filters/search, replay cursor, auto-step flag, previous response reference for diff/receipt display, last submitted input, export timestamp, and UI-only preferences such as timeline `TimelineDetailMode`.
- Components render typed DTOs or view models. Event detail projection, timeline filtering/search, agent-detail lookup, relationship rows, world inspector, receipts, replay cursor, memory/message projections, diagnostics center, state diff, action plans, topology, and debug export models live in `shared/viewModels.ts`; components may pass already-projected payloads to `JsonDetails` for raw inspection but must not infer simulation rules from payload fields.
- Timeline detail mode has two local UI modes: `user` shows natural sentences, while `debug` shows the sentence plus key facts and raw payload JSON.
- `LocationBoard` may expose agent selection as accessible buttons, but selection only updates local `selectedAgentId`; it must not mutate `WorldSnapshot` or submit simulation commands.
- `AgentDetailPanel` renders selected-agent runtime state from `WorldSnapshot`, clearly labeled as runtime/debug state rather than configured persona canon. Configured persona summaries and long-term goals come from `AdminStateResponse.personas` through `createAgentDetailViewModel`.
- Agent related events are filtered centrally from projected `TimelineItem[]`; related means the selected agent is `event.actorId` or appears in `event.targetIds`.
- Relationship network interaction counts must count only explicit actor-target pair events where one agent is `event.actorId` and the other appears in `event.targetIds`; broad system events targeting many agents such as `memory.seeded` are not relationship interactions. `recentInteractions` may be capped for display, but `interactionCount` is the full count.
- `InterventionPanel` is the only MVP owner of debug command forms. It submits `SubmitAdminInputRequest` for pause, resume, set time scale, realm event, and direct private message.
- `DebugPanel` renders backend diagnostics, replay summary, and queued inputs for inspection; it must not hide rejected inputs.
- Diagnostics center categories (`rejectedInputs`, `validationErrors`, `anomalies`) are computed from the full diagnostics list; only the `latest` display list is capped.
- `ObservabilityPanels.tsx` owns semantic read-only panels for relationship network, world inspector, receipt, replay, persona read-only page, memory view, message stream, diagnostics center, state diff, action plan, topology, and local JSON export. These panels receive view models only.
- Auto-step calls the existing step command on an interval and must stop through local UI state; jump-to-tick/replay cursor only changes which persisted event is selected.
- World inspector and debug export must expose current state, event count/list, timeline count/list, replay summary, diagnostics, conversations/queues, and derived diffs so local audits do not need a second data source.
- Debug export creates a browser download blob from the current `AdminStateResponse` and derived view models; it must not write repository files or mutate simulation state.
- Source/provenance badges must render text labels for `system`, `user`, `agent`, `llm`, and `test` when those sources appear.

### 4. Validation & Error Matrix

- initial state request pending -> loading panel with text feedback
- failed fetch/command -> visible error banner; do not mutate local snapshot optimistically
- invalid time scale form value -> field-level form error, no request sent
- missing realm event target/kind -> field-level form error, no request sent
- missing direct-message target/text -> field-level form error, no request sent
- backend structured error -> display the backend error message
- empty timeline -> explicit empty state
- no selected agent -> explicit Agent detail empty state prompting selection
- selected agent id missing from current snapshot -> explicit not-found Agent detail state
- selected agent -> runtime identity/status/location/action/operation/relationships/cooldowns render from `WorldSnapshot`
- related agent events -> actor/target event rows reuse centralized `TimelineItem` projection
- user timeline mode -> natural event sentences without debug-style key/value fact lists
- debug timeline mode -> sentence plus key facts and raw payload JSON inspector
- empty diagnostics -> explicit no-diagnostics state
- missing persona fixtures -> agent/persona panels show explicit configured-facts empty state, not generated defaults
- no receipt context -> receipt panel shows no-recent-input state
- rejected simulation input -> receipt and diagnostics center show rejection reason and related event/input ids
- empty replay/message/memory/diff/topology history -> explicit empty states
- export action -> browser download only; no server or filesystem write

### 5. Good/Base/Bad Cases

Good:

```tsx
const timelineItems = createTimelineItems(state.events, state.timeline, language, detailMode);
const agentDetail = createAgentDetailViewModel(
  state.snapshot,
  selectedAgentId,
  timelineItems,
  undefined,
  state.personas,
);
return <AgentDetailPanel viewModel={agentDetail} />;
```

Base:

```tsx
await runCommand(() => fetchAdminState());
// Replace the dashboard state with the returned AdminStateResponse.
```

Bad:

```tsx
// Do not parse event payloads in component render logic.
const timeScale = (event.payload as { timeScale: number }).timeScale;

// Do not optimistically patch backend-owned state.
state.snapshot.status = "running";

// Do not duplicate event payload business parsing in a panel.
const summary = item.event.payload.summary as string;
```

### 6. Tests Required

Frontend/admin UI tests must assert:

- agents are grouped from backend snapshot locations;
- selected-agent lookup, no-selection, and not-found states are covered;
- current location mapping and cooldown entry projection are covered;
- related agent events include actor and target matches through centralized helpers;
- timeline items are created through centralized event detail projection;
- each MVP event kind has user-mode and debug-mode detail coverage;
- diagnostics are ordered newest-first for display;
- admin response personas feed agent/persona/relationship/memory configured-fact projections;
- timeline filters cover keyword, kind, source, agent id, target id, and time range;
- relationship, inspector, receipt, replay, memory/message, diagnostics, diff, plan, topology, and export view models are covered by pure Node tests;
- relationship tests cover full interaction count versus capped recent interaction display and exclude broad multi-agent system events;
- diagnostics-center tests cover full-list aggregation with capped latest display;
- inspector/export tests assert event/timeline/replay/conversation metadata is exposed;
- typecheck covers React components and API helper contracts;
- production build emits the Vite frontend assets.

### 7. Wrong vs Correct

#### Wrong

```tsx
<button onClick={() => setState({ ...state, snapshot: { ...state.snapshot, status: "running" } })}>
  Resume
</button>
```

#### Correct

```tsx
<button onClick={() => submitAdminInput({
  kind: "observerCommand",
  targetIds: [state.snapshot.id],
  payload: { action: "resume" },
  source: "user",
})}>
  Resume
</button>

const receipt = createInterventionReceiptViewModel(
  previousState,
  state,
  lastSubmittedInput,
  timelineItems,
);
```

## LLM Proposal Review Draft Contract

### 1. Scope / Trigger

Trigger: the frontend converts a sandbox `LlmActionProposalResponse` from `/api/admin/llm/action-proposal` into an editable draft, then submits it through the existing admin input command boundary only after an explicit user action.

This is a cross-layer safety contract because it touches LLM operation results, local UI draft state, and `SubmitAdminInputRequest` submission. Future proposal/apply work must preserve backend authority: a proposal is not a simulation mutation until it is submitted as a typed user intervention and accepted by the backend engine.

### 2. Signatures

Current source paths:

- `src/app/llm/actionProposalDraft.ts`
- `src/app/llm/LlmRuntimeConfigPanel.tsx`
- `tests/llmActionProposalDraft.test.ts`

Required helper signatures:

```ts
export function createLlmProposalInterventionDraft(
  result: LlmActionProposalResponse,
): SubmitAdminInputRequest | undefined;

export type LlmProposalDraftParseError = "draftJson" | "draftShape";

export function parseLlmProposalDraftText(
  text: string,
): { ok: true; value: SubmitAdminInputRequest } | { ok: false; error: LlmProposalDraftParseError };
```

The runtime panel receives the existing command boundary instead of importing a second submission path:

```ts
onSubmitInput: (input: SubmitAdminInputRequest) => Promise<void>;
```

### 3. Contracts

- A draft may be created only from `operation.status === "completed"` and a present `proposal`.
- The default draft is a `SubmitAdminInputRequest` with `kind: "realmEvent"` and `source: "user"`.
- Draft `targetIds` are unique non-empty IDs built from the selected `agentId`, optional `targetLocationId`, and optional `targetAgentId`.
- Draft payload must preserve review/audit metadata:
  - `eventKind: "llm.proposal.<action>"`
  - `description`
  - `provenance: "user-reviewed-llm-proposal"`
  - `reviewedBy: "user"`
  - `sandbox`
  - `llmOperationId`
  - `agentId`
  - `proposalAction`
  - `reason`
  - optional `intent`, `targetLocationId`, `targetAgentId`
- Draft JSON is local React state only. It may be edited or cleared without making a request.
- Draft submission parses the edited JSON, normalizes `source` to `"user"`, then calls the provided `onSubmitInput(parsed.value)` handler.
- API keys and provider secrets must never be copied into the draft payload, stored in browser storage, or included in operation response rendering.

### 4. Validation & Error Matrix

- action proposal operation not completed -> draft helper returns `undefined`; copy/apply button stays disabled
- action proposal missing `proposal` -> draft helper returns `undefined`; failed metadata remains display-only
- failed/invalid LLM proposal result -> no draft, no hidden fallback, no admin input submission
- malformed draft JSON -> `draftJson`, visible form error, no request sent
- parsed draft is not a `realmEvent` -> `draftShape`, visible form error, no request sent
- draft `targetIds` missing/empty/non-string -> `draftShape`, visible form error, no request sent
- draft `payload` missing or not an object -> `draftShape`, visible form error, no request sent
- draft `source` present and not `"user"` -> `draftShape`, visible form error, no request sent
- clear/close draft -> local state reset only; no backend request and no world mutation
- valid submitted draft -> submit through existing admin input path and render the usual receipt/diagnostics from backend state

### 5. Good/Base/Bad Cases

Good:

```tsx
const proposalDraft = proposal
  ? createLlmProposalInterventionDraft(proposal)
  : undefined;

const submitDraft = async () => {
  const parsed = parseLlmProposalDraftText(draftText);
  if (!parsed.ok) {
    setFormError(copy.errors[parsed.error]);
    return;
  }
  await onSubmitInput(parsed.value);
};
```

Base:

```tsx
<button disabled={!proposalDraft} onClick={() => setDraftText(JSON.stringify(proposalDraft, null, 2))}>
  Copy to editable intervention draft
</button>
```

Bad:

```tsx
// Do not auto-apply an LLM proposal or bypass the admin input receipt flow.
useEffect(() => {
  if (proposal?.proposal) {
    void submitAdminInput(createLlmProposalInterventionDraft(proposal)!);
  }
}, [proposal]);
```

### 6. Tests Required

Proposal-review draft tests must assert:

- completed proposal results map to editable `realmEvent` admin input drafts;
- failed or missing proposal results cannot create drafts;
- duplicate target IDs are removed;
- the draft payload preserves proposal action, reason, optional targets, sandbox flag, operation ID, and user-review provenance;
- serialized drafts do not contain API keys or provider secrets;
- edited valid JSON parses into a user-sourced admin input;
- malformed JSON, non-`realmEvent` drafts, missing required shape, and non-user sources are rejected without submitting;
- typecheck covers panel props so draft submission keeps using the existing `onSubmitInput` boundary.

### 7. Wrong vs Correct

#### Wrong

```tsx
// Proposal generation must remain preview-only.
const result = await proposeLlmAction(request);
await submitAdminInput(createLlmProposalInterventionDraft(result)!);
```

#### Correct

```tsx
const result = await proposeLlmAction(request);
setProposal(result);
setDraftText("");

// Later, after an explicit user click:
const parsed = parseLlmProposalDraftText(draftText);
if (parsed.ok) {
  await onSubmitInput(parsed.value);
}
```

## Visual Roadmap

Recommended MVP is text/timeline-first.

2D map requirements can be added later:

- location coordinates and paths come from backend projections
- movement animation interpolates server state but does not own pathfinding rules
- map interactions submit typed movement/intervention commands
- replay interpolation uses snapshot/history buffers, not component-local truth

## Testing Requirements

When frontend code exists, add tests for:

- empty/loading/error states for realm timeline and agent profile
- generated/configured/user provenance labels
- command form validation
- event projection rendering per event kind
- replay controls not requiring live model calls
- operation failure display

## Common Mistakes to Avoid

- Treating the UI as the source of the current agent status.
- Letting each component parse `event.payload` independently.
- Showing generated memories as canon facts.
- Building a 2D map before text/replay contracts are stable.
- Suppressing failed LLM operations because they are "debug-only".
