import type { AgentStatus, EventSource, WorldStatus } from "../../shared/domain/index.js";

export type AppLanguage = "zh" | "en";

export const DEFAULT_LANGUAGE: AppLanguage = "zh";

type DiagnosticLevel = "info" | "warning" | "error";

interface CopyBundle {
  app: {
    eyebrow: string;
    title: string;
    loading: string;
    unknownError: string;
  };
  language: {
    toggleButton: string;
    toggleAriaLabel: string;
  };
  dashboard: {
    sideLabel: string;
  };
  world: {
    metricsLabel: string;
    world: string;
    status: string;
    time: string;
    timeScale: string;
    lastStep: string;
    events: string;
  };
  locations: {
    eyebrow: string;
    title: string;
    emptyAgents: string;
    relationships: string;
    none: string;
    names: Record<string, string>;
    descriptions: Record<string, string>;
  };
  agents: {
    eyebrow: string;
    title: string;
    emptyTitle: string;
    emptyDescription: string;
    notFoundTitle: string;
    notFoundDescription: string;
    runtimeState: string;
    runtimeNote: string;
    selected: string;
    selectAgent: string;
    agentId: string;
    personaId: string;
    displayName: string;
    status: string;
    currentLocation: string;
    relationships: string;
    currentAction: string;
    currentPlan: string;
    operation: string;
    cooldowns: string;
    noRelationships: string;
    noAction: string;
    noPlan: string;
    noOperation: string;
    noCooldowns: string;
    actionKind: string;
    actionIntent: string;
    actionTarget: string;
    actionWindow: string;
    relatedEvents: string;
    noRelatedEvents: string;
  };
  timeline: {
    eyebrow: string;
    title: string;
    empty: string;
    id: string;
    step: string;
    time: string;
    targets: string;
    payloadJson: string;
    debugMode: string;
    debugOn: string;
    debugOff: string;
    toggleDebugAriaLabel: string;
  };
  controls: {
    eyebrow: string;
    title: string;
    simulationControls: string;
    step: string;
    pause: string;
    resume: string;
    reset: string;
    setTimeScale: string;
    apply: string;
    realmEvent: string;
    target: string;
    worldTarget: string;
    eventKind: string;
    description: string;
    submitRealmEvent: string;
    directMessage: string;
    agent: string;
    message: string;
    sendMessage: string;
    defaultRealmDescription: string;
    errors: {
      timeScale: string;
      realmTarget: string;
      realmKind: string;
      messageTarget: string;
      message: string;
    };
  };
  diagnostics: {
    eyebrow: string;
    title: string;
    metricsLabel: string;
    replayEvents: string;
    finalStep: string;
    queuedInputs: string;
    empty: string;
    input: string;
    event: string;
    details: string;
    replayJson: string;
    queuedJson: string;
  };
  badges: Record<EventSource | DiagnosticLevel | "success" | WorldStatus | AgentStatus, string>;
  viewModels: {
    noPayload: string;
    eventKinds: Record<string, string>;
    payloadKeys: Record<string, string>;
  };
}

