import { useEffect, useRef } from "react";
import { Application, Assets, Container, Graphics, Text, Texture } from "pixi.js";
import { parseMap, TiledMap } from "pixi-tiledmap";
import type { ResolvedLayer, ResolvedMap, ResolvedObjectLayer, TiledMapData } from "pixi-tiledmap";
import type { AppLanguage } from "../shared/i18n.js";
import type { RealmMapAgentMarker, RealmMapEventPulse, RealmMapLocationNode, RealmMapViewModel } from "../shared/viewModels.js";
import { REALM_TILED_MAP_ASSET } from "./realmTiledMapAssets.js";

export type RealmMapInspectedItem =
  | { kind: "location"; id: string }
  | { kind: "agent"; id: string };

interface RealmIsometricStageProps {
  language: AppLanguage;
  viewModel: RealmMapViewModel;
  inspectedItem?: RealmMapInspectedItem;
  onInspectItemChange: (item: RealmMapInspectedItem | undefined) => void;
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
const DETAIL_CARD_WIDTH = 282;
const DETAIL_CARD_PADDING = 14;
const DETAIL_CARD_LINE_GAP = 6;
const ANIMATION_FRAME_INTERVAL_MS = 1000 / 24;
const BREATH_SPEED = 2.6;

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

export function RealmIsometricStage({ language, viewModel, inspectedItem, onInspectItemChange, onSelectAgent, onSelectLocation, onTiledMapErrorChange }: RealmIsometricStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | undefined>(undefined);
  const tiledMapResourceRef = useRef<RealmTiledMapResource | undefined>(undefined);
  const tiledMapErrorRef = useRef<string | undefined>(undefined);
  const latestRenderRef = useRef({ language, viewModel, inspectedItem, onInspectItemChange, onSelectAgent, onSelectLocation, onTiledMapErrorChange });
  const animationPhaseRef = useRef(0);

  useEffect(() => {
    latestRenderRef.current = { language, viewModel, inspectedItem, onInspectItemChange, onSelectAgent, onSelectLocation, onTiledMapErrorChange };
    const app = appRef.current;
    if (app) renderLatestStage(app, latestRenderRef.current, tiledMapResourceRef.current, tiledMapErrorRef.current, animationPhaseRef.current);
  }, [language, inspectedItem, onInspectItemChange, onSelectAgent, onSelectLocation, onTiledMapErrorChange, viewModel]);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return undefined;

    let disposed = false;
    let initialized = false;
    let tornDown = false;
    let resizeObserver: ResizeObserver | undefined;
    let lastAnimationRenderAt = 0;
    const app = new Application();

    const renderCurrentStage = () => renderLatestStage(app, latestRenderRef.current, tiledMapResourceRef.current, tiledMapErrorRef.current, animationPhaseRef.current);
    const onAnimationTick = () => {
      const now = performance.now();
      if (now - lastAnimationRenderAt < ANIMATION_FRAME_INTERVAL_MS) return;
      lastAnimationRenderAt = now;
      animationPhaseRef.current = now * 0.001 * BREATH_SPEED;
      renderCurrentStage();
    };

    const setTiledMapError = (message: string | undefined) => {
      tiledMapErrorRef.current = message;
      latestRenderRef.current.onTiledMapErrorChange?.(message);
    };

    const teardown = () => {
      if (tornDown) return;
      tornDown = true;
      resizeObserver?.disconnect();
      resizeObserver = undefined;
      app.ticker.remove(onAnimationTick);
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
      renderCurrentStage();
      app.ticker.add(onAnimationTick);
      resizeObserver = new ResizeObserver(renderCurrentStage);
      resizeObserver.observe(host);

      void loadRealmTiledMapResource().then((resource) => {
        if (disposed || tornDown) return;
        tiledMapResourceRef.current = resource;
        setTiledMapError(undefined);
        renderCurrentStage();
      }).catch((error: unknown) => {
        if (disposed || tornDown) return;
        const message = formatUnknownError(error);
        console.error("RealmIsometricStage failed to load Tiled map; keeping procedural fallback", error);
        setTiledMapError(message);
        renderCurrentStage();
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
  animationPhase: number,
): void {
  renderStage(app, renderInput.viewModel, renderInput.language, renderInput.inspectedItem, renderInput.onInspectItemChange, renderInput.onSelectAgent, renderInput.onSelectLocation, tiledMapResource, tiledMapError, animationPhase);
}

function renderStage(
  app: Application,
  viewModel: RealmMapViewModel,
  language: AppLanguage,
  inspectedItem: RealmMapInspectedItem | undefined,
  onInspectItemChange: (item: RealmMapInspectedItem | undefined) => void,
  onSelectAgent: (agentId: string) => void,
  onSelectLocation: (locationId: string) => void,
  tiledMapResource: RealmTiledMapResource | undefined,
  tiledMapError: string | undefined,
  animationPhase: number,
): void {
  app.stage.removeChildren().forEach((child) => child.destroy({ children: true }));

  const size = createStageSize(app.canvas);
  const projection = createProjection(size);
  const root = new Container();
  app.stage.addChild(root);

  const activeTiledMapResource = tiledMapResource && !tiledMapError ? tiledMapResource : undefined;
  const inspectedTarget = resolveInspectedTarget(viewModel, inspectedItem);
  const detailTarget = inspectedTarget ?? resolveSelectedDetailTarget(viewModel);

  drawBackdrop(root, size);
  if (activeTiledMapResource) drawTiledRoom(root, activeTiledMapResource, projection);
  else drawRoomShell(root, projection);
  drawLocationZones(root, viewModel.locations, projection, activeTiledMapResource, inspectedTarget, animationPhase);
  drawLocations(root, viewModel, projection, inspectedTarget, onInspectItemChange, onSelectLocation, activeTiledMapResource, animationPhase);
  drawAgents(root, viewModel, projection, inspectedTarget, onInspectItemChange, onSelectAgent, activeTiledMapResource, animationPhase);
  drawPulses(root, viewModel.pulses.slice(0, PULSE_LIMIT), viewModel.locations, projection, language, activeTiledMapResource, animationPhase);
  if (detailTarget) drawDetailCard(root, size, projection, viewModel, detailTarget, activeTiledMapResource, language, animationPhase);
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
  detailTarget: RealmMapInspectedItem | undefined,
  animationPhase: number,
): void {
  const zones = new Graphics();
  locations.forEach((location, index) => {
    if (location.id === "atrium") return;
    const inspected = detailTarget?.kind === "location" && detailTarget.id === location.id;
    const selected = location.selected;
    const motion = selected || inspected ? pulseWave(animationPhase, index * 0.45) : 0;
    const zoneScale = 1 + motion * 0.045;
    const center = resolveLocationScreen(location, index, projection, tiledMapResource);
    drawDiamond(zones, center.x, center.y, projection.tileWidth * (inspected ? 1.46 : 1.28) * zoneScale, projection.tileHeight * (inspected ? 1.02 : 0.86) * zoneScale)
      .fill({ color: selected ? COLORS.gold : accentForIndex(index), alpha: inspected ? 0.28 + motion * 0.08 : selected ? 0.22 + motion * 0.07 : 0.18 })
      .stroke({ width: inspected ? 4 : selected ? 3 : 2, color: selected ? COLORS.gold : accentForIndex(index), alpha: inspected ? 0.62 + motion * 0.16 : selected ? 0.46 + motion * 0.12 : 0.32 });
  });
  root.addChild(zones);
}

function isSameInspectedItem(left: RealmMapInspectedItem | undefined, right: RealmMapInspectedItem): boolean {
  return left?.kind === right.kind && left.id === right.id;
}

function pulseWave(animationPhase: number, offset = 0): number {
  return (Math.sin(animationPhase + offset) + 1) * 0.5;
}

function drawLocations(
  root: Container,
  viewModel: RealmMapViewModel,
  projection: IsoProjection,
  detailTarget: RealmMapInspectedItem | undefined,
  onInspectItemChange: (item: RealmMapInspectedItem | undefined) => void,
  onSelectLocation: (locationId: string) => void,
  tiledMapResource: RealmTiledMapResource | undefined,
  animationPhase: number,
): void {
  viewModel.locations.forEach((location, index) => {
    const inspectedItem = { kind: "location", id: location.id } as const;
    const inspected = isSameInspectedItem(detailTarget, inspectedItem);
    const selected = location.selected;
    const motion = selected || inspected ? pulseWave(animationPhase, index * 0.5) : 0;
    const screen = resolveLocationScreen(location, index, projection, tiledMapResource, projection.tileHeight * 0.46);
    const accent = selected ? COLORS.gold : accentForIndex(index);
    const node = new Container();
    node.x = screen.x;
    node.y = screen.y - motion * 1.6;
    node.scale.set((inspected ? 1.06 : 1) + motion * (inspected ? 0.022 : selected ? 0.014 : 0));
    node.eventMode = "static";
    node.cursor = "pointer";
    node.on("pointerover", () => onInspectItemChange(inspectedItem));
    node.on("pointerout", () => onInspectItemChange(undefined));
    node.on("pointertap", () => {
      onInspectItemChange(inspectedItem);
      onSelectLocation(location.id);
    });

    if (inspected || selected) {
      const glow = new Graphics()
        .roundRect(-25 - motion * 1.6, -63 - motion * 1.6, 50 + motion * 3.2, 52 + motion * 3.2, 16)
        .fill({ color: accent, alpha: inspected ? 0.16 + motion * 0.08 : 0.1 + motion * 0.05 })
        .stroke({ width: inspected ? 4 : 3, color: accent, alpha: inspected ? 0.4 + motion * 0.16 : 0.26 + motion * 0.12 });
      node.addChild(glow);
    }

    const marker = new Graphics()
      .roundRect(-20, -58, 40, 42, 12)
      .fill({ color: COLORS.white, alpha: 0.96 })
      .stroke({ width: inspected ? 4 : selected ? 3 : 2, color: accent, alpha: inspected ? 1 : 0.92 });
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
  detailTarget: RealmMapInspectedItem | undefined,
  onInspectItemChange: (item: RealmMapInspectedItem | undefined) => void,
  onSelectAgent: (agentId: string) => void,
  tiledMapResource: RealmTiledMapResource | undefined,
  animationPhase: number,
): void {
  const locationEntries = new Map(viewModel.locations.map((location, index) => [location.id, { location, index }]));
  const sortedAgents = [...viewModel.agents].sort((left, right) => resolveLocationDepth(left.locationId, locationEntries, tiledMapResource) - resolveLocationDepth(right.locationId, locationEntries, tiledMapResource));

  sortedAgents.forEach((agent) => {
    const entry = locationEntries.get(agent.locationId);
    if (!entry) return;
    const inspectedItem = { kind: "agent", id: agent.id } as const;
    const inspected = isSameInspectedItem(detailTarget, inspectedItem);
    const selected = agent.selected;
    const motion = selected || inspected ? pulseWave(animationPhase, entry.index * 0.4 + agent.id.length * 0.13) : 0;
    const base = resolveAgentScreen(entry.location, entry.index, projection, tiledMapResource);
    const marker = new Container();
    marker.x = base.x + agent.xOffset * 0.35;
    marker.y = base.y + agent.yOffset * 0.25 - motion * (inspected ? 3.2 : selected ? 2.2 : 0);
    marker.scale.set((inspected ? 1.08 : 1) + motion * (inspected ? 0.025 : selected ? 0.016 : 0));
    marker.eventMode = "static";
    marker.cursor = "pointer";
    marker.on("pointerover", () => onInspectItemChange(inspectedItem));
    marker.on("pointerout", () => onInspectItemChange(undefined));
    marker.on("pointertap", () => {
      onInspectItemChange(inspectedItem);
      onSelectAgent(agent.id);
    });

    const sourceColor = colorForSource(agent.activitySource);
    const accent = selected ? COLORS.gold : sourceColor;
    const shadow = new Graphics()
      .ellipse(0, 24, inspected ? 23 : selected ? 21 : 18, inspected ? 10 : 7)
      .fill({ color: selected ? COLORS.gold : COLORS.ink, alpha: inspected ? 0.24 : selected ? 0.2 : 0.16 });
    marker.addChild(shadow);

    if (inspected || selected) {
      const halo = new Graphics()
        .circle(0, -2, (inspected ? 25 : 22) + motion * 3.4)
        .fill({ color: accent, alpha: inspected ? 0.1 + motion * 0.08 : 0.06 + motion * 0.05 })
        .stroke({ width: inspected ? 4 : 3, color: accent, alpha: inspected ? 0.42 + motion * 0.18 : 0.28 + motion * 0.14 });
      marker.addChild(halo);
    }

    const body = new Graphics()
      .roundRect(-12, 2, 24, 30, 12)
      .fill({ color: selected ? COLORS.gold : sourceColor, alpha: 0.78 })
      .stroke({ width: inspected ? 3 : 2, color: inspected ? accent : COLORS.white, alpha: inspected ? 1 : 0.92 })
      .circle(0, -8, 15)
      .fill({ color: 0xffd5e4, alpha: 0.98 })
      .stroke({ width: inspected ? 3 : 2, color: selected ? COLORS.gold : COLORS.white, alpha: inspected || selected ? 1 : 0.94 });
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
  animationPhase: number,
): void {
  const locationById = new Map(locations.map((location, index) => [location.id, { location, index }]));
  pulses.forEach((pulse, pulseIndex) => {
    const entry = locationById.get(pulse.locationId);
    if (!entry) return;
    const screen = resolveLocationScreen(entry.location, entry.index, projection, tiledMapResource, 4);
    const color = colorForPulse(pulse);
    const motion = pulseWave(animationPhase, pulseIndex * 0.72);
    const ring = new Graphics()
      .ellipse(screen.x, screen.y + 3, projection.tileWidth * (0.45 + pulseIndex * 0.035 + motion * 0.035), projection.tileHeight * (0.24 + pulseIndex * 0.02 + motion * 0.018))
      .stroke({ width: 2, color, alpha: Math.max(0.12, 0.48 - pulseIndex * 0.055 + motion * 0.11) });
    root.addChild(ring);

    if (pulseIndex < 2) {
      const label = createText(formatPulseLabel(pulse, language), 10, color, "bold");
      label.anchor.set(0.5);
      label.x = screen.x;
      label.y = screen.y - projection.tileHeight * 0.78 - pulseIndex * 14 - motion * 2;
      label.alpha = 0.86 + motion * 0.14;
      root.addChild(label);
    }
  });
}

function drawDetailCard(
  root: Container,
  size: StageSize,
  projection: IsoProjection,
  viewModel: RealmMapViewModel,
  detailTarget: RealmMapInspectedItem,
  tiledMapResource: RealmTiledMapResource | undefined,
  language: AppLanguage,
  animationPhase: number,
): void {
  const detail = createDetailCardContent(viewModel, detailTarget, language);
  if (!detail) return;

  const anchor = resolveDetailAnchor(viewModel, detailTarget, projection, tiledMapResource);
  if (!anchor) return;

  const card = new Container();
  const content = new Container();

  const tag = createText(detail.kindLabel, 10, detail.accent, "bold");
  tag.x = DETAIL_CARD_PADDING;
  tag.y = 12;
  content.addChild(tag);

  const title = createText(detail.title, 14, COLORS.ink, "bold");
  title.x = DETAIL_CARD_PADDING;
  title.y = 29;
  content.addChild(title);

  let nextLineY = 54;
  detail.lines.forEach((line, index) => {
    const text = new Text({
      text: line,
      style: {
        fill: index === 0 ? COLORS.ink : COLORS.inkMuted,
        fontFamily: "Nunito, Inter, ui-sans-serif, system-ui, sans-serif",
        fontSize: 11,
        fontWeight: "bold",
        lineHeight: 15,
        wordWrap: true,
        wordWrapWidth: DETAIL_CARD_WIDTH - DETAIL_CARD_PADDING * 2,
      },
    });
    text.x = DETAIL_CARD_PADDING;
    text.y = nextLineY;
    content.addChild(text);
    nextLineY += text.height + DETAIL_CARD_LINE_GAP;
  });

  const cardHeight = Math.max(92, nextLineY + DETAIL_CARD_PADDING - DETAIL_CARD_LINE_GAP);
  const position = clampCardPosition(anchor.x + 24, anchor.y - cardHeight - 20, DETAIL_CARD_WIDTH, cardHeight, size);
  const motion = pulseWave(animationPhase, detailTarget.kind === "agent" ? 0.35 : 0);
  card.x = position.x;
  card.y = position.y - motion * 1.5;
  card.alpha = 0.94 + motion * 0.06;

  const panel = new Graphics()
    .roundRect(0, 0, DETAIL_CARD_WIDTH, cardHeight, 18)
    .fill({ color: COLORS.white, alpha: 0.96 })
    .stroke({ width: 2, color: detail.accent, alpha: 0.82 });
  card.addChild(panel);
  card.addChild(content);
  root.addChild(card);
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

function resolveInspectedTarget(viewModel: RealmMapViewModel, inspectedItem: RealmMapInspectedItem | undefined): RealmMapInspectedItem | undefined {
  if (inspectedItem?.kind === "location" && viewModel.locations.some((location) => location.id === inspectedItem.id)) return inspectedItem;
  if (inspectedItem?.kind === "agent" && viewModel.agents.some((agent) => agent.id === inspectedItem.id)) return inspectedItem;
  return undefined;
}

function resolveSelectedDetailTarget(viewModel: RealmMapViewModel): RealmMapInspectedItem | undefined {
  if (viewModel.selectedAgentId && viewModel.agents.some((agent) => agent.id === viewModel.selectedAgentId)) return { kind: "agent", id: viewModel.selectedAgentId };
  if (viewModel.selectedLocationId && viewModel.locations.some((location) => location.id === viewModel.selectedLocationId)) return { kind: "location", id: viewModel.selectedLocationId };
  return undefined;
}

function resolveDetailAnchor(
  viewModel: RealmMapViewModel,
  detailTarget: RealmMapInspectedItem,
  projection: IsoProjection,
  tiledMapResource: RealmTiledMapResource | undefined,
): StagePoint | undefined {
  if (detailTarget.kind === "location") {
    const index = viewModel.locations.findIndex((location) => location.id === detailTarget.id);
    const location = viewModel.locations[index];
    return location ? resolveLocationScreen(location, index, projection, tiledMapResource, projection.tileHeight * 0.62) : undefined;
  }

  const agent = viewModel.agents.find((candidate) => candidate.id === detailTarget.id);
  if (!agent) return undefined;
  const index = viewModel.locations.findIndex((location) => location.id === agent.locationId);
  const location = viewModel.locations[index];
  if (!location) return undefined;
  const base = resolveAgentScreen(location, index, projection, tiledMapResource);
  return { x: base.x + agent.xOffset * 0.35, y: base.y + agent.yOffset * 0.25 - 28 };
}

function createDetailCardContent(viewModel: RealmMapViewModel, detailTarget: RealmMapInspectedItem, language: AppLanguage): { kindLabel: string; title: string; lines: string[]; accent: number } | undefined {
  if (detailTarget.kind === "location") {
    const locationIndex = viewModel.locations.findIndex((location) => location.id === detailTarget.id);
    const location = viewModel.locations[locationIndex];
    if (!location) return undefined;
    return {
      kindLabel: language === "zh" ? "地点" : "Location",
      title: location.displayName,
      lines: [location.occupancyLabel, location.activityLabel, location.description],
      accent: location.selected ? COLORS.gold : accentForIndex(locationIndex),
    };
  }

  const agent = viewModel.agents.find((candidate) => candidate.id === detailTarget.id);
  if (!agent) return undefined;
  return {
    kindLabel: language === "zh" ? "角色" : "Agent",
    title: agent.displayName,
    lines: [
      `${agent.roleLabel} · ${agent.status}`,
      agent.currentIntent ?? agent.activityText ?? (language === "zh" ? "暂无当前意图" : "No current intent"),
      `${language === "zh" ? "关系" : "Relationships"}: ${agent.relationshipCount}`,
    ],
    accent: agent.selected ? COLORS.gold : colorForSource(agent.activitySource),
  };
}

function clampCardPosition(x: number, y: number, width: number, height: number, size: StageSize): StagePoint {
  return {
    x: Math.max(12, Math.min(x, size.width - width - 12)),
    y: Math.max(12, Math.min(y, size.height - height - 12)),
  };
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
