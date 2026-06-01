import type { AdminStateResponse } from "../../server/admin/index.js";
import { Badge } from "../shared/Badge.js";
import { JsonDetails } from "../shared/JsonDetails.js";
import type { AppLanguage } from "../shared/i18n.js";
import { formatDiagnosticLevelLabel, getCopy } from "../shared/i18n.js";
import { latestDiagnostics } from "../shared/viewModels.js";

interface DebugPanelProps {
  language: AppLanguage;
  state: AdminStateResponse;
}

export function DebugPanel({ language, state }: DebugPanelProps) {
  const copy = getCopy(language);
  const diagnostics = latestDiagnostics(state.diagnostics);

  return (
    <section className="panel debug-panel" aria-labelledby="debug-heading">
      <div className="panel-heading">
        <p className="eyebrow">{copy.diagnostics.eyebrow}</p>
        <h2 id="debug-heading">{copy.diagnostics.title}</h2>
      </div>

      <dl className="compact-metrics" aria-label={copy.diagnostics.metricsLabel}>
        <div><dt>{copy.diagnostics.replayEvents}</dt><dd>{state.events.length}</dd></div>
        <div><dt>{copy.diagnostics.finalStep}</dt><dd><code>{state.replay.finalStepId}</code></dd></div>
        <div><dt>{copy.diagnostics.queuedInputs}</dt><dd>{state.snapshot.queuedInputs.length}</dd></div>
      </dl>

      {diagnostics.length === 0 ? (
        <p className="empty-state">{copy.diagnostics.empty}</p>
      ) : (
        <ul className="diagnostic-list">
          {diagnostics.map((diagnostic) => (
            <li key={diagnostic.id}>
              <div className="timeline-row">
                <Badge tone={diagnostic.level === "error" ? "error" : "neutral"}>{formatDiagnosticLevelLabel(language, diagnostic.level)}</Badge>
                <strong>{diagnostic.message}</strong>
              </div>
              <dl className="event-meta">
                {diagnostic.inputId ? <div><dt>{copy.diagnostics.input}</dt><dd><code>{diagnostic.inputId}</code></dd></div> : null}
                {diagnostic.eventId ? <div><dt>{copy.diagnostics.event}</dt><dd><code>{diagnostic.eventId}</code></dd></div> : null}
              </dl>
              {diagnostic.details ? <JsonDetails title={copy.diagnostics.details} value={diagnostic.details} /> : null}
            </li>
          ))}
        </ul>
      )}

      <JsonDetails title={copy.diagnostics.replayJson} value={state.replay} />
      <JsonDetails title={copy.diagnostics.queuedJson} value={state.snapshot.queuedInputs} />
    </section>
  );
}
