import { BUG, FISH, HOUSE, MINE, WORLD } from '../config/constants.ts';
import type { NpcId } from '../config/npcs.ts';
import { NPCS, npcPositionAt } from '../config/npcs.ts';
import type { AnimalId } from '../config/animals.ts';
import { ANIMALS, animalPositionAt } from '../config/animals.ts';
import { MAP_LAYOUT } from '../config/mapLayout.ts';
import type { ToolId } from '../config/items.ts';
import { ITEMS } from '../config/items.ts';
import type { BugSpot, FishSpot, RockSpot, TreeData, PlantSpot, PathTile } from '../systems/save.ts';
import { MUSEUM } from '../config/constants.ts';
import { WORLD_FEATURES, type WorldFeatureId } from '../config/worldFeatures.ts';
import { groundKind } from '../systems/terrain.ts';

export type InteractionTarget =
  | { kind: 'shop'; dist: number }
  | { kind: 'museum'; dist: number }
  | { kind: 'npc'; id: NpcId; dist: number }
  | { kind: 'animal'; id: AnimalId; dist: number }
  | { kind: 'house'; dist: number }
  | { kind: 'fish'; id: string; dist: number }
  | { kind: 'bug'; id: string; dist: number }
  | { kind: 'tree'; id: string; dist: number; hasFruit: boolean; fruitName?: string }
  | { kind: 'plant'; id: string; dist: number; spot: PlantSpot }
  | { kind: 'rock'; id: string; dist: number }
  | { kind: 'feature'; id: WorldFeatureId; dist: number }
  | { kind: 'path'; id: string; dist: number; tile: PathTile }
  | { kind: 'water'; dist: number };

interface FindInteractionTargetArgs {
  playerX: number;
  playerZ: number;
  trees: TreeData[];
  fishSpots: FishSpot[];
  bugs: BugSpot[];
  plants: PlantSpot[];
  rocks: RockSpot[];
  paths: PathTile[];
  minutes: number;
}

const PRIORITY: Record<InteractionTarget['kind'], number> = {
  shop: 100,
  museum: 95,
  feature: 92,
  npc: 90,
  animal: 85,
  house: 80,
  rock: 75,
  fish: 70,
  bug: 60,
  path: 57,
  plant: 55,
  tree: 50,
  water: 40,
};

