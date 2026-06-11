import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import type { AppLanguage } from "../shared/i18n.js";
import type { RealmMapAgentMarker, RealmMapEventPulse, RealmMapLocationNode, RealmMapViewModel } from "../shared/viewModels.js";

interface RealmPixiStageProps {
  language: AppLanguage;
  viewModel: RealmMapViewModel;
  onSelectAgent: (agentId: string) => void;
  onSelectLocation: (locationId: string) => void;
}

interface StageSize {
  width: number;
  height: number;
}

interface StagePoint {
  x: number;
  y: number;
}

const STAGE_MIN_HEIGHT = 560;
const STAGE_PADDING = 44;
const LOCATION_RADIUS = 58;
const AGENT_RADIUS = 18;
const PULSE_LIMIT = 8;

const COLORS = {
  background: 0x07111e,
  cyan: 0x67e8f9,
  cyanMuted: 0x164e63,
  emerald: 0x74f0b2,
  gold: 0xf8c66a,
  goldDark: 0x78350f,
  ink: 0xedf7ff,
  inkMuted: 0x9fb4ca,
  panel: 0x0f172a,
  violet: 0xc4b5fd,
  red: 0xfb7185,
  slate: 0x1e293b,
};

export function RealmPixiStage({ language, viewModel, onSelectAgent, onSelectLocation }: RealmPixiStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | undefined>(undefined);
  const latestRenderRef = useRef({ language, viewModel, onSelectAgent, onSelectLocation });

  useEffect(() => {
    latestRenderRef.current = { language, viewModel, onSelectAgent, onSelectLocation };
    const app = appRef.current;
    if (app) renderLatestStage(app, latestRenderRef.current);
  }, [language, onSelectAgent, onSelectLocation, viewModel]);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return undefined;

    let disposed = false;
    let resizeObserver: ResizeObserver | undefined;
    const app = new Application();

    void app.init({
      antialias: true,
      autoDensity: true,
      backgroundAlpha: 0,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      resizeTo: host,
    }).then(() => {
      if (disposed) {
        app.destroy({ removeView: true }, { children: true });
        return;
      }
      app.canvas.setAttribute("aria-hidden", "true");
      app.canvas.classList.add("realm-pixi-canvas");
      host.appendChild(app.canvas);
      appRef.current = app;
      renderLatestStage(app, latestRenderRef.current);
      resizeObserver = new ResizeObserver(() => renderLatestStage(app, latestRenderRef.current));
      resizeObserver.observe(host);
    });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      appRef.current = undefined;
      app.stage.removeChildren().forEach((child) => child.destroy({ children: true }));
      app.destroy({ removeView: true }, { children: true });
    };
  }, []);

  return <div className="realm-pixi-stage" ref={containerRef} aria-hidden="true" />;
}

function renderLatestStage(app: Application, renderInput: RealmPixiStageProps): void {
  renderStage(app, renderInput.viewModel, renderInput.language, renderInput.onSelectAgent, renderInput.onSelectLocation);
}

function renderStage(
  app: Application,
  viewModel: RealmMapViewModel,
  language: AppLanguage,
  onSelectAgent: (agentId: string) => void,
  onSelectLocation: (locationId: string) => void,
): void {
  app.stage.removeChildren().forEach((child) => child.destroy({ children: true }));

  const size = createStageSize(app.canvas);
  const root = new Container();
  app.stage.addChild(root);

  drawBackdrop(root, size);
  drawLinks(root, viewModel, size);
  drawLocations(root, viewModel, size, language, onSelectLocation);
  drawAgents(root, viewModel, size, language, onSelectAgent);
  drawPulses(root, viewModel.pulses.slice(0, PULSE_LIMIT), viewModel.locations, size);
}

function createStageSize(canvas: HTMLCanvasElement): StageSize {
  return {
    width: Math.max(canvas.clientWidth, 720),
    height: Math.max(canvas.clientHeight, STAGE_MIN_HEIGHT),
  };
}

