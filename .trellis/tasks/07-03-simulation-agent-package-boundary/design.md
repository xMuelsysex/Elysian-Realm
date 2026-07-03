# Package Simulation Agent Framework Boundary - Design

## 1. Boundary Objective

M1 establishes a real package boundary for the existing framework seed. It should not change framework behavior beyond import/package mechanics.

The package boundary is successful only if:

- package source has no Elysian imports;
- Elysian consumes only the package public entrypoint;
- package tests validate behavior through public exports;
- existing Elysian simulation tests stay green.

## 2. Package Layout

Target layout:

```text
packages/simulation-agent/
  package.json
  tsconfig.json
  src/
    index.ts
    loop/
      cognitiveLoop.ts
    diagnostics/
      diagnostics.ts
    ports/
      ports.ts
```

M1 moves current files mechanically:

```text
src/agent-core/cognitiveLoop.ts -> packages/simulation-agent/src/loop/cognitiveLoop.ts
src/agent-core/diagnostics.ts   -> packages/simulation-agent/src/diagnostics/diagnostics.ts
src/agent-core/ports.ts         -> packages/simulation-agent/src/ports/ports.ts
src/agent-core/index.ts         -> packages/simulation-agent/src/index.ts
```

Internal import paths update accordingly.

## 3. Package Manifest

`packages/simulation-agent/package.json` should define:

- `"name": "@elysian/simulation-agent"`
- `"version": "0.1.0"`
- `"private": true`
- `"type": "module"`
- `"main": "./dist/index.js"`
- `"types": "./dist/index.d.ts"`
- `"exports"` with `"."` only for M1.

M1 should not expose deep subpath exports. Deep exports can be promoted later only when intentionally designed.

## 4. Workspace Mechanics

Root `package.json` should add npm workspaces:

```json
"workspaces": [
  "packages/*"
]
```

Root should depend on the package through the workspace/local package mechanism validated by npm in this repository.

Preferred dependency:

```json
"@elysian/simulation-agent": "workspace:*"
```

If npm in this environment rejects `workspace:*`, use the npm-supported local workspace link form that passes `npm install`, and record the reason in the implementation notes.

## 5. TypeScript Build Shape

Package `tsconfig.json` should:

- use NodeNext-compatible ESM;
- emit declarations;
- emit package build output under `packages/simulation-agent/dist`;
- include only `packages/simulation-agent/src/**/*.ts`;
- avoid importing root app files.

Root build scripts should compile package code before compiling app/server code.

Acceptable M1 script shape:

```json
"build:packages": "tsc -p packages/simulation-agent/tsconfig.json",
"build:server": "npm run build:packages && tsc"
```

If a different script arrangement is simpler and keeps `npm test` green, it is acceptable.

## 6. Elysian Integration

`src/server/simulation/agentRuntimeAdapter.ts` should import framework APIs from the package entrypoint:

```ts
import {
  runCognitiveTickSync,
  type CognitiveLoopDeps,
  type PhaseDiagnostic,
  type PlanningPort,
} from "@elysian/simulation-agent";
```

The adapter remains Elysian-owned and keeps all imports of:

- `WorldSnapshot`
- `AgentRuntimeState`
- `PlanAction`
- `pilotPersonas`
- routine fallback helpers

The package must not learn these types.

## 7. Tests

M1 test strategy:

- Keep Elysian adapter tests in root `tests/`.
- Move or rewrite loop tests so they import from `@elysian/simulation-agent`.
- It is acceptable for root `npm test` to run package tests after build, as long as they remain offline and deterministic.

Do not introduce a separate test runner unless the root command remains simple and green.

## 8. Boundary Checks

Run these checks during implementation:

```bash
rg -n "src/server|src/shared|src/app|\\.\\./\\.\\./src" packages/simulation-agent/src
rg -n "packages/simulation-agent/src|@elysian/simulation-agent/src" src tests
rg -n "from \"\\.\\./src/agent-core|from \"\\.\\./\\.\\./agent-core|src/agent-core" src tests packages
```

Expected:

- first command finds no package imports of app code;
- second command finds no deep imports into package internals;
- third command finds no stale `src/agent-core` imports.

## 9. Non-Goals

- No memory contracts beyond existing `MemoryPort`.
- No in-memory memory store.
- No retrieval scoring.
- No reflection implementation.
- No provider adapter.
- No package publish step.