export function findInteractionTarget({
  playerX,
  playerZ,
  trees,
  fishSpots,
  bugs,
  plants,
  rocks,
  paths,
  minutes,
}: FindInteractionTargetArgs): InteractionTarget | null {
  const targets: InteractionTarget[] = [];

  for (const feature of WORLD_FEATURES) {
    const dist = Math.hypot(playerX - feature.x, playerZ - feature.z);
    if (dist <= feature.radius) targets.push({ kind: 'feature', id: feature.id, dist });
  }

  for (const p of paths) {
    const dist = Math.hypot(playerX - p.pos[0], playerZ - p.pos[2]);
    if (dist <= WORLD.interactRadius) targets.push({ kind: 'path', id: p.id, dist, tile: p });
  }

  const distShop = Math.hypot(playerX - MAP_LAYOUT.shop.pos[0], playerZ - MAP_LAYOUT.shop.pos[2]);
  if (distShop <= MAP_LAYOUT.shop.interactRadius) targets.push({ kind: 'shop', dist: distShop });

  const distMuseum = Math.hypot(playerX - MAP_LAYOUT.museum.pos[0], playerZ - MAP_LAYOUT.museum.pos[2]);
  if (distMuseum <= MUSEUM.interactRadius) targets.push({ kind: 'museum', dist: distMuseum });

  for (const npc of NPCS) {
    const p = npcPositionAt(npc, minutes);
    const dist = Math.hypot(playerX - p[0], playerZ - p[2]);
    if (dist <= WORLD.interactRadius) targets.push({ kind: 'npc', id: npc.id, dist });
  }

  for (const animal of ANIMALS) {
    const p = animalPositionAt(animal, minutes);
    const dist = Math.hypot(playerX - p[0], playerZ - p[2]);
    if (dist <= WORLD.interactRadius) targets.push({ kind: 'animal', id: animal.id, dist });
  }

  const [hx, , hz] = HOUSE.pos;
  const distHouse = Math.hypot(playerX - hx, playerZ - hz);
  if (distHouse <= HOUSE.interactRadius) targets.push({ kind: 'house', dist: distHouse });

  for (const f of fishSpots) {
    if (f.state !== 'idle') continue;
    const dist = Math.hypot(playerX - f.pos[0], playerZ - f.pos[2]);
    if (dist <= FISH.interactRadius) targets.push({ kind: 'fish', id: f.id, dist });
  }

  for (const b of bugs) {
    if (b.state !== 'active') continue;
    const dist = Math.hypot(playerX - b.pos[0], playerZ - b.pos[2]);
    if (dist <= BUG.alertRadius) targets.push({ kind: 'bug', id: b.id, dist });
  }

  for (const t of trees) {
    if (t.state !== 'intact') continue;
    const dist = Math.hypot(playerX - t.pos[0], playerZ - t.pos[2]);
    if (dist <= WORLD.interactRadius) {
      const hasFruit = t.fruit !== null && t.fruitCount > 0;
      const fruitName = hasFruit ? ITEMS[t.fruit!].name : undefined;
      targets.push({ kind: 'tree', id: t.id, dist, hasFruit, fruitName });
    }
  }

  for (const p of plants) {
    if (p.stage === -1) {
      const dist = Math.hypot(playerX - p.pos[0], playerZ - p.pos[2]);
      if (dist <= WORLD.interactRadius) targets.push({ kind: 'plant', id: p.id, dist, spot: p });
    } else if (p.stage >= 0 && p.stage < 2) {
      // 可浇水
      const dist = Math.hypot(playerX - p.pos[0], playerZ - p.pos[2]);
      if (dist <= WORLD.interactRadius) targets.push({ kind: 'plant', id: p.id, dist, spot: p });
    } else if (p.stage >= 2) {
      // 可收获
      const dist = Math.hypot(playerX - p.pos[0], playerZ - p.pos[2]);
      if (dist <= WORLD.interactRadius) targets.push({ kind: 'plant', id: p.id, dist, spot: p });
    }
  }

  for (const r of rocks) {
    if (r.state !== 'intact') continue;
    const dist = Math.hypot(playerX - r.pos[0], playerZ - r.pos[2]);
    if (dist <= MINE.interactRadius) targets.push({ kind: 'rock', id: r.id, dist });
  }

  // 检测附近水域（用于游泳）
  const waterDirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, 1], [1, -1], [-1, -1],
  ];
  for (const [dx, dz] of waterDirs) {
    const checkX = playerX + dx * 2;
    const checkZ = playerZ + dz * 2;
    if (groundKind(checkX, checkZ) === 'water') {
      const dist = Math.hypot(dx * 2, dz * 2);
      targets.push({ kind: 'water', dist });
      break;
    }
  }

  targets.sort((a, b) => PRIORITY[b.kind] - PRIORITY[a.kind] || a.dist - b.dist);
  return targets[0] ?? null;
}

export function interactionHint(target: InteractionTarget, equipped: ToolId | null): string {
  if (target.kind === 'feature') {
    return WORLD_FEATURES.find((feature) => feature.id === target.id)?.hint ?? '按 E 互动';
  }
  if (target.kind === 'shop') return '按 E 进入商店';
  if (target.kind === 'museum') return '按 E 进入博物馆';
  if (target.kind === 'npc') {
    const npc = NPCS.find((x) => x.id === target.id);
    return `按 E 和${npc?.name ?? '居民'}交谈`;
  }
  if (target.kind === 'animal') {
    const animal = ANIMALS.find((x) => x.id === target.id);
    return `按 E 摸摸${animal?.name ?? '小动物'}`;
  }
  if (target.kind === 'house') return '按 E 进屋';
  if (target.kind === 'fish') return equipped === 'fishingRod' ? '按 E 抛竿钓鱼' : '装备钓竿才能钓鱼（按 2）';
  if (target.kind === 'bug') return equipped === 'net' ? '按 E 挥网捕虫' : '装备捕虫网才能捕虫（按 3）';
  if (target.kind === 'plant') {
    if (target.spot.stage === -1) return '按 E 种植';
    if (target.spot.stage >= 2) return '按 E 收获';
    if (equipped === 'watering_can') return target.spot.wateredToday ? '今天已浇水' : '按 E 浇水';
    return '装备水壶浇水（按 5）';
  }
  if (target.kind === 'rock') return equipped === 'shovel' ? '按 E 采矿' : '需要装备铲子才能采矿（按 4）';
  if (target.kind === 'path') return '按 E 拆除道路';
  if (target.kind === 'water') return '按 E 进入游泳';
  if (target.kind === 'tree') {
    if (target.hasFruit) return `按 E 摘${target.fruitName ?? '果实'}`;
    return equipped === 'axe' ? '按 E 砍树' : '装备斧头才能砍树（按 1）';
  }
  return equipped === 'axe' ? '按 E 砍树' : '装备斧头才能砍树（按 1）';
}
