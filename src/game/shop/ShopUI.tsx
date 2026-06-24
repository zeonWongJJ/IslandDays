// 商店 UI：购买工具、修理工具、出售物品、买家具/图纸、合成家具。
// 动森式 Tom Nook 商店。HTML 覆盖层，按 B 开关。
// 定价逻辑全部走 systems/economy.ts 的纯函数。

import { useState } from 'react';
import {
  ITEMS,
  TOOLS,
  type ItemId,
  type ToolId,
  type FurnitureItemId,
} from '../../config/items.ts';
import {
  buyToolValue,
  repairToolValue,
  sellValue,
  inventorySellTotal,
} from '../../systems/economy.ts';
import { RECIPES, hasMaterials, hasRecipe } from '../../config/recipes.ts';
import { TOOL_TIER_DUR } from '../../config/constants.ts';
import { useGameStore } from '../../store/useGameStore.ts';

const TOOL_ORDER: ToolId[] = ['axe', 'fishingRod', 'net', 'shovel', 'watering_can'];
const TOOL_ICON: Record<ToolId, string> = {
  axe: '🪓',
  fishingRod: '🎣',
  net: '🦟',
  shovel: '🪏',
  watering_can: '🚿',
};

// 可出售物品（有 sellPrice 的）
const SELL_ORDER: ItemId[] = [
  'branch', 'wood', 'stone',
  'fish_common', 'fish_crucian', 'fish_carp', 'fish_bluegill', 'fish_loach',
  'fish_salmon', 'fish_mackerel', 'fish_rare', 'fish_mahi_mahi', 'fish_legend',
  'bug_common', 'bug_cicada', 'bug_beetle', 'bug_dragonfly', 'bug_moth', 'bug_rare',
  'sapling', 'flower_seed',
  'tomato_seed', 'carrot_seed', 'wheat_seed', 'tomato', 'carrot', 'wheat',
  'iron_ore', 'gold_ore',  // <-- add
  'tomato', 'carrot', 'wheat',
  'coconut', 'driftwood',
  'path_stone', 'path_brick', 'path_wood', 'path_dirt',
  'furniture_stool', 'furniture_table', 'furniture_bed', 'furniture_lamp', 'furniture_rug',
  'furniture_chair', 'furniture_sofa', 'furniture_bookcase', 'furniture_desk',
  'furniture_coffeeTable', 'furniture_bench', 'furniture_sideTable', 'furniture_cabinet',
  'furniture_lampTable', 'furniture_rugSquare',
];
const ITEM_ICON: Record<ItemId, string> = {
  branch: '🌿',
  wood: '🪵',
  stone: '🪨',
  fish_common: '🐟',
  fish_crucian: '🐟',
  fish_carp: '🐟',
  fish_bluegill: '🐟',
  fish_loach: '🐟',
  fish_salmon: '🐟',
  fish_mackerel: '🐟',
  fish_rare: '🐠',
  fish_mahi_mahi: '🐠',
  fish_legend: '🦈',
  bug_common: '🦋',
  bug_cicada: '🦗',
  bug_beetle: '🐞',
  bug_dragonfly: '🪰',
  bug_moth: '🦋',
  bug_rare: '✨',
  sapling: '🌱',
  flower_seed: '🌸',
  tomato_seed: '🟠',
  carrot_seed: '🟠',
  wheat_seed: '🟡',
  tomato: '🍅',
  carrot: '🥕',
  wheat: '🌾',
  coconut: '🥥',
  driftwood: '🪵',
  path_stone: '⬜',
  path_brick: '🟥',
  path_wood: '🟫',
  path_dirt: '🟨',
  iron_ore: '🪨',
  gold_ore: '✨',
  furniture_stool: '🪑',
  furniture_table: '🪟',
  furniture_bed: '🛏️',
  furniture_lamp: '💡',
  furniture_rug: '🟫',
  furniture_chair: '🪑',
  furniture_sofa: '🛋️',
  furniture_bookcase: '📚',
  furniture_desk: '📝',
  furniture_coffeeTable: '🟤',
  furniture_bench: '🪑',
  furniture_sideTable: '🟤',
  furniture_cabinet: '🗄️',
  furniture_lampTable: '💡',
  furniture_rugSquare: '🟫',
  recipe_stool: '📜',
  recipe_table: '📜',
  recipe_bed: '📜',
  recipe_lamp: '📜',
  recipe_rug: '📜',
  recipe_chair: '📜',
  recipe_sofa: '📜',
  recipe_bookcase: '📜',
  recipe_desk: '📜',
  recipe_coffeeTable: '📜',
  recipe_bench: '📜',
  recipe_sideTable: '📜',
  recipe_cabinet: '📜',
  recipe_lampTable: '📜',
  recipe_rugSquare: '📜',
};

