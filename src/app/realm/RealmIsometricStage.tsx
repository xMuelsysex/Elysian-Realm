import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import type { AppLanguage } from "../shared/i18n.js";
import type { RealmMapAgentMarker, RealmMapEventPulse, RealmMapLocationNode, RealmMapViewModel } from "../shared/viewModels.js";

interface RealmIsometricStageProps {
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

interface IsoPoint {
  gridX: number;
  gridY: number;
}

interface IsoProjection {
  originX: number;
  originY: number;
  tileWidth: number;
  tileHeight: number;
  roomWidth: number;
  roomHeight: number;
  slabHeight: number;
}

const STAGE_MIN_HEIGHT = 560;
const ROOM_WIDTH = 10;
const ROOM_HEIGHT = 8;
const TILE_WIDTH = 76;
const TILE_HEIGHT = 38;
const PULSE_LIMIT = 8;

const COLORS = {
  background: 0xf5fbff,
  wallLeft: 0xf5fcff,
  wallRight: 0xdff6ff,
  wallLine: 0x9ddbf5,
  floorLight: 0xeaf9ff,
  floorMid: 0xbfebff,
  floorDark: 0x82cbea,
  slabLeft: 0x8fd2ef,
  slabRight: 0x65b8dc,
  ink: 0x12324a,
  inkMuted: 0x58738c,
  white: 0xffffff,
  cyan: 0x52bdf4,
  cyanSoft: 0xb9efff,
  emerald: 0x7ce3af,
  gold: 0xf7c76a,
  violet: 0xaa96ff,
  pink: 0xff8fb7,
  blue: 0x8edfff,
  red: 0xfb7185,
};

const LOCATION_ACCENTS = [COLORS.cyan, COLORS.emerald, COLORS.violet, COLORS.pink, COLORS.gold, COLORS.blue, COLORS.gold];
const LOCATION_GLYPHS = ["✦", "❉", "◈", "▣", "✸", "⌂", "✧"];
const ISO_LAYOUT: Record<string, IsoPoint> = {
  atrium: { gridX: 4.45, gridY: 3.55 },
  garden: { gridX: 1.55, gridY: 2.15 },
  lounge: { gridX: 7.05, gridY: 3.25 },
  archives: { gridX: 8.15, gridY: 1.65 },
  "training-hall": { gridX: 4.35, gridY: 1.35 },
  quarters: { gridX: 1.65, gridY: 6.15 },
  overlook: { gridX: 7.4, gridY: 6.35 },
};

export function RealmIsometricStage({ language, viewModel, onSelectAgent, onSelectLocation }: RealmIsometricStageProps) {
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
    let initialized = false;
    let tornDown = false;
    let resizeObserver: ResizeObserver | undefined;
    const app = new Application();

    const teardown = () => {
      if (tornDown) return;
      tornDown = true;
      resizeObserver?.disconnect();
      resizeObserver = undefined;
      if (appRef.current === app) appRef.current = undefined;
      app.stage.removeChildren().forEach((child) => child.destroy({ children: true }));
      app.destroy({ removeView: true }, { children: true });
    };

    void app.init({
      antialias: true,
      autoDensity: true,
      backgroundAlpha: 0,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      resizeTo: host,
    }).then(() => {
      initialized = true;
      if (disposed) {
        teardown();
        return;
      }
      app.canvas.setAttribute("aria-hidden", "true");
      app.canvas.classList.add("realm-pixi-canvas");
      host.appendChild(app.canvas);
      appRef.current = app;
      renderLatestStage(app, latestRenderRef.current);
      resizeObserver = new ResizeObserver(() => renderLatestStage(app, latestRenderRef.current));
      resizeObserver.observe(host);
    }).catch((error: unknown) => {
      if (!disposed) console.error("RealmIsometricStage failed to initialize Pixi application", error);
      if (initialized) teardown();
    });

    return () => {
      disposed = true;
      if (initialized) teardown();
    };
  }, []);

  return <div className="realm-pixi-stage realm-isometric-stage" ref={containerRef} aria-hidden="true" />;
}

function renderLatestStage(app: Application, renderInput: RealmIsometricStageProps): void {
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
  const projection = createProjection(size);
  const root = new Container();
  app.stage.addChild(root);

  drawBackdrop(root, size);
  drawRoomShell(root, projection);
  drawLocationZones(root, viewModel.locations, projection);
  drawLocations(root, viewModel, projection, onSelectLocation);
  drawAgents(root, viewModel, projection, onSelectAgent);
  drawPulses(root, viewModel.pulses.slice(0, PULSE_LIMIT), viewModel.locations, projection, language);
}

