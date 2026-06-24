// 物品与工具定义表。
// 新增物品只需在此追加一项，并在 UI/商店/配方里引用 id 即可。

export type ItemId =
  | 'branch' // 树枝
  | 'wood' // 木材
  | 'stone' // 石头
  // 鱼
  | 'fish_common' // 鲈鱼（常见）
  | 'fish_crucian' // 鲫鱼（常见）
  | 'fish_carp' // 鲤鱼（常见）
  | 'fish_bluegill' // 蓝鳃鱼（常见）
  | 'fish_loach' // 泥鳅（常见）
  | 'fish_salmon' // 鲑鱼（稀有）
  | 'fish_mackerel' // 鲭鱼（稀有）
  | 'fish_rare' // 金鱼（稀有）
  | 'fish_mahi_mahi' // 鬼头刀（传说）
  | 'fish_legend' // 鲨鱼（传说）
  // 虫
  | 'bug_common' // 蝴蝶（常见）
  | 'bug_cicada' // 蝉（常见）
  | 'bug_beetle' // 独角仙（常见）
  | 'bug_dragonfly' // 蜻蜓（稀有）
  | 'bug_moth' // 飞蛾（稀有）
  | 'bug_rare' // 萤火虫（稀有）
  // 种植
  | 'sapling' // 树苗
  | 'flower_seed' // 花种
  | 'tomato_seed'
  | 'carrot_seed'
  | 'wheat_seed'
  | 'tomato'
  | 'carrot'
  | 'wheat'
  // 矿石（工具升级材料）
  | 'iron_ore'
  | 'gold_ore'
  // 家具（Phase C）—— 在商店买成品或用图纸合成
  | 'furniture_stool'
  | 'furniture_table'
  | 'furniture_bed'
  | 'furniture_lamp'
  | 'furniture_rug'
  | 'furniture_chair'
  | 'furniture_sofa'
  | 'furniture_bookcase'
  | 'furniture_desk'
  | 'furniture_coffeeTable'
  | 'furniture_bench'
  | 'furniture_sideTable'
  | 'furniture_cabinet'
  | 'furniture_lampTable'
  | 'furniture_rugSquare'
  // 图纸（Phase C）—— 学会合成后才能用材料造家具
  | 'recipe_stool'
  | 'recipe_table'
  | 'recipe_bed'
  | 'recipe_lamp'
  | 'recipe_rug'
  | 'recipe_chair'
  | 'recipe_sofa'
  | 'recipe_bookcase'
  | 'recipe_desk'
  | 'recipe_coffeeTable'
  | 'recipe_bench'
  | 'recipe_sideTable'
  | 'recipe_cabinet'
  | 'recipe_lampTable'
  | 'recipe_rugSquare';

export type ToolId = 'axe' | 'fishingRod' | 'net' | 'shovel' | 'watering_can';

export type FishItemId = 'fish_common' | 'fish_crucian' | 'fish_carp' | 'fish_bluegill' | 'fish_loach' | 'fish_salmon' | 'fish_mackerel' | 'fish_rare' | 'fish_mahi_mahi' | 'fish_legend';
export type BugItemId = 'bug_common' | 'bug_cicada' | 'bug_beetle' | 'bug_dragonfly' | 'bug_moth' | 'bug_rare';
/** 家具类物品 id（可摆放到室内的）。 */
export type FurnitureItemId =
  | 'furniture_stool' | 'furniture_table' | 'furniture_bed' | 'furniture_lamp' | 'furniture_rug'
  | 'furniture_chair' | 'furniture_sofa' | 'furniture_bookcase' | 'furniture_desk'
  | 'furniture_coffeeTable' | 'furniture_bench' | 'furniture_sideTable' | 'furniture_cabinet'
  | 'furniture_lampTable' | 'furniture_rugSquare';
/** 图纸类物品 id。 */
export type RecipeItemId =
  | 'recipe_stool' | 'recipe_table' | 'recipe_bed' | 'recipe_lamp' | 'recipe_rug'
  | 'recipe_chair' | 'recipe_sofa' | 'recipe_bookcase' | 'recipe_desk'
  | 'recipe_coffeeTable' | 'recipe_bench' | 'recipe_sideTable' | 'recipe_cabinet'
  | 'recipe_lampTable' | 'recipe_rugSquare';

