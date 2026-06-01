import type { AgentDetailViewModel } from "../shared/viewModels.js";
import { Badge } from "../shared/Badge.js";
import type { AppLanguage } from "../shared/i18n.js";
import { formatAgentStatusLabel, formatLocationName, formatSourceLabel, getCopy } from "../shared/i18n.js";

interface AgentDetailPanelProps {
  language: AppLanguage;
  viewModel: AgentDetailViewModel;
}

export function AgentDetailPanel({ language, viewModel }: AgentDetailPanelProps) {
  const copy = getCopy(language);

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
          <dl className="metric-grid" aria-label={copy.agents.runtimeState}>
            <div><dt>{copy.agents.displayName}</dt><dd>{viewModel.agent.displayName}</dd></div>
            <div><dt>{copy.agents.agentId}</dt><dd><code>{viewModel.agent.id}</code></dd></div>
            <div><dt>{copy.agents.personaId}</dt><dd><code>{viewModel.agent.personaId}</code></dd></div>
            <div>
              <dt>{copy.agents.status}</dt>
              <dd><Badge tone="agent">{formatAgentStatusLabel(language, viewModel.agent.status)}</Badge></dd>
            </div>
            <div>
              <dt>{copy.agents.currentLocation}</dt>
              <dd>
                {viewModel.location ? (
                  <>
                    {formatLocationName(language, viewModel.location.id, viewModel.location.displayName)} <code>{viewModel.location.id}</code>
                  </>
                ) : (
                  <code>{viewModel.agent.locationId}</code>
                )}
              </dd>
            </div>
            <div><dt>{copy.agents.currentPlan}</dt><dd>{viewModel.agent.currentPlanId ? <code>{viewModel.agent.currentPlanId}</code> : copy.agents.noPlan}</dd></div>
            <div><dt>{copy.agents.operation}</dt><dd>{viewModel.agent.inProgressOperationId ? <code>{viewModel.agent.inProgressOperationId}</code> : copy.agents.noOperation}</dd></div>
          </dl>

          <div className="agent-detail-sections">
            <section className="detail-card" aria-labelledby="agent-relationships-heading">
              <h3 id="agent-relationships-heading">{copy.agents.relationships}</h3>
              {viewModel.agent.relationshipRefs.length > 0 ? (
                <ul className="inline-list">
                  {viewModel.agent.relationshipRefs.map((relationshipRef) => (
                    <li key={relationshipRef}><code>{relationshipRef}</code></li>
                  ))}
                </ul>
              ) : (
                <p className="muted">{copy.agents.noRelationships}</p>
              )}
            </section>

            <section className="detail-card" aria-labelledby="agent-action-heading">
              <h3 id="agent-action-heading">{copy.agents.currentAction}</h3>
              {viewModel.agent.currentAction ? (
                <dl className="event-meta">
                  <div><dt>{copy.agents.actionKind}</dt><dd>{viewModel.agent.currentAction.kind}</dd></div>
                  <div><dt>{copy.agents.actionIntent}</dt><dd>{viewModel.agent.currentAction.intent}</dd></div>
                  {viewModel.agent.currentAction.locationId ? <div><dt>{copy.agents.currentLocation}</dt><dd><code>{viewModel.agent.currentAction.locationId}</code></dd></div> : null}
                  {viewModel.agent.currentAction.targetAgentId ? <div><dt>{copy.agents.actionTarget}</dt><dd><code>{viewModel.agent.currentAction.targetAgentId}</code></dd></div> : null}
                  {viewModel.agent.currentAction.startsAt || viewModel.agent.currentAction.endsAt ? (
                    <div>
                      <dt>{copy.agents.actionWindow}</dt>
                      <dd>{[viewModel.agent.currentAction.startsAt, viewModel.agent.currentAction.endsAt].filter(Boolean).join(" → ")}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : (
                <p className="muted">{copy.agents.noAction}</p>
              )}
            </section>

            <section className="detail-card" aria-labelledby="agent-cooldowns-heading">
              <h3 id="agent-cooldowns-heading">{copy.agents.cooldowns}</h3>
              {viewModel.cooldownEntries.length > 0 ? (
                <dl className="event-meta">
                  {viewModel.cooldownEntries.map((cooldown) => (
                    <div key={cooldown.key}><dt>{cooldown.key}</dt><dd>{cooldown.value}</dd></div>
                  ))}
                </dl>
              ) : (
                <p className="muted">{copy.agents.noCooldowns}</p>
              )}
            </section>
          </div>

          <section className="detail-card" aria-labelledby="agent-related-events-heading">
            <h3 id="agent-related-events-heading">{copy.agents.relatedEvents}</h3>
            {viewModel.relatedEvents.length > 0 ? (
              <ol className="related-event-list">
                {viewModel.relatedEvents.map((item) => (
                  <li key={item.entry.id}>
                    <div className="timeline-row">
                      <Badge tone={item.entry.source}>{formatSourceLabel(language, item.entry.source)}</Badge>
                      <strong>{item.title}</strong>
                    </div>
                    <p>{item.detail}</p>
                    <small className="muted"><code>{item.entry.id}</code> · {item.entry.time}</small>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">{copy.agents.noRelatedEvents}</p>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}
