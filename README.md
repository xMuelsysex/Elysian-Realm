# Elysian-Realm

## Local debug/admin interface

This repository includes a development-only admin/debug interface for the deterministic offline simulation.

- Start both the local Node admin API and Vite UI with `npm run dev` or `npm run admin`.
- Open the browser UI at `http://localhost:5173`.
- The admin API listens on `http://127.0.0.1:4317` and is proxied by Vite under `/api/admin/*`.

The admin surface is local-first and in-memory only: it has no production auth, no database, no persistence, and no public deployment scope. Resetting the admin state returns the simulation to the deterministic observation MVP seed.

## Optional local LLM provider

The backend includes an OpenAI-compatible LLM boundary for local experiments. Core tests use a deterministic fake provider and do not require network access or API keys.

To try a real compatible endpoint locally:

1. Copy `.env.example` to `.env`.
2. Set `ELYSIAN_LLM_BASE_URL`, `ELYSIAN_LLM_MODEL`, and `ELYSIAN_LLM_API_KEY` for your provider.
3. Optionally set `ELYSIAN_LLM_API_MODE=responses` to use the OpenAI Responses-style `/responses` endpoint; the default is `chat_completions`.
4. Keep `.env` local. It is gitignored and must not be committed.

The simulation engine does not call the real provider directly in this MVP. Model calls must go through `src/server/llm/**`, where provider failures, timeouts, refusals, incomplete Responses API statuses, and structured-output validation errors are recorded visibly instead of being converted into fake successful agent behavior. Responses API requests are sent with `store: false` by default from this boundary.

### Persona conversation drafts

The Control tab can generate a private-message reply through the configured OpenAI-compatible provider. The backend builds a bounded context from the selected Persona, current location and action, nearby agents, the last eight conversation messages, and up to five agent-scoped relevant memories.

Generation is sandbox-only and does not mutate the simulation. A user must review the reply, tone, memory importance, and continuation flag before applying it. The reviewed submission is bound to the generated operation, selected agent, original message, and referenced memories; successful operations are single-use. Applying a review writes normal conversation events, conversation state, and linked memory records through the synchronous simulation engine.

Relevant local admin routes:

- `POST /api/admin/llm/conversation-turn` generates and validates a sandbox draft.
- `POST /api/admin/input` applies the reviewed draft with `kind: "conversationTurn"`.
