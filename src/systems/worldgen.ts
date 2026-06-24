// 世界生成：初始树木、散落树枝、钓鱼点、虫刷新点。
// 用确定性 PRNG，保证同一存档重建时岛屿布局一致。

import { WORLD, FISH, BUG, MINE } from '../config/constants.ts';
import { blocksWalking, groundKind } from './terrain.ts';
import { acceptsTreePlacement } from './placement.ts';
import type { BugSpot, DropData, FishSpot, RockSpot, TreeData, Vec3 } from './save.ts';
import type { ItemId } from '../config/items.ts';

const FRUIT_TYPES: ItemId[] = ['apple', 'orange', 'peach', 'cherry'];
const FRUIT_PROBABILITY = 0.3; // 30% 的普通树是果树

// xorshift32 —— 简单确定性随机，避免引入额外依赖。
function makeRng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

export interface GeneratedWorld {
  trees: TreeData[];
  drops: DropData[];
  fishSpots: FishSpot[];
  bugs: BugSpot[];
  rocks: RockSpot[];
}

export function generateWorld(seed = 20240618): GeneratedWorld {
  const rng = makeRng(seed);
  const trees: TreeData[] = [];
  const drops: DropData[] = [];
  const fishSpots: FishSpot[] = [];
  const bugs: BugSpot[] = [];

  const half = WORLD.size / 2 - 10; // 留出边缘（大世界留更多）
  const housePos: [number, number] = [0, 10]; // 房屋位置（XZ），避开此处种树
  const treeCount = 120;
  for (let i = 0; i < treeCount; i++) {
    // 避开出生点与房屋
    let x = (rng() * 2 - 1) * half;
    let z = (rng() * 2 - 1) * half;
    let tries = 0;
    while (
      (
        Math.hypot(x, z) < 8 ||
        Math.hypot(x - housePos[0], z - housePos[1]) < 10 ||
        !acceptsTreePlacement(x, z) ||
        groundKind(x, z) !== 'grass' ||
        blocksWalking(x, z)
      ) &&
      tries < 40
    ) {
      x = (rng() * 2 - 1) * half;
      z = (rng() * 2 - 1) * half;
      tries += 1;
    }
    if (!acceptsTreePlacement(x, z) || groundKind(x, z) !== 'grass' || blocksWalking(x, z)) continue;

    trees.push({
      id: `tree-${i}`,
      pos: [x, 0, z],
      hp: 3,
      state: 'intact',
      regrowAt: null,
      variant: Math.floor(rng() * 9),
      fruit: rng() < FRUIT_PROBABILITY ? FRUIT_TYPES[Math.floor(rng() * FRUIT_TYPES.length)] : null,
      fruitCount: rng() < FRUIT_PROBABILITY ? Math.floor(rng() * 3) + 1 : 0,
      fruitReadyAt: null,
    });
  }

  // 棕榈树：在沙滩上放置
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2 + (rng() - 0.5) * 0.3;
    const r = half * (0.705 + rng() * 0.065);
    let x = Math.cos(angle) * r;
    let z = Math.sin(angle) * r;
    let tries = 0;
    while ((groundKind(x, z) !== 'sand' || blocksWalking(x, z) || !acceptsTreePlacement(x, z)) && tries < 12) {
      const a2 = angle + (rng() - 0.5) * 0.5;
      const r2 = half * (0.7 + rng() * 0.075);
      x = Math.cos(a2) * r2;
      z = Math.sin(a2) * r2;
      tries += 1;
    }
    if (groundKind(x, z) !== 'sand' || blocksWalking(x, z) || !acceptsTreePlacement(x, z)) continue;
    trees.push({
      id: `palm-${i}`,
      pos: [x, 0, z],
      hp: 3,
      state: 'intact',
      regrowAt: null,
      variant: 9 + Math.floor(rng() * 2),
      fruit: 'coconut',
      fruitCount: Math.floor(rng() * 2) + 1,
      fruitReadyAt: null,
    });
  }

  // 散落一些树枝供玩家一上来就能捡。
  for (let i = 0; i < 36; i++) {
    const x = (rng() * 2 - 1) * half * 0.85;
    const z = (rng() * 2 - 1) * half * 0.85;
    if (Math.hypot(x, z) < 3) continue;
    if (groundKind(x, z) !== 'grass' || blocksWalking(x, z)) continue;
    drops.push({
      id: `drop-${i}`,
      itemId: 'branch',
      pos: [x, 0, z],
      amount: 1,
    });
  }

  // 漂流木：沙滩上
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + (rng() - 0.5) * 0.4;
    const r = half * (0.71 + rng() * 0.06);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    if (Math.hypot(x, z) < 5) continue;
    if (groundKind(x, z) !== 'sand' || blocksWalking(x, z)) continue;
    drops.push({
      id: `driftwood-${i}`,
      itemId: 'driftwood',
      pos: [x, 0, z],
      amount: 1,
    });
  }

  // 钓鱼点：沿岛屿边缘生成合法站位，并确认外侧确实是水。
  for (let i = 0; i < FISH.spotCount; i++) {
    const spot = findFishSpot(i, rng, half);
    if (spot) fishSpots.push(spot);
  }
  let fillTry = 0;
  while (fishSpots.length < FISH.spotCount && fillTry < FISH.spotCount * 8) {
    const spot = findFishSpot(fillTry + FISH.spotCount, rng, half);
    if (spot && fishSpots.every((f) => Math.hypot(f.pos[0] - spot.pos[0], f.pos[2] - spot.pos[2]) > 5)) {
      fishSpots.push({ ...spot, id: `fish-${fishSpots.length}` });
    }
    fillTry += 1;
  }

  // 兜底：理论上不会走到这里，避免极端地形导致完全没有钓鱼点。
  while (fishSpots.length < FISH.spotCount) {
    const angle = (fishSpots.length / FISH.spotCount) * Math.PI * 2;
    const x = Math.cos(angle) * half * 0.72;
    const z = Math.sin(angle) * half * 0.72;
    fishSpots.push({
      id: `fish-${fishSpots.length}`,
      pos: [x, 0, z],
      state: 'idle',
      readyAt: null,
    });
  }
  fishSpots.forEach((spot, i) => { spot.id = `fish-${i}`; });

  // 虫刷新点：散布在草地上，初始为 hidden，由游戏时钟随机激活。
  for (let i = 0; i < BUG.spotCount; i++) {
    let x = 0;
    let z = 0;
    let ok = false;
    let tries = 0;
    while (!ok && tries < 20) {
      x = (rng() * 2 - 1) * half * 0.9;
      z = (rng() * 2 - 1) * half * 0.9;
      ok = groundKind(x, z) === 'grass' && !blocksWalking(x, z) && Math.hypot(x, z) > 3;
      tries += 1;
    }
    if (!ok) continue;
    bugs.push({
      id: `bug-${i}`,
      pos: [x, 0, z],
      state: 'hidden',
      fleeAt: null,
      // 首次激活延迟一个随机量，避免所有虫同时出现
      readyAt: Math.floor(rng() * 30),
      variant: Math.floor(rng() * 6),
    });
  }

  const rocks: RockSpot[] = [];
  for (let i = 0; i < MINE.spotCount; i++) {
    let ok = false; let attempts = 0; let rx = 0; let rz = 0;
    while (!ok && attempts < 30) {
      rx = (rng() * 2 - 1) * half * 0.88;
      rz = (rng() * 2 - 1) * half * 0.88;
      ok = groundKind(rx, rz) === 'grass' && !blocksWalking(rx, rz) && Math.hypot(rx, rz) > 5
        && rocks.every((r) => Math.hypot(rx - r.pos[0], rz - r.pos[2]) > 4);
      attempts++;
    }
    if (ok) rocks.push({ id: `rock-${i}`, pos: [rx, 0, rz], state: 'intact', respawnAt: null });
  }

  return { trees, drops, fishSpots, bugs, rocks };
}

