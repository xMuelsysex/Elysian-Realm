import { useState } from "react";
import type { AdminStateResponse, SubmitAdminInputRequest } from "../../server/admin/index.js";
import { createAgentDetailViewModel, groupAgentsByLocation, createTimelineItems, type TimelineDetailMode } from "../shared/viewModels.js";
import type { AppLanguage } from "../shared/i18n.js";
import { getCopy } from "../shared/i18n.js";
import { AgentDetailPanel } from "../agents/AgentDetailPanel.js";
import { DebugPanel } from "../diagnostics/DebugPanel.js";
import { InterventionPanel } from "../interventions/InterventionPanel.js";
import { EventTimeline } from "./EventTimeline.js";
import { LocationBoard } from "./LocationBoard.js";
import { WorldHeader } from "./WorldHeader.js";

interface RealmDashboardProps {
  language: AppLanguage;
  state: AdminStateResponse;
  loading: boolean;
  error?: string;
  onToggleLanguage: () => void;
  onStep: () => Promise<void>;
  onReset: () => Promise<void>;
  onSubmitInput: (input: SubmitAdminInputRequest) => Promise<void>;
}

export function RealmDashboard({ language, state, loading, error, onToggleLanguage, onStep, onReset, onSubmitInput }: RealmDashboardProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>();
  const [timelineDetailMode, setTimelineDetailMode] = useState<TimelineDetailMode>("user");
  const copy = getCopy(language);
  const locationGroups = groupAgentsByLocation(state.snapshot.locations, state.snapshot.agents);
  const timelineItems = createTimelineItems(state.events, state.timeline, language, timelineDetailMode);
  const agentDetailViewModel = createAgentDetailViewModel(state.snapshot, selectedAgentId, timelineItems);
  const toggleTimelineDetailMode = () => setTimelineDetailMode((mode) => (mode === "user" ? "debug" : "user"));

  return (
    <main className="dashboard-shell">
      <WorldHeader language={language} snapshot={state.snapshot} eventCount={state.events.length} onToggleLanguage={onToggleLanguage} />
      {error ? <p className="error-banner" role="alert">{error}</p> : null}
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <LocationBoard language={language} groups={locationGroups} selectedAgentId={selectedAgentId} onSelectAgent={setSelectedAgentId} />
          <AgentDetailPanel language={language} viewModel={agentDetailViewModel} />
          <EventTimeline
            detailMode={timelineDetailMode}
            language={language}
            items={timelineItems}
            onToggleDetailMode={toggleTimelineDetailMode}
          />
        </div>
        <aside className="dashboard-side" aria-label={copy.dashboard.sideLabel}>
          <InterventionPanel language={language} disabled={loading} snapshot={state.snapshot} onStep={onStep} onReset={onReset} onSubmit={onSubmitInput} />
          <DebugPanel language={language} state={state} />
        </aside>
      </div>
    </main>
  );
}
