// 全局游戏状态（zustand + persist）。
// 持久化字段即 SaveData；运行期临时状态（提示、最近交互目标等）不持久化。
//
// 设计要点：
// - 所有玩法动作都通过这里的 action 修改状态，组件只读 store。
// - persist 的 partialize 只保留 SaveData 字段，避免把瞬时 UI 状态写进 localStorage。
// - 钓鱼/捕虫的“每帧计时”放在组件 ref 里，只在状态切换时调 store action。

import { create } from 'zustand/react';
import { persist, createJSONStorage } from 'zustand/middleware';
import { WORLD, TREE, AXE, CLOCK, WEATHER, SAVE, FISH, BUG, TOOL_USE, TOOL_TIER_DUR, HOUSE, ROOMS, MUSEUM, MINE, type RoomId } from '../config/constants.ts';
import type { WeatherPattern } from '../config/constants.ts';
import { ITEMS, TOOLS, type ItemId, type ToolId, type FurnitureItemId } from '../config/items.ts';
import {
  defaultSave,
  migrate as migrateSave,
  realClockNow,
  type SaveData,
  type DropData,
  type FishSpot,
  type Vec3,
  type PlacedFurniture,
} from '../systems/save.ts';
import { fishWaterPos, generateWorld } from '../systems/worldgen.ts';
import { rollFish, rollBug } from '../config/spawns.ts';
import {
  buyToolValue,
  repairToolValue,
  sellValue,
  inventorySellTotal,
} from '../systems/economy.ts';
import { RECIPES, hasMaterials, hasRecipe } from '../config/recipes.ts';
import { npcById, type NpcId } from '../config/npcs.ts';
import { animalById, type AnimalId } from '../config/animals.ts';
import { blocksWalking, groundKind, nearestWalkable } from '../systems/terrain.ts';
import { currentEvent } from '../config/events.ts';
import type { WorldFeatureId } from '../config/worldFeatures.ts';
import { createTurnipMarket } from '../systems/turnipMarket.ts';

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

interface Toast {
  id: number;
  text: string;
}

export type FishingPhase = 'idle' | 'casting' | 'waiting' | 'hooked' | 'reeling' | 'caught';

interface FishingSession {
  phase: FishingPhase;
  spotId: string | null;
  prompt: string | null;
  reelingProgress: number;
}

interface DialogueState {
  npcId: NpcId;
  name: string;
  role: string;
  color: string;
  text: string;
}

interface GameState extends SaveData {
  // ───────── 瞬时状态（不持久化） ─────────
  toasts: Toast[];
  /** 当前玩家附近可交互对象的提示文本（UI 显示用）。 */
  interactHint: string | null;
  /** 钓鱼会话：phase 推进由 FishingController 在帧内驱动。 */
  fishing: FishingSession;
  /** UI 开关 */
  shopOpen: boolean;
  /** 家具摆放模式：active 时玩家正在放置/收回家具。瞬时状态，不持久化。 */
  placing: {
    active: boolean;
    itemId: FurnitureItemId | null; // 放置模式选中的家具
    pickupId: string | null; // 收回模式选中的家具 id
  };
  dialogue: DialogueState | null;
  /** 当前所在房间。瞬时状态，不持久化。 */
  currentRoom: RoomId;
  /** 博物馆捐赠面板是否打开。瞬时状态，不持久化。 */
  museumPanel: boolean;
  /** 是否已通过标题画面进入游戏。瞬时状态，不持久化。 */
  booted: boolean;

  // ───────── 动作 ─────────
  setPlayer: (pos: Vec3, yaw: number) => void;
  addItem: (id: ItemId, amount: number) => void;
  removeItem: (id: ItemId, amount: number) => boolean;
  addBells: (n: number) => void;
  spendBells: (n: number) => boolean;
  equipTool: (t: ToolId | null) => void;
  upgradeTool: (toolId: ToolId) => void;
  chopTree: (treeId: string) => boolean;
  harvestFruit: (treeId: string) => void;
  pickupDrop: (dropId: string) => void;
  regrowDue: () => void;
  tickClock: () => void;
  setWeather: (weather: WeatherPattern) => void;
  pushToast: (text: string) => void;
  dismissToast: (id: number) => void;
  setInteractHint: (text: string | null) => void;
  resetGame: (name?: string) => void;

  // 商店
  buyTool: (tool: ToolId) => boolean;
  repairTool: (tool: ToolId) => boolean;
  sellItem: (id: ItemId, qty: number) => boolean;
  sellAll: () => number;
  setShopOpen: (open: boolean) => void;

  // 大头菜市场
  /** 购买大头菜 */
  buyTurnips: (qty: number) => boolean;
  /** 卖出大头菜 */
  sellTurnips: (qty: number) => boolean;
  /** 更新大头菜价格（时钟 tick 时调用） */
  updateTurnipPrices: () => void;
  /** 检查大头菜是否过期 */
  checkTurnipSpoil: () => void;

  // 钓鱼
  /** 开始一次钓鱼（抛竿）。由 Player 在按 E 时调用。 */
  startFishing: (spotId: string) => void;
  /** FishingController 推进钓鱼阶段。 */
  setFishingPhase: (phase: FishingPhase, prompt: string | null) => void;
  /** 钓上鱼：结算。由 FishingController 在成功拉杆时调用。 */
  catchFish: (spotId: string) => void;
  /** 钓鱼失败/超时：结算。 */
  missFish: () => void;
  /** 结束钓鱼会话（无论成败）。 */
  endFishing: () => void;
  /** 收线：推进收线进度（每按一次 E 加 0.33）。 */
  progressReel: () => void;

  // 捕虫
  catchBug: (spotId: string) => void;
  missBug: (spotId: string) => void;
  /** 推进虫点状态：激活到期的隐藏点、让停留到期的虫逃跑。
   *  realNow 为 three clock.elapsedTime（真实秒），gameMinNow 为当前游戏分钟。 */
  tickBugs: (realNow: number, gameMinNow: number) => void;

  // 房屋与家具
  /** 进入房屋：切换 scene='house'，把玩家位置挪到室内门口。 */
  enterHouse: () => void;
  /** 离开房屋：回到岛上房屋门口外。 */
  leaveHouse: () => void;
  /** 把背包里的一件家具摆放到室内指定网格位置。消耗该家具 1 个。 */
  placeFurniture: (itemId: FurnitureItemId, pos: Vec3, rotStep: number) => boolean;
  /** 旋转当前正在摆放的家具（仅改 ref，不写 store）。这里提供 store 侧记录。 */
  rotatePlacing: () => void;
  /** 收回一件已摆放的家具，放回背包。 */
  pickupFurniture: (placedId: string) => void;
  /** 合成家具：消耗材料 + 图纸（图纸不消耗），产出 1 件家具。 */
  craftFurniture: (output: FurnitureItemId) => boolean;
  /** 商店购买物品（家具/图纸等，非工具）。 */
  buyItem: (id: ItemId) => boolean;
  /** 进入/退出家具放置模式（选择一件背包家具开始摆放）。 */
  startPlacing: (itemId: FurnitureItemId) => void;
  /** 取消放置模式。 */
  cancelPlacing: () => void;
  /** 进入收回模式：高亮可拾取的家具。 */
  startPicking: () => void;
  /** 与 NPC 交谈：展示台词并提升一点好感。 */
  talkToNpc: (id: NpcId) => void;
  /** 给 NPC 送礼：消耗物品，提升好感。 */
  giftNpc: (id: NpcId, itemId: ItemId) => void;
  /** 与小动物互动：每日第一次记录互动，后续给轻量反馈。 */
  interactWithAnimal: (id: AnimalId) => void;
  closeDialogue: () => void;
  setCurrentRoom: (room: RoomId) => void;

