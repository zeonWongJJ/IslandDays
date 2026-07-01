import { BRIDGES, groundHeight, groundKind, riverAmount, roadAmount } from './terrain.ts';
import { HOUSE } from '../config/constants.ts';
import { isLandmarkClearing } from '../config/landmarks.ts';
import { MAP_LAYOUT } from '../config/mapLayout.ts';

export function terrainSlope(x: number, z: number, step = 0.8): number {
  return (
    Math.abs(groundHeight(x + step, z) - groundHeight(x - step, z)) +
    Math.abs(groundHeight(x, z + step) - groundHeight(x, z - step))
  ) * 0.5;
}

export function isDrySurface(x: number, z: number): boolean {
  if (BRIDGES.some((bridge) => {
    const [lx, lz] = bridgeLocalPosition(x, z, bridge);
    return Math.abs(lx) <= bridge.size[0] / 2 + 0.1 && Math.abs(lz) <= bridge.size[2] / 2 + 0.1;
  })) return true;
  const kind = groundKind(x, z);
  return kind !== 'water' && riverAmount(x, z) <= 0.25 && groundHeight(x, z) > -0.95;
}

export function isFlatDrySurface(x: number, z: number, maxSlope = 0.7): boolean {
  return isDrySurface(x, z) && terrainSlope(x, z) <= maxSlope;
}

function distanceToSegment(x: number, z: number, a: [number, number], b: [number, number]): number {
  const vx = b[0] - a[0];
  const vz = b[1] - a[1];
  const ls = vx * vx + vz * vz || 1;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / ls));
  return Math.hypot(x - (a[0] + vx * t), z - (a[1] + vz * t));
}

function bridgeLocalPosition(x: number, z: number, bridge: (typeof BRIDGES)[number]): [number, number] {
  const dx = x - bridge.pos[0];
  const dz = z - bridge.pos[2];
  const c = Math.cos(-bridge.rotation);
  const s = Math.sin(-bridge.rotation);
  return [dx * c - dz * s, dx * s + dz * c];
}

export function roadClearance(x: number, z: number): number {
  let clearance = Number.POSITIVE_INFINITY;
  for (const road of MAP_LAYOUT.roads) {
    clearance = Math.min(clearance, distanceToSegment(x, z, road.from, road.to) - road.width * 0.55);
  }
  return clearance;
}

export function bridgeClearance(x: number, z: number): number {
  let clearance = Number.POSITIVE_INFINITY;
  for (const bridge of BRIDGES) {
    const dx = x - bridge.pos[0];
    const dz = z - bridge.pos[2];
    const c = Math.cos(-bridge.rotation);
    const s = Math.sin(-bridge.rotation);
    const lx = dx * c - dz * s;
    const lz = dx * s + dz * c;
    const edgeX = Math.abs(lx) - bridge.size[0] * 0.5;
    const edgeZ = Math.abs(lz) - bridge.size[2] * 0.5;
    const outside = Math.hypot(Math.max(edgeX, 0), Math.max(edgeZ, 0));
    const inside = Math.max(edgeX, edgeZ);
    clearance = Math.min(clearance, inside <= 0 ? inside : outside);
  }
  return clearance;
}

export function blocksMainPassage(x: number, z: number, radius = 0.65): boolean {
  return roadClearance(x, z) < radius || bridgeClearance(x, z) < radius;
}

export function acceptsTreePlacement(x: number, z: number): boolean {
  return !isLandmarkClearing(x, z) && roadClearance(x, z) >= 1.25 && bridgeClearance(x, z) >= 3.0;
}

export function acceptsBuildingDecoration(x: number, z: number): boolean {
  const kind = groundKind(x, z);
  if (kind === 'water' || kind === 'rock' || kind === 'sand') return false;
  if (riverAmount(x, z) > 0.18) return false;
  if (blocksMainPassage(x, z, 0.4)) return false;
  return terrainSlope(x, z) <= 0.55;
}

export function acceptsRoadDecoration(x: number, z: number): boolean {
  const kind = groundKind(x, z);
  if (kind === 'water' || kind === 'rock' || kind === 'sand') return false;
  if (riverAmount(x, z) > 0.18) return false;
  if (roadAmount(x, z) < 0.12) return false;
  if (blocksMainPassage(x, z, 0.25)) return false;
  return terrainSlope(x, z) <= 0.6;
}

export function acceptsGrassDecoration(x: number, z: number): boolean {
  if (groundKind(x, z) !== 'grass') return false;
  if (riverAmount(x, z) > 0.18) return false;
  const h = groundHeight(x, z);
  return h > 0.12 && terrainSlope(x, z) < 0.85;
}

export function acceptsShoreDecoration(x: number, z: number): boolean {
  const kind = groundKind(x, z);
  if (kind === 'water' || kind === 'road' || kind === 'foundation') return false;
  const h = groundHeight(x, z);
  if (h < -0.95 || h > 1.05) return false;
  return terrainSlope(x, z) <= 1.15;
}

export function collectPlacementWarnings(): string[] {
  const warnings: string[] = [];
  const checkFlat = (label: string, x: number, z: number, maxSlope = 0.55) => {
    if (!isFlatDrySurface(x, z, maxSlope)) {
      warnings.push(`${label} 落点不平或接近水面: (${x.toFixed(1)}, ${z.toFixed(1)}) kind=${groundKind(x, z)} slope=${terrainSlope(x, z).toFixed(2)}`);
    }
  };
  checkFlat('玩家房子', HOUSE.pos[0], HOUSE.pos[2]);
  checkFlat('商店', MAP_LAYOUT.shop.pos[0], MAP_LAYOUT.shop.pos[2]);
  checkFlat('博物馆', MAP_LAYOUT.museum.pos[0], MAP_LAYOUT.museum.pos[2]);
  MAP_LAYOUT.npcs.forEach((npc) => checkFlat(`${npc.id} 房子`, npc.homePos[0], npc.homePos[2]));
  MAP_LAYOUT.bridgePads.forEach((pad) => checkFlat(`桥头 ${pad.id}`, pad.pos[0], pad.pos[2], 0.35));
  BRIDGES.forEach((bridge) => {
    const [length] = bridge.size;
    const leftX = bridge.pos[0] - Math.cos(bridge.rotation) * length * 0.5;
    const leftZ = bridge.pos[2] + Math.sin(bridge.rotation) * length * 0.5;
    const rightX = bridge.pos[0] + Math.cos(bridge.rotation) * length * 0.5;
    const rightZ = bridge.pos[2] - Math.sin(bridge.rotation) * length * 0.5;
    checkFlat(`桥 ${bridge.id} 左端`, leftX, leftZ, 0.45);
    checkFlat(`桥 ${bridge.id} 右端`, rightX, rightZ, 0.45);
  });
  const waterfallTop = groundHeight(MAP_LAYOUT.waterfall.top[0], MAP_LAYOUT.waterfall.top[2]);
  const waterfallBottom = groundHeight(MAP_LAYOUT.waterfall.pool[0], MAP_LAYOUT.waterfall.pool[2]);
  if (waterfallTop - waterfallBottom < 2.0) {
    warnings.push(`瀑布高度差不足: top=${waterfallTop.toFixed(2)} bottom=${waterfallBottom.toFixed(2)}`);
  }

  return warnings;
}
