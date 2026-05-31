# Frontend Component Guidelines

> Component rules for rendering an inspectable multi-agent realm UI.

## Core Principle

Components should be presentational over typed view models. They should not parse raw backend payloads, own simulation rules, or hide operation failures.

## Component Shape

Recommended component structure:

```text
feature/
├── ComponentName.tsx       # rendering and local interaction only
├── ComponentName.test.tsx  # render/interaction tests when implemented
├── useFeatureData.ts       # feature query/view-model hook, if needed
└── viewModels.ts           # formatting from shared projections
```

Components receive typed props and emit typed UI callbacks. Data fetching and command submission should live in hooks or route containers.

## Required UI Provenance

Every narrative or agent-generated item must show provenance:

- `configured`: base persona facts and location configuration;
- `generated`: LLM-created dialogue, plan, memory, or reflection;
- `user`: user-authored intervention or persona content;
- `system`: deterministic engine event or diagnostic.

Use a consistent badge or label component across timeline, profiles, conversations, and debug panels.

## Core Components

### Realm Timeline

Must render:

- simulated time;
- event kind/source;
- actor and target labels;
- links to related agent/conversation/memory/operation records;
- loading, empty, and error states.

### Agent Profile Panel

Must separate:

- configured persona facts;
- runtime status and current plan;
- generated memories;
- generated reflections with evidence links;
- user interventions involving the agent.

### Conversation Transcript

Must render:

- active lifecycle state;
- participants;
- messages or paginated transcript;
- generated per-participant summaries after completion;
- failure state if summarization fails.

### Debug Panels

Debug components may be hidden behind a toggle, but they must render textual data for:

- operation status/errors;
- memory retrieval scores;
- decision traces;
- prompt schema versions.

## Accessibility

- Interactive timeline items and playback controls must be keyboard accessible.
- Status and provenance must not be communicated by color alone.
- Auto-updating timelines must not steal focus.
- Long generated text should preserve paragraphs and remain selectable/copyable.
- Buttons and form fields must have accessible labels.

## Styling Rules

No styling framework has been selected yet. Regardless of stack:

- keep layout primitives reusable;
- use semantic spacing/status tokens where possible;
- do not encode domain state only in CSS class names;
- make provenance and error states visually consistent.

## Forbidden Patterns

- `event.payload as any` in a component.
- Components that submit unvalidated raw objects to the backend.
- Components treating generated reflections as immutable persona facts.
- Silent UI failure for LLM/provider errors.
- Recreating backend filtering/ranking logic in frontend render code.

## Testing Expectations

When tests exist, component tests should cover:

- empty/loading/error states;
- provenance badge rendering;
- generated-vs-configured separation;
- command form validation;
- operation failure display;
- keyboard-visible playback controls.
