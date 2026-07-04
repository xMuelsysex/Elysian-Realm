import test from "node:test";
import assert from "node:assert/strict";

import type { SimulationEvent } from "../src/shared/contracts/index.js";
import type { AdminDiagnostic } from "../src/server/admin/index.js";
import {
  createAgentDetailViewModel,
  createAgentMemoryStreamViewModel,
  createAgentTickInspectorViewModel,
  createAgentPlanViewModels,
  createDebugExportViewModel,
  createDiagnosticsCenterViewModel,
  createInterventionReceiptViewModel,
  createMemoryViewModel,
  createMessageStreamViewModel,
  createRealmMapViewModel,
  createRelationshipNetworkViewModel,
  createReplayCursorViewModel,
  createStateDiffViewModel,
  createTimelineItems,
  createTopologyViewModel,
  createWorldInspectorViewModel,
  createTimelineTargetFilterForLocation,
  filterRelatedTimelineItems,
  filterTimelineItems,
  findAgentLocation,
  findReplayCursorForEvent,
  findSelectedAgent,
  groupAgentsByLocation,
  latestDiagnostics,
  projectEventDetail,
} from "../src/app/shared/viewModels.js";
import { createAdminController } from "../src/server/admin/index.js";
import { DASHBOARD_TABS, DEFAULT_DASHBOARD_TAB_ID, findDashboardTab, getDashboardTabDescription, getDashboardTabLabel } from "../src/app/realm/dashboardTabs.js";

const expectedStartupKinds = [
  "world.created",
  "agent.spawned",
  "world.timeAdvanced",
  "agent.startedRoutine",
  "memory.seeded",
] as const;

const expectedRoutineProgressionKinds = ["agent.moved", "agent.continuedRoutine"] as const;

test("defines dashboard tab pages with overview as the default", () => {
  assert.equal(DEFAULT_DASHBOARD_TAB_ID, "overview");
  assert.deepEqual(DASHBOARD_TABS.map((tab) => tab.id), ["overview", "map", "agents", "events", "control", "debug"]);
  assert.equal(getDashboardTabLabel("zh", findDashboardTab("map")), "地图");
  assert.equal(getDashboardTabLabel("en", findDashboardTab("control")), "Control");
  assert.match(getDashboardTabDescription("en", findDashboardTab("events")), /timeline/i);
});

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
  assertEventDetail(zhItems, "memory.seeded", /记忆种子已记录为批次事件/);

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
  assertEventDetail(items, "agent.startedRoutine", /意图: make the first visible space feel alive/);
  assertEventDetail(items, "realm.interventionSubmitted", /命令: 观察者命令/);
  assertEventDetail(items, "realm.interventionSubmitted", /输入: admin_input_001/);
  assertEventDetail(items, "simulation.inputRejected", /输入: admin_input_002/);
  assertEventDetail(items, "simulation.inputRejected", /私信目标必须且只能包含一个已知角色编号/);
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