// 取鱼点（岸边）对应的水面位置（站点朝向水的方向）。
// 由于站点已接近边缘，水面位置就是站点本身略向外推。
export function fishWaterPos(spot: FishSpot): Vec3 {
  const [x, , z] = spot.pos;
  const dist = Math.hypot(x, z) || 1;
  const dx = x / dist;
  const dz = z / dist;
  for (let step = 2; step <= 18; step += 1) {
    const wx = x + dx * step;
    const wz = z + dz * step;
    if (groundKind(wx, wz) === 'water' || blocksWalking(wx, wz)) return [wx, -1.4, wz];
  }
  return [x + dx * 10, -1.4, z + dz * 10];
}

function findFishSpot(index: number, rng: () => number, half: number): FishSpot | null {
  const baseAngle = (index / FISH.spotCount) * Math.PI * 2;
  for (let attempt = 0; attempt < 24; attempt++) {
    const angle = baseAngle + (rng() - 0.5) * 0.65 + attempt * 0.03;
    const r = half * (0.66 + rng() * 0.22);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    if (blocksWalking(x, z)) continue;
    const kind = groundKind(x, z);
    if (kind === 'water' || kind === 'rock') continue;
    const water = fishWaterPos({ id: `fish-${index}`, pos: [x, 0, z], state: 'idle', readyAt: null });
    if (groundKind(water[0], water[2]) !== 'water' && !blocksWalking(water[0], water[2])) continue;
    return {
      id: `fish-${index}`,
      pos: [x, 0, z],
      state: 'idle',
      readyAt: null,
    };
  }
  return null;
}
