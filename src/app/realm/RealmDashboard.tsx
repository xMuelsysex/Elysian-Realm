import type { AdminStateResponse, SubmitAdminInputRequest } from "../../server/admin/index.js";
import { groupAgentsByLocation, createTimelineItems } from "../shared/viewModels.js";
import type { AppLanguage } from "../shared/i18n.js";
import { getCopy } from "../shared/i18n.js";
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
  const copy = getCopy(language);
  const locationGroups = groupAgentsByLocation(state.snapshot.locations, state.snapshot.agents);
  const timelineItems = createTimelineItems(state.events, state.timeline, language);

  return (
    <main className="dashboard-shell">
      <WorldHeader language={language} snapshot={state.snapshot} eventCount={state.events.length} onToggleLanguage={onToggleLanguage} />
      {error ? <p className="error-banner" role="alert">{error}</p> : null}
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <LocationBoard language={language} groups={locationGroups} />
          <EventTimeline language={language} items={timelineItems} />
        </div>
        <aside className="dashboard-side" aria-label={copy.dashboard.sideLabel}>
          <InterventionPanel language={language} disabled={loading} snapshot={state.snapshot} onStep={onStep} onReset={onReset} onSubmit={onSubmitInput} />
          <DebugPanel language={language} state={state} />
        </aside>
      </div>
    </main>
  );
}
