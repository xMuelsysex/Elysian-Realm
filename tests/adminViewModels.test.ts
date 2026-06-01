import test from "node:test";
import assert from "node:assert/strict";

import { createTimelineItems, groupAgentsByLocation, latestDiagnostics } from "../src/app/shared/viewModels.js";
import { createAdminController } from "../src/server/admin/index.js";

test("groups agents by backend snapshot locations", () => {
  const state = createAdminController().getState();
  const groups = groupAgentsByLocation(state.snapshot.locations, state.snapshot.agents);

  assert.equal(groups.length, state.snapshot.locations.length);
  assert.deepEqual(
    groups.flatMap((group) => group.agents.map((agent) => agent.id)).sort(),
    state.snapshot.agents.map((agent) => agent.id).sort(),
  );
});

test("creates timeline items from centralized localized event payload formatting", () => {
  const state = createAdminController().step();
  const zhItems = createTimelineItems(state.events, state.timeline);
  const enItems = createTimelineItems(state.events, state.timeline, "en");

  assert.equal(zhItems.length, state.events.length);
  assert.equal(zhItems[0]?.entry.id, state.events.at(-1)?.id);
  assert.ok(zhItems.some((item) => item.title.includes("时间推进")));
  assert.ok(zhItems.some((item) => item.detail.includes("时间倍率: 60")));
  assert.ok(enItems.some((item) => item.title.includes("world.timeAdvanced")));
  assert.ok(enItems.some((item) => item.detail.includes("timeScale: 60")));
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
