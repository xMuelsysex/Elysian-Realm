import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const tiledDir = join(repoRoot, "public", "assets", "realm", "tiled");
const mapPath = join(tiledDir, "realm-room.tmj");

const requiredAnchors = [
  "atrium",
  "garden",
  "lounge",
  "archives",
  "training-hall",
  "quarters",
  "overlook",
];

const expected = {
  orientation: "isometric",
  width: 10,
  height: 8,
  tilewidth: 76,
  tileheight: 38,
};

function fail(message) {
  console.error(`[realm-tiled-map] ${message}`);
  process.exitCode = 1;
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readMap() {
  if (!existsSync(mapPath)) {
    fail(`Missing map file: ${mapPath}`);
    return undefined;
  }

  try {
    return JSON.parse(readFileSync(mapPath, "utf8"));
  } catch (error) {
    fail(`Invalid JSON in ${mapPath}: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function layerByName(map, name) {
  return Array.isArray(map.layers) ? map.layers.find((layer) => isRecord(layer) && layer.name === name) : undefined;
}

function validateMapShape(map) {
  assert(map.type === "map", "Expected Tiled JSON type to be 'map'.");
  assert(map.orientation === expected.orientation, `Expected orientation '${expected.orientation}', got '${map.orientation}'.`);
  assert(map.width === expected.width, `Expected map width ${expected.width}, got ${map.width}.`);
  assert(map.height === expected.height, `Expected map height ${expected.height}, got ${map.height}.`);
  assert(map.tilewidth === expected.tilewidth, `Expected tilewidth ${expected.tilewidth}, got ${map.tilewidth}.`);
  assert(map.tileheight === expected.tileheight, `Expected tileheight ${expected.tileheight}, got ${map.tileheight}.`);
  assert(Array.isArray(map.layers), "Expected map.layers to be an array.");
  assert(Array.isArray(map.tilesets), "Expected map.tilesets to be an array.");
}

function validateLayers(map) {
  const floor = layerByName(map, "floor");
  const lowWalls = layerByName(map, "low_walls");
  const oldWalls = layerByName(map, "walls");
  const hotspots = layerByName(map, "realm_hotspots");

  assert(floor?.type === "tilelayer", "Missing required tile layer 'floor'.");
  assert(floor?.visible === true, "Layer 'floor' must be visible.");
  assert(Array.isArray(floor?.data), "Layer 'floor' must contain tile data.");
  assert(floor?.data?.length === expected.width * expected.height, `Layer 'floor' must contain ${expected.width * expected.height} tile entries.`);

  assert(lowWalls?.type === "tilelayer", "Missing required tile layer 'low_walls'.");
  assert(lowWalls?.visible === true, "Layer 'low_walls' must be visible for the visual baseline.");
  assert(Array.isArray(lowWalls?.data), "Layer 'low_walls' must contain tile data.");
  assert(lowWalls?.data?.length === expected.width * expected.height, `Layer 'low_walls' must contain ${expected.width * expected.height} tile entries.`);

  if (oldWalls) {
    assert(oldWalls.type === "tilelayer", "Layer 'walls' must remain a tile layer when present.");
    assert(oldWalls.visible === false || oldWalls.opacity === 0, "Legacy layer 'walls' must not show noisy vertical wall cards in normal MVP state.");
  }

  assert(hotspots?.type === "objectgroup", "Missing required object layer 'realm_hotspots'.");
  assert(Array.isArray(hotspots?.objects), "Layer 'realm_hotspots' must contain objects.");
  return hotspots;
}

function validateHotspots(hotspots) {
  const objects = hotspots.objects.filter((object) => isRecord(object));
  for (const anchorName of requiredAnchors) {
    const object = objects.find((candidate) => candidate.name === anchorName);
    assert(Boolean(object), `Missing hotspot anchor '${anchorName}'.`);
    if (object) {
      assert(object.point === true, `Hotspot '${anchorName}' must be a point object.`);
      assert(object.visible === true, `Hotspot '${anchorName}' must stay visible in object metadata.`);
      assert(typeof object.x === "number" && Number.isFinite(object.x), `Hotspot '${anchorName}' must have finite x coordinate.`);
      assert(typeof object.y === "number" && Number.isFinite(object.y), `Hotspot '${anchorName}' must have finite y coordinate.`);
    }
  }
}

function validateTilesets(map) {
  assert(map.tilesets.length > 0, "Expected at least one tileset reference.");
  for (const tileset of map.tilesets) {
    assert(isRecord(tileset), "Every tileset entry must be an object.");
    assert(typeof tileset.image === "string" && tileset.image.length > 0, `Tileset '${tileset.name ?? "unknown"}' must reference an image.`);
    if (typeof tileset.image === "string") {
      assert(!tileset.image.includes("..") && !tileset.image.startsWith("/"), `Tileset image '${tileset.image}' must stay under public/assets/realm/tiled/.`);
      assert(existsSync(join(tiledDir, tileset.image)), `Missing tileset image '${tileset.image}'.`);
    }
    assert(tileset.tilewidth === expected.tilewidth, `Tileset '${tileset.name ?? "unknown"}' must use tilewidth ${expected.tilewidth}.`);
    assert(tileset.tileheight === expected.tileheight || tileset.tileheight === expected.tileheight * 2, `Tileset '${tileset.name ?? "unknown"}' must use tileheight ${expected.tileheight} or ${expected.tileheight * 2}.`);
  }
}

const map = readMap();
if (map && isRecord(map)) {
  validateMapShape(map);
  const hotspots = validateLayers(map);
  if (hotspots) validateHotspots(hotspots);
  validateTilesets(map);
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("[realm-tiled-map] realm-room.tmj contract is valid.");
