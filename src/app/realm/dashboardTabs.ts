import type { AppLanguage } from "../shared/i18n.js";

export type DashboardTabId = "overview" | "map" | "agents" | "events" | "control" | "debug";

export interface DashboardTabDefinition {
  id: DashboardTabId;
  zhLabel: string;
  enLabel: string;
  zhDescription: string;
  enDescription: string;
}

export const DASHBOARD_TABS: readonly DashboardTabDefinition[] = [
  {
    id: "overview",
    zhLabel: "总览",
    enLabel: "Overview",
    zhDescription: "世界状态、回执、诊断和最近变化。",
    enDescription: "World state, receipts, diagnostics, and recent changes.",
  },
  {
    id: "map",
    zhLabel: "地图",
    enLabel: "Map",
    zhDescription: "2D 地图、拓扑和地点占用。",
    enDescription: "2D map, topology, and location occupancy.",
  },
  {
    id: "agents",
    zhLabel: "角色",
    enLabel: "Agents",
    zhDescription: "角色详情、关系、计划、记忆和人格配置。",
    enDescription: "Agent details, relationships, plans, memories, and persona config.",
  },
  {
    id: "events",
    zhLabel: "事件",
    enLabel: "Events",
    zhDescription: "事件时间线、过滤器和回放控制。",
    enDescription: "Event timeline, filters, and replay controls.",
  },
  {
    id: "control",
    zhLabel: "控制",
    enLabel: "Control",
    zhDescription: "模拟控制、用户干预和临时 LLM 连接测试。",
    enDescription: "Simulation controls, user interventions, and temporary LLM tests.",
  },
  {
    id: "debug",
    zhLabel: "调试",
    enLabel: "Debug",
    zhDescription: "调试导出和原始管理状态。",
    enDescription: "Debug export and raw admin state.",
  },
] as const;

export const DEFAULT_DASHBOARD_TAB_ID: DashboardTabId = "overview";

export function getDashboardTabLabel(language: AppLanguage, tab: DashboardTabDefinition): string {
  return language === "zh" ? tab.zhLabel : tab.enLabel;
}

export function getDashboardTabDescription(language: AppLanguage, tab: DashboardTabDefinition): string {
  return language === "zh" ? tab.zhDescription : tab.enDescription;
}

export function findDashboardTab(tabId: DashboardTabId): DashboardTabDefinition {
  return DASHBOARD_TABS.find((tab) => tab.id === tabId) ?? DASHBOARD_TABS[0];
}
