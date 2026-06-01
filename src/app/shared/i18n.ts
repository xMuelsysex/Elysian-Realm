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
  timeline: {
    eyebrow: string;
    title: string;
    empty: string;
    id: string;
    step: string;
    time: string;
    targets: string;
    payloadJson: string;
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
      title: "Elysian Realm 管理台",
      loading: "正在加载管理状态…",
      unknownError: "未知管理界面错误",
    },
    language: {
      toggleButton: "中文 / English",
      toggleAriaLabel: "切换中文和英文界面",
    },
    dashboard: {
      sideLabel: "控制与诊断",
    },
    world: {
      metricsLabel: "世界状态指标",
      world: "世界",
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
    timeline: {
      eyebrow: "回放日志",
      title: "事件时间线",
      empty: "还没有事件。点击“步进”生成确定性的启动时间线。",
      id: "ID",
      step: "步进",
      time: "时间",
      targets: "目标",
      payloadJson: "Payload JSON",
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
      replayJson: "回放摘要 JSON",
      queuedJson: "排队输入 JSON",
    },
    badges: {
      system: "系统",
      user: "用户",
      agent: "角色",
      llm: "LLM",
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
      noPayload: "无 payload 详情",
      eventKinds: {
        "world.created": "世界创建",
        "agent.spawned": "角色生成",
        "world.timeAdvanced": "时间推进",
        "agent.startedRoutine": "开始日程",
        "realm.interventionSubmitted": "干预已提交",
        "simulation.inputRejected": "输入被拒绝",
        "memory.seeded": "记忆种子记录",
      },
      payloadKeys: {
        seedId: "种子 ID",
        personaIds: "人格 ID",
        locationIds: "位置 ID",
        initialStatus: "初始状态",
        personaId: "人格 ID",
        locationId: "位置 ID",
        status: "状态",
        from: "从",
        to: "到",
        timeScale: "时间倍率",
        stepId: "步进 ID",
        routineId: "日程 ID",
        intent: "意图",
        provenance: "来源标记",
        inputId: "输入 ID",
        commandKind: "命令类型",
        accepted: "已接受",
        summary: "摘要",
        code: "代码",
        message: "消息",
        seedBatchId: "种子批次 ID",
        memoryIds: "记忆 ID",
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
      toggleButton: "中文 / English",
      toggleAriaLabel: "Switch between Chinese and English UI",
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
    timeline: {
      eyebrow: "Replay log",
      title: "Event timeline",
      empty: "No events yet. Run one step to create the deterministic startup timeline.",
      id: "ID",
      step: "Step",
      time: "Time",
      targets: "Targets",
      payloadJson: "Payload JSON",
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
