# LLM Runtime API Config Panel MVP Design

## Security Model

The API key is session-only frontend state. It is sent to the local admin backend only when the user clicks the test button. The backend creates an OpenAI-compatible provider for that request, runs one operation, returns diagnostics/result text, and discards the key.

No `.env` write, localStorage/sessionStorage write, database write, or simulation engine mutation.

## Backend

Add an admin route for LLM test requests. Request fields:

- `baseUrl`
- `model`
- `apiKey`
- `providerName?`
- `apiMode`: `chat_completions | responses`
- `timeoutMs?`
- `prompt`

The controller validates required fields, builds `OpenAiCompatibleProvider`, and runs an explicit test operation through existing LLM boundary code. Failures become structured JSON errors/results, never fake success.

## Frontend

Add a panel under admin controls/diagnostics area:

- form inputs for provider config and prompt;
- optional import JSON textarea/button;
- test button;
- result/error diagnostics;
- warning that key is kept in memory only and lost on refresh.

## Tests

- Admin controller rejects malformed LLM runtime requests.
- Provider test path can run offline with an injected fake fetch.
- Frontend API helper submits the runtime config without requiring env.
- Build/typecheck validate UI wiring.