  // 铲子种植
  digHole: (pos: Vec3) => void;
  plantAtSpot: (spotId: string) => void;
  waterPlant: (spotId: string) => void;
  harvestPlant: (spotId: string) => void;
  growPlants: () => void;
  mineRock: (rockId: string) => void;

  // 道路
  placePath: (pos: Vec3) => void;
  removePath: (pathId: string) => void;

  // 博物馆
  enterMuseum: () => void;
  leaveMuseum: () => void;
  donateToMuseum: (itemId: string) => void;
  claimMuseumReward: () => void;
  setMuseumPanel: (open: boolean) => void;
  interactWorldFeature: (id: WorldFeatureId) => void;

  // 标题画面
  setBooted: (v: boolean) => void;
  setPlayerName: (name: string) => void;
}

let toastSeq = 1;

// 首次进入：若存档为空，生成初始世界。旧存档若 fishSpots/bugs 为空也补齐。
function bootstrap(): SaveData {
  const stored = localStorage.getItem(SAVE.key);
  if (stored) {
    try {
      const data = migrateSave(JSON.parse(stored));
      const w = generateWorld();
      const safePlayer = nearestWalkable(data.player.pos[0], data.player.pos[2]);
      const playerPos: Vec3 = data.scene === 'house' ? [0, 0, 5.8] : data.scene === 'museum' ? [0, 0, 9] : [safePlayer[0], 0, safePlayer[2]];
      return {
        ...data,
        player: { ...data.player, pos: playerPos },
        trees: mergeById(data.trees, w.trees),
        fishSpots: mergeFishSpots(data.fishSpots, w.fishSpots),
        bugs: mergeById(data.bugs, w.bugs),
        rocks: mergeById(data.rocks ?? [], w.rocks),
      };
    } catch {
      // fall through
    }
  }
  const base = defaultSave();
  const world = generateWorld();
  return {
    ...base,
    trees: world.trees,
    drops: world.drops,
    fishSpots: world.fishSpots,
    bugs: world.bugs,
    rocks: world.rocks,
    house: base.house,
    scene: base.scene,
  };
}

function mergeById<T extends { id: string }>(saved: T[] | undefined, generated: T[]): T[] {
  if (!saved || saved.length === 0) return generated;
  const ids = new Set(saved.map((item) => item.id));
  const missing = generated.filter((item) => !ids.has(item.id));
  return [...saved, ...missing];
}

function mergeFishSpots(saved: FishSpot[] | undefined, generated: FishSpot[]): FishSpot[] {
  if (!saved || saved.length === 0) return generated;
  const savedById = new Map(saved.map((spot) => [spot.id, spot]));
  return generated.map((spot) => {
    const old = savedById.get(spot.id);
    if (!old || !isValidFishSpot(old)) return spot;
    return { ...old, pos: spot.pos };
  });
}

