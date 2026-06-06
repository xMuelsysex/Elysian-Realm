import type { AgentDetailViewModel } from "../shared/viewModels.js";
import { Badge } from "../shared/Badge.js";
import type { AppLanguage } from "../shared/i18n.js";
import { formatAgentDisplayName, formatAgentStatusLabel, formatLocationName, formatPersonaText, formatProvenanceLabel, formatSourceLabel, getCopy } from "../shared/i18n.js";

interface AgentDetailPanelProps {
  language: AppLanguage;
  viewModel: AgentDetailViewModel;
}

export function AgentDetailPanel({ language, viewModel }: AgentDetailPanelProps) {
  const copy = getCopy(language);
  const displayName = viewModel.agent ? formatAgentDisplayName(language, viewModel.agent.id, viewModel.agent.displayName) : undefined;

  return (
    <section className="panel agent-detail-panel" aria-labelledby="agent-detail-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{copy.agents.eyebrow}</p>
          <h2 id="agent-detail-heading">{copy.agents.title}</h2>
        </div>
      </div>

      {viewModel.state === "empty" ? (
        <div className="empty-state">
          <strong>{copy.agents.emptyTitle}</strong>
          <p>{copy.agents.emptyDescription}</p>
        </div>
      ) : null}

      {viewModel.state === "notFound" ? (
        <div className="empty-state" role="status">
          <strong>{copy.agents.notFoundTitle}</strong>
          <p>{copy.agents.notFoundDescription}</p>
          {viewModel.selectedAgentId ? <code>{viewModel.selectedAgentId}</code> : null}
        </div>
      ) : null}

      {viewModel.state === "selected" && viewModel.agent ? (
        <div className="agent-detail-content">
          <p className="muted">{copy.agents.runtimeNote}</p>
          <div className="agent-dossier-hero">
            <div>
              <p className="eyebrow">{language === "zh" ? "角色档案" : "Character dossier"}</p>
              <h3>{displayName}</h3>
              <p><Badge tone="agent">{formatAgentStatusLabel(language, viewModel.agent.status)}</Badge> <code>{viewModel.agent.id}</code></p>
            </div>
            <div className="agent-dossier-current">
              <span className="eyebrow">{copy.agents.currentAction}</span>
              <strong>{viewModel.agent.currentAction?.intent ?? copy.agents.noAction}</strong>
              <p>
                {copy.agents.currentLocation}: {viewModel.location ? formatLocationName(language, viewModel.location.id, viewModel.location.displayName) : viewModel.agent.locationId}
              </p>
              <div className="button-row agent-dossier-provenance" aria-label={language === "zh" ? "档案来源标记" : "Dossier provenance labels"}>
                <Badge tone="system">{formatProvenanceLabel(language, "system")}</Badge>
                {viewModel.persona ? <Badge tone="neutral">{formatProvenanceLabel(language, "configured")}</Badge> : null}
                {viewModel.recentMemoryIndex.some((memory) => memory.provenance === "user") ? <Badge tone="user">{formatProvenanceLabel(language, "user")}</Badge> : null}
              </div>
            </div>
          </div>
          <dl className="agent-dossier-strip" aria-label={language === "zh" ? "档案重点" : "Dossier highlights"}>
            <div><dt>{copy.agents.currentLocation}</dt><dd>{viewModel.location ? <code>{viewModel.location.id}</code> : <code>{viewModel.agent.locationId}</code>}</dd></div>
            <div><dt>{copy.agents.relationships}</dt><dd>{viewModel.agent.relationshipRefs.length}</dd></div>
            <div><dt>{copy.agents.relatedEvents}</dt><dd>{viewModel.relatedEvents.length}</dd></div>
            <div><dt>{language === "zh" ? "记忆索引" : "Memory index"}</dt><dd>{viewModel.recentMemoryIndex.length}</dd></div>
          </dl>
          <dl className="metric-grid" aria-label={copy.agents.runtimeState}>
            <div><dt>{copy.agents.displayName}</dt><dd>{displayName}</dd></div>
            <div><dt>{copy.agents.agentId}</dt><dd><code>{viewModel.agent.id}</code></dd></div>
            <div><dt>{copy.agents.personaId}</dt><dd><code>{viewModel.agent.personaId}</code></dd></div>
            <div><dt>{copy.agents.status}</dt><dd><Badge tone="agent">{formatAgentStatusLabel(language, viewModel.agent.status)}</Badge></dd></div>
            <div>
              <dt>{copy.agents.currentLocation}</dt>
              <dd>{viewModel.location ? <>{formatLocationName(language, viewModel.location.id, viewModel.location.displayName)} <code>{viewModel.location.id}</code></> : <code>{viewModel.agent.locationId}</code>}</dd>
            </div>
            <div><dt>{copy.agents.currentPlan}</dt><dd>{viewModel.agent.currentPlanId ? <code>{viewModel.agent.currentPlanId}</code> : copy.agents.noPlan}</dd></div>
            <div><dt>{copy.agents.operation}</dt><dd>{viewModel.agent.inProgressOperationId ? <code>{viewModel.agent.inProgressOperationId}</code> : copy.agents.noOperation}</dd></div>
            <div><dt>{language === "zh" ? "运行情绪与意图" : "Runtime mood/intent"}</dt><dd>{viewModel.runtimeMoodIntent}</dd></div>
          </dl>

          <div className="agent-detail-sections">
            <section className="detail-card" aria-labelledby="agent-persona-heading">
              <h3 id="agent-persona-heading">{language === "zh" ? "配置人格摘要" : "Configured persona summary"}</h3>
              {viewModel.persona ? (
                <>
                  <p><Badge tone="neutral">{formatProvenanceLabel(language, "configured")}</Badge> {formatPersonaText(language, viewModel.persona.id, viewModel.persona.profile.archetype)}</p>
                  <ul>{viewModel.configuredFacts.slice(0, 6).map((fact) => <li key={`${fact.label}:${fact.value}`}>{fact.value}</li>)}</ul>
                </>
              ) : <p className="muted">{language === "zh" ? "当前响应未包含人格配置。" : "No persona fixture is present in this response."}</p>}
            </section>

            <section className="detail-card" aria-labelledby="agent-goals-heading">
              <h3 id="agent-goals-heading">{language === "zh" ? "长期目标" : "Long-term goals"}</h3>
              {viewModel.longTermGoals.length > 0 ? <ul>{viewModel.longTermGoals.map((goal) => <li key={goal}>{goal}</li>)}</ul> : <p className="muted">{language === "zh" ? "暂无配置目标。" : "No configured goals."}</p>}
            </section>

            <section className="detail-card" aria-labelledby="agent-relationships-heading">
              <h3 id="agent-relationships-heading">{copy.agents.relationships}</h3>
              {viewModel.agent.relationshipRefs.length > 0 ? (
                <ul className="inline-list">
                  {viewModel.agent.relationshipRefs.map((relationshipRef) => <li key={relationshipRef}><code>{relationshipRef}</code></li>)}
                </ul>
              ) : <p className="muted">{copy.agents.noRelationships}</p>}
            </section>

            <section className="detail-card" aria-labelledby="agent-action-heading">
              <h3 id="agent-action-heading">{copy.agents.currentAction}</h3>
              {viewModel.agent.currentAction ? (
                <dl className="event-meta">
                  <div><dt>{copy.agents.actionKind}</dt><dd>{viewModel.agent.currentAction.kind}</dd></div>
                  <div><dt>{copy.agents.actionIntent}</dt><dd>{viewModel.agent.currentAction.intent}</dd></div>
                  {viewModel.agent.currentAction.locationId ? <div><dt>{copy.agents.currentLocation}</dt><dd><code>{viewModel.agent.currentAction.locationId}</code></dd></div> : null}
                  {viewModel.agent.currentAction.targetAgentId ? <div><dt>{copy.agents.actionTarget}</dt><dd><code>{viewModel.agent.currentAction.targetAgentId}</code></dd></div> : null}
                  {viewModel.agent.currentAction.startsAt || viewModel.agent.currentAction.endsAt ? <div><dt>{copy.agents.actionWindow}</dt><dd>{[viewModel.agent.currentAction.startsAt, viewModel.agent.currentAction.endsAt].filter(Boolean).join(" → ")}</dd></div> : null}
                </dl>
              ) : <p className="muted">{copy.agents.noAction}</p>}
            </section>

            <section className="detail-card" aria-labelledby="agent-cooldowns-heading">
              <h3 id="agent-cooldowns-heading">{copy.agents.cooldowns}</h3>
              {viewModel.cooldownEntries.length > 0 ? <dl className="event-meta">{viewModel.cooldownEntries.map((cooldown) => <div key={cooldown.key}><dt>{cooldown.key}</dt><dd>{cooldown.value}</dd></div>)}</dl> : <p className="muted">{copy.agents.noCooldowns}</p>}
            </section>

            <section className="detail-card" aria-labelledby="agent-memory-heading">
              <h3 id="agent-memory-heading">{language === "zh" ? "最近记忆索引" : "Recent memory index"}</h3>
              {viewModel.recentMemoryIndex.length > 0 ? <ul>{viewModel.recentMemoryIndex.map((memory) => <li key={memory.eventId}><Badge tone={memory.provenance === "user" ? "user" : "system"}>{formatProvenanceLabel(language, memory.provenance)}</Badge> {memory.summary}</li>)}</ul> : <p className="muted">{language === "zh" ? "暂无运行时记忆事件。" : "No runtime memory events yet."}</p>}
            </section>
          </div>

          <section className="detail-card" aria-labelledby="agent-related-events-heading">
            <h3 id="agent-related-events-heading">{copy.agents.relatedEvents}</h3>
            {viewModel.relatedEvents.length > 0 ? (
              <ol className="related-event-list">
                {viewModel.relatedEvents.map((item) => (
                  <li key={item.entry.id}>
                    <div className="timeline-row"><Badge tone={item.entry.source}>{formatSourceLabel(language, item.entry.source)}</Badge><strong>{item.title}</strong></div>
                    <p>{item.detail}</p>
                    <small className="muted"><code>{item.entry.id}</code> · {item.entry.time}</small>
                  </li>
                ))}
              </ol>
            ) : <p className="muted">{copy.agents.noRelatedEvents}</p>}
          </section>
        </div>
      ) : null}
    </section>
  );
}
