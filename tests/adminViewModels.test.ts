import test from "node:test";
import assert from "node:assert/strict";

import type { SimulationEvent } from "../src/shared/contracts/index.js";
import { createTimelineItems, groupAgentsByLocation, latestDiagnostics, projectEventDetail } from "../src/app/shared/viewModels.js";
import { createAdminController } from "../src/server/admin/index.js";

const expectedStartupKinds = [
  "world.created",
  "agent.spawned",
  "world.timeAdvanced",
  "agent.startedRoutine",
  "memory.seeded",
] as const;

test("groups agents by backend snapshot locations", () => {
  const state = createAdminController().getState();
  const groups = groupAgentsByLocation(state.snapshot.locations, state.snapshot.agents);

  assert.equal(groups.length, state.snapshot.locations.length);
  assert.deepEqual(
    groups.flatMap((group) => group.agents.map((agent) => agent.id)).sort(),
    state.snapshot.agents.map((agent) => agent.id).sort(),
  );
});

test("creates timeline items with localized user-mode natural event details", () => {
  const state = createAdminController().step();
  const zhItems = createTimelineItems(state.events, state.timeline);
  const enItems = createTimelineItems(state.events, state.timeline, "en");

  assert.equal(zhItems.length, state.events.length);
  assert.equal(zhItems[0]?.entry.id, state.events.at(-1)?.id);
  for (const kind of expectedStartupKinds) {
    assert.ok(zhItems.some((item) => item.event.kind === kind), `${kind} should be projected`);
  }

  assertEventDetail(zhItems, "world.created", /新的世界已经启动/);
  assertEventDetail(zhItems, "agent.spawned", /一位角色已经出现在世界中/);
  assertEventDetail(zhItems, "world.timeAdvanced", /世界时间向前推进/);
  assertEventDetail(zhItems, "agent.startedRoutine", /角色开始执行预设日程/);
  assertEventDetail(zhItems, "memory.seeded", /记忆种子已记录为事件/);

  assert.ok(zhItems.some((item) => item.title.includes("时间推进")));
  assert.ok(enItems.some((item) => item.title.includes("world.timeAdvanced")));
  assertEventDetail(enItems, "world.timeAdvanced", /World time advanced/);
});

test("debug-mode timeline details include key facts for every MVP event kind", () => {
  const controller = createAdminController();
  const stepped = controller.step();
  const accepted = controller.submitInput({
    kind: "observerCommand",
    targetIds: [stepped.snapshot.id],
    payload: { action: "resume" },
  });
  assert.equal(accepted.ok, true);
  const rejected = controller.submitInput({
    kind: "directPrivateMessage",
    targetIds: ["missing_agent"],
    payload: { message: "Hello." },
  });
  assert.equal(rejected.ok, true);

  const items = createTimelineItems(rejected.body.events, rejected.body.timeline, "zh", "debug");

  assertEventDetail(items, "world.created", /种子: mvp-current-roster-v1/);
  assertEventDetail(items, "world.created", /角色数: 3/);
  assertEventDetail(items, "agent.spawned", /人格: elysia/);
  assertEventDetail(items, "agent.spawned", /位置: atrium/);
  assertEventDetail(items, "world.timeAdvanced", /时间倍率: 60/);
  assertEventDetail(items, "world.timeAdvanced", /步进: step_0605_001/);
  assertEventDetail(items, "agent.startedRoutine", /意图: start the configured morning routine/);
  assertEventDetail(items, "realm.interventionSubmitted", /命令: observerCommand/);
  assertEventDetail(items, "realm.interventionSubmitted", /输入: admin_input_001/);
  assertEventDetail(items, "simulation.inputRejected", /输入: admin_input_002/);
  assertEventDetail(items, "simulation.inputRejected", /directPrivateMessage targetIds/);
  assertEventDetail(items, "memory.seeded", /批次: mvp-current-roster-v1:memory-events-only/);
});

test("user-mode timeline details omit debug-style key facts", () => {
  const state = createAdminController().step();
  const items = createTimelineItems(state.events, state.timeline, "zh", "user");

  assertEventDetail(items, "world.timeAdvanced", /世界时间向前推进/);
  assertNoEventDetail(items, "world.timeAdvanced", /时间倍率:/);
  assertNoEventDetail(items, "world.timeAdvanced", /step_0605_001/);
  assertNoEventDetail(items, "memory.seeded", /批次:/);
});

test("unknown event kinds use a safe localized payload fallback", () => {
  const event: SimulationEvent = {
    id: "evt_unknown_001",
    worldId: "world_elysian_observation_mvp",
    stepId: "step_unknown_001",
    time: "2026-05-31T06:00:00.000Z",
    kind: "future.eventKind",
    source: "system",
    targetIds: ["world_elysian_observation_mvp"],
    payload: {
      timeScale: 60,
      customFact: "visible",
    },
  };

  assert.equal(projectEventDetail(event, "zh", "user"), "时间倍率: 60 · customFact: visible");
  assert.equal(projectEventDetail(event, "en", "debug"), "timeScale: 60 · customFact: visible");
});

test("latest diagnostics returns newest rejected input diagnostics first", () => {
  const controller = createAdminController();
  const first = controller.submitInput({ kind: "directPrivateMessage", targetIds: ["missing_1"], payload: { message: "One" } });
  assert.equal(first.ok, true);
  const second = controller.submitInput({ kind: "directPrivateMessage", targetIds: ["missing_2"], payload: { message: "Two" } });
  assert.equal(second.ok, true);

  const diagnostics = latestDiagnostics(second.body.diagnostics);

  assert.equal(diagnostics.length, 2);
  assert.equal(diagnostics[0]?.inputId, "admin_input_002");
  assert.equal(diagnostics[1]?.inputId, "admin_input_001");
});

function assertEventDetail(items: ReturnType<typeof createTimelineItems>, kind: string, pattern: RegExp): void {
  const matchingItems = items.filter((timelineItem) => timelineItem.event.kind === kind);
  assert.ok(matchingItems.length > 0, `${kind} event should exist`);
  assert.ok(
    matchingItems.some((item) => pattern.test(item.detail)),
    `${kind} detail should match ${String(pattern)}`,
  );
}

function assertNoEventDetail(items: ReturnType<typeof createTimelineItems>, kind: string, pattern: RegExp): void {
  const matchingItems = items.filter((timelineItem) => timelineItem.event.kind === kind);
  assert.ok(matchingItems.length > 0, `${kind} event should exist`);
  for (const item of matchingItems) {
    assert.doesNotMatch(item.detail, pattern);
  }
}
