import { WORLD } from '../config/constants.ts';
import { LAND_PADS, MAP_LAYOUT } from '../config/mapLayout.ts';

const WATER_LEVEL = -1.4;
export const SWIM_HEIGHT = WATER_LEVEL + 0.18;
const SHORE_WALK_MIN_HEIGHT = -1.12;
export const BRIDGE_DECK_Y = 0.95;
export const BRIDGE_WALK_HEIGHT = 1.12;

export const BRIDGES = MAP_LAYOUT.bridges;

// 地形层级参数
const CLIFF_INNER = 0.65;
const CLIFF_OUTER = 0.70;
const BEACH_OUTER = 0.78;
const UPPER_HEIGHT = 2.0;
const BEACH_HEIGHT = 0.5;

const WATERFALL_X = MAP_LAYOUT.waterfall.dropPos[0];
const WATERFALL_Z = MAP_LAYOUT.waterfall.dropPos[2];

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function baseNoise(x: number, z: number): number {
  return (
    Math.sin(x * 0.06) * Math.cos(z * 0.055) * 1.1 +
    Math.sin((x + z) * 0.035) * 0.7 +
    Math.sin(x * 0.18 + 1.3) * 0.28 +
    Math.cos(z * 0.16 - 0.7) * 0.24 +
    Math.sin(x * 0.5) * 0.08 +
    Math.cos(z * 0.48) * 0.06
  );
}

function distanceToPoint(x: number, z: number, point: [number, number]): number {
  return Math.hypot(x - point[0], z - point[1]);
}

function mountainBoost(x: number, z: number): number {
  const center = MAP_LAYOUT.zones.mountain.center;
  const dx = x - center[0];
  const dz = z - center[2];
  const mound = 1 - smoothstep(0.35, 1.0, Math.hypot(dx / 18, dz / 13));
  if (mound <= 0) return 0;
  const crest = 1 - smoothstep(0.15, 0.9, Math.abs((x - WATERFALL_X) / 8));
  const face = smoothstep(-7, 2, z - WATERFALL_Z) * (1 - smoothstep(8, 18, z - WATERFALL_Z));
  const fractured = Math.sin(x * 0.2 + z * 0.11) * 0.16 + Math.cos(x * 0.13 - z * 0.08) * 0.12;
  return mound * (1.25 + face * 1.45 + crest * 0.45 + fractured);
}

function ovalAmount(x: number, z: number, cx: number, cz: number, rx: number, rz: number): number {
  return 1 - smoothstep(0.72, 1.0, Math.hypot((x - cx) / rx, (z - cz) / rz));
}

function terraceBoost(x: number, z: number): number {
  const northRidge = ovalAmount(x, z, 16, 58, 44, 18);
  const westCliff = ovalAmount(x, z, -62, -12, 22, 34);
  const southBluff = ovalAmount(x, z, 56, -48, 30, 20);
  const ridgeBreak = Math.sin(x * 0.11 + z * 0.07) * 0.18 + Math.cos(x * 0.09 - z * 0.13) * 0.14;

  let boost = 0;
  boost += northRidge * (1.65 + ridgeBreak);
  boost += westCliff * (2.1 + ridgeBreak * 0.7);
  boost += southBluff * (1.25 + ridgeBreak * 0.5);
  return boost;
}

function protectedLandAmount(x: number, z: number): number {
  const protectedAreas = [
    { pos: MAP_LAYOUT.home.pos, radius: MAP_LAYOUT.home.padRadius + 5 },
    { pos: MAP_LAYOUT.plaza.pos, radius: MAP_LAYOUT.plaza.padRadius + 4 },
    { pos: MAP_LAYOUT.shop.pos, radius: MAP_LAYOUT.shop.padRadius + 5 },
    { pos: MAP_LAYOUT.museum.pos, radius: MAP_LAYOUT.museum.padRadius + 5 },
    ...MAP_LAYOUT.npcs.map((npc) => ({ pos: npc.homePos, radius: 13 })),
  ];
  let amount = 0;
  for (const area of protectedAreas) {
    amount = Math.max(amount, 1 - smoothstep(area.radius * 0.7, area.radius, Math.hypot(x - area.pos[0], z - area.pos[2])));
  }
  return amount;
}

export function plazaPavingAmount(x: number, z: number): number {
  const plaza = MAP_LAYOUT.plaza;
  const shopApron = { x: MAP_LAYOUT.shop.pos[0] - 2.5, z: MAP_LAYOUT.shop.pos[2] + 3.2, r: 5.2 };
  const museumApron = { x: MAP_LAYOUT.museum.pos[0] - 1.4, z: MAP_LAYOUT.museum.pos[2] + 4.0, r: 5.8 };
  const plazaCore = 1 - smoothstep(plaza.padRadius * 0.58, plaza.padRadius * 0.88, Math.hypot(x - plaza.pos[0], z - plaza.pos[2]));
  const shopCore = 1 - smoothstep(shopApron.r * 0.58, shopApron.r, Math.hypot(x - shopApron.x, z - shopApron.z));
  const museumCore = 1 - smoothstep(museumApron.r * 0.58, museumApron.r, Math.hypot(x - museumApron.x, z - museumApron.z));
  return Math.max(plazaCore, shopCore, museumCore);
}

