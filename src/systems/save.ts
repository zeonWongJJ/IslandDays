// 存档数据模型 + 加载/保存/迁移。
// 所有需要跨刷新保留的状态都走 SaveData；运行期临时状态留在 store 的非持久字段。

import { SAVE, type WeatherPattern } from '../config/constants.ts';
import type { ItemId, FurnitureItemId, ToolId } from '../config/items.ts';

export type Vec3 = [number, number, number];

export type TreeState = 'intact' | 'stump';

export interface TreeData {
  id: string;
  pos: Vec3;
  hp: number;
  state: TreeState;
  /** 当 state==='stump' 时，到达此“游戏分钟”时间戳后重生。 */
  regrowAt: number | null;
  variant: number; // 外观变体索引，用于多种树模型
}

export interface DropData {
  id: string;
  itemId: ItemId;
  pos: Vec3;
  amount: number;
}

export type FishState = 'idle' | 'cooling';

export interface FishSpot {
  id: string;
  pos: Vec3; // 站位点（岸边，玩家站这里钓鱼）
  /** 当前状态。cooling 时不可钓。 */
  state: FishState;
  /** 到达此“游戏分钟”时间戳后从 cooling 恢复为 idle。 */
  readyAt: number | null;
}

export type BugState = 'hidden' | 'active' | 'cooling';

export interface BugSpot {
  id: string;
  pos: Vec3;
  state: BugState;
  /** active 时虫停留到此“真实秒”时间戳后逃跑。hidden 阶段忽略。 */
  fleeAt: number | null;
  /** cooling 到此“游戏分钟”时间戳后随机刷新为 active。 */
  readyAt: number | null;
  variant: number; // 外观变体（0=常见蝴蝶，1=稀有萤火虫）
}

export interface PlantSpot {
  id: string;
  pos: Vec3;
  itemId: 'sapling' | 'flower_seed' | 'tomato_seed' | 'carrot_seed' | 'wheat_seed';
  plantedDay: number;
  stage: number; // -1=hole, 0=sprout, 1=sapling, 2=grown
  wateredToday: boolean;
}

export type PathType = 'stone' | 'brick' | 'wood' | 'dirt';

export interface PathTile {
  id: string;
  pos: Vec3;
  type: PathType;
}

export interface RockSpot {
  id: string;
  pos: Vec3;
  state: 'intact' | 'depleted';
  respawnAt: number | null;
}

export interface RoomData {
  placed: PlacedFurniture[];
}

/** 已摆放在室内的家具实例。 */
export interface PlacedFurniture {
  id: string;
  itemId: FurnitureItemId;
  /** 室内坐标（已按网格吸附）。 */
  pos: Vec3;
  /** 旋转（0/90/180/270 度，存为弧度倍数；这里存 0~3 的步进）。 */
  rotStep: number; // 0=0°, 1=90°, 2=180°, 3=270°
}

export interface SaveData {
  version: number;
  player: {
    name: string;
    pos: Vec3;
    yaw: number; // 朝向（弧度）
    bells: number; // 钱包铃钱
  };
  /** 背包：物品 id -> 数量。 */
  inventory: Partial<Record<ItemId, number>>;
  /** 已拥有工具及其耐久。 */
  tools: Partial<Record<ToolId, number>>;
  /** 当前装备的工具（null = 赤手）。 */
  equipped: ToolId | null;
  trees: TreeData[];
  drops: DropData[];
  fishSpots: FishSpot[];
  bugs: BugSpot[];
  /** 房屋与室内摆放的家具。 */
  house: {
    built: boolean;
    rooms: Record<string, RoomData>;
  };
  /** 玩家当前所在场景：'island' 在岛上，'house' 在室内，'museum' 在博物馆。 */
  scene: 'island' | 'house' | 'museum';
  clock: { day: number; minutes: number };
  npcAffinity: Record<string, number>;
  social: {
    daily: Record<string, number>;
  };
  weather: WeatherPattern;
  plants: PlantSpot[];
  paths: PathTile[];
  rocks: RockSpot[];
  collection: Record<string, true>;
  toolLevel: Record<string, number>;
  /** 已捐赠给博物馆的物品（fish/bug），itemId -> true */
  museumDonations: Record<string, true>;
  /** 是否已领取全图鉴奖励 */
  museumRewardClaimed: boolean;
  regionProgress: {
    ruinRunes: number;
    ruinChestOpened: boolean;
    collectedShells: Record<string, true>;
    volleyballDay: number | null;
  };
}

export function realClockNow(): { day: number; minutes: number } {
  const now = new Date();
  const epoch = new Date(2024, 0, 1).getTime();
  const day = Math.floor((now.getTime() - epoch) / (24 * 60 * 60 * 1000)) + 1;
  return {
    day,
    minutes: now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60,
  };
}

