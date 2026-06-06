import { useEffect, useMemo, useState } from "react";
import type { AdminStateResponse, SubmitAdminInputRequest } from "../../server/admin/index.js";
import {
  createAgentDetailViewModel,
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
  filterTimelineItems,
  findReplayCursorForEvent,
  groupAgentsByLocation,
  type TimelineDetailMode,
  type TimelineFilters,
} from "../shared/viewModels.js";
import type { AppLanguage } from "../shared/i18n.js";
import { formatAgentDisplayName } from "../shared/i18n.js";
import { AgentDetailPanel } from "../agents/AgentDetailPanel.js";
import { DebugPanel } from "../diagnostics/DebugPanel.js";
import { InterventionPanel } from "../interventions/InterventionPanel.js";
import { LlmRuntimeConfigPanel } from "../llm/LlmRuntimeConfigPanel.js";
import { EventTimeline } from "./EventTimeline.js";
import { LocationBoard } from "./LocationBoard.js";
import { RealmMapPanel } from "./RealmMapPanel.js";
import {
  AgentPlanPanel,
  DebugExportPanel,
  DiagnosticsCenter,
  LocationTopology,
  MemoryView,
  MessageStreamPanel,
  PersonaReadOnlyPanel,
  ReceiptPanel,
  RelationshipNetwork,
  ReplayPanel,
  StateDiffPanel,
  WorldInspector,
} from "./ObservabilityPanels.js";
import { WorldHeader } from "./WorldHeader.js";
import {
  DASHBOARD_TABS,
  DEFAULT_DASHBOARD_TAB_ID,
  findDashboardTab,
  getDashboardTabDescription,
  getDashboardTabLabel,
  type DashboardTabId,
} from "./dashboardTabs.js";

interface RealmDashboardProps {
  language: AppLanguage;
  state: AdminStateResponse;
  previousState?: AdminStateResponse;
  lastSubmittedInput?: SubmitAdminInputRequest;
  loading: boolean;
  error?: string;
  onToggleLanguage: () => void;
  onStep: () => Promise<void>;
  onReset: () => Promise<void>;
  onSubmitInput: (input: SubmitAdminInputRequest) => Promise<void>;
}

