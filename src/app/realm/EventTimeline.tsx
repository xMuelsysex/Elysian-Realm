import type { TimelineDetailMode, TimelineItem } from "../shared/viewModels.js";
import { Badge } from "../shared/Badge.js";
import { JsonDetails } from "../shared/JsonDetails.js";
import type { AppLanguage } from "../shared/i18n.js";
import { formatSourceLabel, getCopy } from "../shared/i18n.js";

interface EventTimelineProps {
  detailMode: TimelineDetailMode;
  language: AppLanguage;
  items: TimelineItem[];
  onToggleDetailMode: () => void;
}

export function EventTimeline({ detailMode, language, items, onToggleDetailMode }: EventTimelineProps) {
  const copy = getCopy(language);
  const debugMode = detailMode === "debug";

  return (
    <section className="panel" aria-labelledby="timeline-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{copy.timeline.eyebrow}</p>
          <h2 id="timeline-heading">{copy.timeline.title}</h2>
        </div>
        <button type="button" className="secondary-button" aria-label={copy.timeline.toggleDebugAriaLabel} onClick={onToggleDetailMode}>
          {copy.timeline.debugMode}: {debugMode ? copy.timeline.debugOn : copy.timeline.debugOff}
        </button>
      </div>
      {items.length === 0 ? (
        <p className="empty-state">{copy.timeline.empty}</p>
      ) : (
        <ol className="timeline">
          {items.map((item) => (
            <li key={item.entry.id} className="timeline-item">
              <div className="timeline-row">
                <Badge tone={item.entry.source}>{formatSourceLabel(language, item.entry.source)}</Badge>
                <strong>{item.title}</strong>
              </div>
              <p>{item.detail}</p>
              {debugMode ? (
                <>
                  <dl className="event-meta">
                    <div><dt>{copy.timeline.id}</dt><dd><code>{item.entry.id}</code></dd></div>
                    <div><dt>{copy.timeline.step}</dt><dd><code>{item.entry.stepId}</code></dd></div>
                    <div><dt>{copy.timeline.time}</dt><dd>{item.entry.time}</dd></div>
                    <div><dt>{copy.timeline.targets}</dt><dd>{item.entry.targetIds.join(", ")}</dd></div>
                  </dl>
                  <JsonDetails title={copy.timeline.payloadJson} value={item.event.payload} />
                </>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
