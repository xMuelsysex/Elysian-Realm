import { Badge } from "../shared/Badge.js";
import type { AppLanguage } from "../shared/i18n.js";
import { formatSourceLabel } from "../shared/i18n.js";
import type { RealmMapAgentMarker, RealmMapEventPulse, RealmMapLocationNode, RealmMapViewModel } from "../shared/viewModels.js";

interface RealmMapPanelProps {
  language: AppLanguage;
  viewModel: RealmMapViewModel;
  onSelectAgent: (agentId: string) => void;
  onSelectLocation: (locationId: string) => void;
}

export function RealmMapPanel({ language, viewModel, onSelectAgent, onSelectLocation }: RealmMapPanelProps) {
  return (
    <section className="panel realm-map-panel" aria-labelledby="realm-map-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{language === "zh" ? "像素地图" : "Pixel map"}</p>
          <h2 id="realm-map-heading">{language === "zh" ? "乐土 2D 地图" : "2D Realm map"}</h2>
        </div>
        <span className="realm-map-mode">{language === "zh" ? "后端快照投影" : "Backend snapshot projection"}</span>
      </div>

      <p className="realm-map-summary">{viewModel.summary}</p>

      <div className="realm-map-board" role="group" aria-label={language === "zh" ? "位置与角色地图" : "Location and agent map"}>
        <div className="realm-map-links" aria-hidden="true">
          {viewModel.links.map((link) => {
            const from = viewModel.locations.find((location) => location.id === link.fromLocationId);
            const to = viewModel.locations.find((location) => location.id === link.toLocationId);
            if (!from || !to) return null;
            return <MapLink key={`${link.fromLocationId}:${link.toLocationId}`} from={from} to={to} />;
          })}
        </div>

        {viewModel.locations.map((location) => (
          <MapLocation
            key={location.id}
            language={language}
            location={location}
            agents={viewModel.agents.filter((agent) => agent.locationId === location.id)}
            pulses={viewModel.pulses.filter((pulse) => pulse.locationId === location.id && (pulse.source !== "system" || pulse.tone === "error")).slice(0, 3)}
            onSelectAgent={onSelectAgent}
            onSelectLocation={onSelectLocation}
          />
        ))}
      </div>

      <div className="realm-map-text-fallback" aria-label={language === "zh" ? "地图文本摘要" : "Map text summary"}>
        <h3>{language === "zh" ? "当前占用" : "Current occupancy"}</h3>
        <ul>
          {viewModel.locations.map((location) => {
            const agents = viewModel.agents.filter((agent) => agent.locationId === location.id);
            return (
              <li key={`${location.id}:summary`}>
                <strong>{location.displayName}</strong>: {agents.length > 0 ? agents.map((agent) => agent.displayName).join(", ") : (language === "zh" ? "暂无角色" : "no agents")}
                {location.selected ? <span className="selected-marker"> · {language === "zh" ? "已选地点" : "selected location"}</span> : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function MapLocation({ language, location, agents, pulses, onSelectAgent, onSelectLocation }: {
  language: AppLanguage;
  location: RealmMapLocationNode;
  agents: RealmMapAgentMarker[];
  pulses: RealmMapEventPulse[];
  onSelectAgent: (agentId: string) => void;
  onSelectLocation: (locationId: string) => void;
}) {
  return (
    <div className="realm-map-location-wrap" style={{ left: `${location.x}%`, top: `${location.y}%` }}>
      <button
        type="button"
        className={location.selected ? "realm-map-location realm-map-location--selected" : "realm-map-location"}
        aria-pressed={location.selected}
        aria-label={`${language === "zh" ? "选择地点" : "Select location"}: ${location.displayName}`}
        onClick={() => onSelectLocation(location.id)}
      >
        <span className="realm-map-location-title">{location.displayName}</span>
        <span className="realm-map-location-code">{location.id}</span>
        <span className="realm-map-location-count">{location.occupancyLabel}</span>
        <span className="realm-map-location-activity">{location.activityLabel}</span>
        {location.selected ? <span className="realm-map-selected-text">{language === "zh" ? "已选地点" : "Selected location"}</span> : null}
      </button>

      <div className="realm-map-agents" aria-label={language === "zh" ? `${location.displayName} 的角色` : `Agents in ${location.displayName}`}>
        {agents.map((agent) => (
          <button
            type="button"
            className={agent.selected ? "realm-map-agent realm-map-agent--selected" : "realm-map-agent"}
            key={agent.id}
            style={{ transform: `translate(${agent.xOffset}px, ${agent.yOffset}px)` }}
            aria-pressed={agent.selected}
            aria-label={`${language === "zh" ? "选择角色" : "Select agent"}: ${agent.displayName}; ${language === "zh" ? "状态" : "status"}: ${agent.status}`}
            onClick={() => onSelectAgent(agent.id)}
            title={agent.currentIntent ?? agent.status}
          >
            <span className="realm-map-agent-face" aria-hidden="true">{createAgentInitials(agent.displayName)}</span>
            <span className="realm-map-agent-name">{agent.displayName}</span>
            <span className="realm-map-agent-role">{agent.roleLabel}</span>
            <span className="realm-map-agent-status">{agent.status} · {language === "zh" ? "关系" : "rels"}: {agent.relationshipCount}</span>
            {agent.activityText ? (
              <span className="realm-map-agent-bubble">
                <Badge tone={agent.activitySource}>{formatSourceLabel(language, agent.activitySource)}</Badge>
                <span>{agent.activityText}</span>
              </span>
            ) : null}
            {agent.selected ? <span className="realm-map-selected-text">{language === "zh" ? "已选角色" : "Selected agent"}</span> : null}
          </button>
        ))}
      </div>

      <div className="realm-map-pulses" aria-hidden="true">
        {pulses.map((pulse) => <MapPulse key={pulse.id} pulse={pulse} language={language} />)}
      </div>
    </div>
  );
}

function MapPulse({ pulse, language }: { pulse: RealmMapEventPulse; language: AppLanguage }) {
  return (
    <div className={`realm-map-pulse realm-map-pulse--${pulse.tone}`} title={`${pulse.label}: ${pulse.summary}`}>
      <Badge tone={pulse.tone}>{pulse.tone === "error" ? (language === "zh" ? "错误" : "error") : formatSourceLabel(language, pulse.source)}</Badge>
      <span>{pulse.label}</span>
    </div>
  );
}

function MapLink({ from, to }: { from: RealmMapLocationNode; to: RealmMapLocationNode }) {
  const x1 = from.x;
  const y1 = from.y;
  const x2 = to.x;
  const y2 = to.y;
  const length = Math.hypot(x2 - x1, y2 - y1);
  const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
  return (
    <span
      className="realm-map-link"
      style={{
        left: `${x1}%`,
        top: `${y1}%`,
        width: `${length}%`,
        transform: `rotate(${angle}deg)`,
      }}
    />
  );
}

function createAgentInitials(displayName: string): string {
  const letters = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2);
  return letters || displayName.slice(0, 1) || "?";
}