// 商店售卖的家具与图纸
const FURNITURE_ORDER: FurnitureItemId[] = [
  'furniture_stool', 'furniture_table', 'furniture_chair', 'furniture_bench',
  'furniture_sideTable', 'furniture_coffeeTable', 'furniture_lamp', 'furniture_lampTable',
  'furniture_desk', 'furniture_bookcase', 'furniture_cabinet', 'furniture_sofa',
  'furniture_rug', 'furniture_rugSquare', 'furniture_bed',
];
const RECIPE_ORDER: ItemId[] = [
  'recipe_stool', 'recipe_table', 'recipe_chair', 'recipe_bench',
  'recipe_sideTable', 'recipe_coffeeTable', 'recipe_lamp', 'recipe_lampTable',
  'recipe_desk', 'recipe_bookcase', 'recipe_cabinet', 'recipe_sofa',
  'recipe_rug', 'recipe_rugSquare', 'recipe_bed',
];

type Tab = 'buy' | 'repair' | 'sell' | 'furniture' | 'craft' | 'plants' | 'upgrade';

export function ShopUI() {
  const open = useGameStore((s) => s.shopOpen);
  const setOpen = useGameStore((s) => s.setShopOpen);
  const bells = useGameStore((s) => s.player.bells);
  const tools = useGameStore((s) => s.tools);
  const inventory = useGameStore((s) => s.inventory);
  const buyTool = useGameStore((s) => s.buyTool);
  const repairTool = useGameStore((s) => s.repairTool);
  const sellItem = useGameStore((s) => s.sellItem);
  const sellAll = useGameStore((s) => s.sellAll);
  const buyItem = useGameStore((s) => s.buyItem);
  const craftFurniture = useGameStore((s) => s.craftFurniture);

  const [tab, setTab] = useState<Tab>('buy');

  if (!open) return null;

  const sellTotal = inventorySellTotal(inventory);

  return (
    <div className="shop-overlay" onClick={() => setOpen(false)}>
      <div className="shop-panel" onClick={(e) => e.stopPropagation()}>
        <div className="shop-header">
          <h2>🦝 Nook 商店</h2>
          <div className="shop-bells">🪙 {bells.toLocaleString()} 铃钱</div>
          <button className="close" onClick={() => setOpen(false)}>×</button>
        </div>

        <div className="shop-tabs">
          <button className={tab === 'buy' ? 'active' : ''} onClick={() => setTab('buy')}>🛠️ 工具</button>
          <button className={tab === 'repair' ? 'active' : ''} onClick={() => setTab('repair')}>🔧 修理</button>
          <button className={tab === 'plants' ? 'active' : ''} onClick={() => setTab('plants')}>🌱 苗木</button>
          <button className={tab === 'furniture' ? 'active' : ''} onClick={() => setTab('furniture')}>🪑 家具/图纸</button>
          <button className={tab === 'craft' ? 'active' : ''} onClick={() => setTab('craft')}>🔨 合成</button>
          <button className={tab === 'sell' ? 'active' : ''} onClick={() => setTab('sell')}>💰 出售</button>
          <button className={tab === 'upgrade' ? 'active' : ''} onClick={() => setTab('upgrade')}>⬆️ 升级</button>
        </div>

        {tab === 'buy' && (
          <div className="shop-list">
            {TOOL_ORDER.map((id) => {
              const def = TOOLS[id];
              const owned = tools[id] !== undefined;
              const price = buyToolValue(id);
              const canAfford = bells >= price;
              return (
                <div key={id} className={`shop-row ${owned ? 'owned' : ''}`}>
                  <span className="shop-icon">{TOOL_ICON[id]}</span>
                  <span className="shop-name">{def.name}</span>
                  <span className="shop-sub">{owned ? '已拥有' : `耐久 ${def.durability}`}</span>
                  <span className="shop-price">🪙 {price}</span>
                  <button
                    disabled={owned || !canAfford}
                    onClick={() => buyTool(id)}
                  >
                    {owned ? '已拥有' : canAfford ? '购买' : '钱不够'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'repair' && (
          <div className="shop-list">
            {TOOL_ORDER.map((id) => {
              const def = TOOLS[id];
              const cur = tools[id];
              const cost = repairToolValue(id, cur);
              const full = cur !== undefined && cur >= def.durability;
              const canAfford = bells >= cost;
              return (
                <div key={id} className="shop-row">
                  <span className="shop-icon">{TOOL_ICON[id]}</span>
                  <span className="shop-name">{def.name}</span>
                  <span className="shop-sub">
                    {cur === undefined ? '未拥有' : `耐久 ${cur}/${def.durability}`}
                  </span>
                  <span className="shop-price">{full || cur === undefined ? '—' : `🪙 ${cost}`}</span>
                  <button
                    disabled={cur === undefined || full || !canAfford}
                    onClick={() => repairTool(id)}
                  >
                    {cur === undefined ? '未拥有' : full ? '已满' : canAfford ? '修理' : '钱不够'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'furniture' && (
          <div className="shop-list">
            {/* 成品家具：可直接购买摆放 */}
            <div className="shop-section-title">成品家具（购买后进屋按对应快捷键摆放）</div>
            {FURNITURE_ORDER.map((id) => {
              const def = ITEMS[id];
              const price = def.buyPrice;
              const canAfford = bells >= price;
              const owned = (inventory[id] ?? 0) > 0;
              return (
                <div key={id} className="shop-row">
                  <span className="shop-icon">{ITEM_ICON[id]}</span>
                  <span className="shop-name">{def.name}</span>
                  <span className="shop-sub">{owned ? `已持有 ${inventory[id]}` : '可摆放于室内'}</span>
                  <span className="shop-price">🪙 {price}</span>
                  <button disabled={!canAfford} onClick={() => buyItem(id)}>
                    {canAfford ? '购买' : '钱不够'}
                  </button>
                </div>
              );
            })}
            {/* 图纸：购买即学会合成配方 */}
            <div className="shop-section-title">家具图纸（购买后可在“合成”页用材料造家具）</div>
            {RECIPE_ORDER.map((id) => {
              const def = ITEMS[id];
              const price = def.buyPrice;
              const canAfford = bells >= price;
              const learned = (inventory[id] ?? 0) > 0;
              return (
                <div key={id} className={`shop-row ${learned ? 'owned' : ''}`}>
                  <span className="shop-icon">{ITEM_ICON[id]}</span>
                  <span className="shop-name">{def.name}</span>
                  <span className="shop-sub">{learned ? '已学会' : `可合成${ITEMS[def.id.replace('recipe_', 'furniture_') as FurnitureItemId].name}`}</span>
                  <span className="shop-price">🪙 {price}</span>
                  <button disabled={learned || !canAfford} onClick={() => buyItem(id)}>
                    {learned ? '已学会' : canAfford ? '购买' : '钱不够'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'plants' && (
          <div className="shop-list">
            {['sapling', 'flower_seed', 'tomato_seed', 'carrot_seed', 'wheat_seed', 'path_stone', 'path_brick', 'path_wood', 'path_dirt'].map((id) => {
              const def = ITEMS[id as ItemId];
              const count = inventory[id as ItemId] ?? 0;
              const price = def.buyPrice;
              const canAfford = bells >= price;
              return (
                <div key={id} className="shop-row">
                  <span className="shop-icon">{ITEM_ICON[id as ItemId]}</span>
                  <span className="shop-name">{def.name}</span>
                  <span className="shop-sub">库存 {count}</span>
                  <span className="shop-price">🪙 {price}</span>
                  <button
                    disabled={!canAfford}
                    onClick={() => buyItem(id as ItemId)}
                  >
                    {canAfford ? '购买' : '钱不够'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'craft' && (
          <div className="shop-list">
            {FURNITURE_ORDER.map((id) => {
              const def = ITEMS[id];
              const recipe = RECIPES[id];
              const learned = hasRecipe(inventory, id);
              const enough = hasMaterials(inventory, id);
              const mats = Object.entries(recipe.materials) as [ItemId, number][];
              return (
                <div key={id} className={`shop-row ${!learned ? 'locked' : ''}`}>
                  <span className="shop-icon">{ITEM_ICON[id]}</span>
                  <span className="shop-name">{def.name}</span>
                  <span className="shop-sub">
                    {learned
                      ? mats.map(([m, n]) => `${ITEMS[m].name}×${n}（${inventory[m] ?? 0}）`).join(' · ')
                      : '未学会图纸'}
                  </span>
                  <span className="shop-price">{learned ? (enough ? '可合成' : '材料不足') : '🔒'}</span>
                  <button disabled={!learned || !enough} onClick={() => craftFurniture(id)}>
                    合成
                  </button>
                </div>
              );
            })}
            <div className="shop-empty" style={{ paddingTop: 8 }}>提示：先在“家具/图纸”页购买图纸，攒够材料后在此合成。</div>
          </div>
        )}

        {tab === 'sell' && (
          <div className="shop-list sell-list">
            {SELL_ORDER.map((id) => {
              const def = ITEMS[id];
              const count = inventory[id] ?? 0;
              const unit = sellValue(id, 1);
              if (count <= 0) return null;
              return (
                <div key={id} className="shop-row">
                  <span className="shop-icon">{ITEM_ICON[id]}</span>
                  <span className="shop-name">{def.name}</span>
                  <span className="shop-sub">×{count}</span>
                  <span className="shop-price">单价 🪙 {unit}</span>
                  <div className="sell-actions">
                    <button onClick={() => sellItem(id, 1)} disabled={count < 1}>卖1个</button>
                    <button onClick={() => sellItem(id, count)} disabled={count < 1}>全卖({count})</button>
                  </div>
                </div>
              );
            })}
            {sellTotal <= 0 && <div className="shop-empty">背包里没有可出售的物品</div>}
            <div className="shop-sellall">
              <button
                className="sellall-btn"
                disabled={sellTotal <= 0}
                onClick={() => sellAll()}
              >
                一键出售全部（可得 🪙 {sellTotal}）
              </button>
            </div>
          </div>
        )}

        {tab === 'upgrade' && (
          <div className="shop-list">
            {TOOL_ORDER.map((id) => {
              const curLevel = useGameStore.getState().toolLevel[id] ?? 1;
              const maxDur = TOOL_TIER_DUR[id]?.[curLevel - 1] ?? 0;
              const def = TOOLS[id];
              const owned = tools[id] !== undefined;
              const nextLevel = curLevel + 1;
              const canUpgrade = owned && nextLevel <= 3;
              const cost = nextLevel === 2 ? 500 : 2000;
              const ore = nextLevel === 2 ? 'iron_ore' : 'gold_ore';
              const oreCost = nextLevel === 2 ? 3 : 2;
              return (
                <div key={id} className="shop-row">
                  <span className="shop-icon">{TOOL_ICON[id]}</span>
                  <span className="shop-name">{def.name}</span>
                  <span className="shop-sub">
                    Lv{curLevel} {owned ? `(${tools[id]}/${maxDur})` : '未拥有'}
                  </span>
                  <span className="shop-price">
                    {canUpgrade ? `Lv${nextLevel} 🪙${cost} + ${ore}×${oreCost}` : '已满级'}
                  </span>
                  <button
                    disabled={!canUpgrade}
                    onClick={() => useGameStore.getState().upgradeTool(id)}
                  >
                    {canUpgrade ? '升级' : owned ? '已满级' : '未拥有'}
                  </button>
                </div>
              );
            })}
            <div className="shop-empty" style={{ paddingTop: 8 }}>
              Lv2: +铁矿石×3 + 500铃钱 ｜ Lv3: +金矿石×2 + 2000铃钱
            </div>
          </div>
        )}

        <div className="shop-footer">按 B 或 Esc 关闭</div>
      </div>
    </div>
  );
}