function drawBackdrop(root: Container, size: StageSize): void {
  const background = new Graphics()
    .roundRect(0, 0, size.width, size.height, 24)
    .fill({ color: COLORS.background, alpha: 0.94 })
    .stroke({ width: 1, color: COLORS.gold, alpha: 0.38 });
  root.addChild(background);

  const grid = new Graphics();
  for (let x = 0; x <= size.width; x += 34) {
    grid.moveTo(x, 0).lineTo(x, size.height).stroke({ width: 1, color: COLORS.ink, alpha: 0.045 });
  }
  for (let y = 0; y <= size.height; y += 34) {
    grid.moveTo(0, y).lineTo(size.width, y).stroke({ width: 1, color: COLORS.ink, alpha: 0.04 });
  }
  root.addChild(grid);

  const halo = new Graphics()
    .circle(size.width * 0.5, size.height * 0.44, Math.min(size.width, size.height) * 0.32)
    .fill({ color: COLORS.gold, alpha: 0.08 })
    .circle(size.width * 0.22, size.height * 0.24, Math.min(size.width, size.height) * 0.18)
    .fill({ color: COLORS.emerald, alpha: 0.09 })
    .circle(size.width * 0.78, size.height * 0.28, Math.min(size.width, size.height) * 0.17)
    .fill({ color: COLORS.violet, alpha: 0.08 })
    .circle(size.width * 0.68, size.height * 0.78, Math.min(size.width, size.height) * 0.18)
    .fill({ color: COLORS.cyan, alpha: 0.08 });
  root.addChild(halo);
}

function drawLinks(root: Container, viewModel: RealmMapViewModel, size: StageSize): void {
  const locationById = new Map(viewModel.locations.map((location) => [location.id, location]));
  const links = new Graphics();
  for (const link of viewModel.links) {
    const from = locationById.get(link.fromLocationId);
    const to = locationById.get(link.toLocationId);
    if (!from || !to) continue;
    const fromPoint = toStagePoint(from, size);
    const toPoint = toStagePoint(to, size);
    links.moveTo(fromPoint.x, fromPoint.y)
      .lineTo(toPoint.x, toPoint.y)
      .stroke({ width: 4, color: COLORS.gold, alpha: 0.42 });
    links.moveTo(fromPoint.x, fromPoint.y)
      .lineTo(toPoint.x, toPoint.y)
      .stroke({ width: 1, color: COLORS.cyan, alpha: 0.58 });
  }
  root.addChild(links);
}

function drawLocations(
  root: Container,
  viewModel: RealmMapViewModel,
  size: StageSize,
  language: AppLanguage,
  onSelectLocation: (locationId: string) => void,
): void {
  for (const location of viewModel.locations) {
    const point = toStagePoint(location, size);
    const node = new Container();
    node.x = point.x;
    node.y = point.y;
    node.eventMode = "static";
    node.cursor = "pointer";
    node.on("pointertap", () => onSelectLocation(location.id));

    const fillColor = location.selected ? COLORS.goldDark : COLORS.panel;
    const strokeColor = location.selected ? COLORS.gold : COLORS.cyan;
    const shell = new Graphics()
      .circle(0, 0, LOCATION_RADIUS + 10)
      .fill({ color: strokeColor, alpha: location.selected ? 0.18 : 0.08 })
      .circle(0, 0, LOCATION_RADIUS)
      .fill({ color: fillColor, alpha: 0.92 })
      .stroke({ width: location.selected ? 4 : 2, color: strokeColor, alpha: location.selected ? 0.95 : 0.72 });
    node.addChild(shell);

    const title = createText(location.displayName, 15, COLORS.ink, "bold");
    title.anchor.set(0.5);
    title.y = -17;
    node.addChild(title);

    const occupancy = createText(location.occupancyLabel, 11, COLORS.inkMuted);
    occupancy.anchor.set(0.5);
    occupancy.y = 8;
    node.addChild(occupancy);

    const recent = createText(formatRecentActivity(language, location.recentEventCount), 10, COLORS.cyan);
    recent.anchor.set(0.5);
    recent.y = 28;
    node.addChild(recent);

    root.addChild(node);
  }
}

