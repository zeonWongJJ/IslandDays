// 全局游戏常量。所有“魔法数字”集中在此，便于调参与平衡。

import { MAP_LAYOUT } from './mapLayout.ts';

export const WORLD = {
  // 岛屿尺寸（世界单位）。地形以原点为中心。
  size: 200,
  // 水域宽度（岛屿边缘到外圈）。
  waterBorder: 26,
  // 玩家行走速度（单位/秒）。
  walkSpeed: 6,
  // 冲刺速度。
  runSpeed: 11,
  // 玩家碰撞半径。
  playerRadius: 0.45,
  // 拾取半径：进入即自动捡起掉落物。
  pickupRadius: 1.6,
  // 交互半径：按 E 触发砍树/对话等。
  interactRadius: 2.4,
} as const;

export const CLOCK = {
  // 真实时间模式下只用于视觉平滑，真实校准由 realClockNow/tickClock 负责。
  minutesPerRealSecond: 1 / 60,
  // 一天有多少游戏分钟。
  minutesPerDay: 24 * 60,
} as const;

export const TREE = {
  // 砍倒一棵树需要的命中次数。
  maxHp: 3,
  // 每次命中冷却（秒），防止一帧多次触发。
  hitCooldown: 0.45,
  // 砍倒后掉落木材数量。
  woodDrop: 3,
  // 砍倒后掉落树枝数量。
  branchDrop: 2,
  // 树桩重生所需的“游戏分钟”数。
  regrowMinutes: 3 * 24 * 60, // 3 游戏日
  // 树木碰撞半径。
  radius: 1.15,
} as const;

export const AXE = {
  // 斧头耐久上限。
  maxDurability: 30,
  // 每次砍击消耗耐久。
  costPerHit: 1,
} as const;

export const TOOL_USE = {
  // 钓竿每次成功钓鱼消耗耐久。
  fishCost: 1,
  // 捕虫网每次挥网消耗耐久（无论是否命中）。
  netCost: 1,
  // 铲子每次挖坑消耗耐久。
  shovelCost: 1,
} as const;

// 工具各等级最大耐久：[Lv1, Lv2, Lv3]
export const TOOL_TIER_DUR: Record<string, [number, number, number]> = {
  axe: [30, 60, 100],
  fishingRod: [30, 60, 100],
  net: [30, 60, 100],
  shovel: [30, 60, 100],
};

export const MINE = {
  spotCount: 18,
  cooldownMinutes: 60,
  interactRadius: 2.5,
} as const;

export const FISH = {
  // 钓鱼点数量。
  spotCount: 24,
  // 抛竿后等待咬钩的最短/最长时间（秒）。
  waitMin: 1.5,
  waitMax: 6,
  // 鱼咬钩后的判定窗口（秒）：玩家必须在此期间再次按 E 拉杆。
  hookWindow: 1.8,
  // 钓上一个鱼后，该点冷却（游戏分钟）才能再钓。
  cooldownMinutes: 30,
  // 玩家触发钓鱼的距离（到鱼点）。
  interactRadius: 4.2,
} as const;

export const BUG = {
  // 虫刷新点数量。
  spotCount: 52,
  // 虫停留时间（秒），过后逃跑/消失并重新刷新。
  lingerSec: 8,
  // 挥网命中半径。
  catchRadius: 1.6,
  // 虫被惊扰的逃跑距离（玩家靠近此值内虫会开始警觉）。
  alertRadius: 4,
  // 虫点刷新冷却（游戏分钟）。
  cooldownMinutes: 20,
} as const;

export const ROOMS = {
  living: {
    // 对应旧的 interiorSize 16，客厅占据整层
    half: 7.5, // 15×15 可用
    spawn: [0, 0, 5.8] as [number, number, number],
    doors: [
      { to: 'bedroom', x: 4.5, z: -7, w: 1.4 },
      { to: 'kitchen', x: -4.5, z: -7, w: 1.4 },
    ],
  },
  bedroom: {
    half: 6,
    spawn: [0, 0, 4] as [number, number, number],
    doors: [
      { to: 'living', x: 0, z: 5.5, w: 1.2 },
    ],
  },
  kitchen: {
    half: 6,
    spawn: [0, 0, 4] as [number, number, number],
    doors: [
      { to: 'living', x: 0, z: 5.5, w: 1.2 },
    ],
  },
} as const;
export type RoomId = keyof typeof ROOMS;

export const HOUSE = {
  // 房屋在岛上的位置（相对中心偏南，留出北侧活动区）。
  pos: MAP_LAYOUT.home.pos,
  // 房屋占地半径（用于碰撞 + 进入判定）。
  radius: 4.5,
  // 进入房屋的交互距离。
  interactRadius: 6.5,
  // 默认室内地板尺寸（兼容旧代码）。
  interiorSize: 16,
  // 家具网格单元大小（吸附单位）。
  gridCell: 0.8,
  // 摆放/旋转/收回的按键提示
  rotateKey: 'KeyR',
} as const;

export const FURNITURE = {
  // 单件家具碰撞半径（摆放时避免重叠用，简化）。
  radius: 0.5,
} as const;

export type WeatherPattern = 'clear' | 'cloudy' | 'rainy' | 'stormy' | 'snowy';
export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export const WEATHER = {
  // 天气切换间隔（游戏分钟）
  changeInterval: 480,
  // 季节划分（北半球，按游戏天）
  seasonStart: { spring: 80, summer: 172, fall: 264, winter: 356 },
  // 各季节天气概率 [clear, cloudy, rainy, stormy, snowy]
  seasonWeights: {
    spring: [40, 25, 25, 10, 0] as number[],
    summer: [50, 20, 20, 10, 0] as number[],
    fall: [30, 25, 30, 15, 0] as number[],
    winter: [35, 20, 0, 0, 45] as number[],
  },
} as const;

export const SHOP = {
  // 出售给商店时的折扣系数：玩家卖出价 = 物品 sellPrice × sellDiscount
  // 这里直接用 sellPrice，系数保留给未来调整（如 Nook 周末翻倍活动）。
  sellDiscount: 1,
  // 维修费折扣（维修单价已含在工具定义里）。
  repairDiscount: 1,
} as const;

export const MUSEUM = {
  // 博物馆在岛上的位置
  pos: MAP_LAYOUT.museum.pos,
  // 进入博物馆的交互距离
  interactRadius: 7,
  // 室内地板尺寸
  interiorSize: 22,
  // 全图鉴收集奖励
  completionReward: 5000,
  // 可捐赠的物品列表
  donateableItems: ['fish_common', 'fish_rare', 'fish_legend', 'bug_common', 'bug_rare'] as const,
} as const;

export const SAVE = {
  // localStorage key。改 schema 时升 version 并在 save.ts 写迁移。
  key: 'ac-save-v1',
  // 存档版本号，与 SaveData.version 对应。v13 添加区域探索进度。
  version: 13 as const,
} as const;