export function RealmDashboard({
  language,
  state,
  previousState,
  lastSubmittedInput,
  loading,
  error,
  onToggleLanguage,
  onStep,
  onReset,
  onSubmitInput,
}: RealmDashboardProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>();
  const [selectedLocationId, setSelectedLocationId] = useState<string>();
  const [selectedEventId, setSelectedEventId] = useState<string>();
  const [timelineDetailMode, setTimelineDetailMode] = useState<TimelineDetailMode>("user");
  const [timelineFilters, setTimelineFilters] = useState<TimelineFilters>({});
  const [replayCursor, setReplayCursor] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [autoStep, setAutoStep] = useState(false);
  const [exportedAt, setExportedAt] = useState<string>();
  const [activeTab, setActiveTab] = useState<DashboardTabId>(DEFAULT_DASHBOARD_TAB_ID);

  const timelineItems = useMemo(
    () => createTimelineItems(state.events, state.timeline, language, timelineDetailMode),
    [state.events, state.timeline, language, timelineDetailMode],
  );
  const filteredTimelineItems = useMemo(() => filterTimelineItems(timelineItems, timelineFilters), [timelineItems, timelineFilters]);
  const locationGroups = groupAgentsByLocation(state.snapshot.locations, state.snapshot.agents);
  const realmMap = useMemo(
    () => createRealmMapViewModel(state.snapshot, timelineItems, selectedAgentId, selectedLocationId, language),
    [state.snapshot, timelineItems, selectedAgentId, selectedLocationId, language],
  );
  const agentDetailViewModel = createAgentDetailViewModel(state.snapshot, selectedAgentId, timelineItems, undefined, state.personas, language);
  const relationshipRows = createRelationshipNetworkViewModel(state.personas, state.snapshot, timelineItems, language);
  const worldInspector = createWorldInspectorViewModel(state);
  const receipt = createInterventionReceiptViewModel(previousState, state, lastSubmittedInput, timelineItems, language);
  const replay = createReplayCursorViewModel(state.replay, timelineItems, replayCursor);
  const memory = createMemoryViewModel(state.personas, timelineItems, selectedAgentId, language);
  const messages = createMessageStreamViewModel(timelineItems, language);
  const diagnostics = createDiagnosticsCenterViewModel(state.diagnostics);
  const diffs = createStateDiffViewModel(previousState, state);
  const plans = createAgentPlanViewModels(state.snapshot, language);
  const topology = createTopologyViewModel(state.snapshot, timelineItems);
  const exportViewModel = createDebugExportViewModel(state, timelineItems, diagnostics, diffs);
  const kindOptions = [...new Set(state.events.map((event) => event.kind))].sort();
  const sourceOptions = [...new Set(state.events.map((event) => event.source))].sort();
  const toggleTimelineDetailMode = () => setTimelineDetailMode((mode) => (mode === "user" ? "debug" : "user"));

  useEffect(() => {
    if (!autoStep || loading) return undefined;
    const id = window.setInterval(() => {
      void onStep();
    }, 2000);
    return () => window.clearInterval(id);
  }, [autoStep, loading, onStep]);

  useEffect(() => {
    if (!replayPlaying || loading) return undefined;
    const id = window.setInterval(() => {
      setReplayCursor((current) => Math.min(current + 1, Math.max(timelineItems.length - 1, 0)));
    }, Math.max(80, Math.round(1200 / replaySpeed)));
    return () => window.clearInterval(id);
  }, [replayPlaying, replaySpeed, timelineItems.length, loading]);

  useEffect(() => {
    if (timelineItems.length === 0) {
      setReplayCursor(0);
      setReplayPlaying(false);
      return;
    }
    setReplayCursor((current) => Math.min(current, timelineItems.length - 1));
  }, [timelineItems.length]);

  useEffect(() => {
    if (replayPlaying && replayCursor >= Math.max(timelineItems.length - 1, 0)) {
      setReplayPlaying(false);
    }
  }, [replayPlaying, replayCursor, timelineItems.length]);

  const jumpReplayCursor = (cursor: number) => {
    if (!Number.isFinite(cursor)) return;
    const nextCursor = Math.max(0, Math.min(cursor, Math.max(timelineItems.length - 1, 0)));
    setReplayCursor(nextCursor);
    const selectedReplay = createReplayCursorViewModel(state.replay, timelineItems, nextCursor).selected;
    if (selectedReplay) setSelectedEventId(selectedReplay.event.id);
  };

  const selectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    const cursor = findReplayCursorForEvent(timelineItems, eventId);
    if (cursor !== undefined) setReplayCursor(cursor);
  };

  const selectLocation = (locationId: string) => {
    setSelectedLocationId(locationId);
    setTimelineFilters((filters) => createTimelineTargetFilterForLocation(filters, locationId));
  };

  const exportDebugState = () => {
    const generatedAt = new Date().toISOString();
    const blob = new Blob([JSON.stringify({ ...exportViewModel, generatedAt }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `elysian-realm-debug-${state.snapshot.lastStepId}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setExportedAt(generatedAt);
  };

  const activeTabDefinition = findDashboardTab(activeTab);
  const agentOptions = state.snapshot.agents.map((agent) => ({ id: agent.id, displayName: formatAgentDisplayName(language, agent.id, agent.displayName) }));
  const timeline = (
    <EventTimeline
      detailMode={timelineDetailMode}
      language={language}
      items={filteredTimelineItems}
      filters={timelineFilters}
      agentOptions={agentOptions}
      kindOptions={kindOptions}
      sourceOptions={sourceOptions}
      selectedEventId={selectedEventId}
      onFiltersChange={setTimelineFilters}
      onSelectEvent={selectEvent}
      onToggleDetailMode={toggleTimelineDetailMode}
    />
  );

  return (
    <main className="dashboard-shell">
      <WorldHeader language={language} snapshot={state.snapshot} eventCount={state.events.length} onToggleLanguage={onToggleLanguage} />
      {error ? <p className="error-banner" role="alert">{error}</p> : null}

      <nav className="dashboard-tabs" aria-label={language === "zh" ? "管理台子页面" : "Dashboard pages"} role="tablist">
        {DASHBOARD_TABS.map((tab) => {
          const selected = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              id={`dashboard-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`dashboard-tabpanel-${tab.id}`}
              className={selected ? "dashboard-tab dashboard-tab--active" : "dashboard-tab"}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{getDashboardTabLabel(language, tab)}</span>
              <small>{getDashboardTabDescription(language, tab)}</small>
            </button>
          );
        })}
      </nav>

      <section
        id={`dashboard-tabpanel-${activeTab}`}
        className="dashboard-tab-page"
        role="tabpanel"
        aria-labelledby={`dashboard-tab-${activeTab}`}
      >
        <header className="dashboard-tab-heading">
          <p className="eyebrow">{language === "zh" ? "当前子页面" : "Current page"}</p>
          <h2>{getDashboardTabLabel(language, activeTabDefinition)}</h2>
          <p>{getDashboardTabDescription(language, activeTabDefinition)}</p>
        </header>

        {activeTab === "overview" ? (
          <div className="dashboard-page-grid dashboard-page-grid--balanced">
            <WorldInspector language={language} viewModel={worldInspector} />
            <ReceiptPanel language={language} receipt={receipt} />
            <DiagnosticsCenter language={language} viewModel={diagnostics} />
            <StateDiffPanel language={language} diffs={diffs} />
          </div>
        ) : null}

        {activeTab === "map" ? (
          <div className="dashboard-page-stack">
            <RealmMapPanel language={language} viewModel={realmMap} onSelectAgent={setSelectedAgentId} onSelectLocation={selectLocation} />
            <div className="dashboard-page-grid dashboard-page-grid--balanced">
              <LocationTopology language={language} viewModel={topology} />
              <LocationBoard language={language} groups={locationGroups} selectedAgentId={selectedAgentId} onSelectAgent={setSelectedAgentId} />
            </div>
          </div>
        ) : null}

        {activeTab === "agents" ? (
          <div className="dashboard-page-stack">
            <AgentDetailPanel language={language} viewModel={agentDetailViewModel} />
            <div className="dashboard-page-grid dashboard-page-grid--balanced">
              <RelationshipNetwork language={language} rows={relationshipRows} />
              <AgentPlanPanel language={language} plans={plans} />
              <MemoryView language={language} viewModel={memory} />
              <MessageStreamPanel language={language} threads={messages} />
              <PersonaReadOnlyPanel language={language} personas={state.personas} />
            </div>
          </div>
        ) : null}

        {activeTab === "events" ? (
          <div className="dashboard-page-stack">
            {timeline}
            <ReplayPanel
              language={language}
              viewModel={replay}
              replayPlaying={replayPlaying}
              replaySpeed={replaySpeed}
              autoStep={autoStep}
              onReplayPlayingChange={setReplayPlaying}
              onReplaySpeedChange={setReplaySpeed}
              onAutoStepChange={setAutoStep}
              onCursorChange={jumpReplayCursor}
            />
          </div>
        ) : null}

        {activeTab === "control" ? (
          <div className="dashboard-page-grid dashboard-page-grid--balanced">
            <InterventionPanel language={language} disabled={loading} snapshot={state.snapshot} onStep={onStep} onReset={onReset} onSubmit={onSubmitInput} />
            <LlmRuntimeConfigPanel language={language} disabled={loading} agents={agentOptions} selectedAgentId={selectedAgentId} onSelectAgent={setSelectedAgentId} onSubmitInput={onSubmitInput} />
          </div>
        ) : null}

        {activeTab === "debug" ? (
          <div className="dashboard-page-stack">
            <DebugExportPanel language={language} viewModel={exportViewModel} onExport={exportDebugState} exportedAt={exportedAt} />
            <DebugPanel language={language} state={state} />
          </div>
        ) : null}
      </section>
    </main>
  );
}
