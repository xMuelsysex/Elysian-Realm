import type { EventSource } from "../../shared/domain/index.js";
import type { TimelineDetailMode, TimelineFilters, TimelineItem } from "../shared/viewModels.js";
import { Badge } from "../shared/Badge.js";
import { JsonDetails } from "../shared/JsonDetails.js";
import type { AppLanguage } from "../shared/i18n.js";
import { formatEventKindLabel, formatSourceLabel, getCopy } from "../shared/i18n.js";

interface EventTimelineProps {
  detailMode: TimelineDetailMode;
  language: AppLanguage;
  items: TimelineItem[];
  filters: TimelineFilters;
  agentOptions: readonly { id: string; displayName: string }[];
  kindOptions: readonly string[];
  sourceOptions: readonly EventSource[];
  selectedEventId?: string;
  onFiltersChange: (filters: TimelineFilters) => void;
  onSelectEvent: (eventId: string) => void;
  onToggleDetailMode: () => void;
}

export function EventTimeline({
  detailMode,
  language,
  items,
  filters,
  agentOptions,
  kindOptions,
  sourceOptions,
  selectedEventId,
  onFiltersChange,
  onSelectEvent,
  onToggleDetailMode,
}: EventTimelineProps) {
  const copy = getCopy(language);
  const debugMode = detailMode === "debug";
  const selectedItem = items.find((item) => item.event.id === selectedEventId) ?? items[0];

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

      <fieldset className="filter-grid">
        <legend>{language === "zh" ? "筛选与搜索" : "Filters and search"}</legend>
        <label>
          {language === "zh" ? "关键词" : "Keyword"}
          <input value={filters.keyword ?? ""} onChange={(event) => onFiltersChange({ ...filters, keyword: event.target.value })} />
        </label>
        <label>
          {language === "zh" ? "角色" : "Agent"}
          <select value={filters.agentId ?? ""} onChange={(event) => onFiltersChange({ ...filters, agentId: event.target.value || undefined })}>
            <option value="">{language === "zh" ? "全部" : "All"}</option>
            {agentOptions.map((agent) => <option key={agent.id} value={agent.id}>{agent.displayName} ({agent.id})</option>)}
          </select>
        </label>
        <label>
          {language === "zh" ? "事件类型" : "Kind"}
          <select value={filters.kind ?? ""} onChange={(event) => onFiltersChange({ ...filters, kind: event.target.value || undefined })}>
            <option value="">{language === "zh" ? "全部" : "All"}</option>
            {kindOptions.map((kind) => <option key={kind} value={kind}>{formatEventKindLabel(language, kind)}</option>)}
          </select>
        </label>
        <label>
          {language === "zh" ? "来源" : "Source"}
          <select value={filters.source ?? ""} onChange={(event) => onFiltersChange({ ...filters, source: readSelectedSource(event.currentTarget.value) })}>
            <option value="">{language === "zh" ? "全部" : "All"}</option>
            {sourceOptions.map((source) => <option key={source} value={source}>{formatSourceLabel(language, source)}</option>)}
          </select>
        </label>
        <label>
          {language === "zh" ? "目标" : "Target"}
          <input value={filters.targetId ?? ""} onChange={(event) => onFiltersChange({ ...filters, targetId: event.target.value || undefined })} />
        </label>
        <label>
          {language === "zh" ? "起始时间" : "From time"}
          <input value={filters.fromTime ?? ""} onChange={(event) => onFiltersChange({ ...filters, fromTime: event.target.value || undefined })} />
        </label>
        <label>
          {language === "zh" ? "结束时间" : "To time"}
          <input value={filters.toTime ?? ""} onChange={(event) => onFiltersChange({ ...filters, toTime: event.target.value || undefined })} />
        </label>
      </fieldset>

      {items.length === 0 ? (
        <p className="empty-state">{copy.timeline.empty}</p>
      ) : (
        <div className="timeline-layout">
          <ol className="timeline">
            {items.map((item) => (
              <li key={item.entry.id} className={item.entry.id === selectedEventId ? "timeline-item timeline-item--selected" : "timeline-item"}>
                <button type="button" className="event-select-button" onClick={() => onSelectEvent(item.entry.id)} aria-pressed={item.entry.id === selectedEventId}>
                  <span className="timeline-row">
                    <Badge tone={item.entry.source}>{formatSourceLabel(language, item.entry.source)}</Badge>
                    <strong>{item.title}</strong>
                  </span>
                  <span>{item.detail}</span>
                  <small className="muted"><code>{item.entry.id}</code> · {item.entry.time}</small>
                </button>
              </li>
            ))}
          </ol>
          {selectedItem ? (
            <aside className="detail-card" aria-label={language === "zh" ? "事件详情" : "Event detail"}>
              <h3>{language === "zh" ? "事件详情" : "Event detail"}</h3>
              <p><strong>{selectedItem.detailModel.title}</strong></p>
              <p>{selectedItem.detailModel.summary}</p>
              <dl className="event-meta">
                <div><dt>{copy.timeline.id}</dt><dd><code>{selectedItem.detailModel.id}</code></dd></div>
                <div><dt>{copy.timeline.step}</dt><dd><code>{selectedItem.detailModel.stepId}</code></dd></div>
                <div><dt>{copy.timeline.time}</dt><dd>{selectedItem.detailModel.time}</dd></div>
                <div><dt>{copy.timeline.targets}</dt><dd>{selectedItem.detailModel.targetIds.join(", ")}</dd></div>
                <div><dt>{language === "zh" ? "相关角色" : "Related agents"}</dt><dd>{selectedItem.detailModel.relatedAgentIds.join(", ") || "—"}</dd></div>
              </dl>
              {selectedItem.detailModel.debugFacts.length > 0 ? (
                <dl className="event-meta">
                  {selectedItem.detailModel.debugFacts.map((fact) => <div key={`${fact.label}:${fact.value}`}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
                </dl>
              ) : null}
              <JsonDetails title={copy.timeline.payloadJson} value={selectedItem.detailModel.payload} open={debugMode} />
            </aside>
          ) : null}
        </div>
      )}
    </section>
  );
}

function readSelectedSource(value: string): EventSource | undefined {
  switch (value) {
    case "system":
    case "user":
    case "agent":
    case "llm":
    case "test":
      return value;
    default:
      return undefined;
  }
}
