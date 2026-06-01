import type { LocationGroup } from "../shared/viewModels.js";
import { Badge } from "../shared/Badge.js";
import type { AppLanguage } from "../shared/i18n.js";
import { formatAgentStatusLabel, formatLocationDescription, formatLocationName, getCopy } from "../shared/i18n.js";

interface LocationBoardProps {
  language: AppLanguage;
  groups: LocationGroup[];
}

export function LocationBoard({ language, groups }: LocationBoardProps) {
  const copy = getCopy(language);

  return (
    <section className="panel" aria-labelledby="locations-heading">
      <div className="panel-heading">
        <p className="eyebrow">{copy.locations.eyebrow}</p>
        <h2 id="locations-heading">{copy.locations.title}</h2>
      </div>
      <div className="location-grid">
        {groups.map((group) => (
          <article className="location-card" key={group.location.id}>
            <header>
              <h3>{formatLocationName(language, group.location.id, group.location.displayName)}</h3>
              <code>{group.location.id}</code>
            </header>
            <p>{formatLocationDescription(language, group.location.id, group.location.description)}</p>
            {group.agents.length === 0 ? (
              <p className="muted">{copy.locations.emptyAgents}</p>
            ) : (
              <ul className="agent-list">
                {group.agents.map((agent) => (
                  <li key={agent.id}>
                    <strong>{agent.displayName}</strong>
                    <span>{agent.id}</span>
                    <Badge tone="agent">{formatAgentStatusLabel(language, agent.status)}</Badge>
                    <small>{copy.locations.relationships}: {agent.relationshipRefs.join(", ") || copy.locations.none}</small>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