test("timeline projections describe deterministic routine movement events", () => {
  const state = stepControllerTimes(createAdminController(), 72);
  const items = createTimelineItems(state.events, state.timeline, "zh", "debug");

  for (const kind of expectedRoutineProgressionKinds) {
    assert.ok(items.some((item) => item.event.kind === kind), `${kind} should be projected`);
  }
  assertEventDetail(items, "agent.moved", /角色因预设日程移动到了新的地点/);
  assertEventDetail(items, "agent.moved", /到: lounge/);
  assertEventDetail(items, "agent.continuedRoutine", /角色切换到当前时段的预设日程/);
  assertEventDetail(items, "agent.continuedRoutine", /时段: day/);
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

test("finds selected agent and current location from backend snapshot", () => {
  const state = createAdminController().getState();
  const agent = findSelectedAgent(state.snapshot.agents, "agent_elysia");
  const location = findAgentLocation(state.snapshot.locations, agent);

  assert.equal(agent?.displayName, "Elysia");
  assert.equal(location?.id, "atrium");
  assert.equal(findSelectedAgent(state.snapshot.agents, undefined), undefined);
  assert.equal(findSelectedAgent(state.snapshot.agents, "missing_agent"), undefined);
});

test("creates empty and not-found agent detail view models", () => {
  const state = createAdminController().getState();

  const empty = createAgentDetailViewModel(state.snapshot, undefined, []);
  assert.equal(empty.state, "empty");
  assert.deepEqual(empty.relatedEvents, []);
  assert.deepEqual(empty.cooldownEntries, []);

  const notFound = createAgentDetailViewModel(state.snapshot, "missing_agent", []);
  assert.equal(notFound.state, "notFound");
  assert.equal(notFound.selectedAgentId, "missing_agent");
  assert.deepEqual(notFound.relatedEvents, []);
});

test("filters related timeline items by selected agent actor or target", () => {
  const controller = createAdminController();
  const stepped = controller.step();
  const messageResult = controller.submitInput({
    kind: "directPrivateMessage",
    targetIds: ["agent_elysia"],
    payload: { message: "Hello Elysia." },
  });
  assert.equal(messageResult.ok, true);

  const items = createTimelineItems(messageResult.body.events, messageResult.body.timeline, "zh", "debug");
  const related = filterRelatedTimelineItems(items, "agent_elysia", 10);

  assert.ok(stepped.events.some((event) => event.actorId === "agent_elysia"));
  assert.ok(related.some((item) => item.event.actorId === "agent_elysia"));
  assert.ok(related.some((item) => item.event.targetIds.includes("agent_elysia")));
  assert.ok(related.every((item) => item.event.actorId === "agent_elysia" || item.event.targetIds.includes("agent_elysia")));
  assert.equal(filterRelatedTimelineItems(items, undefined).length, 0);
});

test("creates selected agent detail view model with runtime state and capped related events", () => {
  const controller = createAdminController();
  const stepped = controller.step();
  const items = createTimelineItems(stepped.events, stepped.timeline, "zh", "debug");
  const snapshotWithCooldown = {
    ...stepped.snapshot,
    agents: stepped.snapshot.agents.map((agent) =>
      agent.id === "agent_elysia"
        ? {
            ...agent,
            cooldowns: {
              conversation: "2026-05-31T07:00:00.000Z",
              reflection: "2026-05-31T08:00:00.000Z",
            },
          }
        : agent,
    ),
  };

  const viewModel = createAgentDetailViewModel(snapshotWithCooldown, "agent_elysia", items, 2);

  assert.equal(viewModel.state, "selected");
  assert.equal(viewModel.agent?.id, "agent_elysia");
  assert.equal(viewModel.agent?.personaId, "elysia");
  assert.equal(viewModel.location?.id, "atrium");
  assert.deepEqual(viewModel.cooldownEntries, [
    { key: "conversation", value: "2026-05-31T07:00:00.000Z" },
    { key: "reflection", value: "2026-05-31T08:00:00.000Z" },
  ]);
  assert.ok(viewModel.relatedEvents.length > 0);
  assert.ok(viewModel.relatedEvents.length <= 2);
  assert.ok(viewModel.relatedEvents.every((item) => item.event.actorId === "agent_elysia" || item.event.targetIds.includes("agent_elysia")));
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

test("creates agent tick inspector rows with same-step related events", () => {
  const controller = createAdminController();
  const initial = controller.getState();
  const empty = createAgentTickInspectorViewModel(initial, createTimelineItems(initial.events, initial.timeline, "en", "debug"), "en");

  assert.equal(empty.stepId, initial.snapshot.lastStepId);
  assert.deepEqual(empty.rows, []);
  assert.equal(empty.relatedEventCount, 0);

  const state = stepControllerTimes(controller, 72);
  const items = createTimelineItems(state.events, state.timeline, "en", "debug");
  const viewModel = createAgentTickInspectorViewModel(state, items, "en");

  assert.equal(viewModel.stepId, state.snapshot.lastStepId);
  assert.equal(viewModel.rows.length, state.agentTickDiagnostics.length);
  assert.ok(viewModel.rows.every((row) => row.phases.map((phase) => phase.phase).includes("plan")));
  assert.ok(viewModel.rows.some((row) => row.proposal?.intent));

  const rowWithEvents = viewModel.rows.find((row) => row.relatedEvents.length > 0);
  assert.ok(rowWithEvents);
  assert.ok(items.some((item) => item.event.stepId !== state.snapshot.lastStepId && item.event.actorId === rowWithEvents.agentId));
  assert.ok(rowWithEvents.relatedEvents.every((item) => item.event.stepId === state.snapshot.lastStepId));
  assert.ok(rowWithEvents.relatedEvents.every((item) => item.event.actorId === rowWithEvents.agentId || item.event.targetIds.includes(rowWithEvents.agentId)));
});

test("creates grouped agent memory stream view model from real memory records", () => {
  const controller = createAdminController();
  const initial = controller.getState();
  const initialStream = createAgentMemoryStreamViewModel(initial, "en");

  assert.equal(initialStream.total, 3);
  assert.equal(initialStream.groups.length, initial.snapshot.agents.length);
  assert.ok(initialStream.groups.every((group) => group.rows.length === 1));
  assert.ok(initialStream.groups.every((group) => group.rows[0]?.kind === "observation"));

  const state = stepControllerTimes(controller, 72);
  const stream = createAgentMemoryStreamViewModel(state, "en");
  const elysia = stream.groups.find((group) => group.agentId === "agent_elysia");

  assert.equal(stream.total, 6);
  assert.equal(stream.groups.length, state.snapshot.agents.length);
  assert.ok(elysia);
  assert.equal(elysia.displayName, "Elysia");
  assert.deepEqual(elysia.rows.map((row) => row.id), [
    "memory_step_1200_072_agent_elysia_plan",
    "memory_seed_agent_elysia",
  ]);
  assert.equal(elysia.rows[0]?.source, "engine");
  assert.equal(elysia.rows[0]?.kind, "plan");
  assert.equal(elysia.rows[0]?.importance, 4);
  assert.deepEqual(elysia.rows[0]?.sourceIds, ["step_1200_072"]);
  assert.ok(elysia.rows[0]?.tags.includes("performActivity"));
  assert.equal(elysia.rows[0]?.metadata.locationId, "lounge");
  assert.equal(elysia.rows[1]?.source, "seed");
});

test("creates enhanced selected agent detail with configured persona facts and runtime memory index", () => {
  const controller = createAdminController();
  const stepped = controller.step();
  const items = createTimelineItems(stepped.events, stepped.timeline, "zh", "debug");

  const viewModel = createAgentDetailViewModel(stepped.snapshot, "agent_elysia", items, 5, stepped.personas);

  assert.equal(viewModel.persona?.id, "elysia");
  assert.ok(viewModel.configuredFacts.some((fact) => fact.provenance === "configured" && fact.value.includes("温暖的社交引导者")));
  assert.ok(viewModel.longTermGoals.includes("让乐土始终保持情感上的欢迎感"));
  assert.equal(viewModel.runtimeMoodIntent, "make the first visible space feel alive");
  assert.ok(viewModel.recentMemoryIndex.some((memory) => memory.eventId.includes("memory_seeded")));
});

test("filters timeline by keyword kind source agent target and time range", () => {
  const state = createAdminController().step();
  const items = createTimelineItems(state.events, state.timeline, "en", "debug");

  assert.ok(filterTimelineItems(items, { keyword: "memory" }).every((item) => `${item.title} ${item.detail}`.toLocaleLowerCase().includes("memory")));
  assert.equal(filterTimelineItems(items, { kind: "world.timeAdvanced" }).length, 1);
  assert.ok(filterTimelineItems(items, { source: "system" }).length > 0);
  assert.ok(filterTimelineItems(items, { agentId: "agent_elysia" }).every((item) => item.event.actorId === "agent_elysia" || item.event.targetIds.includes("agent_elysia")));
  assert.ok(filterTimelineItems(items, { targetId: "atrium" }).every((item) => item.event.targetIds.includes("atrium")));
  assert.equal(filterTimelineItems(items, { fromTime: "2999-01-01T00:00:00.000Z" }).length, 0);
});

test("creates relationship network rows from persona relationships and timeline interactions", () => {
  const state = createAdminController().step();
  const interactionEvents = Array.from({ length: 6 }, (_, index) => createAgentInteractionEvent(index + 1));
  const items = createTimelineItems(
    [...state.events, ...interactionEvents],
    [...state.timeline, ...interactionEvents.map((event) => ({
      id: event.id,
      stepId: event.stepId,
      time: event.time,
      kind: "agent.startedRoutine" as const,
      source: event.source,
      actorId: event.actorId,
      targetIds: event.targetIds,
      causedByInputId: event.causedByInputId,
    }))],
    "en",
    "debug",
  );

  const rows = createRelationshipNetworkViewModel(state.personas, state.snapshot, items);
  const elysiaToKevin = rows.find((row) => row.sourcePersonaId === "elysia" && row.targetPersonaId === "kevin");

  assert.ok(elysiaToKevin);
  assert.equal(elysiaToKevin.affinity, 7);
  assert.equal(elysiaToKevin.trust, 8);
  assert.equal(elysiaToKevin.grouping, "trusted");
  assert.equal(elysiaToKevin.interactionCount, 6);
  assert.equal(elysiaToKevin.recentInteractions.length, 5);
});

test("creates inspector replay receipt diff plan topology and export models", () => {
  const controller = createAdminController();
  const initial = controller.getState();
  const stepped = controller.step();
  const accepted = controller.submitInput({
    kind: "observerCommand",
    targetIds: [stepped.snapshot.id],
    payload: { action: "resume" },
  });
  assert.equal(accepted.ok, true);

  const items = createTimelineItems(accepted.body.events, accepted.body.timeline, "en", "debug");
  const inspector = createWorldInspectorViewModel(accepted.body);
  const receipt = createInterventionReceiptViewModel(stepped, accepted.body, { kind: "observerCommand", targetIds: [stepped.snapshot.id], payload: { action: "resume" } }, items);
  const replay = createReplayCursorViewModel(accepted.body.replay, items, 0);
  const diagnostics = createDiagnosticsCenterViewModel(accepted.body.diagnostics);
  const diffs = createStateDiffViewModel(initial, accepted.body);
  const plans = createAgentPlanViewModels(accepted.body.snapshot);
  const topology = createTopologyViewModel(accepted.body.snapshot, items);
  const exported = createDebugExportViewModel(accepted.body, items, diagnostics, diffs);

  assert.equal(inspector.worldId, accepted.body.snapshot.id);
  assert.equal(inspector.eventCount, accepted.body.events.length);
  assert.equal(inspector.timelineCount, accepted.body.timeline.length);
  assert.equal(inspector.replayFinalStepId, accepted.body.replay.finalStepId);
  assert.equal(inspector.activeConversations.length, accepted.body.snapshot.activeConversations.length);
  assert.equal(receipt.status, "accepted");
  assert.ok(receipt.resultingEvents.some((item) => item.event.kind === "realm.interventionSubmitted"));
  assert.equal(replay.cursor, 0);
  assert.equal(replay.positionLabel, `1 / ${items.length}`);
  assert.equal(replay.progressPercent, 0);
  assert.ok(replay.selected);
  assert.equal(findReplayCursorForEvent(items, replay.selected.event.id), 0);
  assert.ok(diffs.some((diff) => diff.scope === "world" && diff.field === "status"));
  assert.equal(plans.length, accepted.body.snapshot.agents.length);
  assert.equal(topology.nodes.length, accepted.body.snapshot.locations.length);
  assert.ok(topology.movementPaths.length > 0);
  assert.equal(exported.state.snapshot.id, accepted.body.snapshot.id);
  assert.equal(exported.events.length, accepted.body.events.length);
  assert.equal(exported.replay.finalStepId, accepted.body.replay.finalStepId);
});

test("topology and realm map expose deterministic routine movements from centralized projections", () => {
  const state = stepControllerTimes(createAdminController(), 72);
  const items = createTimelineItems(state.events, state.timeline, "en", "debug");

  const topology = createTopologyViewModel(state.snapshot, items);
  const viewModel = createRealmMapViewModel(state.snapshot, items, "agent_elysia", "lounge", "en");
  const elysia = viewModel.agents.find((agent) => agent.id === "agent_elysia");

  assert.ok(topology.movementPaths.some((path) => path.actorId === "agent_elysia" && path.locationId === "lounge" && path.summary.includes("configured routine")));
  assert.equal(elysia?.locationId, "lounge");
  assert.equal(elysia?.currentIntent, "notice who may need company");
  assert.equal(elysia?.roleLabel, "persona elysia");
  assert.equal(elysia?.relationshipCount, 2);
  assert.equal(elysia?.activitySource, "system");
  assert.ok(elysia?.activityText?.includes("notice who may need company"));
  assert.ok(viewModel.pulses.some((pulse) => pulse.locationId === "lounge" && pulse.label === "agent.moved"));
  assert.ok(viewModel.pulses.some((pulse) => pulse.locationId === "lounge" && pulse.label === "agent.continuedRoutine"));
});

test("creates realm map nodes markers pulses and location target filters", () => {
  const controller = createAdminController();
  const stepped = controller.step();
  const accepted = controller.submitInput({
    kind: "realmEvent",
    targetIds: ["garden"],
    payload: { eventKind: "debug.gathering", description: "Gather near the garden." },
  });
  assert.equal(accepted.ok, true);
  const rejected = controller.submitInput({
    kind: "directPrivateMessage",
    targetIds: ["missing_agent"],
    payload: { message: "Hello." },
  });
  assert.equal(rejected.ok, true);
  const items = createTimelineItems(rejected.body.events, rejected.body.timeline, "en", "debug");

  const viewModel = createRealmMapViewModel(rejected.body.snapshot, items, "agent_elysia", "garden", "en");
  const atrium = viewModel.locations.find((location) => location.id === "atrium");
  const garden = viewModel.locations.find((location) => location.id === "garden");
  const elysia = viewModel.agents.find((agent) => agent.id === "agent_elysia");

  assert.equal(viewModel.locations.length, rejected.body.snapshot.locations.length);
  assert.equal(viewModel.agents.length, rejected.body.snapshot.agents.length);
  assert.ok(viewModel.locations.every((location) => Number.isFinite(location.x) && Number.isFinite(location.y)));
  assert.ok(viewModel.agents.every((agent) => Number.isFinite(agent.xOffset) && Number.isFinite(agent.yOffset)));
  assert.equal(atrium?.x, 50);
  assert.equal(atrium?.y, 42);
  assert.equal(garden?.selected, true);
  assert.equal(garden?.recentEventCount, viewModel.pulses.filter((pulse) => pulse.locationId === "garden").length);
  assert.match(garden?.occupancyLabel ?? "", /agents present/);
  assert.match(garden?.activityLabel ?? "", /recent activit/);
  assert.equal(elysia?.locationId, "atrium");
  assert.equal(elysia?.selected, true);
  assert.ok(elysia?.activityText);
  assert.ok(viewModel.links.some((link) => link.fromLocationId === "atrium" && link.toLocationId === "garden"));
  assert.ok(viewModel.links.every((link) => viewModel.locations.some((location) => location.id === link.fromLocationId) && viewModel.locations.some((location) => location.id === link.toLocationId)));
  assert.ok(viewModel.pulses.some((pulse) => pulse.locationId === "garden" && pulse.source === "user"));
  assert.ok(viewModel.pulses.some((pulse) => pulse.tone === "error"));
  assert.match(viewModel.summary, /locations/);
  assert.equal(createTimelineTargetFilterForLocation({ kind: "world.timeAdvanced" }, "garden").targetId, "garden");
  assert.equal(stepped.snapshot.lastStepId, "step_0605_001");
});

test("realm map assigns deterministic fallback coordinates for unknown future locations", () => {
  const state = createAdminController().getState();
  const snapshot = {
    ...state.snapshot,
    locations: [
      ...state.snapshot.locations,
      { id: "future-room", displayName: "Future Room", description: "A later location." },
    ],
  };

  const viewModel = createRealmMapViewModel(snapshot, [], undefined, "future-room", "en");
  const futureRoom = viewModel.locations.find((location) => location.id === "future-room");

  assert.ok(futureRoom);
  assert.equal(futureRoom.x, 84);
  assert.equal(futureRoom.y, 42);
  assert.equal(futureRoom.selected, true);
});

test("creates rejected receipts diagnostics center memory and message stream projections", () => {
  const controller = createAdminController();
  const stepped = controller.step();
  const message = controller.submitInput({
    kind: "directPrivateMessage",
    targetIds: ["agent_elysia"],
    payload: { message: "Hello Elysia." },
  });
  assert.equal(message.ok, true);
  const rejected = controller.submitInput({
    kind: "directPrivateMessage",
    targetIds: ["missing_agent"],
    payload: { message: "Hello." },
  });
  assert.equal(rejected.ok, true);

  const items = createTimelineItems(rejected.body.events, rejected.body.timeline, "en", "debug");
  const receipt = createInterventionReceiptViewModel(message.body, rejected.body, { kind: "directPrivateMessage", targetIds: ["missing_agent"], payload: { message: "Hello." } }, items);
  const memory = createMemoryViewModel(rejected.body.personas, items, "agent_elysia");
  const threads = createMessageStreamViewModel(items);
  const diagnostics = createDiagnosticsCenterViewModel(rejected.body.diagnostics);

  assert.equal(stepped.snapshot.lastStepId, "step_0605_001");
  assert.equal(receipt.status, "rejected");
  assert.match(receipt.reason ?? "", /私信目标必须且只能包含一个已知角色编号/);
  assert.ok(memory.configuredFacts.some((fact) => fact.provenance === "configured"));
  assert.ok(memory.runtimeMemories.some((runtimeMemory) => runtimeMemory.provenance === "system" || runtimeMemory.provenance === "user"));
  assert.ok(threads.some((thread) => thread.participantIds.includes("agent_elysia")));
  assert.equal(diagnostics.total, 1);
  assert.equal(diagnostics.rejectedInputs[0]?.inputId, "admin_input_002");
});

test("diagnostics center aggregates all diagnostics while limiting latest display", () => {
  const diagnosticsInput = Array.from({ length: 12 }, (_, index) => createDiagnostic(index + 1));

  const diagnostics = createDiagnosticsCenterViewModel(diagnosticsInput);

  assert.equal(diagnostics.total, 12);
  assert.equal(diagnostics.latest.length, 8);
  assert.equal(diagnostics.latest[0]?.id, "diag_012");
  assert.equal(diagnostics.rejectedInputs.length, 6);
  assert.equal(diagnostics.validationErrors.length, 4);
  assert.equal(diagnostics.anomalies.length, 6);
});

function stepControllerTimes(controller: ReturnType<typeof createAdminController>, count: number) {
  let state = controller.getState();
  for (let index = 0; index < count; index += 1) {
    state = controller.step();
  }
  return state;
}

function createAgentInteractionEvent(index: number): SimulationEvent {
  return {
    id: `evt_test_relation_${String(index).padStart(3, "0")}`,
    worldId: "world_elysian_observation_mvp",
    stepId: `step_test_relation_${String(index).padStart(3, "0")}`,
    time: `2026-05-31T06:${String(index).padStart(2, "0")}:00.000Z`,
    kind: "agent.startedRoutine",
    actorId: "agent_elysia",
    targetIds: ["agent_kevin"],
    source: "system",
    payload: {
      routineId: `test.relationship.${index}`,
      locationId: "lounge",
      intent: `interaction ${index}`,
      provenance: "configured",
    },
  };
}

function createDiagnostic(index: number): AdminDiagnostic {
  const padded = String(index).padStart(3, "0");
  return {
    id: `diag_${padded}`,
    level: index % 2 === 0 ? "error" : "warning",
    message: index % 3 === 0 ? `event.payload.test ${index}` : `diagnostic ${index}`,
    inputId: index % 2 === 0 ? `input_${padded}` : undefined,
  };
}

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