export const UI_COPY: Record<AppLanguage, CopyBundle> = {
  zh: {
    app: {
      eyebrow: "本地调试世界",
      title: "乐土管理台",
      loading: "正在加载管理状态…",
      unknownError: "未知管理界面错误",
    },
    language: {
      toggleButton: "切换到英文",
      toggleAriaLabel: "切换到英文界面",
    },
    dashboard: {
      sideLabel: "控制与诊断",
    },
    world: {
      metricsLabel: "世界状态指标",
      world: "世界编号",
      status: "状态",
      time: "当前时间",
      timeScale: "时间倍率",
      lastStep: "最后步进",
      events: "事件数",
    },
    locations: {
      eyebrow: "快照投影",
      title: "位置与角色",
      emptyAgents: "此处暂无角色。",
      relationships: "关系",
      none: "无",
      names: {
        atrium: "中庭",
        garden: "花园",
        lounge: "休息室",
        archives: "档案室",
        "training-hall": "训练厅",
        overlook: "眺望台",
        quarters: "居所",
      },
      descriptions: {
        atrium: "明亮的交汇空间，居民会在这里最先感受到一天的节奏。",
        garden: "安静的户外房间，适合温和接待、反思和低压力会面。",
        lounge: "共享休息空间，为轻松交谈而准备，没有正式负担。",
        archives: "靠近记录与记忆的房间，用于档案、诊断和回放钩子。",
        "training-hall": "纪律感较强的房间，适合独处日程、实用准备和安静专注。",
        overlook: "远处的眺望点，适合观察、停顿和傍晚的注视。",
        quarters: "私人休息区域，供需要低打扰恢复的居民使用。",
      },
    },
    agents: {
      eyebrow: "运行态详情",
      title: "角色详情",
      emptyTitle: "请选择一个角色",
      emptyDescription: "在“位置与角色”中点击角色后，这里会显示运行态状态、位置、关系引用和最近相关事件。",
      notFoundTitle: "未找到选中的角色",
      notFoundDescription: "当前快照里没有这个角色编号，可能是世界已重置或数据已刷新。",
      runtimeState: "运行态状态",
      runtimeNote: "以下信息来自当前世界快照；它不是配置人格设定，也不会修改模拟状态。",
      selected: "已选择",
      selectAgent: "选择角色",
      agentId: "角色编号",
      personaId: "人格编号",
      displayName: "显示名",
      status: "状态",
      currentLocation: "当前位置",
      relationships: "关系引用",
      currentAction: "当前行动",
      currentPlan: "当前计划",
      operation: "进行中操作",
      cooldowns: "冷却",
      noRelationships: "暂无关系引用",
      noAction: "当前没有行动",
      noPlan: "当前没有计划",
      noOperation: "当前没有进行中操作",
      noCooldowns: "暂无冷却",
      actionKind: "类型",
      actionIntent: "意图",
      actionTarget: "目标",
      actionWindow: "时间窗口",
      relatedEvents: "最近相关事件",
      noRelatedEvents: "暂无相关事件",
    },
    timeline: {
      eyebrow: "回放日志",
      title: "事件时间线",
      empty: "还没有事件。点击“步进”生成确定性的启动时间线。",
      id: "编号",
      step: "步进",
      time: "时间",
      targets: "目标",
      payloadJson: "载荷数据",
      debugMode: "调试模式",
      debugOn: "开启",
      debugOff: "关闭",
      toggleDebugAriaLabel: "切换事件时间线调试模式",
    },
    controls: {
      eyebrow: "类型化命令",
      title: "控制与干预",
      simulationControls: "模拟控制",
      step: "步进",
      pause: "暂停",
      resume: "继续",
      reset: "重置种子",
      setTimeScale: "设置时间倍率",
      apply: "应用",
      realmEvent: "领域事件",
      target: "目标",
      worldTarget: "世界",
      eventKind: "事件类型",
      description: "描述",
      submitRealmEvent: "提交领域事件",
      directMessage: "私信",
      agent: "角色",
      message: "消息",
      sendMessage: "发送消息",
      defaultRealmDescription: "从管理台提交的调试领域事件。",
      errors: {
        timeScale: "时间倍率必须是正数。",
        realmTarget: "领域事件需要选择目标。",
        realmKind: "领域事件类型不能为空。",
        messageTarget: "私信需要选择目标角色。",
        message: "私信内容不能为空。",
      },
    },
    diagnostics: {
      eyebrow: "验证",
      title: "诊断",
      metricsLabel: "回放摘要",
      replayEvents: "回放事件",
      finalStep: "最终步进",
      queuedInputs: "排队输入",
      empty: "暂无被拒绝输入或验证诊断。",
      input: "输入",
      event: "事件",
      details: "诊断详情",
      replayJson: "回放摘要数据",
      queuedJson: "排队输入数据",
    },
    badges: {
      system: "系统",
      user: "用户",
      agent: "角色",
      llm: "模型",
      test: "测试",
      error: "错误",
      warning: "警告",
      info: "信息",
      success: "成功",
      running: "运行中",
      paused: "已暂停",
      stopped: "已停止",
      archived: "已归档",
      idle: "空闲",
      planning: "规划中",
      moving: "移动中",
      conversing: "对话中",
      reflecting: "反思中",
      waiting: "等待中",
    },
    viewModels: {
      noPayload: "无载荷详情",
      eventKinds: {
        "world.created": "世界创建",
        "agent.spawned": "角色生成",
        "world.timeAdvanced": "时间推进",
        "agent.startedRoutine": "开始日程",
        "agent.moved": "角色移动",
        "agent.continuedRoutine": "继续日程",
        "realm.interventionSubmitted": "干预已提交",
        "simulation.inputRejected": "输入被拒绝",
        "memory.seeded": "记忆种子记录",
      },
      payloadKeys: {
        seedId: "种子编号",
        personaIds: "人格编号",
        locationIds: "位置编号",
        initialStatus: "初始状态",
        personaId: "人格编号",
        locationId: "位置编号",
        status: "状态",
        from: "从",
        to: "到",
        timeScale: "时间倍率",
        stepId: "步进编号",
        routineId: "日程 ID",
        fromLocationId: "起点位置",
        toLocationId: "目标位置",
        reason: "原因",
        period: "时段",
        intent: "意图",
        provenance: "来源标记",
        inputId: "输入编号",
        commandKind: "命令类型",
        accepted: "已接受",
        summary: "摘要",
        code: "代码",
        message: "消息",
        seedBatchId: "种子批次编号",
        memoryIds: "记忆编号",
        note: "备注",
      },
    },
  },
  en: {
    app: {
      eyebrow: "Local debug world",
      title: "Elysian Realm Admin",
      loading: "Loading admin state…",
      unknownError: "Unknown admin UI error",
    },
    language: {
      toggleButton: "切换到中文",
      toggleAriaLabel: "Switch to the Chinese interface",
    },
    dashboard: {
      sideLabel: "Controls and diagnostics",
    },
    world: {
      metricsLabel: "World state metrics",
      world: "World",
      status: "Status",
      time: "Time",
      timeScale: "Time scale",
      lastStep: "Last step",
      events: "Events",
    },
    locations: {
      eyebrow: "Snapshot projection",
      title: "Locations & agents",
      emptyAgents: "No agents here.",
      relationships: "relationships",
      none: "none",
      names: {},
      descriptions: {},
    },
    agents: {
      eyebrow: "Runtime detail",
      title: "Agent detail",
      emptyTitle: "Select an agent",
      emptyDescription: "Click an agent in Locations & agents to inspect runtime state, location, relationship references, and recent related events.",
      notFoundTitle: "Selected agent was not found",
      notFoundDescription: "The current snapshot does not contain this agent id. The world may have reset or refreshed.",
      runtimeState: "Runtime state",
      runtimeNote: "This information comes from the current WorldSnapshot. It is not configured persona canon and does not mutate simulation state.",
      selected: "Selected",
      selectAgent: "Select agent",
      agentId: "角色编号",
      personaId: "人格编号",
      displayName: "Display name",
      status: "Status",
      currentLocation: "Current location",
      relationships: "Relationship refs",
      currentAction: "Current action",
      currentPlan: "Current plan",
      operation: "In-progress operation",
      cooldowns: "Cooldowns",
      noRelationships: "No relationship refs",
      noAction: "No current action",
      noPlan: "No current plan",
      noOperation: "No in-progress operation",
      noCooldowns: "No cooldowns",
      actionKind: "Kind",
      actionIntent: "Intent",
      actionTarget: "Target",
      actionWindow: "Time window",
      relatedEvents: "Recent related events",
      noRelatedEvents: "No related events yet",
    },
    timeline: {
      eyebrow: "Replay log",
      title: "Event timeline",
      empty: "No events yet. Run one step to create the deterministic startup timeline.",
      id: "编号",
      step: "Step",
      time: "Time",
      targets: "Targets",
      payloadJson: "载荷数据",
      debugMode: "Debug mode",
      debugOn: "On",
      debugOff: "Off",
      toggleDebugAriaLabel: "Toggle event timeline debug mode",
    },
    controls: {
      eyebrow: "Typed commands",
      title: "Controls & interventions",
      simulationControls: "Simulation controls",
      step: "Step",
      pause: "Pause",
      resume: "Resume",
      reset: "Reset seed",
      setTimeScale: "Set time scale",
      apply: "Apply",
      realmEvent: "Realm event",
      target: "Target",
      worldTarget: "world",
      eventKind: "Event kind",
      description: "Description",
      submitRealmEvent: "Submit realm event",
      directMessage: "Direct private message",
      agent: "Agent",
      message: "Message",
      sendMessage: "Send message",
      defaultRealmDescription: "Debug realm event submitted from the admin UI.",
      errors: {
        timeScale: "Time scale must be a positive number.",
        realmTarget: "Realm event target is required.",
        realmKind: "Realm event kind is required.",
        messageTarget: "Direct message target agent is required.",
        message: "Direct message text is required.",
      },
    },
    diagnostics: {
      eyebrow: "Validation",
      title: "Diagnostics",
      metricsLabel: "Replay summary",
      replayEvents: "Replay events",
      finalStep: "Final step",
      queuedInputs: "Queued inputs",
      empty: "No rejected inputs or validation diagnostics yet.",
      input: "Input",
      event: "Event",
      details: "Diagnostic details",
      replayJson: "Replay summary JSON",
      queuedJson: "Queued inputs JSON",
    },
    badges: {
      system: "system",
      user: "user",
      agent: "agent",
      llm: "llm",
      test: "test",
      error: "error",
      warning: "warning",
      info: "info",
      success: "success",
      running: "running",
      paused: "paused",
      stopped: "stopped",
      archived: "archived",
      idle: "idle",
      planning: "planning",
      moving: "moving",
      conversing: "conversing",
      reflecting: "reflecting",
      waiting: "waiting",
    },
    viewModels: {
      noPayload: "No payload details",
      eventKinds: {
        "world.created": "world.created",
        "agent.spawned": "agent.spawned",
        "world.timeAdvanced": "world.timeAdvanced",
        "agent.startedRoutine": "agent.startedRoutine",
        "agent.moved": "agent.moved",
        "agent.continuedRoutine": "agent.continuedRoutine",
        "realm.interventionSubmitted": "realm.interventionSubmitted",
        "simulation.inputRejected": "simulation.inputRejected",
        "memory.seeded": "memory.seeded",
      },
      payloadKeys: {
        seedId: "seedId",
        personaIds: "personaIds",
        locationIds: "locationIds",
        initialStatus: "initialStatus",
        personaId: "personaId",
        locationId: "locationId",
        status: "status",
        from: "from",
        to: "to",
        timeScale: "timeScale",
        stepId: "stepId",
        routineId: "routineId",
        fromLocationId: "fromLocationId",
        toLocationId: "toLocationId",
        reason: "reason",
        period: "period",
        intent: "intent",
        provenance: "provenance",
        inputId: "inputId",
        commandKind: "commandKind",
        accepted: "accepted",
        summary: "summary",
        code: "code",
        message: "message",
        seedBatchId: "seedBatchId",
        memoryIds: "memoryIds",
        note: "note",
      },
    },
  },
};