export function groundHeight(x: number, z: number): number {
  const half = WORLD.size / 2;
  const dist = Math.min(1, Math.hypot(x, z) / half);
  let noise = baseNoise(x, z);

  const centerFlat = smoothstep(0, 0.18, dist);
  noise *= 0.2 + 0.8 * centerFlat;

  // 原三级地形
  let h: number;
  if (dist < CLIFF_INNER) {
    h = UPPER_HEIGHT + noise * 0.5;
  } else if (dist < CLIFF_OUTER) {
    const t = smoothstep(CLIFF_INNER, CLIFF_OUTER, dist);
    h = UPPER_HEIGHT * (1 - t) + BEACH_HEIGHT * t + noise * 0.2;
  } else if (dist < BEACH_OUTER) {
    const t = smoothstep(CLIFF_OUTER, BEACH_OUTER, dist);
    h = BEACH_HEIGHT * (1 - t) + (-0.2) * t + noise * 0.15 * (1 - t);
  } else {
    const t = smoothstep(BEACH_OUTER, 1.0, dist);
    h = (-0.2) * (1 - t) + (-3.0) * t + noise * 0.1;
  }

  h += mountainBoost(x, z) + terraceBoost(x, z);

  const river = riverAmount(x, z);
  if (river > 0) h = h * (1 - river * 0.7) + (-1.8) * river * 0.7;

  const pad = landPadAmount(x, z);
  if (pad.amount > 0) h = h * (1 - pad.amount) + pad.height * pad.amount;

  const road = roadAmount(x, z);
  if (road > 0 && !blocksWaterOnly(x, z)) h = h * (1 - road * 0.35) + 0.28 * road * 0.35;

  return h;
}

function groundHeightBaseWater(x: number, z: number): number {
  const half = WORLD.size / 2;
  const dist = Math.min(1, Math.hypot(x, z) / half);
  let noise = baseNoise(x, z);
  noise *= 0.2 + 0.8 * smoothstep(0, 0.18, dist);
  let h: number;
  if (dist < CLIFF_INNER) h = UPPER_HEIGHT + noise * 0.5;
  else if (dist < CLIFF_OUTER) {
    const t = smoothstep(CLIFF_INNER, CLIFF_OUTER, dist);
    h = UPPER_HEIGHT * (1 - t) + BEACH_HEIGHT * t + noise * 0.2;
  } else if (dist < BEACH_OUTER) {
    const t = smoothstep(CLIFF_OUTER, BEACH_OUTER, dist);
    h = BEACH_HEIGHT * (1 - t) + (-0.2) * t + noise * 0.15 * (1 - t);
  } else {
    const t = smoothstep(BEACH_OUTER, 1.0, dist);
    h = (-0.2) * (1 - t) + (-3.0) * t + noise * 0.1;
  }
  h += mountainBoost(x, z) + terraceBoost(x, z);
  const river = riverAmount(x, z);
  return river > 0 ? h * (1 - river * 0.7) + (-1.8) * river * 0.7 : h;
}

export function riverAmount(x: number, z: number): number {
  const half = WORLD.size / 2;
  if (Math.hypot(x, z) / half > 0.95) return 0;
  const mainPath: [number, number][] = [
    [-20, -92],
    [-18, -62],
    [-13, -30],
    [-12, 6],
    [-15, 30],
    [-22, 54],
    [-30, 78],
    [-34, 92],
  ];
  let mainDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < mainPath.length - 1; i++) {
    mainDistance = Math.min(mainDistance, distanceToSegment(x, z, mainPath[i], mainPath[i + 1]));
  }
  const mainWidth = 4.2 + Math.sin(z * 0.05) * 0.35;
  const main = 1 - smoothstep(mainWidth, mainWidth + 2.4, mainDistance);

  const upperStream = 1 - smoothstep(2.2, 4.4, distanceToSegment(x, z, [-42, 38], [WATERFALL_X, WATERFALL_Z]));
  const lowerStream = 1 - smoothstep(2.8, 5.4, distanceToSegment(x, z, [WATERFALL_X, WATERFALL_Z], [-17, 31]));
  const pool = 1 - smoothstep(5.0, 8.5, distanceToPoint(x, z, [MAP_LAYOUT.waterfall.pool[0], MAP_LAYOUT.waterfall.pool[2]]));

  const raw = Math.max(main, upperStream * 0.72, lowerStream * 0.82, pool * 0.95);
  const protectedLand = protectedLandAmount(x, z);
  return raw * (1 - protectedLand * 0.92);
}

