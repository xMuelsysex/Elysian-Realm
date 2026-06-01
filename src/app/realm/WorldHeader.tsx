import type { WorldSnapshot } from "../../shared/contracts/index.js";
import { Badge } from "../shared/Badge.js";
import type { AppLanguage } from "../shared/i18n.js";
import { formatWorldStatusLabel, getCopy } from "../shared/i18n.js";

interface WorldHeaderProps {
  language: AppLanguage;
  snapshot: WorldSnapshot;
  eventCount: number;
  onToggleLanguage: () => void;
}

export function WorldHeader({ language, snapshot, eventCount, onToggleLanguage }: WorldHeaderProps) {
  const copy = getCopy(language);

  return (
    <section className="panel world-header" aria-labelledby="world-heading">
      <div className="top-bar">
        <div>
          <p className="eyebrow">{copy.app.eyebrow}</p>
          <h1 id="world-heading">{copy.app.title}</h1>
        </div>
        <button type="button" className="secondary-button" aria-label={copy.language.toggleAriaLabel} onClick={onToggleLanguage}>
          {copy.language.toggleButton}
        </button>
      </div>
      <dl className="metric-grid" aria-label={copy.world.metricsLabel}>
        <div>
          <dt>{copy.world.world}</dt>
          <dd>{snapshot.id}</dd>
        </div>
        <div>
          <dt>{copy.world.status}</dt>
          <dd><Badge tone={snapshot.status === "running" ? "success" : "neutral"}>{formatWorldStatusLabel(language, snapshot.status)}</Badge></dd>
        </div>
        <div>
          <dt>{copy.world.time}</dt>
          <dd>{snapshot.currentTime}</dd>
        </div>
        <div>
          <dt>{copy.world.timeScale}</dt>
          <dd>{snapshot.timeScale}</dd>
        </div>
        <div>
          <dt>{copy.world.lastStep}</dt>
          <dd>{snapshot.lastStepId}</dd>
        </div>
        <div>
          <dt>{copy.world.events}</dt>
          <dd>{eventCount}</dd>
        </div>
      </dl>
    </section>
  );
}