export function getCopy(language: AppLanguage): CopyBundle {
  return UI_COPY[language];
}

export function toggleLanguage(language: AppLanguage): AppLanguage {
  return language === "zh" ? "en" : "zh";
}

export function htmlLanguage(language: AppLanguage): string {
  return language === "zh" ? "zh-CN" : "en";
}

export function formatSourceLabel(language: AppLanguage, source: EventSource): string {
  return UI_COPY[language].badges[source] ?? source;
}

export function formatWorldStatusLabel(language: AppLanguage, status: WorldStatus): string {
  return UI_COPY[language].badges[status] ?? status;
}

export function formatAgentStatusLabel(language: AppLanguage, status: AgentStatus): string {
  return UI_COPY[language].badges[status] ?? status;
}

export function formatPayloadStatusLabel(language: AppLanguage, status: string): string {
  return UI_COPY[language].badges[status as WorldStatus | AgentStatus] ?? status;
}

export function formatAgentDisplayName(language: AppLanguage, agentOrPersonaId: string, fallback: string): string {
  if (language !== "zh") return fallback;
  const normalizedId = agentOrPersonaId.replace(/^agent_/, "");
  const names: Record<string, string> = {
    elysia: "爱莉希雅",
    kevin: "凯文",
    eden: "伊甸",
  };
  return names[normalizedId] ?? fallback;
}