export interface ItemDef {
  id: ItemId;
  name: string; // 中文显示名
  /** 商店收购价（卖出给商店得到的铃钱）。0 表示不可卖。 */
  sellPrice: number;
  /** 商店售价（买入价）。0 表示不可购买。 */
  buyPrice: number;
  /** 背包里最多堆叠数量。 */
  stack: number;
  /** 可堆叠资源？true=数量型，false=独立实例（家具等）。 */
  stackable: boolean;
  /** 稀有度，用于 UI 配色与钓鱼/捕虫概率权重。 */
  rarity: 'common' | 'rare' | 'legend';
}

export const ITEMS: Record<ItemId, ItemDef> = {
  branch: { id: 'branch', name: '树枝', sellPrice: 3, buyPrice: 0, stack: 99, stackable: true, rarity: 'common' },
  wood: { id: 'wood', name: '木材', sellPrice: 30, buyPrice: 0, stack: 99, stackable: true, rarity: 'common' },
  stone: { id: 'stone', name: '石头', sellPrice: 12, buyPrice: 0, stack: 99, stackable: true, rarity: 'common' },
  fish_common: { id: 'fish_common', name: '鲈鱼', sellPrice: 120, buyPrice: 0, stack: 30, stackable: true, rarity: 'common' },
  fish_crucian: { id: 'fish_crucian', name: '鲫鱼', sellPrice: 80, buyPrice: 0, stack: 30, stackable: true, rarity: 'common' },
  fish_carp: { id: 'fish_carp', name: '鲤鱼', sellPrice: 150, buyPrice: 0, stack: 30, stackable: true, rarity: 'common' },
  fish_bluegill: { id: 'fish_bluegill', name: '蓝鳃鱼', sellPrice: 100, buyPrice: 0, stack: 30, stackable: true, rarity: 'common' },
  fish_loach: { id: 'fish_loach', name: '泥鳅', sellPrice: 60, buyPrice: 0, stack: 30, stackable: true, rarity: 'common' },
  fish_salmon: { id: 'fish_salmon', name: '鲑鱼', sellPrice: 500, buyPrice: 0, stack: 20, stackable: true, rarity: 'rare' },
  fish_mackerel: { id: 'fish_mackerel', name: '鲭鱼', sellPrice: 350, buyPrice: 0, stack: 20, stackable: true, rarity: 'rare' },
  fish_rare: { id: 'fish_rare', name: '金鱼', sellPrice: 600, buyPrice: 0, stack: 20, stackable: true, rarity: 'rare' },
  fish_mahi_mahi: { id: 'fish_mahi_mahi', name: '鬼头刀', sellPrice: 1800, buyPrice: 0, stack: 10, stackable: true, rarity: 'legend' },
  fish_legend: { id: 'fish_legend', name: '鲨鱼', sellPrice: 2400, buyPrice: 0, stack: 10, stackable: true, rarity: 'legend' },
  bug_common: { id: 'bug_common', name: '蝴蝶', sellPrice: 90, buyPrice: 0, stack: 30, stackable: true, rarity: 'common' },
  bug_cicada: { id: 'bug_cicada', name: '蝉', sellPrice: 70, buyPrice: 0, stack: 30, stackable: true, rarity: 'common' },
  bug_beetle: { id: 'bug_beetle', name: '独角仙', sellPrice: 120, buyPrice: 0, stack: 30, stackable: true, rarity: 'common' },
  bug_dragonfly: { id: 'bug_dragonfly', name: '蜻蜓', sellPrice: 200, buyPrice: 0, stack: 20, stackable: true, rarity: 'rare' },
  bug_moth: { id: 'bug_moth', name: '飞蛾', sellPrice: 150, buyPrice: 0, stack: 20, stackable: true, rarity: 'rare' },
  bug_rare: { id: 'bug_rare', name: '萤火虫', sellPrice: 480, buyPrice: 0, stack: 20, stackable: true, rarity: 'rare' },
  sapling: { id: 'sapling', name: '树苗', sellPrice: 20, buyPrice: 200, stack: 30, stackable: true, rarity: 'common' },
  flower_seed: { id: 'flower_seed', name: '花种', sellPrice: 10, buyPrice: 100, stack: 30, stackable: true, rarity: 'common' },
  tomato_seed: { id: 'tomato_seed', name: '番茄种子', sellPrice: 10, buyPrice: 120, stack: 30, stackable: true, rarity: 'common' },
  carrot_seed: { id: 'carrot_seed', name: '胡萝卜种子', sellPrice: 10, buyPrice: 100, stack: 30, stackable: true, rarity: 'common' },
  wheat_seed: { id: 'wheat_seed', name: '小麦种子', sellPrice: 10, buyPrice: 80, stack: 30, stackable: true, rarity: 'common' },
  tomato: { id: 'tomato', name: '番茄', sellPrice: 60, buyPrice: 0, stack: 30, stackable: true, rarity: 'common' },
  carrot: { id: 'carrot', name: '胡萝卜', sellPrice: 50, buyPrice: 0, stack: 30, stackable: true, rarity: 'common' },
  wheat: { id: 'wheat', name: '小麦', sellPrice: 40, buyPrice: 0, stack: 30, stackable: true, rarity: 'common' },
  iron_ore: { id: 'iron_ore', name: '铁矿石', sellPrice: 50, buyPrice: 500, stack: 30, stackable: true, rarity: 'common' },
  gold_ore: { id: 'gold_ore', name: '金矿石', sellPrice: 200, buyPrice: 2000, stack: 10, stackable: true, rarity: 'rare' },
  // 家具：可购买成品，也可用图纸合成。stack=1（独立实例）。
  furniture_stool: { id: 'furniture_stool', name: '木凳', sellPrice: 80, buyPrice: 480, stack: 10, stackable: true, rarity: 'common' },
  furniture_table: { id: 'furniture_table', name: '木桌', sellPrice: 160, buyPrice: 960, stack: 10, stackable: true, rarity: 'common' },
  furniture_bed: { id: 'furniture_bed', name: '木床', sellPrice: 240, buyPrice: 1600, stack: 5, stackable: true, rarity: 'rare' },
  furniture_lamp: { id: 'furniture_lamp', name: '台灯', sellPrice: 120, buyPrice: 720, stack: 10, stackable: true, rarity: 'common' },
  furniture_rug: { id: 'furniture_rug', name: '地毯', sellPrice: 200, buyPrice: 1200, stack: 5, stackable: true, rarity: 'rare' },
  furniture_chair: { id: 'furniture_chair', name: '木椅', sellPrice: 100, buyPrice: 600, stack: 10, stackable: true, rarity: 'common' },
  furniture_sofa: { id: 'furniture_sofa', name: '沙发', sellPrice: 300, buyPrice: 2200, stack: 5, stackable: true, rarity: 'rare' },
  furniture_bookcase: { id: 'furniture_bookcase', name: '书架', sellPrice: 200, buyPrice: 1400, stack: 5, stackable: true, rarity: 'rare' },
  furniture_desk: { id: 'furniture_desk', name: '书桌', sellPrice: 180, buyPrice: 1100, stack: 5, stackable: true, rarity: 'common' },
  furniture_coffeeTable: { id: 'furniture_coffeeTable', name: '茶几', sellPrice: 140, buyPrice: 800, stack: 10, stackable: true, rarity: 'common' },
  furniture_bench: { id: 'furniture_bench', name: '长凳', sellPrice: 160, buyPrice: 950, stack: 10, stackable: true, rarity: 'common' },
  furniture_sideTable: { id: 'furniture_sideTable', name: '边几', sellPrice: 80, buyPrice: 480, stack: 10, stackable: true, rarity: 'common' },
  furniture_cabinet: { id: 'furniture_cabinet', name: '橱柜', sellPrice: 280, buyPrice: 1800, stack: 5, stackable: true, rarity: 'rare' },
  furniture_lampTable: { id: 'furniture_lampTable', name: '台灯', sellPrice: 110, buyPrice: 680, stack: 10, stackable: true, rarity: 'common' },
  furniture_rugSquare: { id: 'furniture_rugSquare', name: '方毯', sellPrice: 180, buyPrice: 1100, stack: 5, stackable: true, rarity: 'rare' },
  // 图纸：买到即“学会”该家具的合成配方，本身不消耗、不堆叠。
  recipe_stool: { id: 'recipe_stool', name: '木凳图纸', sellPrice: 0, buyPrice: 160, stack: 1, stackable: false, rarity: 'common' },
  recipe_table: { id: 'recipe_table', name: '木桌图纸', sellPrice: 0, buyPrice: 320, stack: 1, stackable: false, rarity: 'common' },
  recipe_bed: { id: 'recipe_bed', name: '木床图纸', sellPrice: 0, buyPrice: 640, stack: 1, stackable: false, rarity: 'rare' },
  recipe_lamp: { id: 'recipe_lamp', name: '台灯图纸', sellPrice: 0, buyPrice: 240, stack: 1, stackable: false, rarity: 'common' },
  recipe_rug: { id: 'recipe_rug', name: '地毯图纸', sellPrice: 0, buyPrice: 480, stack: 1, stackable: false, rarity: 'rare' },
  recipe_chair: { id: 'recipe_chair', name: '木椅图纸', sellPrice: 0, buyPrice: 200, stack: 1, stackable: false, rarity: 'common' },
  recipe_sofa: { id: 'recipe_sofa', name: '沙发图纸', sellPrice: 0, buyPrice: 800, stack: 1, stackable: false, rarity: 'rare' },
  recipe_bookcase: { id: 'recipe_bookcase', name: '书架图纸', sellPrice: 0, buyPrice: 560, stack: 1, stackable: false, rarity: 'rare' },
  recipe_desk: { id: 'recipe_desk', name: '书桌图纸', sellPrice: 0, buyPrice: 400, stack: 1, stackable: false, rarity: 'common' },
  recipe_coffeeTable: { id: 'recipe_coffeeTable', name: '茶几图纸', sellPrice: 0, buyPrice: 280, stack: 1, stackable: false, rarity: 'common' },
  recipe_bench: { id: 'recipe_bench', name: '长凳图纸', sellPrice: 0, buyPrice: 320, stack: 1, stackable: false, rarity: 'common' },
  recipe_sideTable: { id: 'recipe_sideTable', name: '边几图纸', sellPrice: 0, buyPrice: 160, stack: 1, stackable: false, rarity: 'common' },
  recipe_cabinet: { id: 'recipe_cabinet', name: '橱柜图纸', sellPrice: 0, buyPrice: 800, stack: 1, stackable: false, rarity: 'rare' },
  recipe_lampTable: { id: 'recipe_lampTable', name: '台灯图纸', sellPrice: 0, buyPrice: 240, stack: 1, stackable: false, rarity: 'common' },
  recipe_rugSquare: { id: 'recipe_rugSquare', name: '方毯图纸', sellPrice: 0, buyPrice: 480, stack: 1, stackable: false, rarity: 'rare' },
};

export interface ToolDef {
  id: ToolId;
  name: string;
  buyPrice: number;
  /** 耐久上限；0 表示无耐久（永久）。 */
  durability: number;
  /** 维修一次的铃钱（按当前剩余耐久差×单价计）。 */
  repairUnitPrice: number;
}

export const TOOLS: Record<ToolId, ToolDef> = {
  axe: { id: 'axe', name: '斧头', buyPrice: 400, durability: 30, repairUnitPrice: 8 },
  fishingRod: { id: 'fishingRod', name: '钓竿', buyPrice: 400, durability: 30, repairUnitPrice: 8 },
  net: { id: 'net', name: '捕虫网', buyPrice: 400, durability: 30, repairUnitPrice: 8 },
  shovel: { id: 'shovel', name: '铲子', buyPrice: 400, durability: 30, repairUnitPrice: 8 },
  watering_can: { id: 'watering_can', name: '水壶', buyPrice: 300, durability: 40, repairUnitPrice: 6 },
};

export function itemName(id: ItemId): string {
  return ITEMS[id].name;
}