function isValidFishSpot(spot: FishSpot): boolean {
  if (blocksWalking(spot.pos[0], spot.pos[2])) return false;
  const kind = groundKind(spot.pos[0], spot.pos[2]);
  if (kind === 'water' || kind === 'rock') return false;
  const water = fishWaterPos(spot);
  return groundKind(water[0], water[2]) === 'water' || blocksWalking(water[0], water[2]);
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...bootstrap(),

      toasts: [],
      interactHint: null,
      fishing: { phase: 'idle', spotId: null, prompt: null, reelingProgress: 0 },
      shopOpen: false,
      placing: { active: false, itemId: null, pickupId: null },
      dialogue: null,
      currentRoom: 'living' as RoomId,
      museumPanel: false,
      booted: false,

      setPlayer: (pos, yaw) =>
        set((s) => ({ player: { ...s.player, pos, yaw } })),

      addItem: (id, amount) =>
        set((s) => {
          const cur = s.inventory[id] ?? 0;
          const cap = ITEMS[id].stack;
          const next = Math.min(cur + amount, cap);
          return { inventory: { ...s.inventory, [id]: next } };
        }),

      removeItem: (id, amount) => {
        const cur = get().inventory[id] ?? 0;
        if (cur < amount) return false;
        set((s) => ({ inventory: { ...s.inventory, [id]: cur - amount } }));
        return true;
      },

      addBells: (n) => set((s) => ({ player: { ...s.player, bells: s.player.bells + n } })),

      spendBells: (n) => {
        if (get().player.bells < n) return false;
        set((s) => ({ player: { ...s.player, bells: s.player.bells - n } }));
        return true;
      },

      equipTool: (t) => set({ equipped: t }),

      upgradeTool: (toolId) => {
        const s = get();
        const curLevel = s.toolLevel[toolId] ?? 1;
        if (curLevel >= 3) { get().pushToast('已经是最高等级了'); return; }
        const nextLevel = curLevel + 1;
        const maxDur = TOOL_TIER_DUR[toolId]?.[nextLevel - 1] ?? 0;
        const cost = nextLevel === 2 ? 500 : 2000;
        const ore = nextLevel === 2 ? 'iron_ore' : 'gold_ore';
        const oreCost = nextLevel === 2 ? 3 : 2;
        if (!s.spendBells(cost) || (s.inventory[ore] ?? 0) < oreCost) {
          get().pushToast(`升级需要 🪙${cost} + ${ore}×${oreCost}`);
          return;
        }
        set({
          tools: { ...s.tools, [toolId]: maxDur },
          toolLevel: { ...s.toolLevel, [toolId]: nextLevel },
          inventory: { ...s.inventory, [ore]: (s.inventory[ore] ?? 0) - oreCost },
        });
        get().pushToast(`工具升级到 Lv${nextLevel}！耐久 ${maxDur}`);
      },

      chopTree: (treeId) => {
        const s = get();
        if (s.equipped !== 'axe') {
          get().pushToast('需要装备斧头才能砍树');
          return false;
        }
        const tree = s.trees.find((t) => t.id === treeId);
        if (!tree || tree.state !== 'intact') return false;
        const dur = s.tools.axe ?? 0;
        if (dur <= 0) {
          get().pushToast('斧头坏了，去商店修理或购买新的');
          return false;
        }
        const newHp = tree.hp - 1;
        const newDur = dur - AXE.costPerHit;
        let trees: typeof s.trees;
        let drops = s.drops;

        if (newHp > 0) {
          trees = s.trees.map((t) => (t.id === treeId ? { ...t, hp: newHp } : t));
        } else {
          const regrowAt = s.clock.day * CLOCK.minutesPerDay + s.clock.minutes + TREE.regrowMinutes;
          trees = s.trees.map((t) =>
            t.id === treeId ? { ...t, hp: 0, state: 'stump', regrowAt } : t,
          );
          const newDrops: DropData[] = [];
          const [tx, , tz] = tree.pos;
          const isPalm = tree.variant >= 9;
          if (isPalm) {
            for (let i = 0; i < 3; i++) {
              newDrops.push({
                id: `drop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-c${i}`,
                itemId: 'coconut',
                pos: [tx + (Math.random() - 0.5) * 1.6, 0, tz + (Math.random() - 0.5) * 1.6],
                amount: 1,
              });
            }
            drops = [...s.drops, ...newDrops];
            get().pushToast('椰子树倒了！掉落了椰子');
          } else {
            for (let i = 0; i < TREE.woodDrop; i++) {
              newDrops.push({
                id: `drop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${i}`,
                itemId: 'wood',
                pos: [tx + (Math.random() - 0.5) * 1.6, 0, tz + (Math.random() - 0.5) * 1.6],
                amount: 1,
              });
            }
            for (let i = 0; i < TREE.branchDrop; i++) {
              newDrops.push({
                id: `drop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-b${i}`,
                itemId: 'branch',
                pos: [tx + (Math.random() - 0.5) * 1.6, 0, tz + (Math.random() - 0.5) * 1.6],
                amount: 1,
              });
            }
            drops = [...s.drops, ...newDrops];
            get().pushToast('树倒了！掉落了木材和树枝');
          }
        }

        set({
          trees,
          drops,
          tools: { ...s.tools, axe: newDur },
        });
        return true;
      },

      harvestFruit: (treeId) => {
        const s = get();
        const tree = s.trees.find((t) => t.id === treeId);
        if (!tree || !tree.fruit || tree.fruitCount <= 0) return;
        const fruitId = tree.fruit;
        const amount = tree.fruitCount;
        get().addItem(fruitId, amount);
        const fruitReadyAt = s.clock.day * CLOCK.minutesPerDay + s.clock.minutes + 1440; // 1 game day
        set({
          trees: s.trees.map((t) =>
            t.id === treeId ? { ...t, fruitCount: 0, fruitReadyAt } : t,
          ),
        });
        get().pushToast(`摘了 ${amount} 个${ITEMS[fruitId].name}！`);
      },

      pickupDrop: (dropId) => {
        const s = get();
        const drop = s.drops.find((d) => d.id === dropId);
        if (!drop) return;
        const cur = s.inventory[drop.itemId] ?? 0;
        const cap = ITEMS[drop.itemId].stack;
        if (cur >= cap) {
          get().pushToast(`${ITEMS[drop.itemId].name}已满，无法拾取`);
          return;
        }
        get().addItem(drop.itemId, drop.amount);
        set({ drops: s.drops.filter((d) => d.id !== dropId) });
      },

      regrowDue: () => {
        const s = get();
        const now = s.clock.day * CLOCK.minutesPerDay + s.clock.minutes;
        const anyDue = s.trees.some((t) => t.state === 'stump' && t.regrowAt !== null && t.regrowAt <= now);
        const anyFruitDue = s.trees.some((t) => t.state === 'intact' && t.fruit && t.fruitCount === 0 && t.fruitReadyAt !== null && t.fruitReadyAt <= now);
        if (!anyDue && !anyFruitDue) return;
        set({
          trees: s.trees.map((t) => {
            if (t.state === 'stump' && t.regrowAt !== null && t.regrowAt <= now) {
              return { ...t, state: 'intact', hp: TREE.maxHp, regrowAt: null };
            }
            if (t.state === 'intact' && t.fruit && t.fruitCount === 0 && t.fruitReadyAt !== null && t.fruitReadyAt <= now) {
              const newCount = Math.floor(Math.random() * 3) + 1;
              return { ...t, fruitCount: newCount, fruitReadyAt: null };
            }
            return t;
          }),
        });
      },

      tickClock: () => {
        const nextClock = realClockNow();
        const now = nextClock.day * CLOCK.minutesPerDay + nextClock.minutes;
        set((s) => ({
          clock: nextClock,
          rocks: s.rocks.map((r) =>
            r.state === 'depleted' && r.respawnAt !== null && r.respawnAt <= now
              ? { ...r, state: 'intact', respawnAt: null }
              : r,
          ),
        }));
        get().growPlants();
        get().updateTurnipPrices();
        get().checkTurnipSpoil();
        // 周日创建新的大头菜市场
        const dayOfWeek = nextClock.day % 7;
        if (dayOfWeek === 0 && nextClock.minutes === 0) {
          const rng = makeRng(nextClock.day * 1000);
          const market = createTurnipMarket(nextClock.day, nextClock.minutes, rng);
          set({ turnipMarket: market });
          get().pushToast('大头菜市场开门了！周日可以买大头菜');
        }
      },

      setWeather: (weather) => set({ weather }),

      pushToast: (text) => {
        const id = toastSeq++;
        set((s) => ({ toasts: [...s.toasts, { id, text }] }));
        setTimeout(() => get().dismissToast(id), 3000);
      },

      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      setInteractHint: (text) => set({ interactHint: text }),

      resetGame: (name) => {
        localStorage.removeItem(SAVE.key);
        const base = defaultSave();
        const world = generateWorld();
        set({
          ...base,
          player: { ...base.player, name: name ?? base.player.name },
          trees: world.trees,
          drops: world.drops,
          fishSpots: world.fishSpots,
          bugs: world.bugs,
          rocks: world.rocks,
          house: base.house,
          scene: base.scene,
          toasts: [],
          interactHint: null,
          fishing: { phase: 'idle', spotId: null, prompt: null, reelingProgress: 0 },
          shopOpen: false,
          placing: { active: false, itemId: null, pickupId: null },
          dialogue: null,
          museumPanel: false,
          booted: true,
        });
      },

      // ───────── 商店 ─────────
      buyTool: (tool) => {
        const s = get();
        const price = buyToolValue(tool);
        if (s.player.bells < price) {
          get().pushToast('铃钱不够');
          return false;
        }
        set({
          player: { ...s.player, bells: s.player.bells - price },
          tools: { ...s.tools, [tool]: TOOLS[tool].durability },
        });
        get().pushToast(`购买了${TOOLS[tool].name}`);
        return true;
      },

      repairTool: (tool) => {
        const s = get();
        const cur = s.tools[tool];
        if (cur === undefined) {
          get().pushToast('还没有这把工具，请先购买');
          return false;
        }
        const cost = repairToolValue(tool, cur);
        if (cost <= 0) {
          get().pushToast(`${TOOLS[tool].name}已是满耐久`);
          return false;
        }
        if (s.player.bells < cost) {
          get().pushToast('铃钱不够维修');
          return false;
        }
        set({
          player: { ...s.player, bells: s.player.bells - cost },
          tools: { ...s.tools, [tool]: TOOLS[tool].durability },
        });
        get().pushToast(`维修了${TOOLS[tool].name}（-${cost}铃钱）`);
        return true;
      },

      sellItem: (id, qty) => {
        const s = get();
        const have = s.inventory[id] ?? 0;
        if (have <= 0) return false;
        const n = Math.min(qty, have);
        const gain = sellValue(id, n);
        if (gain <= 0) {
          get().pushToast(`${ITEMS[id].name}无法出售`);
          return false;
        }
        set({
          player: { ...s.player, bells: s.player.bells + gain },
          inventory: { ...s.inventory, [id]: have - n },
        });
        get().pushToast(`卖出 ${ITEMS[id].name} ×${n}（+${gain}铃钱）`);
        return true;
      },

      sellAll: () => {
        const s = get();
        const total = inventorySellTotal(s.inventory);
        if (total <= 0) {
          get().pushToast('没有可出售的物品');
          return 0;
        }
        const inv: Partial<Record<ItemId, number>> = { ...s.inventory };
        for (const id of Object.keys(inv) as ItemId[]) {
          if (sellValue(id, 1) > 0) inv[id] = 0;
        }
        set({ player: { ...s.player, bells: s.player.bells + total }, inventory: inv });
        get().pushToast(`一键出售（+${total}铃钱）`);
        return total;
      },

      setShopOpen: (open) => set({ shopOpen: open }),

      // ───────── 大头菜市场 ─────────
      buyTurnips: (qty) => {
        const s = get();
        const market = s.turnipMarket;
        if (!market) {
          get().pushToast('周日才能买大头菜');
          return false;
        }
        const cost = market.buyPrice * qty;
        if (s.player.bells < cost) {
          get().pushToast(`铃钱不足（需要 ${cost} 铃）`);
          return false;
        }
        const cur = s.inventory.turnip ?? 0;
        if (cur + qty > 99) {
          get().pushToast('大头菜最多只能带 99 个');
          return false;
        }
        set({
          player: { ...s.player, bells: s.player.bells - cost },
          inventory: { ...s.inventory, turnip: cur + qty },
        });
        get().pushToast(`买了 ${qty} 个大头菜（-${cost}铃钱）`);
        return true;
      },

      sellTurnips: (qty) => {
        const s = get();
        const market = s.turnipMarket;
        const cur = s.inventory.turnip ?? 0;
        if (cur <= 0 || cur < qty) {
          get().pushToast('没有足够的大头菜');
          return false;
        }
        if (!market) {
          get().pushToast('大头菜无法出售');
          return false;
        }
        const gain = market.sellPrice * qty;
        set({
          player: { ...s.player, bells: s.player.bells + gain },
          inventory: { ...s.inventory, turnip: cur - qty },
        });
        get().pushToast(`卖出大头菜 ×${qty}（+${gain}铃钱）`);
        return true;
      },

      updateTurnipPrices: () => {
        const s = get();
        const market = s.turnipMarket;
        if (!market) return;
        const now = s.clock.day * CLOCK.minutesPerDay + s.clock.minutes;
        if (now < market.nextPriceChange) return;
        const rng = makeRng(s.clock.day * 1000 + s.clock.minutes);
        const newSellPrice = Math.max(10, market.buyPrice + Math.floor((rng() - 0.5) * market.buyPrice * 0.8));
        const nextPriceChange = market.nextPriceChange + CLOCK.minutesPerDay / 2;
        set({
          turnipMarket: { ...market, sellPrice: newSellPrice, nextPriceChange },
        });
        get().pushToast(`大头菜价格更新：${newSellPrice} 铃/个`);
      },

      checkTurnipSpoil: () => {
        const s = get();
        const market = s.turnipMarket;
        if (!market) return;
        const now = s.clock.day * CLOCK.minutesPerDay + s.clock.minutes;
        if (now < market.spoilAt) return;
        // 大头菜过期，清空库存
        const cur = s.inventory.turnip ?? 0;
        if (cur > 0) {
          set({
            inventory: { ...s.inventory, turnip: 0 },
            turnipMarket: null,
          });
          get().pushToast(`大头菜过期了！${cur} 个大头菜腐烂了`);
        } else {
          set({ turnipMarket: null });
        }
      },

      // ───────── 钓鱼 ─────────
      startFishing: (spotId) => {
        const s = get();
        const spot = s.fishSpots.find((f) => f.id === spotId);
        if (!spot || spot.state !== 'idle') return;
        if (s.equipped !== 'fishingRod') {
          get().pushToast('需要装备钓竿');
          return;
        }
        const dur = s.tools.fishingRod ?? 0;
        if (dur <= 0) {
          get().pushToast('钓竿坏了，去商店修理');
          return;
        }
        set({ fishing: { phase: 'casting', spotId, prompt: '抛竿中…', reelingProgress: 0 } });
      },

      setFishingPhase: (phase, prompt) =>
        set((s) => ({ fishing: { ...s.fishing, phase, prompt } })),

      catchFish: (spotId) => {
        const s = get();
        const spot = s.fishSpots.find((f) => f.id === spotId);
        if (!spot) return;
        const itemId = rollFish(Math.random(), s.clock.day, s.clock.minutes, WEATHER.seasonStart);
        const dur = s.tools.fishingRod ?? 0;
        const newDur = Math.max(0, dur - TOOL_USE.fishCost);
        const readyAt = s.clock.day * CLOCK.minutesPerDay + s.clock.minutes + FISH.cooldownMinutes;
        set({
          inventory: { ...s.inventory, [itemId]: Math.min((s.inventory[itemId] ?? 0) + 1, ITEMS[itemId].stack) },
          tools: { ...s.tools, fishingRod: newDur },
          fishSpots: s.fishSpots.map((f) => (f.id === spotId ? { ...f, state: 'cooling', readyAt } : f)),
          fishing: { phase: 'idle', spotId: null, prompt: null, reelingProgress: 0 },
          collection: { ...s.collection, [itemId]: true as const },
        });
        get().pushToast(`钓到了${ITEMS[itemId].name}！`);
      },

      missFish: () => {
        const s = get();
        const dur = s.tools.fishingRod ?? 0;
        const newDur = Math.max(0, dur - TOOL_USE.fishCost);
        set({
          tools: { ...s.tools, fishingRod: newDur },
          fishing: { phase: 'idle', spotId: null, prompt: null, reelingProgress: 0 },
        });
        get().pushToast('鱼跑了…');
      },

      endFishing: () => set({ fishing: { phase: 'idle', spotId: null, prompt: null, reelingProgress: 0 } }),

      progressReel: () => {
        const s = get();
        const progress = Math.min(1, (s.fishing.reelingProgress ?? 0) + 0.33);
        set({ fishing: { ...s.fishing, reelingProgress: progress } });
      },

      // ───────── 捕虫 ─────────
      catchBug: (spotId) => {
        const s = get();
        const spot = s.bugs.find((b) => b.id === spotId);
        if (!spot || spot.state !== 'active') return;
        if (s.equipped !== 'net') {
          get().pushToast('需要装备捕虫网');
          return;
        }
        const itemId = rollBug(Math.random(), s.clock.day, s.clock.minutes, WEATHER.seasonStart);
        const dur = s.tools.net ?? 0;
        if (dur <= 0) {
          get().pushToast('捕虫网坏了，去商店修理');
          return;
        }
        const newDur = Math.max(0, dur - TOOL_USE.netCost);
        const readyAt = s.clock.day * CLOCK.minutesPerDay + s.clock.minutes + BUG.cooldownMinutes;
        set({
          inventory: { ...s.inventory, [itemId]: Math.min((s.inventory[itemId] ?? 0) + 1, ITEMS[itemId].stack) },
          tools: { ...s.tools, net: newDur },
          bugs: s.bugs.map((b) => (b.id === spotId ? { ...b, state: 'cooling', readyAt, fleeAt: null } : b)),
          collection: { ...s.collection, [itemId]: true as const },
        });
        get().pushToast(`捕到了${ITEMS[itemId].name}！`);
      },

      missBug: (spotId) => {
        const s = get();
        if (s.equipped !== 'net') {
          get().pushToast('需要装备捕虫网');
          return;
        }
        const dur = s.tools.net ?? 0;
        if (dur <= 0) {
          get().pushToast('捕虫网坏了，去商店修理');
          return;
        }
        const newDur = Math.max(0, dur - TOOL_USE.netCost);
        const readyAt = s.clock.day * CLOCK.minutesPerDay + s.clock.minutes + BUG.cooldownMinutes;
        set({
          tools: { ...s.tools, net: newDur },
          bugs: s.bugs.map((b) => (b.id === spotId ? { ...b, state: 'cooling', readyAt, fleeAt: null } : b)),
        });
        get().pushToast('虫飞走了…');
      },

      tickBugs: (realNow, gameMinNow) => {
        const s = get();
        let changed = false;
        const bugs = s.bugs.map((b) => {
          // 隐藏 → 激活：到 readyAt 则出现
          if (b.state === 'hidden' && b.readyAt !== null && b.readyAt <= gameMinNow) {
            changed = true;
            return { ...b, state: 'active' as const, readyAt: null, fleeAt: realNow + BUG.lingerSec, variant: Math.random() < 0.25 ? 1 : 0 };
          }
          // 激活 → 逃跑（停留到期）：进入冷却
          if (b.state === 'active' && b.fleeAt !== null && b.fleeAt <= realNow) {
            changed = true;
            return { ...b, state: 'cooling' as const, fleeAt: null, readyAt: gameMinNow + BUG.cooldownMinutes };
          }
          // 冷却 → 隐藏：到 readyAt 后转入隐藏并安排下一次激活
          if (b.state === 'cooling' && b.readyAt !== null && b.readyAt <= gameMinNow) {
            changed = true;
            return { ...b, state: 'hidden' as const, readyAt: gameMinNow + Math.floor(Math.random() * 40), fleeAt: null };
          }
          return b;
        });
        if (changed) set({ bugs });
      },

      // ───────── 房屋与家具 ─────────
      enterHouse: () => {
        const s = get();
        if (s.scene === 'house') return;
        set({
          scene: 'house',
          currentRoom: 'living',
          player: { ...s.player, pos: [0, 0, 5.8], yaw: 0 }, // 室内门口朝里
          fishing: { phase: 'idle', spotId: null, prompt: null, reelingProgress: 0 },
        });
        get().pushToast('回家了');
      },

      leaveHouse: () => {
        const s = get();
        if (s.scene !== 'house') return;
        // 回到房屋门口外（房屋 +Z 方向再往外）
        const [hx, , hz] = HOUSE.pos;
        set({
          scene: 'island',
          player: { ...s.player, pos: [hx, 0, hz + HOUSE.radius + 2], yaw: Math.PI },
        });
        get().pushToast('出门了');
      },

      placeFurniture: (itemId, pos, rotStep) => {
        const s = get();
        if (s.scene !== 'house') return false;
        const room = s.currentRoom;
        const have = s.inventory[itemId] ?? 0;
        if (have <= 0) {
          get().pushToast('背包里没有这件家具');
          return false;
        }
        const placed: PlacedFurniture = {
          id: `fur-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          itemId,
          pos,
          rotStep,
        };
        const currentPlaced = s.house.rooms[room]?.placed ?? [];
        set({
          inventory: { ...s.inventory, [itemId]: have - 1 },
          house: {
            ...s.house,
            rooms: { ...s.house.rooms, [room]: { placed: [...currentPlaced, placed] } },
          },
        });
        get().pushToast(`摆放了${ITEMS[itemId].name}`);
        return true;
      },

      rotatePlacing: () => {
        // 摆放时的旋转由 FurniturePlacer 组件本地 ref 处理，这里保留接口
      },

      pickupFurniture: (placedId) => {
        const s = get();
        const room = s.currentRoom;
        const currentPlaced = s.house.rooms[room]?.placed ?? [];
        const fur = currentPlaced.find((f) => f.id === placedId);
        if (!fur) return;
        const have = s.inventory[fur.itemId] ?? 0;
        if (have >= ITEMS[fur.itemId].stack) {
          get().pushToast(`${ITEMS[fur.itemId].name}已满，无法收回`);
          return;
        }
        set({
          house: {
            ...s.house,
            rooms: { ...s.house.rooms, [room]: { placed: currentPlaced.filter((f) => f.id !== placedId) } },
          },
          inventory: { ...s.inventory, [fur.itemId]: have + 1 },
        });
        get().pushToast(`收回了${ITEMS[fur.itemId].name}`);
      },

      craftFurniture: (output) => {
        const s = get();
        const recipe = RECIPES[output];
        if (!hasRecipe(s.inventory, output)) {
          get().pushToast(`还没有${ITEMS[recipe.recipe].name}，去商店购买`);
          return false;
        }
        if (!hasMaterials(s.inventory, output)) {
          get().pushToast('材料不足');
          return false;
        }
        // 消耗材料（图纸不消耗）
        const inv: Partial<Record<ItemId, number>> = { ...s.inventory };
        for (const [id, need] of Object.entries(recipe.materials) as [ItemId, number][]) {
          inv[id] = (inv[id] ?? 0) - need;
        }
        inv[output] = Math.min((inv[output] ?? 0) + 1, ITEMS[output].stack);
        set({ inventory: inv });
        get().pushToast(`合成了${ITEMS[output].name}`);
        return true;
      },

      buyItem: (id) => {
        const s = get();
        const def = ITEMS[id];
        if (def.buyPrice <= 0) {
          get().pushToast('此物品不可购买');
          return false;
        }
        if (s.player.bells < def.buyPrice) {
          get().pushToast('铃钱不够');
          return false;
        }
        const cur = s.inventory[id] ?? 0;
        if (cur >= def.stack) {
          get().pushToast(`${def.name}已满`);
          return false;
        }
        set({
          player: { ...s.player, bells: s.player.bells - def.buyPrice },
          inventory: { ...s.inventory, [id]: cur + 1 },
        });
        get().pushToast(`购买了${def.name}`);
        return true;
      },

      startPlacing: (itemId) => {
        const s = get();
        if (s.scene !== 'house') {
          get().pushToast('进屋才能摆放家具');
          return;
        }
        if ((s.inventory[itemId] ?? 0) <= 0) {
          get().pushToast('背包里没有这件家具');
          return;
        }
        set({ placing: { active: true, itemId, pickupId: null } });
        get().pushToast(`正在摆放${ITEMS[itemId].name}：R 旋转 / E 放置 / Q 取消`);
      },

      cancelPlacing: () => set({ placing: { active: false, itemId: null, pickupId: null } }),

      startPicking: () => {
        const s = get();
        if (s.scene !== 'house') {
          get().pushToast('进屋才能收回家具');
          return;
        }
        set({ placing: { active: true, itemId: null, pickupId: null } });
        get().pushToast('收回模式：走到家具旁按 E 收回 / Q 退出');
      },

      talkToNpc: (id) => {
        const s = get();
        const npc = npcById(id);
        const affinity = s.npcAffinity[id] ?? 0;
        const dailyKey = `npc:${id}`;
        const firstToday = s.social.daily[dailyKey] !== s.clock.day;
        const ev = currentEvent(s.clock.day);
        const festivalLine = ev && firstToday
          ? `${npc.name}笑着说：「${ev.name}快乐！今天的岛特别热闹呢！」`
          : null;
        const line = festivalLine ?? (firstToday
          ? npc.greetings[(s.clock.day + affinity) % npc.greetings.length]
          : `${npc.name}笑着说：今天已经聊过啦，明天再来找我也会有新鲜事。`);
        set({
          npcAffinity: firstToday ? { ...s.npcAffinity, [id]: affinity + 1 } : s.npcAffinity,
          social: firstToday
            ? { ...s.social, daily: { ...s.social.daily, [dailyKey]: s.clock.day } }
            : s.social,
          dialogue: {
            npcId: id,
            name: npc.name,
            role: npc.role,
            color: npc.color,
            text: line,
          },
        });
      },

      giftNpc: (id, itemId) => {
        const s = get();
        const npc = npcById(id);
        const count = s.inventory[itemId] ?? 0;
        if (count <= 0) return;
        const liked = npc.likes.includes(itemId);
        const delta = liked ? 5 : 1;
        const curAff = s.npcAffinity[id] ?? 0;
        const newAff = Math.min(100, curAff + delta);
        const unlock = npc.recipeUnlock;
        const unlocked = unlock && curAff < unlock.threshold && newAff >= unlock.threshold;
        const itemName = ITEMS[itemId]?.name ?? itemId;
        const giftLine = liked
          ? npc.giftResponses[s.clock.day % npc.giftResponses.length].replace(/\{item\}/g, itemName)
          : `${npc.name}接过礼物，礼貌地笑了笑。「谢谢，不过这个我可能用不太上…」`;
        const unlockLine = unlocked
          ? `\n\n（好感度达到${unlock.threshold}！${npc.name}给了你一张${ITEMS[unlock.recipe].name}）`
          : '';
        set({
          inventory: { ...s.inventory, [itemId]: count - 1 },
          npcAffinity: { ...s.npcAffinity, [id]: newAff },
          dialogue: {
            npcId: id,
            name: npc.name,
            role: npc.role,
            color: npc.color,
            text: `${giftLine}${unlockLine}`,
          },
        });
        if (unlocked) {
          get().addItem(unlock.recipe, 1);
          get().pushToast(`解锁了${ITEMS[unlock.recipe].name}！`);
        }
      },

      interactWithAnimal: (id) => {
        const s = get();
        const animal = animalById(id);
        const dailyKey = `animal:${id}`;
        const firstToday = s.social.daily[dailyKey] !== s.clock.day;
        const line = firstToday
          ? animal.greetings[s.clock.day % animal.greetings.length]
          : `${animal.name}已经很满足了，正慢悠悠地继续散步。`;
        set({
          social: firstToday
            ? { ...s.social, daily: { ...s.social.daily, [dailyKey]: s.clock.day } }
            : s.social,
        });
        get().pushToast(line);
      },

      interactWorldFeature: (id) => {
        const s = get();
        if (id.startsWith('ruin_rune_')) {
          if (s.regionProgress.ruinChestOpened) {
            get().pushToast('遗迹符文已经恢复平静');
            return;
          }
          const rune = Number(id.slice(-1));
          const expected = s.regionProgress.ruinRunes + 1;
          if (rune !== expected) {
            set({ regionProgress: { ...s.regionProgress, ruinRunes: 0 } });
            get().pushToast('符文顺序错误，光芒全部熄灭了');
            return;
          }
          set({ regionProgress: { ...s.regionProgress, ruinRunes: rune } });
          get().pushToast(rune === 3 ? '符文共鸣，中央宝箱解锁了！' : `第 ${rune} 个符文亮了起来`);
          return;
        }
        if (id === 'ruin_chest') {
          if (s.regionProgress.ruinChestOpened) {
            get().pushToast('遗迹宝箱已经打开过了');
            return;
          }
          if (s.regionProgress.ruinRunes < 3) {
            get().pushToast('宝箱仍被封印：按风、水、林的顺序触碰符文');
            return;
          }
          set({
            player: { ...s.player, bells: s.player.bells + 1200 },
            inventory: { ...s.inventory, gold_ore: Math.min((s.inventory.gold_ore ?? 0) + 2, ITEMS.gold_ore.stack) },
            regionProgress: { ...s.regionProgress, ruinChestOpened: true },
          });
          get().pushToast('遗迹奖励：1200 铃钱和 2 块金矿石！');
          return;
        }
        if (id.startsWith('beach_shell_')) {
          if (s.regionProgress.collectedShells[id]) {
            get().pushToast('这里的贝壳已经捡过了');
            return;
          }
          const collectedShells = { ...s.regionProgress.collectedShells, [id]: true as const };
          const count = Object.keys(collectedShells).length;
          const reward = count === 5 ? 800 : 80;
          set({
            player: { ...s.player, bells: s.player.bells + reward },
            regionProgress: { ...s.regionProgress, collectedShells },
          });
          get().pushToast(count === 5 ? '集齐彩色贝壳，获得 800 铃钱！' : '捡到彩色贝壳，获得 80 铃钱');
          return;
        }
        if (id === 'beach_volleyball') {
          if (s.regionProgress.volleyballDay === s.clock.day) {
            get().pushToast('今天已经完成排球挑战了');
            return;
          }
          const reward = 180 + Math.floor(Math.random() * 121);
          set({
            player: { ...s.player, bells: s.player.bells + reward },
            regionProgress: { ...s.regionProgress, volleyballDay: s.clock.day },
          });
          get().pushToast(`排球挑战成功，获得 ${reward} 铃钱！`);
          return;
        }
        const npcId: NpcId = id.endsWith('mira') ? 'mira' : id.endsWith('tao') ? 'tao' : 'lina';
        const dailyKey = `stall:${npcId}`;
        if (s.social.daily[dailyKey] === s.clock.day) {
          get().pushToast('今天已经逛过这个摊位了');
          return;
        }
        const reward: ItemId = npcId === 'mira' ? 'flower_seed' : npcId === 'tao' ? 'fish_common' : 'wood';
        set({
          inventory: { ...s.inventory, [reward]: Math.min((s.inventory[reward] ?? 0) + 1, ITEMS[reward].stack) },
          social: { ...s.social, daily: { ...s.social.daily, [dailyKey]: s.clock.day } },
        });
        get().pushToast(`摊位体验奖励：${ITEMS[reward].name}`);
      },

      closeDialogue: () => set({ dialogue: null }),
      setCurrentRoom: (room) => {
        const s = get();
        const cfg = ROOMS[room];
        if (!cfg) return;
        set({ currentRoom: room, player: { ...s.player, pos: cfg.spawn, yaw: 0 } });
        get().pushToast(`进入${room === 'bedroom' ? '卧室' : room === 'kitchen' ? '厨房' : '客厅'}`);
      },

      digHole: (pos) => {
        const s = get();
        if (s.equipped !== 'shovel') return;
        const dur = s.tools.shovel ?? 0;
        if (dur <= 0) { get().pushToast('铲子坏了'); return; }
        const tooClose = s.plants.some((p) => Math.hypot(p.pos[0] - pos[0], p.pos[2] - pos[2]) < 1.5);
        if (tooClose) { get().pushToast('这里已经有东西了'); return; }
        const id = `plant-${Date.now()}`;
        const newDur = Math.max(0, dur - TOOL_USE.shovelCost);
        set({
          plants: [...s.plants, { id, pos, itemId: 'sapling' as const, plantedDay: s.clock.day, stage: -1, wateredToday: false }],
          tools: { ...s.tools, shovel: newDur },
        });
        get().pushToast('挖好了一个坑');
      },

      plantAtSpot: (spotId) => {
        const s = get();
        const spot = s.plants.find((p) => p.id === spotId);
        if (!spot || spot.stage !== -1) return;
        const seedTypes = ['sapling', 'flower_seed', 'tomato_seed', 'carrot_seed', 'wheat_seed'] as const;
        for (const seed of seedTypes) {
          if ((s.inventory[seed] ?? 0) > 0) {
            set({
              plants: s.plants.map((p) =>
                p.id === spotId ? { ...p, itemId: seed, stage: 0, plantedDay: s.clock.day, wateredToday: false } : p,
              ),
              inventory: { ...s.inventory, [seed]: (s.inventory[seed] ?? 0) - 1 },
            });
            get().pushToast(`种下了${ITEMS[seed].name}`);
            return;
          }
        }
        get().pushToast('需要树苗或种子');
      },

      waterPlant: (spotId) => {
        const s = get();
        if (s.equipped !== 'watering_can') { get().pushToast('需要装备水壶（按 5）'); return; }
        const dur = s.tools.watering_can ?? 0;
        if (dur <= 0) { get().pushToast('水壶没水了，去商店维修'); return; }
        const spot = s.plants.find((p) => p.id === spotId);
        if (!spot || spot.stage < 0 || spot.stage >= 2) return;
        if (spot.wateredToday) { get().pushToast('今天已经浇过水了'); return; }
        const newDur = Math.max(0, dur - TOOL_USE.waterCost);
        set({
          plants: s.plants.map((p) => (p.id === spotId ? { ...p, wateredToday: true } : p)),
          tools: { ...s.tools, watering_can: newDur },
        });
        get().pushToast('浇了水，明天会长大');
      },

      harvestPlant: (spotId) => {
        const s = get();
        const spot = s.plants.find((p) => p.id === spotId);
        if (!spot || spot.stage < 2) return;
        const produceMap: Partial<Record<string, ItemId>> = {
          sapling: 'wood',
          flower_seed: 'flower_seed',
          tomato_seed: 'tomato',
          carrot_seed: 'carrot',
          wheat_seed: 'wheat',
        };
        const produceId = produceMap[spot.itemId];
        if (!produceId) { get().pushToast('没什么可收获的'); return; }
        set({
          plants: s.plants.filter((p) => p.id !== spotId),
          inventory: { ...s.inventory, [produceId]: (s.inventory[produceId] ?? 0) + 1 },
        });
        get().pushToast(`收获了${ITEMS[produceId].name}`);
      },

      growPlants: () => {
        const s = get();
        const changed = s.plants.map((p) => {
          if (p.stage < 0 || p.stage >= 2) return { ...p, wateredToday: false };
          if (!p.wateredToday) return { ...p, wateredToday: false };
          return { ...p, stage: p.stage + 1, wateredToday: false };
        });
        if (changed.some((p, i) => p.stage !== s.plants[i].stage || p.wateredToday !== s.plants[i].wateredToday)) {
          set({ plants: changed });
        }
      },
      mineRock: (rockId) => {
        const s = get();
        if (s.equipped !== 'shovel') { get().pushToast('需要装备铲子'); return; }
        const dur = s.tools.shovel ?? 0;
        if (dur <= 0) { get().pushToast('铲子坏了'); return; }
        const rng = () => Math.random();
        const roll = rng();
        const itemId = roll < 0.5 ? 'stone' : roll < 0.8 ? 'iron_ore' : 'gold_ore';
        const newDur = Math.max(0, dur - TOOL_USE.shovelCost);
        const readyAt = s.clock.day * CLOCK.minutesPerDay + s.clock.minutes + MINE.cooldownMinutes;
        set({
          rocks: s.rocks.map((r) => r.id === rockId ? { ...r, state: 'depleted', respawnAt: readyAt } : r),
          tools: { ...s.tools, shovel: newDur },
          inventory: { ...s.inventory, [itemId]: Math.min((s.inventory[itemId] ?? 0) + 1, ITEMS[itemId].stack) },
        });
        get().pushToast(`采到了${ITEMS[itemId].name}！`);
      },

      // ───────── 道路 ─────────
      placePath: (pos) => {
        const s = get();
        const pathTypes = ['path_stone', 'path_brick', 'path_wood', 'path_dirt'] as const;
        let chosen: (typeof pathTypes)[number] | null = null;
        for (const pt of pathTypes) {
          if ((s.inventory[pt] ?? 0) > 0) { chosen = pt; break; }
        }
        if (!chosen) { get().pushToast('需要购买道路砖（商店→苗木页）'); return; }
        const sx = Math.round(pos[0]);
        const sz = Math.round(pos[2]);
        if (Math.hypot(sx - s.player.pos[0], sz - s.player.pos[2]) > WORLD.interactRadius) return;
        const tooClose = s.plants.some((p) => Math.hypot(p.pos[0] - sx, p.pos[2] - sz) < 1);
        if (tooClose) { get().pushToast('这里有植物，不能铺路'); return; }
        const existing = s.paths.find((p) => p.pos[0] === sx && p.pos[2] === sz);
        if (existing) { get().pushToast('这里已经有路了'); return; }
        const id = `path-${Date.now()}`;
        set({
          paths: [...s.paths, { id, pos: [sx, 0, sz], type: chosen === 'path_stone' ? 'stone' : chosen === 'path_brick' ? 'brick' : chosen === 'path_wood' ? 'wood' : 'dirt' }],
          inventory: { ...s.inventory, [chosen]: (s.inventory[chosen] ?? 0) - 1 },
        });
        get().pushToast('铺设了道路');
      },

      removePath: (pathId) => {
        const s = get();
        const path = s.paths.find((p) => p.id === pathId);
        if (!path) return;
        const typeMap: Record<string, ItemId> = { stone: 'path_stone', brick: 'path_brick', wood: 'path_wood', dirt: 'path_dirt' };
        const itemId = typeMap[path.type] as ItemId;
        set({
          paths: s.paths.filter((p) => p.id !== pathId),
          inventory: { ...s.inventory, [itemId]: Math.min((s.inventory[itemId] ?? 0) + 1, ITEMS[itemId].stack) },
        });
        get().pushToast('拆除了道路，回收了材料');
      },

      // ───────── 博物馆 ─────────
      enterMuseum: () => {
        const s = get();
        if (s.scene === 'museum') return;
        set({
          scene: 'museum',
          player: { ...s.player, pos: [0, 0, 9], yaw: 0 },
          fishing: { phase: 'idle', spotId: null, prompt: null, reelingProgress: 0 },
        });
        get().pushToast('🏛️ 进入博物馆');
      },

      leaveMuseum: () => {
        const s = get();
        if (s.scene !== 'museum') return;
        const [mx, , mz] = MUSEUM.pos;
        set({
          scene: 'island',
          player: { ...s.player, pos: [mx, 0, mz + 6], yaw: Math.PI },
        });
        get().pushToast('离开博物馆');
      },

      donateToMuseum: (itemId: string) => {
        const s = get();
        const id = itemId as ItemId;
        const count = s.inventory[id] ?? 0;
        if (count <= 0) {
          get().pushToast('背包里没有这件物品');
          return;
        }
        if (s.museumDonations[id]) {
          get().pushToast('已经捐赠过了');
          return;
        }
        const isDonateable = (MUSEUM.donateableItems as readonly string[]).includes(id);
        if (!isDonateable) {
          get().pushToast('这件物品不能捐赠');
          return;
        }
        set({
          inventory: { ...s.inventory, [id]: count - 1 },
          museumDonations: { ...s.museumDonations, [id]: true as const },
        });
        const allDonated = MUSEUM.donateableItems.every((d) => s.museumDonations[d] || d === id);
        const name = ITEMS[id]?.name ?? id;
        get().pushToast(`捐赠了${name}到博物馆！`);
        if (allDonated && !s.museumRewardClaimed) {
          get().pushToast('🎉 全藏品已集齐！快去柜台领取奖励！');
        }
      },

      claimMuseumReward: () => {
        const s = get();
        if (s.museumRewardClaimed) {
          get().pushToast('奖励已领取过');
          return;
        }
        const allDonated = MUSEUM.donateableItems.every((id) => s.museumDonations[id]);
        if (!allDonated) {
          get().pushToast('还有未捐赠的藏品');
          return;
        }
        set({
          player: { ...s.player, bells: s.player.bells + MUSEUM.completionReward },
          museumRewardClaimed: true,
        });
        get().pushToast(`🏆 全图鉴奖励 ${MUSEUM.completionReward} 铃钱！`);
      },

      setMuseumPanel: (open) => set({ museumPanel: open }),

      setBooted: (v) => set({ booted: v }),
      setPlayerName: (name) => set((s) => ({ player: { ...s.player, name } })),
    }),
    {
      name: SAVE.key,
      version: SAVE.version,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): SaveData => ({
        version: s.version,
        player: s.player,
        inventory: s.inventory,
        tools: s.tools,
        equipped: s.equipped,
        trees: s.trees,
        drops: s.drops,
        fishSpots: s.fishSpots,
        bugs: s.bugs,
        rocks: s.rocks,
        house: s.house,
        scene: s.scene,
        clock: s.clock,
        npcAffinity: s.npcAffinity,
        social: s.social,
        weather: s.weather,
        plants: s.plants,
        paths: s.paths,
        collection: s.collection,
        toolLevel: s.toolLevel,
        museumDonations: s.museumDonations,
        museumRewardClaimed: s.museumRewardClaimed,
        regionProgress: s.regionProgress,
        turnipMarket: s.turnipMarket,
      }),
      migrate: migrateSave,
      merge: (persisted, current) => {
        const p = persisted as Partial<SaveData> | undefined;
        const world = generateWorld();
        return {
          ...current,
          ...p,
          trees: mergeById(p?.trees ?? [], world.trees),
          fishSpots: mergeFishSpots(p?.fishSpots, world.fishSpots),
          bugs: mergeById(p?.bugs ?? [], world.bugs),
          rocks: mergeById(p?.rocks ?? [], world.rocks),
        };
      },
    },
  ),
);

// 便利选择器
export const useInventory = () => useGameStore((s) => s.inventory);
export const useBells = () => useGameStore((s) => s.player.bells);
export const useEquipped = () => useGameStore((s) => s.equipped);

// 工具函数：把游戏分钟转成 HH:MM
export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// 世界边界工具：把位置限制在岛屿范围内
export function clampToWorld(pos: Vec3): Vec3 {
  const limit = WORLD.size / 2 - 1;
  return [Math.max(-limit, Math.min(limit, pos[0])), pos[1], Math.max(-limit, Math.min(limit, pos[2]))];
}