export function formatEntityLabel(language: AppLanguage, id: string): string {
  if (language !== "zh") return id;
  if (id.startsWith("agent_")) return formatAgentDisplayName(language, id, id);
  const locations = UI_COPY.zh.locations.names;
  if (locations[id]) return locations[id];
  if (id === "world_elysian_observation_mvp") return "观测世界";
  return id;
}

export function formatPersonaText(language: AppLanguage, personaId: string, text: string): string {
  if (language !== "zh") return text;
  const translations: Record<string, Record<string, string>> = {
    elysia: {
      "Warm social guide who draws others into gentle observation and conversation.": "温暖的社交引导者，会把他人带入温和观察与交谈。",
      "keep the realm emotionally welcoming": "让乐土始终保持情感上的欢迎感",
      "notice lonely residents before they withdraw": "在居民退缩前察觉他们的孤独",
      "Respects his burden while trying to draw out quieter feelings.": "尊重他的重负，同时试着引出更安静的情感。",
      "Shares an appreciation for beauty, hospitality, and reflective conversation.": "共同珍视美、待客之道与带有反思的交谈。",
      beauty: "美",
      connection: "连接",
      curiosity: "好奇",
      "kind candor": "温柔坦诚",
      empathetic: "共情",
      curious: "好奇",
      performative: "富有表现力",
      "emotionally perceptive": "敏锐感知情绪",
    },
    kevin: {
      "Reserved protector who prioritizes duty and watches the realm from a distance.": "克制的守护者，把职责放在首位，并从远处注视乐土。",
      "maintain stability in the realm": "维持乐土稳定",
      "avoid letting personal weight harm others": "避免让自己的重负伤及他人",
      "Trusts her perception but may resist being drawn into public emotion.": "信任她的感知，但可能抗拒被带入公开情绪。",
      "Values her composure and her ability to make silence comfortable.": "重视她的从容，以及让沉默变得舒适的能力。",
      duty: "职责",
      endurance: "忍耐",
      restraint: "克制",
      "protective resolve": "守护的决意",
      stoic: "沉静",
      protective: "保护欲强",
      disciplined: "自律",
      distant: "疏离",
    },
    eden: {
      "Elegant artist-patron who preserves atmosphere, memory, and hospitality.": "优雅的艺术守护者，珍视氛围、记忆与待客之道。",
      "keep the realm's shared spaces emotionally resonant": "让乐土共享空间保有情感共鸣",
      "offer comfort without demanding confession": "给予安慰而不强迫他人倾诉",
      "Enjoys her brightness and often helps make gatherings feel effortless.": "欣赏她的明亮，也常帮助聚会变得自然轻松。",
      "Respects his silence and offers comfort in indirect, low-pressure ways.": "尊重他的沉默，并以间接、低压力的方式提供安慰。",
      art: "艺术",
      generosity: "慷慨",
      poise: "从容",
      remembrance: "铭记",
      gracious: "优雅",
      reflective: "善于反思",
      generous: "慷慨",
      composed: "沉着",
    },
  };
  return translations[personaId]?.[text] ?? text;
}

