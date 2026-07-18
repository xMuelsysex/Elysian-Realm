import test from "node:test";
import assert from "node:assert/strict";

import { runAgentCognitiveTickForEngine } from "../src/server/simulation/agentRuntimeAdapter.js";
import { createObservationMvpSnapshot } from "../src/server/simulation/seeds/observationMvpSeed.js";
import { createSimulationEngine, stepSimulationEngine } from "../src/server/simulation/index.js";
import type { PhaseDiagnostic } from "@elysian/simulation-agent";

function findPhase(phases: readonly PhaseDiagnostic[], phase: PhaseDiagnostic["phase"]): PhaseDiagnostic {
  const found = phases.find((entry) => entry.phase === phase);
  assert.ok(found, `expected ${phase} diagnostic`);
  return found;
}

test("engine agent adapter emits a routine proposal without mutating the input snapshot", () => {
  const snapshot = createObservationMvpSnapshot();
  const daySnapshot = {
    ...snapshot,
    currentTime: "2026-05-31T12:00:00.000Z",
    agents: snapshot.agents.map((agent) => ({
      ...agent,
      cooldowns: { ...agent.cooldowns },
      relationshipRefs: [...agent.relationshipRefs],
      currentAction: agent.currentAction ? { ...agent.currentAction } : undefined,
    })),
  };
  const before = JSON.stringify(daySnapshot);

  const result = runAgentCognitiveTickForEngine(daySnapshot, daySnapshot.agents[0]!);

  assert.equal(JSON.stringify(daySnapshot), before);
  assert.equal(result.agentId, "agent_elysia");
  assert.equal(result.activeRoutine?.period, "day");
  assert.equal(result.proposal?.id, "elysia.day.0");
  assert.equal(result.proposal?.kind, "performActivity");
  assert.equal(result.proposal?.locationId, "lounge");
  assert.equal(findPhase(result.phases, "act").status, "ran");
});

test("engine agent adapter skips planning when an operation is already in flight", () => {
  const snapshot = createObservationMvpSnapshot();
  const daySnapshot = {
    ...snapshot,
    currentTime: "2026-05-31T12:00:00.000Z",
    agents: snapshot.agents.map((agent, index) => ({
      ...agent,
      inProgressOperationId: index === 0 ? "op_existing_planner" : agent.inProgressOperationId,
      cooldowns: { ...agent.cooldowns },
      relationshipRefs: [...agent.relationshipRefs],
      currentAction: agent.currentAction ? { ...agent.currentAction } : undefined,
    })),
  };

  const result = runAgentCognitiveTickForEngine(daySnapshot, daySnapshot.agents[0]!);

  assert.equal(result.proposal, undefined);
  assert.equal(result.activeRoutine, undefined);
  const plan = findPhase(result.phases, "plan");
  assert.equal(plan.status, "ran");
  assert.match(plan.detail, /already has in-flight operation/);
  assert.equal(findPhase(result.phases, "act").status, "skipped");
});

test("engine agent adapter records planner failure without fabricating a proposal", () => {
  const snapshot = createObservationMvpSnapshot();
  const before = JSON.stringify(snapshot);

  const result = runAgentCognitiveTickForEngine(snapshot, snapshot.agents[0]!, {
    planning: {
      plan: () => {
        throw new Error("planner failed on purpose");
      },
    },
  });

  assert.equal(JSON.stringify(snapshot), before);
  assert.equal(result.proposal, undefined);
  assert.equal(result.activeRoutine, undefined);
  const plan = findPhase(result.phases, "plan");
  assert.equal(plan.status, "failed");
  assert.match(plan.detail, /planner failed on purpose/);
  assert.equal(findPhase(result.phases, "act").status, "skipped");
});

test("sync engine adapter exposes async-planner misuse as a failed diagnostic", () => {
  const snapshot = createObservationMvpSnapshot();

  const result = runAgentCognitiveTickForEngine(snapshot, snapshot.agents[0]!, {
    planning: {
      plan: async () => ({
        source: "deterministic",
        proposal: {
          id: "async-proposal",
          kind: "wait",
          intent: "should not be accepted by sync tick",
        },
        reason: "async test",
      }),
    },
  });

  assert.equal(result.proposal, undefined);
  const plan = findPhase(result.phases, "plan");
  assert.equal(plan.status, "failed");
  assert.match(plan.detail, /sync cognitive tick received an async plan result/);
});

test("simulation step result exposes agent tick diagnostics without adding events", () => {
  const firstStep = stepSimulationEngine(createSimulationEngine());
  assert.deepEqual(firstStep.agentTickDiagnostics, []);

  const secondStep = stepSimulationEngine(firstStep.state);

  assert.deepEqual(secondStep.events.map((event) => event.kind), ["world.timeAdvanced"]);
  assert.equal(secondStep.agentTickDiagnostics.length, secondStep.state.snapshot.agents.length);
  const elysia = secondStep.agentTickDiagnostics.find((entry) => entry.agentId === "agent_elysia");
  assert.ok(elysia);
  assert.deepEqual(
    elysia.phases.map((entry) => entry.phase),
    ["perceive", "retrieve", "plan", "act", "remember", "reflect"],
  );
  assert.equal(findPhase(elysia.phases, "act").status, "skipped");
  assert.equal(findPhase(elysia.phases, "remember").status, "skipped");
  assert.equal(findPhase(elysia.phases, "reflect").status, "skipped");
});
