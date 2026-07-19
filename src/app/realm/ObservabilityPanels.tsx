import type { AdminStateResponse } from "../../server/admin/index.js";
import type { PersonaSpec } from "../../shared/contracts/index.js";
import { Badge } from "../shared/Badge.js";
import { JsonDetails } from "../shared/JsonDetails.js";
import type { AppLanguage } from "../shared/i18n.js";
import { formatAgentDisplayName, formatDiagnosticLevelLabel, formatEntityLabel, formatLocationName, formatPersonaText, formatProvenanceLabel, formatRelationshipGroup, formatSourceLabel, getCopy } from "../shared/i18n.js";
import type {
  AgentTickInspectorViewModel,
  AgentMemoryStreamViewModel,
  AgentReflectionPolicyViewModel,
  AgentPlanViewModel,
  DebugExportViewModel,
  DiagnosticsCenterViewModel,
  InterventionReceiptViewModel,
  MemoryViewModel,
  MessageThreadViewModel,
  RelationshipRow,
  ReplayCursorViewModel,
  StateDiffEntry,
  TopologyViewModel,
  WorldInspectorViewModel,
} from "../shared/viewModels.js";

interface RelationshipNetworkProps {
  language: AppLanguage;
  rows: RelationshipRow[];
}

export function RelationshipNetwork({ language, rows }: RelationshipNetworkProps) {
  return (
    <section className="panel" aria-labelledby="relationships-heading">
      <PanelTitle eyebrow={language === "zh" ? "关系矩阵" : "Relationship matrix"} title={language === "zh" ? "角色关系网络" : "Agent relationship network"} id="relationships-heading" />
      {rows.length === 0 ? <p className="empty-state">{language === "zh" ? "暂无配置关系。" : "No configured relationships."}</p> : (
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>{language === "zh" ? "来源" : "Source"}</th><th>{language === "zh" ? "目标" : "Target"}</th><th>{language === "zh" ? "亲和" : "Affinity"}</th><th>{language === "zh" ? "信任" : "Trust"}</th><th>{language === "zh" ? "张力" : "Tension"}</th><th>{language === "zh" ? "分组" : "Group"}</th><th>{language === "zh" ? "互动" : "Interactions"}</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.sourcePersonaId}:${row.targetPersonaId}`}>
                  <td>{row.sourceName}</td><td>{row.targetName}</td><td>{row.affinity}</td><td>{row.trust}</td><td>{row.tension}</td><td><Badge tone="neutral">{formatRelationshipGroup(language, row.grouping)}</Badge></td><td>{row.interactionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="card-grid relationship-history-grid">
            {rows.map((row) => (
              <article className="detail-card" key={`${row.sourcePersonaId}:${row.targetPersonaId}:history`}>
                <h3>{row.sourceName} → {row.targetName}</h3>
                <p>{row.notes}</p>
                {row.recentInteractions.length === 0 ? (
                  <p className="muted">{language === "zh" ? "暂无两者共同参与的互动事件。" : "No shared interaction events yet."}</p>
                ) : (
                  <ol className="related-event-list">
                    {row.recentInteractions.map((item) => (
                      <li key={item.event.id}>
                        <Badge tone={item.entry.source}>{formatSourceLabel(language, item.entry.source)}</Badge> {item.detail}
                      </li>
                    ))}
                  </ol>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

interface WorldInspectorProps {
  language: AppLanguage;
  viewModel: WorldInspectorViewModel;
}

interface AgentTickInspectorPanelProps {
  language: AppLanguage;
  viewModel: AgentTickInspectorViewModel;
}

interface AgentMemoryStreamPanelProps {
  language: AppLanguage;
  viewModel: AgentMemoryStreamViewModel;
}

interface AgentReflectionPolicyPanelProps {
  language: AppLanguage;
  viewModel: AgentReflectionPolicyViewModel;
}

export function AgentTickInspectorPanel({ language, viewModel }: AgentTickInspectorPanelProps) {
  return (
    <section className="panel" aria-labelledby="agent-tick-inspector-heading">
      <PanelTitle eyebrow={language === "zh" ? "认知循环" : "Cognitive loop"} title={language === "zh" ? "角色 Tick 检查器" : "Agent tick inspector"} id="agent-tick-inspector-heading" />
      <dl className="compact-metrics">
        <Metric label={language === "zh" ? "步进" : "Step"} value={viewModel.stepId} code />
        <Metric label={language === "zh" ? "角色" : "Agents"} value={viewModel.rows.length} />
        <Metric label={language === "zh" ? "关联事件" : "Related events"} value={viewModel.relatedEventCount} />
      </dl>
      {viewModel.rows.length === 0 ? <p className="empty-state">{language === "zh" ? "最近一步没有角色 tick 诊断。" : "No agent tick diagnostics for the latest step."}</p> : (
        <div className="card-grid">
          {viewModel.rows.map((row) => (
            <article className="detail-card" key={row.agentId}>
              <h3>{row.displayName}</h3>
              <p className="muted"><code>{row.agentId}</code></p>
              <ol className="diagnostic-list">
                {row.phases.map((phase) => (
                  <li key={`${row.agentId}:${phase.phase}`}>
                    <Badge tone={phase.status === "failed" ? "error" : phase.status === "ran" ? "success" : "neutral"}>{phase.status}</Badge> <strong>{phase.phase}</strong>
                    <p className="muted">{phase.detail}</p>
                  </li>
                ))}
              </ol>
              {row.proposal ? <JsonDetails title={language === "zh" ? "Proposal JSON" : "Proposal JSON"} value={row.proposal} /> : <p className="muted">{language === "zh" ? "本次 tick 没有 action proposal。" : "No action proposal for this tick."}</p>}
              {row.relatedEvents.length > 0 ? (
                <ol className="related-event-list">
                  {row.relatedEvents.map((item) => (
                    <li key={item.event.id}>
                      <Badge tone={item.entry.source}>{formatSourceLabel(language, item.entry.source)}</Badge> {item.detail}
                      <p className="muted"><code>{item.event.id}</code></p>
                    </li>
                  ))}
                </ol>
              ) : <p className="muted">{language === "zh" ? "同一步暂无关联事件。" : "No same-step related events."}</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function AgentReflectionPolicyPanel({ language, viewModel }: AgentReflectionPolicyPanelProps) {
  return (
    <section className="panel" aria-labelledby="agent-reflection-policy-heading">
      <PanelTitle eyebrow={language === "zh" ? "反思策略" : "Reflection policy"} title={language === "zh" ? "角色反思诊断" : "Agent reflection diagnostics"} id="agent-reflection-policy-heading" />
      <dl className="compact-metrics">
        <Metric label={language === "zh" ? "步进" : "Step"} value={viewModel.stepId} code />
        <Metric label={language === "zh" ? "完成" : "Completed"} value={viewModel.completedCount} />
        <Metric label={language === "zh" ? "跳过" : "Skipped"} value={viewModel.skippedCount} />
        <Metric label={language === "zh" ? "失败" : "Failed"} value={viewModel.failedCount} />
      </dl>
      {viewModel.rows.length === 0 ? <p className="empty-state">{language === "zh" ? "最近一步没有反思策略诊断。" : "No reflection policy diagnostics for the latest step."}</p> : (
        <div className="card-grid">
          {viewModel.rows.map((row) => (
            <article className="detail-card" key={row.agentId}>
              <h3>{row.displayName}</h3>
              <p className="muted"><code>{row.agentId}</code></p>
              <div className="timeline-row">
                <Badge tone={row.status === "failed" ? "error" : row.status === "completed" ? "success" : "neutral"}>{row.status}</Badge>
                <strong>{row.reason ?? (language === "zh" ? "无额外原因" : "No additional reason")}</strong>
              </div>
              <dl className="event-meta">
                <Metric label={language === "zh" ? "证据" : "Evidence"} value={row.evidenceMemoryIds.length} />
                <Metric label={language === "zh" ? "持久化" : "Persisted"} value={row.persistedMemoryIds.length} />
              </dl>
              {row.trigger ? <JsonDetails title={language === "zh" ? "触发器" : "Trigger"} value={row.trigger} /> : null}
              {row.evidenceMemoryIds.length > 0 ? <p className="muted">{language === "zh" ? "证据记忆" : "Evidence memories"}: <code>{row.evidenceMemoryIds.join(", ")}</code></p> : null}
              {row.persistedMemoryIds.length > 0 ? <p className="muted">{language === "zh" ? "写入记忆" : "Persisted memories"}: <code>{row.persistedMemoryIds.join(", ")}</code></p> : null}
              {row.diagnostics.length > 0 ? <JsonDetails title={language === "zh" ? "反思诊断" : "Reflection diagnostics"} value={row.diagnostics} /> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function AgentMemoryStreamPanel({ language, viewModel }: AgentMemoryStreamPanelProps) {
  return (
    <section className="panel" aria-labelledby="agent-memory-stream-heading">
      <PanelTitle eyebrow={language === "zh" ? "运行时记忆" : "Runtime memory"} title={language === "zh" ? "角色记忆流" : "Agent memory stream"} id="agent-memory-stream-heading" />
      <dl className="compact-metrics">
        <Metric label={language === "zh" ? "记录" : "Records"} value={viewModel.total} />
        <Metric label={language === "zh" ? "角色" : "Agents"} value={viewModel.groups.length} />
      </dl>
      {viewModel.groups.length === 0 ? <p className="empty-state">{language === "zh" ? "暂无运行时 MemoryRecord。" : "No runtime MemoryRecord entries yet."}</p> : (
        <div className="card-grid">
          {viewModel.groups.map((group) => (
            <article className="detail-card" key={group.agentId}>
              <h3>{group.displayName}</h3>
              <p className="muted"><code>{group.agentId}</code></p>
              <ol className="diagnostic-list">
                {group.rows.map((memory) => (
                  <li key={memory.id}>
                    <div className="timeline-row">
                      <Badge tone="system">{memory.kind}</Badge>
                      <Badge tone="neutral">{memory.source}</Badge>
                      <strong>{memory.content}</strong>
                    </div>
                    <dl className="event-meta">
                      <Metric label={language === "zh" ? "重要度" : "Importance"} value={memory.importance} />
                      <Metric label={language === "zh" ? "可见性" : "Visibility"} value={memory.visibility} />
                      <Metric label={language === "zh" ? "创建" : "Created"} value={memory.createdAt} code />
                      <Metric label={language === "zh" ? "访问" : "Accessed"} value={memory.lastAccessedAt} code />
                    </dl>
                    <p className="muted">
                      {language === "zh" ? "来源" : "Sources"}: <code>{memory.sourceIds.join(", ") || "—"}</code>
                    </p>
                    <p className="muted">
                      {language === "zh" ? "标签" : "Tags"}: <code>{memory.tags.join(", ") || "—"}</code>
                    </p>
                    {memory.relatedMemoryIds.length > 0 ? (
                      <p className="muted">{language === "zh" ? "关联记忆" : "Related memories"}: <code>{memory.relatedMemoryIds.join(", ")}</code></p>
                    ) : null}
                    <JsonDetails title={language === "zh" ? "记忆元数据" : "Memory metadata"} value={memory.metadata} />
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function WorldInspector({ language, viewModel }: WorldInspectorProps) {
  return (
    <section className="panel system-overview-panel" aria-labelledby="world-inspector-heading">
      <PanelTitle eyebrow={language === "zh" ? "系统总览" : "System overview"} title={language === "zh" ? "世界状态仪表" : "World state console"} id="world-inspector-heading" />
      <dl className="metric-grid system-overview-grid">
        <Metric label={language === "zh" ? "世界编号" : "World"} value={viewModel.worldId} code />
        <Metric label={language === "zh" ? "状态" : "Status"} value={viewModel.status} />
        <Metric label={language === "zh" ? "时间" : "Time"} value={viewModel.currentTime} />
        <Metric label={language === "zh" ? "地点" : "Locations"} value={viewModel.locationCount} />
        <Metric label={language === "zh" ? "角色" : "Agents"} value={viewModel.agentCount} />
        <Metric label={language === "zh" ? "事件/时间线" : "Events/timeline"} value={`${viewModel.eventCount}/${viewModel.timelineCount}`} />
        <Metric label={language === "zh" ? "队列/诊断" : "Queues/diagnostics"} value={`${viewModel.queuedInputCount}/${viewModel.diagnosticCount}`} />
        <Metric label={language === "zh" ? "会话" : "Conversations"} value={viewModel.activeConversationCount} />
        <Metric label={language === "zh" ? "回放终点" : "Replay final"} value={`${viewModel.replayFinalStepId} @ ${viewModel.replayFinalTime}`} code />
      </dl>
      <div className="system-flow-strip" aria-hidden="true">
        <span /><span /><span /><span /><span />
      </div>
      <JsonDetails title={language === "zh" ? "位置数据" : "Locations JSON"} value={viewModel.locations} />
      <JsonDetails title={language === "zh" ? "角色数据" : "Agents JSON"} value={viewModel.agents} />
      <JsonDetails title={language === "zh" ? "会话数据" : "Conversations JSON"} value={viewModel.activeConversations} />
      <JsonDetails title={language === "zh" ? "队列与诊断数据" : "Queues and diagnostics JSON"} value={{ queues: viewModel.queues, diagnostics: viewModel.diagnostics }} />
    </section>
  );
}

interface ReceiptPanelProps {
  language: AppLanguage;
  receipt: InterventionReceiptViewModel;
}

export function ReceiptPanel({ language, receipt }: ReceiptPanelProps) {
  const title = language === "zh" ? "输入结果回执" : "Input result receipt";
  return (
    <section className="panel" aria-labelledby="receipt-heading">
      <PanelTitle eyebrow={language === "zh" ? "命令反馈" : "Command feedback"} title={title} id="receipt-heading" />
      {receipt.status === "none" ? <p className="empty-state">{language === "zh" ? "尚无最近输入回执。" : "No recent input receipt yet."}</p> : (
        <>
          <div className="timeline-row"><Badge tone={receipt.status === "accepted" ? "success" : "error"}>{language === "zh" ? (receipt.status === "accepted" ? "已接受" : "已拒绝") : receipt.status}</Badge><strong>{receipt.reason ?? title}</strong></div>
          <dl className="event-meta">
            <Metric label={language === "zh" ? "事件" : "Events"} value={receipt.resultingEvents.length} />
            <Metric label={language === "zh" ? "对象" : "Objects"} value={receipt.affectedObjectIds.join(", ") || "—"} code />
          </dl>
          {receipt.resultingEvents.length > 0 ? (
            <ol className="related-event-list">
              {receipt.resultingEvents.map((item) => (
                <li key={item.event.id}>
                  <Badge tone={item.entry.source}>{formatSourceLabel(language, item.entry.source)}</Badge> {item.detail}
                </li>
              ))}
            </ol>
          ) : null}
          <JsonDetails title={language === "zh" ? "提交输入数据" : "Submitted input JSON"} value={receipt.input} />
        </>
      )}
    </section>
  );
}

interface ReplayPanelProps {
  language: AppLanguage;
  viewModel: ReplayCursorViewModel;
  replayPlaying: boolean;
  replaySpeed: number;
  autoStep: boolean;
  onReplayPlayingChange: (playing: boolean) => void;
  onReplaySpeedChange: (speed: number) => void;
  onAutoStepChange: (enabled: boolean) => void;
  onCursorChange: (cursor: number) => void;
}

const REPLAY_SPEED_OPTIONS = [0.5, 1, 2, 4, 10, 20] as const;

export function ReplayPanel({
  language,
  viewModel,
  replayPlaying,
  replaySpeed,
  autoStep,
  onReplayPlayingChange,
  onReplaySpeedChange,
  onAutoStepChange,
  onCursorChange,
}: ReplayPanelProps) {
  const playLabel = replayPlaying ? (language === "zh" ? "暂停回放" : "Pause replay") : (language === "zh" ? "播放回放" : "Play replay");
  return (
    <section className="panel replay-panel" aria-labelledby="replay-heading">
      <PanelTitle eyebrow={language === "zh" ? "离线回放" : "Replay"} title={language === "zh" ? "逐事件回放" : "Step-by-step event playback"} id="replay-heading" />
      <div className="replay-status-strip" aria-live="polite">
        <span>{language === "zh" ? "游标" : "Cursor"}: <strong>{viewModel.positionLabel}</strong></span>
        <span>{language === "zh" ? "进度" : "Progress"}: <strong>{viewModel.progressPercent}%</strong></span>
        <span>{language === "zh" ? "速度" : "Speed"}: <strong>{replaySpeed}×</strong></span>
      </div>
      <div className="replay-progress" aria-hidden="true"><span style={{ width: `${viewModel.progressPercent}%` }} /></div>
      <div className="button-row replay-controls">
        <button
          type="button"
          className="secondary-button"
          disabled={viewModel.totalEvents === 0}
          aria-pressed={replayPlaying}
          onClick={() => {
            if (!replayPlaying && viewModel.totalEvents > 0 && !viewModel.canNext) onCursorChange(0);
            onReplayPlayingChange(!replayPlaying);
          }}
        >
          {playLabel}
        </button>
        <button type="button" className="secondary-button" disabled={!viewModel.canPrevious} onClick={() => onCursorChange(viewModel.cursor - 1)}>{language === "zh" ? "上一事件" : "Previous event"}</button>
        <button type="button" className="secondary-button" disabled={!viewModel.canNext} onClick={() => onCursorChange(viewModel.cursor + 1)}>{language === "zh" ? "下一事件" : "Next event"}</button>
        <label className="replay-speed-label" htmlFor="replay-speed">
          {language === "zh" ? "倍速" : "Speed"}
          <select id="replay-speed" value={replaySpeed} onChange={(event) => onReplaySpeedChange(Number(event.target.value))}>
            {REPLAY_SPEED_OPTIONS.map((speed) => <option key={speed} value={speed}>{speed}×</option>)}
          </select>
        </label>
        <label className="checkbox-label"><input type="checkbox" checked={autoStep} onChange={(event) => onAutoStepChange(event.target.checked)} /> {language === "zh" ? "实时自动步进" : "Live auto-step"}</label>
      </div>
      <label className="stacked-form" htmlFor="replay-cursor">
        {language === "zh" ? "跳转到事件游标" : "Jump to event cursor"}
        <input
          id="replay-cursor"
          type="range"
          min="0"
          max={Math.max(viewModel.totalEvents - 1, 0)}
          value={viewModel.cursor}
          disabled={viewModel.totalEvents === 0}
          aria-valuetext={viewModel.positionLabel}
          onChange={(event) => onCursorChange(Number(event.target.value))}
        />
      </label>
      <label className="stacked-form" htmlFor="replay-cursor-number">
        {language === "zh" ? "输入事件序号" : "Type event index"}
        <input id="replay-cursor-number" type="number" min="0" max={Math.max(viewModel.totalEvents - 1, 0)} value={viewModel.cursor} disabled={viewModel.totalEvents === 0} onChange={(event) => onCursorChange(Number(event.target.value))} />
      </label>
      {viewModel.selected ? (
        <article className="detail-card replay-selected-card">
          <strong>{viewModel.selected.title}</strong>
          <p>{viewModel.selected.detail}</p>
          <small className="muted"><code>{viewModel.selected.event.id}</code> · {viewModel.selected.event.time}</small>
        </article>
      ) : <p className="empty-state">{language === "zh" ? "暂无可回放事件。" : "No replay events yet."}</p>}
      <JsonDetails title={language === "zh" ? "回放摘要数据" : "Replay summary JSON"} value={viewModel.summary} />
    </section>
  );
}

interface PersonaReadOnlyPanelProps {
  language: AppLanguage;
  personas: PersonaSpec[];
}

export function PersonaReadOnlyPanel({ language, personas }: PersonaReadOnlyPanelProps) {
  return (
    <section className="panel" aria-labelledby="personas-heading">
      <PanelTitle eyebrow={language === "zh" ? "配置事实" : "Configured facts"} title={language === "zh" ? "只读人格页面" : "Read-only persona page"} id="personas-heading" />
      <div className="card-grid">
        {personas.map((persona) => (
          <article className="detail-card" key={persona.id}>
            <h3>{formatAgentDisplayName(language, persona.id, persona.displayName)}</h3>
            <p>{formatPersonaText(language, persona.id, persona.profile.archetype)}</p>
            <p><Badge tone="neutral">{formatProvenanceLabel(language, "configured")}</Badge> <code>{persona.id}</code></p>
            <ul>{persona.profile.longTermGoals.map((goal) => <li key={goal}>{formatPersonaText(language, persona.id, goal)}</li>)}</ul>
          </article>
        ))}
      </div>
    </section>
  );
}

interface MemoryViewProps {
  language: AppLanguage;
  viewModel: MemoryViewModel;
}

export function MemoryView({ language, viewModel }: MemoryViewProps) {
  return (
    <section className="panel" aria-labelledby="memory-heading">
      <PanelTitle eyebrow={language === "zh" ? "来源分离" : "Provenance split"} title={language === "zh" ? "记忆视图" : "Memory view MVP"} id="memory-heading" />
      <div className="agent-detail-sections">
        <section className="detail-card"><h3>{language === "zh" ? "配置事实" : "Configured facts"}</h3><ul>{viewModel.configuredFacts.slice(0, 12).map((fact) => <li key={`${fact.label}:${fact.value}`}><Badge tone="neutral">{formatProvenanceLabel(language, fact.provenance)}</Badge> {fact.value}</li>)}</ul></section>
        <section className="detail-card"><h3>{language === "zh" ? "运行时记忆事件" : "Runtime memory events"}</h3>{viewModel.runtimeMemories.length === 0 ? <p className="muted">{language === "zh" ? "暂无运行时记忆事件。" : "No runtime memory events."}</p> : <ul>{viewModel.runtimeMemories.map((memory) => <li key={memory.eventId}><Badge tone={memory.provenance === "user" ? "user" : "system"}>{formatProvenanceLabel(language, memory.provenance)}</Badge> {memory.summary}</li>)}</ul>}</section>
      </div>
    </section>
  );
}

interface MessageStreamPanelProps {
  language: AppLanguage;
  threads: MessageThreadViewModel[];
}

export function MessageStreamPanel({ language, threads }: MessageStreamPanelProps) {
  return (
    <section className="panel" aria-labelledby="messages-heading">
      <PanelTitle eyebrow={language === "zh" ? "对话与消息" : "Conversation/messages"} title={language === "zh" ? "消息流" : "Message stream"} id="messages-heading" />
      {threads.length === 0 ? <p className="empty-state">{language === "zh" ? "暂无私信消息。" : "No private messages yet."}</p> : threads.map((thread) => (
        <article className="detail-card message-thread" key={thread.id}>
          <h3>{thread.title}</h3>
          <p className="muted">{thread.participantIds.map((id) => formatEntityLabel(language, id)).join(", ")}</p>
          <ol className="message-list" role="log" aria-live="polite" aria-relevant="additions" aria-label={thread.title}>
            {thread.messages.map((message) => (
              <li className={`message-item message-item--${message.direction}`} key={message.id}>
                <div className="message-meta">
                  <Badge tone={message.source}>{formatSourceLabel(language, message.source)}</Badge>
                  {message.provenance ? <Badge tone="neutral">{message.provenance}</Badge> : null}
                  <strong>{formatEntityLabel(language, message.senderId)}</strong>
                  <span>{message.time}</span>
                </div>
                <p className="message-body">{message.body}</p>
                {message.tone ? <p className="muted">{language === "zh" ? "语气" : "Tone"}: {message.tone}</p> : null}
                {message.llmOperationId ? <p className="muted">Operation: <code>{message.llmOperationId}</code></p> : null}
                {message.referencedMemoryIds.length > 0 ? (
                  <p className="muted">{language === "zh" ? "引用记忆" : "Referenced memories"}: <code>{message.referencedMemoryIds.join(", ")}</code></p>
                ) : null}
              </li>
            ))}
          </ol>
        </article>
      ))}
    </section>
  );
}

interface DiagnosticsCenterProps {
  language: AppLanguage;
  viewModel: DiagnosticsCenterViewModel;
}

export function DiagnosticsCenter({ language, viewModel }: DiagnosticsCenterProps) {
  return (
    <section className="panel debug-metrics-panel" aria-labelledby="diagnostics-center-heading">
      <PanelTitle eyebrow={language === "zh" ? "调试指标" : "Debug metrics"} title={language === "zh" ? "运行诊断" : "Runtime diagnostics"} id="diagnostics-center-heading" />
      <dl className="compact-metrics debug-metrics-grid"><Metric label={language === "zh" ? "总数" : "Total"} value={viewModel.total} /><Metric label={language === "zh" ? "已拒绝" : "Rejected"} value={viewModel.rejectedInputs.length} /><Metric label={language === "zh" ? "异常" : "Anomalies"} value={viewModel.anomalies.length} /></dl>
      {viewModel.latest.length === 0 ? <p className="empty-state">{language === "zh" ? "暂无诊断。" : "No diagnostics."}</p> : <ul className="diagnostic-list debug-diagnostic-list">{viewModel.latest.map((diagnostic) => <li key={diagnostic.id}><Badge tone={diagnostic.level === "error" ? "error" : "neutral"}>{formatDiagnosticLevelLabel(language, diagnostic.level)}</Badge> <strong>{diagnostic.message}</strong><p className="muted"><code>{diagnostic.eventId ?? diagnostic.inputId ?? diagnostic.id}</code></p></li>)}</ul>}
    </section>
  );
}

interface StateDiffPanelProps {
  language: AppLanguage;
  diffs: StateDiffEntry[];
}

export function StateDiffPanel({ language, diffs }: StateDiffPanelProps) {
  return (
    <section className="panel" aria-labelledby="diff-heading">
      <PanelTitle eyebrow={language === "zh" ? "相邻响应" : "Adjacent responses"} title={language === "zh" ? "状态差异" : "State diff"} id="diff-heading" />
      {diffs.length === 0 ? <p className="empty-state">{language === "zh" ? "暂无状态变化，或这是首次加载。" : "No state changes, or this is the first load."}</p> : <div className="table-scroll"><table className="data-table"><thead><tr><th>{language === "zh" ? "范围" : "Scope"}</th><th>{language === "zh" ? "编号" : "ID"}</th><th>{language === "zh" ? "字段" : "Field"}</th><th>{language === "zh" ? "之前" : "Before"}</th><th>{language === "zh" ? "之后" : "After"}</th></tr></thead><tbody>{diffs.map((diff) => <tr key={`${diff.scope}:${diff.id}:${diff.field}`}><td>{language === "zh" ? formatDiffScope(diff.scope) : diff.scope}</td><td><code>{diff.id}</code></td><td>{language === "zh" ? formatDiffField(diff.field) : diff.field}</td><td>{diff.before}</td><td>{diff.after}</td></tr>)}</tbody></table></div>}
    </section>
  );
}

interface AgentPlanPanelProps {
  language: AppLanguage;
  plans: AgentPlanViewModel[];
}

export function AgentPlanPanel({ language, plans }: AgentPlanPanelProps) {
  return (
    <section className="panel" aria-labelledby="plans-heading">
      <PanelTitle eyebrow={language === "zh" ? "行动计划" : "Action plans"} title={language === "zh" ? "角色行动计划" : "Agent action plan"} id="plans-heading" />
      <div className="card-grid">{plans.map((plan) => <article className="detail-card" key={plan.agentId}><h3>{plan.displayName}</h3><dl className="event-meta"><Metric label={language === "zh" ? "计划" : "Plan"} value={plan.currentPlanId ?? "—"} code /><Metric label={language === "zh" ? "操作" : "Operation"} value={plan.operationStatus} /></dl>{plan.action ? <p>{plan.action.kind}: {plan.action.intent}</p> : <p className="muted">{language === "zh" ? "当前无行动。" : "No current action."}</p>}</article>)}</div>
    </section>
  );
}

interface LocationTopologyProps {
  language: AppLanguage;
  viewModel: TopologyViewModel;
}

export function LocationTopology({ language, viewModel }: LocationTopologyProps) {
  return (
    <section className="panel" aria-labelledby="topology-heading">
      <PanelTitle eyebrow={language === "zh" ? "语义图" : "Semantic graph"} title={language === "zh" ? "位置拓扑" : "Location topology"} id="topology-heading" />
      <div className="topology-grid">{viewModel.nodes.map((node) => <article className="location-card" key={node.location.id}><h3>{formatLocationName(language, node.location.id, node.location.displayName)}</h3><p><code>{node.location.id}</code> → {node.connectedLocationIds.join(", ") || "—"}</p><p>{language === "zh" ? "角色" : "Agents"}: {node.agents.map((agent) => formatAgentDisplayName(language, agent.id, agent.displayName)).join(", ") || "—"}</p></article>)}</div>
      {viewModel.movementPaths.length > 0 ? <ol className="related-event-list">{viewModel.movementPaths.slice(0, 8).map((path) => <li key={path.eventId}><code>{path.actorId ? formatEntityLabel(language, path.actorId) : formatSourceLabel(language, "system")}</code> → <code>{formatEntityLabel(language, path.locationId)}</code><p>{path.summary}</p></li>)}</ol> : <p className="muted">{language === "zh" ? "暂无移动/行动路径事件。" : "No movement/action path events yet."}</p>}
    </section>
  );
}

interface DebugExportPanelProps {
  language: AppLanguage;
  viewModel: DebugExportViewModel;
  onExport: () => void;
  exportedAt?: string;
}

export function DebugExportPanel({ language, viewModel, onExport, exportedAt }: DebugExportPanelProps) {
  return (
    <section className="panel" aria-labelledby="export-heading">
      <PanelTitle eyebrow={language === "zh" ? "本地数据" : "Local JSON"} title={language === "zh" ? "调试导出" : "Debug export"} id="export-heading" />
      <p className="muted">{language === "zh" ? "导出当前状态、事件、时间线、回放、诊断与派生差异；不写入仓库。" : "Exports current state, events, timeline, replay, diagnostics, and derived diffs; does not write repository files."}</p>
      <button type="button" onClick={onExport}>{language === "zh" ? "下载数据" : "Download JSON"}</button>
      {exportedAt ? <p className="muted">{language === "zh" ? "上次导出" : "Last export"}: {exportedAt}</p> : null}
      <JsonDetails title={language === "zh" ? "导出预览数据" : "Export preview JSON"} value={{ generatedAt: viewModel.generatedAt, eventCount: viewModel.events.length, timelineCount: viewModel.timeline.length, replayFinalStepId: viewModel.replay.finalStepId, diagnosticCount: viewModel.diagnostics.total, diffCount: viewModel.diffs.length }} />
    </section>
  );
}

function PanelTitle({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  return <div className="panel-heading"><div><p className="eyebrow">{eyebrow}</p><h2 id={id}>{title}</h2></div></div>;
}

function Metric({ label, value, code = false }: { label: string; value: string | number; code?: boolean }) {
  return <div><dt>{label}</dt><dd>{code ? <code>{String(value)}</code> : String(value)}</dd></div>;
}

function formatDiffScope(scope: StateDiffEntry["scope"]): string {
  return { world: "世界", agent: "角色", location: "位置", queue: "队列" }[scope];
}

function formatDiffField(field: string): string {
  return {
    status: "状态",
    currentTime: "当前时间",
    timeScale: "时间倍率",
    queuedInputs: "排队输入",
    locationId: "位置",
    currentPlanId: "当前计划",
    currentAction: "当前行动",
    created: "已创建",
  }[field] ?? field;
}