export function formatRelationshipGroup(language: AppLanguage, group: string): string {
  if (language !== "zh") return group;
  return { tense: "紧张", trusted: "互信", developing: "发展中" }[group] ?? group;
}

export function formatProvenanceLabel(language: AppLanguage, provenance: string): string {
  if (language !== "zh") return provenance;
  return { configured: "配置", generated: "生成", user: "用户", system: "系统" }[provenance] ?? provenance;
}

export function formatCommandKindLabel(language: AppLanguage, commandKind: string | undefined): string {
  if (!commandKind || language !== "zh") return commandKind ?? "";
  return {
    observerCommand: "观察者命令",
    realmEvent: "领域事件",
    directPrivateMessage: "私信",
  }[commandKind] ?? commandKind;
}

export function formatCommandSummary(language: AppLanguage, summary: string | undefined): string | undefined {
  if (!summary || language !== "zh") return summary;
  const summaries: Record<string, string> = {
    "observerCommand:pause": "观察者命令：暂停",
    "observerCommand:resume": "观察者命令：继续",
    "observerCommand:setTimeScale": "观察者命令：设置时间倍率",
    directPrivateMessage: "私信",
  };
  if (summary.startsWith("realmEvent:")) return `领域事件：${summary.slice("realmEvent:".length)}`;
  return summaries[summary] ?? summary;
}