function landPadAmount(x: number, z: number): { amount: number; height: number; buildable: boolean } {
  let a = 0, h = 0, buildable = false;
  for (const p of LAND_PADS) {
    const d = Math.hypot(x - p.pos[0], z - p.pos[2]);
    const v = 1 - smoothstep(p.radius * 0.65, p.radius, d);
    if (v > a) { a = v; h = p.height; buildable = p.buildable; }
  }
  return { amount: a, height: h, buildable };
}

export function roadAmount(x: number, z: number): number {
  let a = 0;
  for (const s of MAP_LAYOUT.roads) {
    const d = distanceToSegment(x, z, s.from, s.to);
    a = Math.max(a, 1 - smoothstep(s.width, s.width + 1.2, d));
  }
  return a;
}

export function buildableAt(x: number, z: number): boolean {
  if (blocksWalking(x, z)) return false;
  return LAND_PADS.some((p) => p.buildable && Math.hypot(x - p.pos[0], z - p.pos[2]) < p.radius * 0.62);
}

function blocksWaterOnly(x: number, z: number): boolean {
  return groundHeightBaseWater(x, z) < SHORE_WALK_MIN_HEIGHT || riverAmount(x, z) > 0.45;
}

function distanceToSegment(x: number, z: number, a: [number, number], b: [number, number]): number {
  const vx = b[0] - a[0], vz = b[1] - a[1];
  const ls = vx * vx + vz * vz || 1;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / ls));
  return Math.hypot(x - (a[0] + vx * t), z - (a[1] + vz * t));
}

function localSlope(x: number, z: number, step = 0.9): number {
  return (
    Math.abs(groundHeight(x + step, z) - groundHeight(x - step, z)) +
    Math.abs(groundHeight(x, z + step) - groundHeight(x, z - step))
  ) * 0.5;
}

function bridgeLocalPosition(x: number, z: number, bridge: (typeof BRIDGES)[number]): [number, number] {
  const dx = x - bridge.pos[0];
  const dz = z - bridge.pos[2];
  const c = Math.cos(-bridge.rotation);
  const s = Math.sin(-bridge.rotation);
  return [dx * c - dz * s, dx * s + dz * c];
}

export function isOnBridge(x: number, z: number): boolean {
  return BRIDGES.some((bridge) => {
    const [lx, lz] = bridgeLocalPosition(x, z, bridge);
    return Math.abs(lx) <= bridge.size[0] / 2 + 4.6 && Math.abs(lz) <= bridge.size[2] / 2 + 1.7;
  });
}

export function blocksWalking(x: number, z: number): boolean {
  if (isOnBridge(x, z)) return false;
  const h = groundHeight(x, z);
  if (h < SHORE_WALK_MIN_HEIGHT) return true;
  if (h < WATER_LEVEL + 0.28) return true;
  if (landPadAmount(x, z).amount > 0.5) return false;
  if (roadAmount(x, z) < 0.35 && localSlope(x, z) > 1.25) return true;
  if (riverAmount(x, z) > 0.45) return true;
  return false;
}

export function walkingHeight(x: number, z: number): number {
  if (isOnBridge(x, z)) return BRIDGE_WALK_HEIGHT;
  return groundHeight(x, z);
}

export function nearestWalkable(x: number, z: number): [number, number, number] {
  if (!blocksWalking(x, z)) return [x, walkingHeight(x, z), z];
  for (let r = 1; r <= 24; r++) {
    const n = Math.max(12, r * 8);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const nx = x + Math.cos(a) * r;
      const nz = z + Math.sin(a) * r;
      if (!blocksWalking(nx, nz)) return [nx, walkingHeight(nx, nz), nz];
    }
  }
  return [0, walkingHeight(0, 16), 16];
}

export type GroundKind = 'grass' | 'sand' | 'rock' | 'dirt' | 'water' | 'road' | 'foundation' | 'paving';

export function groundKind(x: number, z: number): GroundKind {
  const half = WORLD.size / 2;
  const dist = Math.hypot(x, z) / half;
  const h = groundHeight(x, z);
  const pad = landPadAmount(x, z);

  if (h < WATER_LEVEL + 0.28 || riverAmount(x, z) > 0.45) return 'water';
  if (plazaPavingAmount(x, z) > 0.42) return 'paving';
  if (pad.amount > 0.5) return pad.buildable ? 'foundation' : 'road';
  if (roadAmount(x, z) > 0.45) return 'road';

  const boost = mountainBoost(x, z);
  if (boost > 1.6 || terraceBoost(x, z) > 1.55) return 'rock';
  if (dist > CLIFF_INNER && dist < CLIFF_OUTER) return 'rock';
  if (dist >= CLIFF_OUTER && dist < BEACH_OUTER) return 'sand';
  if (h > 2.8) return 'rock';
  if (h < -0.2) return 'dirt';
  return 'grass';
}
