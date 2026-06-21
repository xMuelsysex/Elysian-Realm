import { useEffect, useRef } from "react";
import { Application, Assets, Container, Graphics, Text, Texture } from "pixi.js";
import { parseMap, TiledMap } from "pixi-tiledmap";
import type { ResolvedLayer, ResolvedMap, ResolvedObjectLayer, TiledMapData } from "pixi-tiledmap";
import type { AppLanguage } from "../shared/i18n.js";
import type { RealmMapAgentMarker, RealmMapEventPulse, RealmMapLocationNode, RealmMapViewModel } from "../shared/viewModels.js";
import { REALM_TILED_MAP_ASSET } from "./realmTiledMapAssets.js";

interface RealmIsometricStageProps {
  language: AppLanguage;
  viewModel: RealmMapViewModel;
  onSelectAgent: (agentId: string) => void;
  onSelectLocation: (locationId: string) => void;
  onTiledMapErrorChange?: (message: string | undefined) => void;
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

interface RealmTiledMapResource {
  mapData: ResolvedMap;
  tilesetTextures: Map<string, Texture>;
  anchors: Map<string, StagePoint>;
}

interface LocationRenderEntry {
  location: RealmMapLocationNode;
  index: number;
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

let tiledMapResourcePromise: Promise<RealmTiledMapResource> | undefined;

export function RealmIsometricStage({ language, viewModel, onSelectAgent, onSelectLocation, onTiledMapErrorChange }: RealmIsometricStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | undefined>(undefined);
  const tiledMapResourceRef = useRef<RealmTiledMapResource | undefined>(undefined);
  const tiledMapErrorRef = useRef<string | undefined>(undefined);
  const latestRenderRef = useRef({ language, viewModel, onSelectAgent, onSelectLocation, onTiledMapErrorChange });

  useEffect(() => {
    latestRenderRef.current = { language, viewModel, onSelectAgent, onSelectLocation, onTiledMapErrorChange };
    const app = appRef.current;
    if (app) renderLatestStage(app, latestRenderRef.current, tiledMapResourceRef.current, tiledMapErrorRef.current);
  }, [language, onSelectAgent, onSelectLocation, onTiledMapErrorChange, viewModel]);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return undefined;

    let disposed = false;
    let initialized = false;
    let tornDown = false;
    let resizeObserver: ResizeObserver | undefined;
    const app = new Application();

    const setTiledMapError = (message: string | undefined) => {
      tiledMapErrorRef.current = message;
      latestRenderRef.current.onTiledMapErrorChange?.(message);
    };

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
      renderLatestStage(app, latestRenderRef.current, tiledMapResourceRef.current, tiledMapErrorRef.current);
      resizeObserver = new ResizeObserver(() => renderLatestStage(app, latestRenderRef.current, tiledMapResourceRef.current, tiledMapErrorRef.current));
      resizeObserver.observe(host);

      void loadRealmTiledMapResource().then((resource) => {
        if (disposed || tornDown) return;
        tiledMapResourceRef.current = resource;
        setTiledMapError(undefined);
        renderLatestStage(app, latestRenderRef.current, resource, undefined);
      }).catch((error: unknown) => {
        if (disposed || tornDown) return;
        const message = formatUnknownError(error);
        console.error("RealmIsometricStage failed to load Tiled map; keeping procedural fallback", error);
        setTiledMapError(message);
        renderLatestStage(app, latestRenderRef.current, undefined, message);
      });
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

function renderLatestStage(
  app: Application,
  renderInput: RealmIsometricStageProps,
  tiledMapResource: RealmTiledMapResource | undefined,
  tiledMapError: string | undefined,
): void {
  renderStage(app, renderInput.viewModel, renderInput.language, renderInput.onSelectAgent, renderInput.onSelectLocation, tiledMapResource, tiledMapError);
}

function renderStage(
  app: Application,
  viewModel: RealmMapViewModel,
  language: AppLanguage,
  onSelectAgent: (agentId: string) => void,
  onSelectLocation: (locationId: string) => void,
  tiledMapResource: RealmTiledMapResource | undefined,
  tiledMapError: string | undefined,
): void {
  app.stage.removeChildren().forEach((child) => child.destroy({ children: true }));

  const size = createStageSize(app.canvas);
  const projection = createProjection(size);
  const root = new Container();
  app.stage.addChild(root);

  drawBackdrop(root, size);
  if (tiledMapResource && !tiledMapError) drawTiledRoom(root, tiledMapResource, projection);
  else drawRoomShell(root, projection);
  drawLocationZones(root, viewModel.locations, projection, tiledMapResource && !tiledMapError ? tiledMapResource : undefined);
  drawLocations(root, viewModel, projection, onSelectLocation, tiledMapResource && !tiledMapError ? tiledMapResource : undefined);
  drawAgents(root, viewModel, projection, onSelectAgent, tiledMapResource && !tiledMapError ? tiledMapResource : undefined);
  drawPulses(root, viewModel.pulses.slice(0, PULSE_LIMIT), viewModel.locations, projection, language, tiledMapResource && !tiledMapError ? tiledMapResource : undefined);
  if (tiledMapError) drawTiledMapDiagnostic(root, size, tiledMapError, language);
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
    slabHeight: 24 * scale,
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

function drawTiledRoom(root: Container, resource: RealmTiledMapResource, projection: IsoProjection): void {
  drawTiledRoomShadow(root, resource.mapData, projection);
  drawTiledRoomBackWalls(root, resource.mapData, projection);
  const tiledMap = new TiledMap(resource.mapData, { tilesetTextures: resource.tilesetTextures });
  const scale = createTiledMapScale(resource.mapData, projection);
  tiledMap.x = projection.originX;
  tiledMap.y = projection.originY;
  tiledMap.scale.set(scale);
  tiledMap.alpha = 0.98;
  root.addChild(tiledMap);
}

function drawTiledRoomBackWalls(root: Container, mapData: ResolvedMap, projection: IsoProjection): void {
  const { top, right, left } = createTiledFootprint(mapData, projection);
  const wallHeight = projection.tileHeight * 2.35;
  const wallFoot = projection.tileHeight * 0.2;
  const walls = new Graphics()
    .moveTo(top.x, top.y - wallHeight)
    .lineTo(right.x, right.y - wallHeight)
    .lineTo(right.x, right.y + wallFoot)
    .lineTo(top.x, top.y + wallFoot)
    .closePath()
    .fill({ color: COLORS.wallRight, alpha: 0.46 })
    .stroke({ width: 2, color: COLORS.white, alpha: 0.56 })
    .moveTo(top.x, top.y - wallHeight)
    .lineTo(left.x, left.y - wallHeight)
    .lineTo(left.x, left.y + wallFoot)
    .lineTo(top.x, top.y + wallFoot)
    .closePath()
    .fill({ color: COLORS.wallLeft, alpha: 0.5 })
    .stroke({ width: 2, color: COLORS.white, alpha: 0.54 });
  root.addChild(walls);
}

function drawTiledRoomShadow(root: Container, mapData: ResolvedMap, projection: IsoProjection): void {
  const { top, right, bottom, left } = createTiledFootprint(mapData, projection);
  const contactShadow = new Graphics()
    .ellipse(bottom.x, bottom.y + projection.slabHeight * 1.05, projection.tileWidth * 3.7, projection.tileHeight * 0.72)
    .fill({ color: COLORS.ink, alpha: 0.045 });
  root.addChild(contactShadow);

  const shadow = new Graphics()
    .moveTo(left.x, left.y + projection.slabHeight * 0.28)
    .lineTo(bottom.x, bottom.y + projection.slabHeight * 0.28)
    .lineTo(bottom.x, bottom.y + projection.slabHeight)
    .lineTo(left.x, left.y + projection.slabHeight)
    .closePath()
    .fill({ color: COLORS.slabLeft, alpha: 0.28 })
    .moveTo(right.x, right.y + projection.slabHeight * 0.28)
    .lineTo(bottom.x, bottom.y + projection.slabHeight * 0.28)
    .lineTo(bottom.x, bottom.y + projection.slabHeight)
    .lineTo(right.x, right.y + projection.slabHeight)
    .closePath()
    .fill({ color: COLORS.slabRight, alpha: 0.25 });
  root.addChild(shadow);
  void top;
}

function createTiledFootprint(mapData: ResolvedMap, projection: IsoProjection): { top: StagePoint; right: StagePoint; bottom: StagePoint; left: StagePoint } {
  const scale = createTiledMapScale(mapData, projection);
  const halfTileWidth = mapData.tilewidth * 0.5;
  const halfTileHeight = mapData.tileheight * 0.5;
  return {
    top: localTiledToScreen(projection, halfTileWidth, 0, scale),
    right: localTiledToScreen(projection, (mapData.width + 1) * halfTileWidth, mapData.width * halfTileHeight, scale),
    bottom: localTiledToScreen(projection, (mapData.width - mapData.height + 1) * halfTileWidth, (mapData.width + mapData.height) * halfTileHeight, scale),
    left: localTiledToScreen(projection, (1 - mapData.height) * halfTileWidth, mapData.height * halfTileHeight, scale),
  };
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

function drawLocationZones(
  root: Container,
  locations: readonly RealmMapLocationNode[],
  projection: IsoProjection,
  tiledMapResource: RealmTiledMapResource | undefined,
): void {
  const zones = new Graphics();
  locations.forEach((location, index) => {
    if (location.id === "atrium") return;
    const center = resolveLocationScreen(location, index, projection, tiledMapResource);
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
  tiledMapResource: RealmTiledMapResource | undefined,
): void {
  viewModel.locations.forEach((location, index) => {
    const screen = resolveLocationScreen(location, index, projection, tiledMapResource, projection.tileHeight * 0.46);
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
  tiledMapResource: RealmTiledMapResource | undefined,
): void {
  const locationEntries = new Map(viewModel.locations.map((location, index) => [location.id, { location, index }]));
  const sortedAgents = [...viewModel.agents].sort((left, right) => resolveLocationDepth(left.locationId, locationEntries, tiledMapResource) - resolveLocationDepth(right.locationId, locationEntries, tiledMapResource));

  sortedAgents.forEach((agent) => {
    const entry = locationEntries.get(agent.locationId);
    if (!entry) return;
    const base = resolveAgentScreen(entry.location, entry.index, projection, tiledMapResource);
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
  tiledMapResource: RealmTiledMapResource | undefined,
): void {
  const locationById = new Map(locations.map((location, index) => [location.id, { location, index }]));
  pulses.forEach((pulse, pulseIndex) => {
    const entry = locationById.get(pulse.locationId);
    if (!entry) return;
    const screen = resolveLocationScreen(entry.location, entry.index, projection, tiledMapResource, 4);
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

function drawTiledMapDiagnostic(root: Container, size: StageSize, errorMessage: string, language: AppLanguage): void {
  const width = Math.min(560, size.width - 48);
  const box = new Container();
  box.x = 24;
  box.y = 24;
  const panel = new Graphics()
    .roundRect(0, 0, width, 96, 18)
    .fill({ color: 0x3b0f1a, alpha: 0.9 })
    .stroke({ width: 2, color: COLORS.red, alpha: 0.78 });
  box.addChild(panel);

  const title = createText(language === "zh" ? "Tiled 地图加载失败" : "Tiled map failed to load", 14, COLORS.white, "bold");
  title.x = 18;
  title.y = 14;
  box.addChild(title);

  const detail = new Text({
    text: `${language === "zh" ? "当前显示程序化回退场景。" : "Showing procedural fallback scene."} ${truncateDiagnostic(errorMessage)}`,
    style: {
      fill: 0xffd7df,
      fontFamily: "Nunito, Inter, ui-sans-serif, system-ui, sans-serif",
      fontSize: 11,
      fontWeight: "bold",
      lineHeight: 15,
      wordWrap: true,
      wordWrapWidth: width - 36,
    },
  });
  detail.x = 18;
  detail.y = 42;
  box.addChild(detail);
  root.addChild(box);
}

function isoToScreen(projection: IsoProjection, gridX: number, gridY: number, z = 0): StagePoint {
  return {
    x: projection.originX + (gridX - gridY) * projection.tileWidth * 0.5,
    y: projection.originY + (gridX + gridY) * projection.tileHeight * 0.5 - z,
  };
}

function localTiledToScreen(projection: IsoProjection, localX: number, localY: number, scale: number, z = 0): StagePoint {
  return {
    x: projection.originX + localX * scale,
    y: projection.originY + localY * scale - z,
  };
}

function createTiledMapScale(mapData: ResolvedMap, projection: IsoProjection): number {
  return projection.tileWidth / mapData.tilewidth;
}

function resolveLocationScreen(
  location: RealmMapLocationNode,
  index: number,
  projection: IsoProjection,
  tiledMapResource: RealmTiledMapResource | undefined,
  z = 0,
): StagePoint {
  const tiledAnchor = tiledMapResource?.anchors.get(location.id);
  if (tiledAnchor && tiledMapResource) return localTiledToScreen(projection, tiledAnchor.x, tiledAnchor.y, createTiledMapScale(tiledMapResource.mapData, projection), z);
  const point = resolveLocationPoint(location, index);
  return isoToScreen(projection, point.gridX + 0.5, point.gridY + 0.5, z);
}

function resolveAgentScreen(
  location: RealmMapLocationNode,
  index: number,
  projection: IsoProjection,
  tiledMapResource: RealmTiledMapResource | undefined,
): StagePoint {
  const tiledAnchor = tiledMapResource?.anchors.get(location.id);
  if (tiledAnchor && tiledMapResource) {
    const scale = createTiledMapScale(tiledMapResource.mapData, projection);
    return localTiledToScreen(projection, tiledAnchor.x + tiledMapResource.mapData.tilewidth * 0.18, tiledAnchor.y + tiledMapResource.mapData.tileheight * 0.22, scale);
  }
  const point = resolveLocationPoint(location, index);
  return isoToScreen(projection, point.gridX + 0.7, point.gridY + 0.72);
}

function resolveLocationDepth(locationId: string, locationEntries: ReadonlyMap<string, LocationRenderEntry>, tiledMapResource: RealmTiledMapResource | undefined): number {
  const entry = locationEntries.get(locationId);
  if (!entry) return 0;
  const tiledAnchor = tiledMapResource?.anchors.get(locationId);
  if (tiledAnchor) return tiledAnchor.y;
  const point = resolveLocationPoint(entry.location, entry.index);
  return point.gridX + point.gridY;
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

async function loadRealmTiledMapResource(): Promise<RealmTiledMapResource> {
  tiledMapResourcePromise ??= loadRealmTiledMapResourceOnce().catch((error: unknown) => {
    tiledMapResourcePromise = undefined;
    throw error;
  });
  return tiledMapResourcePromise;
}

async function loadRealmTiledMapResourceOnce(): Promise<RealmTiledMapResource> {
  const response = await fetch(REALM_TILED_MAP_ASSET.mapUrl);
  if (!response.ok) throw new Error(`Failed to fetch ${REALM_TILED_MAP_ASSET.mapUrl}: ${response.status} ${response.statusText}`);
  const data = await response.json() as unknown;
  if (!isTiledMapData(data)) throw new Error(`Invalid Tiled map shape at ${REALM_TILED_MAP_ASSET.mapUrl}`);
  if (data.orientation !== "isometric") throw new Error(`Expected isometric Tiled map, received ${data.orientation}`);
  if (data.width !== ROOM_WIDTH || data.height !== ROOM_HEIGHT) throw new Error(`Expected ${ROOM_WIDTH}×${ROOM_HEIGHT} Tiled map, received ${data.width}×${data.height}`);

  const mapData = parseMap(data);
  const anchors = createTiledAnchorMap(mapData);
  const tilesetTextures = await loadTilesetTextures(mapData);
  return { mapData, tilesetTextures, anchors };
}

async function loadTilesetTextures(mapData: ResolvedMap): Promise<Map<string, Texture>> {
  const entries = await Promise.all(mapData.tilesets.map(async (tileset) => {
    if (!tileset.image) return undefined;
    const texture = await Assets.load<Texture>(`${REALM_TILED_MAP_ASSET.basePath}${tileset.image}`);
    return [tileset.image, texture] as const;
  }));
  return new Map(entries.filter((entry): entry is readonly [string, Texture] => entry !== undefined));
}

function createTiledAnchorMap(mapData: ResolvedMap): Map<string, StagePoint> {
  const layer = findObjectLayer(mapData.layers, REALM_TILED_MAP_ASSET.hotspotLayerName);
  if (!layer) throw new Error(`Tiled map is missing object layer "${REALM_TILED_MAP_ASSET.hotspotLayerName}"`);
  const anchors = new Map<string, StagePoint>();
  for (const object of layer.objects) {
    if (!object.visible || !object.point || !object.name) continue;
    anchors.set(object.name, { x: object.x, y: object.y });
  }
  if (anchors.size === 0) throw new Error(`Tiled object layer "${REALM_TILED_MAP_ASSET.hotspotLayerName}" has no visible point anchors`);
  return anchors;
}

function findObjectLayer(layers: readonly ResolvedLayer[], name: string): ResolvedObjectLayer | undefined {
  for (const layer of layers) {
    if (layer.type === "objectgroup" && layer.name === name) return layer;
    if (layer.type === "group") {
      const nested = findObjectLayer(layer.layers, name);
      if (nested) return nested;
    }
  }
  return undefined;
}

function isTiledMapData(value: unknown): value is TiledMapData {
  if (!isObjectRecord(value)) return false;
  return value.type === "map"
    && typeof value.width === "number"
    && typeof value.height === "number"
    && typeof value.tilewidth === "number"
    && typeof value.tileheight === "number"
    && typeof value.orientation === "string"
    && Array.isArray(value.layers)
    && Array.isArray(value.tilesets);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown Tiled map load error";
}

function truncateDiagnostic(message: string): string {
  return message.length > 150 ? `${message.slice(0, 147)}…` : message;
}