export function formatDiagnosticMessage(language: AppLanguage, message: string): string {
  if (language !== "zh") return message;
  const exact: Record<string, string> = {
    "directPrivateMessage targetIds must contain exactly one known agent id": "私信目标必须且只能包含一个已知角色编号",
    "realmEvent targets must reference the active world, location, or agent": "领域事件目标必须引用当前世界、位置或角色",
    "observerCommand.payload.action must be step, pause, resume, or setTimeScale": "观察者命令动作必须是步进、暂停、继续或设置时间倍率",
    "input.command.targetIds must be a non-empty string array": "命令目标不能为空",
  };
  if (exact[message]) return exact[message];
  if (message.includes("event.payload")) return message.replaceAll("event.payload", "事件载荷").replaceAll("must be", "必须是");
  return message;
}

export function formatSimulationText(language: AppLanguage, text: string | undefined): string | undefined {
  if (!text || language !== "zh") return text;
  const texts: Record<string, string> = {
    "start the configured morning routine": "开始执行已配置的晨间日程",
    "Memory seeding is recorded as an event only; MemoryRecord storage is deferred.": "记忆种子仅记录为事件；记忆记录存储仍然延后。",
    "idle / no operation": "空闲 / 无操作",
    "in progress": "进行中",
  };
  return texts[text] ?? text;
}

export function formatDiagnosticLevelLabel(language: AppLanguage, level: DiagnosticLevel): string {
  return UI_COPY[language].badges[level] ?? level;
}

export function formatEventKindLabel(language: AppLanguage, kind: string): string {
  return UI_COPY[language].viewModels.eventKinds[kind] ?? kind;
}

export function formatPayloadKeyLabel(language: AppLanguage, key: string): string {
  return UI_COPY[language].viewModels.payloadKeys[key] ?? key;
}

export function formatLocationName(language: AppLanguage, locationId: string, fallback: string): string {
  return UI_COPY[language].locations.names[locationId] ?? fallback;
}

export function formatLocationDescription(language: AppLanguage, locationId: string, fallback: string): string {
  return UI_COPY[language].locations.descriptions[locationId] ?? fallback;
}
