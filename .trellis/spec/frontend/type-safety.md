# Frontend Type Safety

> Type and validation rules for frontend/backend contracts.

## Core Principle

The frontend must consume shared contracts and typed projections. It must not define private versions of event payloads, command payloads, memory records, or persona fields.

## Shared Contract Ownership

The shared contract layer owns:

- command/input schemas;
- event kinds and payload validators;
- projection DTOs for timeline, agents, conversations, memories, and diagnostics;
- provenance enums;
- operation status enums;
- runtime validation helpers.

Frontend code imports these contracts. If a component needs a field that is missing, update the shared projection instead of casting raw data locally.

## Runtime Validation

All external or serialized data must pass runtime validation at a boundary:

- backend command responses;
- event logs or replay files;
- persisted persona/memory fixtures in dev tools;
- URL parameters used as IDs or filters;
- user intervention form payloads before submit.

The validation library is not selected yet. Once selected, use one shared schema definition where possible.

## Event Projection Rule

Event payloads are append-only contract data and must have a single decoder/projection path.

Forbidden:

```ts
const message = (event.payload as any).message;
```

Required pattern:

```ts
const item = projectRealmEventToTimelineItem(event);
```

The actual function name may differ, but the owner must be shared and tested.

## Type Organization

Recommended type buckets:

- `shared/contracts`: transport DTOs and validators;
- `shared/domain`: pure enums/constants used by backend and frontend;
- feature `viewModels.ts`: UI-only derived display shapes;
- component files: props interfaces local to the component when not reused.

Do not import database implementation types into component props.

## Null and Error Handling

Components and hooks must model:

- loading;
- empty data;
- not found;
- permission/auth not configured, if later added;
- operation failed;
- replay data unavailable;
- invalid event payload.

Avoid optional chaining through deeply nested unknown payloads. Validate once, then render typed data.

## Forbidden Patterns

- `any` for event payloads, command payloads, or memory metadata.
- Type assertions that bypass boundary validation.
- Duplicated string unions for event kinds or operation status.
- Component props typed as raw backend rows.
- Local enum values that do not round-trip with backend values.

## Testing Expectations

When implementation exists, add tests for:

- event projection per event kind;
- invalid event payload fallback/error UI;
- command schema validation;
- generated/configured/user/system provenance enum rendering;
- replay fixture decoding.