function createStageSize(canvas: HTMLCanvasElement): StageSize {
  return {
    width: Math.max(canvas.clientWidth, 720),
    height: Math.max(canvas.clientHeight, STAGE_MIN_HEIGHT),
  };
}

function createProjection(size: StageSize): IsoProjection {
  const scale = Math.min(size.width / 980, size.height / 680, 1.12);
  return {
    originX: size.width * 0.5,
    originY: size.height * 0.22,
    tileWidth: TILE_WIDTH * scale,
    tileHeight: TILE_HEIGHT * scale,
    roomWidth: ROOM_WIDTH,
    roomHeight: ROOM_HEIGHT,
    slabHeight: 34 * scale,
  };
}

function drawBackdrop(root: Container, size: StageSize): void {
  const background = new Graphics()
    .roundRect(0, 0, size.width, size.height, 24)
    .fill({ color: COLORS.background, alpha: 0.98 })
    .stroke({ width: 1, color: COLORS.white, alpha: 0.76 });
  root.addChild(background);

  const grid = new Graphics();
  for (let x = 0; x <= size.width; x += 36) {
    grid.moveTo(x, 0).lineTo(x, size.height).stroke({ width: 1, color: COLORS.wallLine, alpha: 0.12 });
  }
  for (let y = 0; y <= size.height; y += 36) {
    grid.moveTo(0, y).lineTo(size.width, y).stroke({ width: 1, color: COLORS.wallLine, alpha: 0.1 });
  }
  root.addChild(grid);

  const glow = new Graphics()
    .circle(size.width * 0.18, size.height * 0.16, Math.min(size.width, size.height) * 0.25)
    .fill({ color: COLORS.cyan, alpha: 0.12 })
    .circle(size.width * 0.84, size.height * 0.2, Math.min(size.width, size.height) * 0.24)
    .fill({ color: COLORS.pink, alpha: 0.11 })
    .circle(size.width * 0.55, size.height * 0.88, Math.min(size.width, size.height) * 0.22)
    .fill({ color: COLORS.gold, alpha: 0.09 });
  root.addChild(glow);
}

function drawRoomShell(root: Container, projection: IsoProjection): void {
  drawWalls(root, projection);
  drawFloor(root, projection);
}

function drawWalls(root: Container, projection: IsoProjection): void {
  const top = isoToScreen(projection, 0, 0);
  const right = isoToScreen(projection, projection.roomWidth, 0);
  const left = isoToScreen(projection, 0, projection.roomHeight);
  const wallHeight = projection.tileHeight * 4.2;

  const wallLayer = new Graphics();
  wallLayer
    .moveTo(top.x, top.y - wallHeight)
    .lineTo(right.x, right.y - wallHeight)
    .lineTo(right.x, right.y + projection.tileHeight * 0.6)
    .lineTo(top.x, top.y + projection.tileHeight * 0.6)
    .closePath()
    .fill({ color: COLORS.wallRight, alpha: 0.74 })
    .stroke({ width: 3, color: COLORS.white, alpha: 0.76 })
    .moveTo(top.x, top.y - wallHeight)
    .lineTo(left.x, left.y - wallHeight)
    .lineTo(left.x, left.y + projection.tileHeight * 0.6)
    .lineTo(top.x, top.y + projection.tileHeight * 0.6)
    .closePath()
    .fill({ color: COLORS.wallLeft, alpha: 0.82 })
    .stroke({ width: 3, color: COLORS.white, alpha: 0.76 });
  root.addChild(wallLayer);

  const wallLines = new Graphics();
  for (let index = 1; index < projection.roomWidth; index += 1) {
    const point = isoToScreen(projection, index, 0);
    wallLines.moveTo(point.x, point.y - wallHeight * 0.9).lineTo(point.x, point.y + projection.tileHeight * 0.35)
      .stroke({ width: 1.5, color: COLORS.wallLine, alpha: 0.28 });
  }
  for (let index = 1; index < projection.roomHeight; index += 1) {
    const point = isoToScreen(projection, 0, index);
    wallLines.moveTo(point.x, point.y - wallHeight * 0.9).lineTo(point.x, point.y + projection.tileHeight * 0.35)
      .stroke({ width: 1.5, color: COLORS.wallLine, alpha: 0.2 });
  }
  root.addChild(wallLines);
}