function drawAgents(
  root: Container,
  viewModel: RealmMapViewModel,
  size: StageSize,
  language: AppLanguage,
  onSelectAgent: (agentId: string) => void,
): void {
  const locations = new Map(viewModel.locations.map((location) => [location.id, location]));
  for (const agent of viewModel.agents) {
    const location = locations.get(agent.locationId);
    if (!location) continue;
    const locationPoint = toStagePoint(location, size);
    const marker = new Container();
    marker.x = locationPoint.x + agent.xOffset;
    marker.y = locationPoint.y + LOCATION_RADIUS + 10 + agent.yOffset;
    marker.eventMode = "static";
    marker.cursor = "pointer";
    marker.on("pointertap", () => onSelectAgent(agent.id));

    const sourceColor = colorForSource(agent.activitySource);
    const body = new Graphics()
      .circle(0, 0, AGENT_RADIUS + (agent.selected ? 5 : 1))
      .fill({ color: agent.selected ? COLORS.gold : sourceColor, alpha: agent.selected ? 0.32 : 0.16 })
      .circle(0, 0, AGENT_RADIUS)
      .fill({ color: sourceColor, alpha: 0.96 })
      .stroke({ width: agent.selected ? 3 : 2, color: agent.selected ? COLORS.gold : COLORS.ink, alpha: 0.9 });
    marker.addChild(body);

    const initials = createText(createAgentInitials(agent.displayName), 10, COLORS.background, "bold");
    initials.anchor.set(0.5);
    initials.y = 0.5;
    marker.addChild(initials);

    const label = createText(agent.displayName, 11, COLORS.ink, "bold");
    label.anchor.set(0.5);
    label.y = 29;
    marker.addChild(label);

    if (agent.activityText) {
      const bubble = createText(truncateLabel(agent.activityText, language === "zh" ? 14 : 18), 10, COLORS.inkMuted);
      bubble.anchor.set(0.5);
      bubble.y = 45;
      marker.addChild(bubble);
    }

    root.addChild(marker);
  }
}

function drawPulses(root: Container, pulses: readonly RealmMapEventPulse[], locations: readonly RealmMapLocationNode[], size: StageSize): void {
  const locationById = new Map(locations.map((location) => [location.id, location]));
  pulses.forEach((pulse, index) => {
    const location = locationById.get(pulse.locationId);
    if (!location) return;
    const point = toStagePoint(location, size);
    const radius = LOCATION_RADIUS + 22 + index * 2;
    const ring = new Graphics()
      .circle(point.x, point.y, radius)
      .stroke({ width: 2, color: colorForPulse(pulse), alpha: Math.max(0.16, 0.5 - index * 0.05) });
    root.addChild(ring);
  });
}

function toStagePoint(location: RealmMapLocationNode, size: StageSize): StagePoint {
  const width = size.width - STAGE_PADDING * 2;
  const height = size.height - STAGE_PADDING * 2;
  return {
    x: STAGE_PADDING + width * (location.x / 100),
    y: STAGE_PADDING + height * (location.y / 100),
  };
}

function createText(text: string, fontSize: number, fill: number, fontWeight: "normal" | "bold" = "normal"): Text {
  return new Text({
    text,
    style: {
      align: "center",
      fill,
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      fontSize,
      fontWeight,
    },
  });
}

function colorForSource(source: RealmMapAgentMarker["activitySource"]): number {
  switch (source) {
    case "agent": return COLORS.emerald;
    case "llm": return COLORS.violet;
    case "user": return COLORS.gold;
    case "test": return COLORS.cyan;
    case "system": return COLORS.cyan;
  }
}

function colorForPulse(pulse: RealmMapEventPulse): number {
  if (pulse.tone === "error") return COLORS.red;
  if (pulse.tone === "neutral") return COLORS.slate;
  return colorForSource(pulse.tone);
}

function formatRecentActivity(language: AppLanguage, count: number): string {
  if (language === "zh") return count > 0 ? `${count} 条活动` : "安静";
  return count === 1 ? "1 activity" : count > 1 ? `${count} activities` : "quiet";
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

function truncateLabel(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, Math.max(0, limit - 1))}…` : text;
}
