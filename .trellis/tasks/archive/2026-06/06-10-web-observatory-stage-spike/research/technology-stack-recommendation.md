# Technology Stack Recommendation

## Context

Elysian Realm is a multi-agent daily-life simulation and observatory project. The core product is not a Unity game: it is an observable world where agents follow routines, remember events, form relationships, hold conversations, and react to user interventions. The visual stage should support that simulation instead of becoming a separate engine-heavy prototype.

## Comparable GitHub Projects

| Project | Similarity | Stack |
| --- | --- | --- |
| `a16z-infra/ai-town` | Closest reference for AI characters that move, chat, and remember in a small town. | `Convex` backend/database/game engine/vector search, `React`, `Pixi.js`, optional `Clerk`, OpenAI-compatible/Ollama/Together models. |
| `joonspk-research/generative_agents` | Original Generative Agents / Smallville reference. | `Python 3.9`, `Django`, OpenAI API, file-backed replay and memory data. |
| `sbenodiz/agent-world` | Smallville-style agent world with MCP integration. | `Django 4.2`, `Channels`, `Daphne`, `FastMCP`, `Phaser.js`, `SQLite`. |
| `jeffliulab/ALICE_PROJECT` | Modern Generative Agents reproduction with browser stage. | `FastAPI`, `React`, `Vite`, `Phaser 3`, `Ollama/Qwen`, `sentence-transformers`, JSON replay. |
| `tsinghua-fib-lab/AgentSociety` | Large-scale urban/social simulation. | `Python`, `Ray`, modular environment/router, REST/Web UI, SQLite replay, MQTT/EMQX in related architecture. |
| `XiaoLuoLYG/GOD` | Local-first agent society control room. | `React`, `Vite`, `FastAPI`, local WebSocket runtime, pixel town/replay, AgentSociety/JiuwenClaw integrations. |
| `jinsoo96/JINXUS` | Virtual office/company agents with collaboration and memory. | `FastAPI`, `LangGraph`, `Next.js 14`, `Zustand`, `Tailwind`, `Redis`, `Qdrant`, `SQLite`. |
| `INOSX/AITeam` | Pixel office with agent conversation and memory panels. | `Next.js App Router`, `React 19`, `TypeScript`, API Routes, `SSE`, `MiniSearch`, Cursor Agent CLI/ACP. |
| `Dhwanil25/Agentis` | Browser-native multi-agent collaboration visualization. | `React`, `TypeScript`, canvas flow graph, `IndexedDB`/`Dexie`, multi-provider LLM calls. |
| `builder-pm/Agent-Lab` | Multi-agent workflow observability/control console. | `Next.js 16`, `React 19`, `Zustand`, `React Flow`, Vercel AI SDK, `SQLite`, `Prisma`, `SSE`. |
| `plasmacat420/langgraph-multi-agent` | LangGraph execution stream reference. | `FastAPI`, `LangGraph`, `SSE`, frontend agent timeline, in-memory task store. |
| `Theepankumargandhi/Multi-Agent-Orchestration` | Production-style LangGraph service template. | `LangGraph`, `FastAPI`, `Streamlit`, `PostgreSQL`/`SQLite`, `ChromaDB`, optional `Redis`. |
| `Brescou/langgraph-agent-stack` | Production LangGraph stack template. | `FastAPI`, LangGraph domain packs, `SSE`, session history, cost/observability, Docker/Helm/Terraform. |
| `01-ai/langcrew` | Higher-level multi-agent framework on LangGraph. | `LangGraph`, crew/task abstractions, React agent UI components, HITL, memory, observability. |
| `alexazhou/TogoAgent` | Multi-agent free group chat with visual console. | Python backend, `Vue 3`, `TypeScript`, realtime collaboration/message stream. |
| `stevenyu113228/multi-agent-chat` | Pure multi-agent chat UI reference. | `React 18`, `TypeScript`, `Vite`, `Zustand`, `Tailwind`, Headless UI, OpenAI-compatible API, `localStorage`. |
| `microsoft/autogen` | Multi-agent conversation framework reference. | `Python`, conversable agents, group chat, tool execution, human-in-the-loop. |
| `langchain-ai/langgraph` | Long-running stateful agent orchestration framework. | Python/JS state graph, durable execution, memory, HITL, LangSmith observability. |
| `ZJU-LLMs/Agent-Kernel` | Large-scale social simulation microkernel. | `Python`, `Ray`, FastAPI/web optional, Redis/asyncpg/Milvus optional, `Vue 3`, `Vite`. |
| `TheJacksonCode/Agent-Architecture` | Lightweight simulation/visualization inspiration only. | Single-file HTML, vanilla JS, Canvas 2D, SVG, CSS/WAAPI. |

## Recommended Direction

- Do not continue investing in Unity for the core MVP; keep Unity work as a visual spike unless a future task explicitly revives it.
- Keep the existing `React + TypeScript + Vite + Node/TypeScript` foundation instead of migrating to Python/FastAPI or Convex immediately.
- Use a web-native 2D stage for visual observability. Prefer `Pixi.js` for the first spike because it is a renderer over backend-owned state; keep `Phaser 3` deferred for tilemap/collision-heavy work.
- Keep React DOM responsible for transcripts, timeline, agent profiles, memories, debug panels, and interventions.
- Use `Sigma.js + Graphology` later for relationship/memory graph side panels, not as the primary world UI.
- Keep the backend centered on a deterministic TypeScript simulation engine plus typed event log.
- Start persistence later with `SQLite + Drizzle` or `SQLite + Prisma`; move to Postgres only when concurrency/deployment requires it.
- Use `SSE` first for timeline/message streaming; add WebSocket only when bidirectional live world control needs it.
- Store conversation messages, summaries, participant metadata, and source event ids in SQL first; add vector search later with `Qdrant`, `LanceDB`, or `Chroma` when memory retrieval needs semantic search.
- Do not introduce LangGraph/CrewAI as the first implementation layer. Build the project-specific conversation service first, then reevaluate orchestration frameworks once the cognitive loop becomes complex.