function drawFloor(root: Container, projection: IsoProjection): void {
  const top = isoToScreen(projection, 0, 0);
  const right = isoToScreen(projection, projection.roomWidth, 0);
  const bottom = isoToScreen(projection, projection.roomWidth, projection.roomHeight);
  const left = isoToScreen(projection, 0, projection.roomHeight);

  const slab = new Graphics()
    .moveTo(left.x, left.y)
    .lineTo(bottom.x, bottom.y)
    .lineTo(bottom.x, bottom.y + projection.slabHeight)
    .lineTo(left.x, left.y + projection.slabHeight)
    .closePath()
    .fill({ color: COLORS.slabLeft, alpha: 0.95 })
    .moveTo(right.x, right.y)
    .lineTo(bottom.x, bottom.y)
    .lineTo(bottom.x, bottom.y + projection.slabHeight)
    .lineTo(right.x, right.y + projection.slabHeight)
    .closePath()
    .fill({ color: COLORS.slabRight, alpha: 0.94 })
    .stroke({ width: 1, color: COLORS.white, alpha: 0.25 });
  root.addChild(slab);

  const floor = new Graphics();
  for (let gridY = 0; gridY < projection.roomHeight; gridY += 1) {
    for (let gridX = 0; gridX < projection.roomWidth; gridX += 1) {
      const center = isoToScreen(projection, gridX + 0.5, gridY + 0.5);
      drawDiamond(floor, center.x, center.y, projection.tileWidth, projection.tileHeight)
        .fill({ color: (gridX + gridY) % 2 === 0 ? COLORS.floorLight : COLORS.floorMid, alpha: 0.96 })
        .stroke({ width: 1, color: COLORS.white, alpha: 0.64 });
    }
  }
  root.addChild(floor);

  const rugCenter = isoToScreen(projection, 5.05, 4.05);
  const rug = new Graphics()
    .ellipse(rugCenter.x, rugCenter.y, projection.tileWidth * 1.15, projection.tileHeight * 0.78)
    .fill({ color: COLORS.pink, alpha: 0.48 })
    .ellipse(rugCenter.x, rugCenter.y, projection.tileWidth * 0.7, projection.tileHeight * 0.45)
    .fill({ color: COLORS.white, alpha: 0.48 })
    .stroke({ width: 2, color: COLORS.white, alpha: 0.74 });
  root.addChild(rug);
}

function drawLocationZones(root: Container, locations: readonly RealmMapLocationNode[], projection: IsoProjection): void {
  const zones = new Graphics();
  locations.forEach((location, index) => {
    if (location.id === "atrium") return;
    const point = resolveLocationPoint(location, index);
    const center = isoToScreen(projection, point.gridX + 0.5, point.gridY + 0.5);
    drawDiamond(zones, center.x, center.y, projection.tileWidth * 1.28, projection.tileHeight * 0.86)
      .fill({ color: accentForIndex(index), alpha: 0.18 })
      .stroke({ width: 2, color: accentForIndex(index), alpha: 0.32 });
  });
  root.addChild(zones);
}

function drawLocations(
  root: Container,
  viewModel: RealmMapViewModel,
  projection: IsoProjection,
  onSelectLocation: (locationId: string) => void,
): void {
  viewModel.locations.forEach((location, index) => {
    const point = resolveLocationPoint(location, index);
    const screen = isoToScreen(projection, point.gridX + 0.5, point.gridY + 0.5, projection.tileHeight * 0.46);
    const accent = location.selected ? COLORS.gold : accentForIndex(index);
    const node = new Container();
    node.x = screen.x;
    node.y = screen.y;
    node.eventMode = "static";
    node.cursor = "pointer";
    node.on("pointertap", () => onSelectLocation(location.id));

    const marker = new Graphics()
      .roundRect(-20, -58, 40, 42, 12)
      .fill({ color: COLORS.white, alpha: 0.96 })
      .stroke({ width: location.selected ? 3 : 2, color: accent, alpha: 0.92 });
    node.addChild(marker);

    const glyph = createText(LOCATION_GLYPHS[index % LOCATION_GLYPHS.length], 15, COLORS.ink, "bold");
    glyph.anchor.set(0.5);
    glyph.y = -37;
    node.addChild(glyph);

    const labelWidth = Math.max(56, Math.min(92, location.displayName.length * 15 + 24));
    const label = new Graphics()
      .roundRect(-labelWidth / 2, -12, labelWidth, 24, 12)
      .fill({ color: COLORS.white, alpha: 0.98 })
      .stroke({ width: 2, color: accent, alpha: 0.78 });
    node.addChild(label);

    const title = createText(location.displayName, 12, COLORS.ink, "bold");
    title.anchor.set(0.5);
    node.addChild(title);

    root.addChild(node);
  });
}

