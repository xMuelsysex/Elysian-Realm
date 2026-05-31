# LLM Orchestration Backend Spec

> Provider, prompt, structured-output, and failure-handling rules for agent reasoning.

## Evidence Base

Reference patterns:

- `a16z-infra/ai-town` keeps long-running LLM work in asynchronous agent operations and submits results back to the game engine as typed inputs.
- `microsoft/TinyTroupe` treats model configuration, cost tracking, persona adherence, and validation as core simulation concerns.
- `camel-ai/camel` emphasizes model abstraction, stateful memory, tool integration, and request/response logging for multi-agent systems.

## Provider Boundary

All model and embedding calls must go through explicit provider interfaces. The MVP provider layer should be provider-agnostic and OpenAI-compatible by default, so local models, low-cost cloud models, and higher-quality cloud models can be swapped through configuration.

Required provider capabilities:

- chat/completion with structured-output support
- embeddings
- model/provider metadata
- token and cost reporting when available
- deterministic fake implementation for tests
- configurable provider/model/base URL/API-key settings from environment or local config
- timeout and cancellation support

Forbidden patterns:

- Calling a vendor SDK directly from simulation engine code.
- Reading API keys from source files or persona files.
- Hard-coding one provider/model in prompt builders.
- Making tests depend on live network model calls.

## Operation Model

LLM work is represented as an operation record, not an inline side effect.

Required operation fields:

- `id`
- `worldId`
- `agentId?`
- `kind`: `dailyPlan | actionProposal | conversationTurn | conversationSummary | reflection | importanceScore | embedding`
- `status`: `pending | running | completed | failed | cancelled | timedOut`
- `inputRef` or typed input payload
- `promptSchemaVersion`
- `provider`
- `model`
- `startedAt`, `completedAt?`
- `result?`
- `error?`
- `diagnostics`: token/cost/latency metadata

Rules:

- The simulation engine may start operations, poll completed operations, or receive operation-completed inputs.
- Completed operation results must be validated before they influence world state.
- Operation results submit typed inputs back to the simulation; they do not patch world state directly.
- Failed operations remain visible in diagnostics and agent status.

## Prompt Builder Rules

Prompt builders must be pure functions over typed inputs:

```text
persona spec + current world projection + retrieved memories + task schema -> prompt messages
```

Rules:

- Keep prompt templates versioned.
- Include only the minimum context needed for the operation.
- Mark base persona facts, generated memories, and user interventions distinctly.
- Include output schema instructions for every operation that the backend must parse.
- Do not let prompt builders query databases, mutate state, or perform provider calls.

## Structured Output Rules

Any LLM output that affects state must be parsed through a schema.

Required validation behavior:

- reject missing required fields
- reject unknown action kinds unless explicitly allowed
- reject references to non-existent agents, locations, conversations, or plans
- clamp or reject out-of-range numeric values according to the schema
- preserve raw output and parser error in diagnostics

Forbidden patterns:

- Regex-parsing arbitrary prose into state-changing actions when a structured schema is possible.
- Falling back to a fabricated valid action after parse failure.
- Silently ignoring invalid model output while marking the operation successful.

## Agent Reasoning Operation Types

### Daily Plan

Input:

- persona summary
- current day/time
- routine preferences
- recent important memories
- current relationships/location constraints

Output:

- ordered plan items with rough time ranges, location preferences, and intent.

### Action Proposal

Input:

- current plan item
- current location/status
- perceived events
- retrieved memories
- active cooldowns

Output:

- `continue | move | startConversation | wait | performActivity | reflect | revisePlan`
- reason
- target location/agent/event IDs where applicable

### Conversation Turn

Input:

- speaker persona
- listener persona summary
- conversation history window
- retrieved relationship/conversation memories
- current tone or objective

Output:

- message text
- whether to continue or end politely
- optional emotional/relationship signals

### Conversation Summary

Input:

- participant persona
- other participant(s)
- full or compressed transcript

Output:

- first-person summary from the participant's perspective
- importance score or importance rationale
- relationship deltas if supported

### Reflection

Input:

- selected recent/important memories
- focal questions or topics

Output:

- insight list
- evidence memory IDs
- optional changed plans/beliefs

## Tool Access Rules

Tools are optional capabilities attached to operation kinds.

Rules:

- Declare tool permissions per operation kind and per agent when needed.
- Tool output must be validated before entering prompt context or state.
- External web/file/network tools are out of scope for the initial daily-life MVP unless the user explicitly approves.
- Do not grant tools globally to all agents by default.

## Cost and Rate-Limit Guardrails

The MVP must support:

- per-run token/cost counters
- per-agent operation counts
- configurable budget limits for local development runs
- reflection and conversation-operation throttling
- embedding cache
- fake providers in tests
- clear errors for provider quota/rate-limit failures

Do not hide rate-limit failures by pretending an agent made a normal decision. Tests for core simulation behavior must use `FakeProvider` or equivalent deterministic fixtures and must not require live network calls.

## Safety and Legal Boundary

- Prompts may enforce strict canon-aligned temperament, relationship constraints, values, speech-style intent, and behavioral boundaries from user-authored persona summaries.
- Do not ask the model to reproduce official dialogue, official story text, copyrighted assets, proprietary audio, or exact scene text.
- Prompts should request original daily-life behavior that remains character-consistent without copying source material.
- Generated output should be labeled generated in persistence and UI.
- Provider-side content moderation failures should abort the operation visibly.

## Verification Checklist

- Fake provider can run deterministic agent-loop tests offline.
- Invalid structured output creates a failed operation with raw diagnostics.
- Provider timeout does not corrupt world state.
- Operation result cannot mutate world state except through typed simulation inputs.
- Prompt schema versions are persisted with operation records.
- Cost/token metadata is captured when the provider returns it.
