import test from "node:test";
import assert from "node:assert/strict";

import {
  formatSimulationAgentDemo,
  runSimulationAgentDemo,
} from "../src/server/demo/simulationAgentDemo.js";

test("simulation agent demo exposes a complete observable tick and reflection result", async () => {
  const result = await runSimulationAgentDemo();

  assert.equal(result.agentId, "agent_demo");
  assert.match(result.observation, /garden/);
  assert.deepEqual(
    result.tick.phases.map((phase) => phase.phase),
    ["perceive", "retrieve", "plan", "act", "remember", "reflect"],
  );
  assert.equal(result.tick.proposal?.kind, "visit");
  assert.equal(result.submittedProposal?.kind, "visit");
  assert.equal(result.retrievedMemories.length, 2);
  assert.ok(result.memoriesAfterTick.some((memory) => memory.kind === "plan"));
  assert.equal(result.reflection.status, "completed");
  assert.equal(result.reflection.persistedRecords.length, 1);
  assert.equal(result.reflection.persistedRecords[0]?.kind, "reflection");
  assert.ok(result.memoriesAfterReflection.some((memory) => memory.kind === "reflection"));
});

test("simulation agent demo formatter includes the visible sections users need", async () => {
  const output = formatSimulationAgentDemo(await runSimulationAgentDemo());

  assert.match(output, /Simulation Agent Demo/);
  assert.match(output, /Agent: agent_demo/);
  assert.match(output, /Retrieved memories:/);
  assert.match(output, /Tick phases:/);
  assert.match(output, /Proposal:/);
  assert.match(output, /Memories after tick:/);
  assert.match(output, /Reflection:/);
  assert.match(output, /Persisted reflection memories:/);
  assert.match(output, /perceive: ran/);
  assert.match(output, /reflect: skipped/);
});