// ─────────────────────────── 迁移注册表 ───────────────────────────
// 当 SaveData 结构变更时，新增迁移函数并升 SAVE.version。
// 旧存档会按顺序执行所有比其 version 更高的迁移。
// 用 Loose 类型承载“形状不确定”的旧存档，避免使用 any。
interface Loose {
  version?: number;
  [key: string]: unknown;
}
type Migration = (data: Loose) => Loose;
const migrations: Record<number, Migration> = {
  // v1 → v2：Phase B 加入 fishSpots / bugs 字段。
  2: (d) => ({
    ...d,
    fishSpots: Array.isArray((d as Loose).fishSpots) ? (d as Loose).fishSpots : [],
    bugs: Array.isArray((d as Loose).bugs) ? (d as Loose).bugs : [],
  }),
  // v2 → v3：Phase C 加入 house / scene 字段。
  3: (d) => {
    const raw = (d as Loose).house as Loose | undefined;
    const placed = Array.isArray(raw?.placed) ? (raw as { placed: PlacedFurniture[] }).placed : [];
    return {
      ...d,
      house: raw
        ? { built: true, rooms: { living: { placed }, bedroom: { placed: [] }, kitchen: { placed: [] } } }
        : { built: true, rooms: { living: { placed: [] }, bedroom: { placed: [] }, kitchen: { placed: [] } } },
      scene: ((d as Loose).scene === 'house' ? 'house' : 'island'),
    };
  },
  // v3 → v4：Phase D 扩大岛屿、加入河流与 NPC。实体补齐在 store bootstrap 中完成。
  4: (d) => ({
    ...d,
    npcAffinity: (d as Loose).npcAffinity ?? {},
  }),
  5: (d) => ({
    ...d,
    social: (d as Loose).social ?? { daily: {} },
  }),
  6: (d) => ({
    ...d,
    weather: isWeather((d as Loose).weather) ? (d as { weather: WeatherPattern }).weather : 'clear',
    clock: realClockNow(),
  }),
  7: (d) => ({
    ...d,
    plants: Array.isArray((d as Loose).plants) ? (d as Loose).plants : [],
  }),
  8: (d) => ({
    ...d,
    collection: (d as Loose).collection ?? {},
  }),
  9: (d) => ({
    ...d,
    toolLevel: (d as Loose).toolLevel ?? {},
  }),
  10: (d) => ({
    ...d,
    rocks: (d as Loose).rocks ?? [],
  }),
  11: (d) => ({
    ...d,
    museumDonations: (d as Loose).museumDonations ?? {},
    museumRewardClaimed: (d as Loose).museumRewardClaimed ?? false,
  }),
  12: (d) => {
    const h = (d as Loose).house as Loose | undefined;
    const placed = Array.isArray(h?.placed) ? (h as { placed: PlacedFurniture[] }).placed : [];
    const rooms = (h?.rooms && typeof h.rooms === 'object' && !Array.isArray(h.rooms))
      ? h.rooms as Record<string, RoomData>
      : { living: { placed }, bedroom: { placed: [] }, kitchen: { placed: [] } };
    return {
      ...d,
      house: { built: true, rooms },
    };
  },
  13: (d) => ({
    ...d,
    regionProgress: (d as Loose).regionProgress ?? {
      ruinRunes: 0,
      ruinChestOpened: false,
      collectedShells: {},
      volleyballDay: null,
    },
  }),
  14: (d) => {
    const plants = (d as Loose).plants as Loose[] | undefined;
    return {
      ...d,
      plants: Array.isArray(plants)
        ? plants.map((p: Loose) => ({ ...p, wateredToday: (p as { wateredToday?: boolean }).wateredToday ?? false }))
        : [],
    };
  },
  15: (d) => ({
    ...d,
    paths: Array.isArray((d as Loose).paths) ? (d as Loose).paths : [],
  }),
};

function isWeather(value: unknown): value is WeatherPattern {
  return value === 'clear' || value === 'cloudy' || value === 'rainy' || value === 'stormy' || value === 'snowy';
}

export function migrate(raw: unknown): SaveData {
  if (!raw || typeof raw !== 'object') return defaultSave();
  let d = raw as Loose;
  let v = d.version ?? 1;
  while (v < SAVE.version && migrations[v + 1]) {
    d = migrations[v + 1](d);
    v += 1;
  }
  d.version = SAVE.version;
  return d as unknown as SaveData;
}

export function defaultSave(): SaveData {
  return {
    version: SAVE.version,
    player: { name: '岛主', pos: [0, 0, 16], yaw: Math.PI, bells: 1000 },
    inventory: {},
    tools: { axe: 30 }, // Phase A 初始自带一把斧头；钓竿/捕虫网需到商店购买
    equipped: 'axe',
    trees: [],
    drops: [],
    fishSpots: [],
    bugs: [],
    house: { built: true, rooms: { living: { placed: [] }, bedroom: { placed: [] }, kitchen: { placed: [] } } },
    scene: 'island',
    clock: realClockNow(),
    npcAffinity: {},
    social: { daily: {} },
    weather: 'clear',
    plants: [],
    paths: [],
    rocks: [],
    collection: {},
    toolLevel: {},
    museumDonations: {},
    museumRewardClaimed: false,
    regionProgress: {
      ruinRunes: 0,
      ruinChestOpened: false,
      collectedShells: {},
      volleyballDay: null,
    },
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE.key);
    if (!raw) return defaultSave();
    return migrate(JSON.parse(raw));
  } catch (e) {
    console.warn('[save] 读取失败，回退默认存档:', e);
    return defaultSave();
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(SAVE.key, JSON.stringify(data));
  } catch (e) {
    console.error('[save] 写入失败:', e);
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE.key);
}