function drawAgents(
  root: Container,
  viewModel: RealmMapViewModel,
  projection: IsoProjection,
  onSelectAgent: (agentId: string) => void,
): void {
  const locations = new Map(viewModel.locations.map((location, index) => [location.id, resolveLocationPoint(location, index)]));
  const sortedAgents = [...viewModel.agents].sort((left, right) => {
    const leftLocation = locations.get(left.locationId);
    const rightLocation = locations.get(right.locationId);
    return (leftLocation ? leftLocation.gridX + leftLocation.gridY : 0) - (rightLocation ? rightLocation.gridX + rightLocation.gridY : 0);
  });

  sortedAgents.forEach((agent) => {
    const point = locations.get(agent.locationId);
    if (!point) return;
    const base = isoToScreen(projection, point.gridX + 0.7, point.gridY + 0.72);
    const marker = new Container();
    marker.x = base.x + agent.xOffset * 0.35;
    marker.y = base.y + agent.yOffset * 0.25;
    marker.eventMode = "static";
    marker.cursor = "pointer";
    marker.on("pointertap", () => onSelectAgent(agent.id));

    const sourceColor = colorForSource(agent.activitySource);
    const shadow = new Graphics()
      .ellipse(0, 24, 18, 7)
      .fill({ color: COLORS.ink, alpha: 0.16 });
    marker.addChild(shadow);

    const body = new Graphics()
      .roundRect(-12, 2, 24, 30, 12)
      .fill({ color: agent.selected ? COLORS.gold : sourceColor, alpha: 0.78 })
      .stroke({ width: 2, color: COLORS.white, alpha: 0.92 })
      .circle(0, -8, 15)
      .fill({ color: 0xffd5e4, alpha: 0.98 })
      .stroke({ width: 2, color: COLORS.white, alpha: 0.94 });
    marker.addChild(body);

    const eyes = new Graphics()
      .circle(-4, -9, 1.6)
      .fill({ color: COLORS.ink, alpha: 0.9 })
      .circle(4, -9, 1.6)
      .fill({ color: COLORS.ink, alpha: 0.9 });
    marker.addChild(eyes);

    root.addChild(marker);
  });
}

function drawPulses(
  root: Container,
  pulses: readonly RealmMapEventPulse[],
  locations: readonly RealmMapLocationNode[],
  projection: IsoProjection,
  language: AppLanguage,
): void {
  const locationById = new Map(locations.map((location, index) => [location.id, { location, index }]));
  pulses.forEach((pulse, pulseIndex) => {
    const entry = locationById.get(pulse.locationId);
    if (!entry) return;
    const point = resolveLocationPoint(entry.location, entry.index);
    const screen = isoToScreen(projection, point.gridX + 0.5, point.gridY + 0.5, 4);
    const color = colorForPulse(pulse);
    const ring = new Graphics()
      .ellipse(screen.x, screen.y + 3, projection.tileWidth * (0.45 + pulseIndex * 0.035), projection.tileHeight * (0.24 + pulseIndex * 0.02))
      .stroke({ width: 2, color, alpha: Math.max(0.14, 0.52 - pulseIndex * 0.06) });
    root.addChild(ring);

    if (pulseIndex < 2) {
      const label = createText(formatPulseLabel(pulse, language), 10, color, "bold");
      label.anchor.set(0.5);
      label.x = screen.x;
      label.y = screen.y - projection.tileHeight * 0.78 - pulseIndex * 14;
      root.addChild(label);
    }
  });
}

function isoToScreen(projection: IsoProjection, gridX: number, gridY: number, z = 0): StagePoint {
  return {
    x: projection.originX + (gridX - gridY) * projection.tileWidth * 0.5,
    y: projection.originY + (gridX + gridY) * projection.tileHeight * 0.5 - z,
  };
}

function drawDiamond(graphics: Graphics, x: number, y: number, width: number, height: number): Graphics {
  return graphics
    .moveTo(x, y - height * 0.5)
    .lineTo(x + width * 0.5, y)
    .lineTo(x, y + height * 0.5)
    .lineTo(x - width * 0.5, y)
    .closePath();
}

function resolveLocationPoint(location: RealmMapLocationNode, index: number): IsoPoint {
  return ISO_LAYOUT[location.id] ?? createFallbackLocationPoint(index);
}

function createFallbackLocationPoint(index: number): IsoPoint {
  const columns = 4;
  return {
    gridX: 2 + (index % columns) * 1.8,
    gridY: 2 + Math.floor(index / columns) * 1.6,
  };
}

function accentForIndex(index: number): number {
  return LOCATION_ACCENTS[index % LOCATION_ACCENTS.length];
}

function createText(text: string, fontSize: number, fill: number, fontWeight: "normal" | "bold" = "normal"): Text {
  return new Text({
    text,
    style: {
      align: "center",
      fill,
      fontFamily: "Nunito, Inter, ui-sans-serif, system-ui, sans-serif",
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
  if (pulse.tone === "neutral") return COLORS.inkMuted;
  return colorForSource(pulse.tone);
}

function formatPulseLabel(pulse: RealmMapEventPulse, language: AppLanguage): string {
  if (pulse.tone === "error") return language === "zh" ? "错误" : "error";
  return pulse.label;
}

