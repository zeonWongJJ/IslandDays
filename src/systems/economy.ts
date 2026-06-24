// 经济系统：纯函数，处理买卖定价与维修费计算。
// 与 store 解耦，便于单元测试与未来扩展（活动折扣、NPC 议价等）。

import { SHOP } from '../config/constants.ts';
import { ITEMS, TOOLS, type ItemId, type ToolId } from '../config/items.ts';

/** 玩家卖出物品实际得到的铃钱（已应用商店收购折扣）。 */
export function sellValue(id: ItemId, qty = 1): number {
  const def = ITEMS[id];
  if (def.sellPrice <= 0) return 0;
  return Math.round(def.sellPrice * SHOP.sellDiscount) * qty;
}

/** 玩家购买物品实际支付的铃钱。0 表示不可购买。 */
export function buyValue(id: ItemId, qty = 1): number {
  const def = ITEMS[id];
  if (def.buyPrice <= 0) return 0;
  return def.buyPrice * qty;
}

/** 购买一把工具的铃钱。 */
export function buyToolValue(tool: ToolId): number {
  return TOOLS[tool].buyPrice;
}

/** 维修一把工具到满耐久所需的铃钱。
 *  费用 = (满耐久 - 当前耐久) × 单价 × 折扣。
 *  已满则返回 0。未拥有返回购买价（视为新购）。 */
export function repairToolValue(tool: ToolId, currentDurability: number | undefined): number {
  const def = TOOLS[tool];
  if (currentDurability === undefined) return def.buyPrice;
  const missing = Math.max(0, def.durability - currentDurability);
  return Math.round(missing * def.repairUnitPrice * SHOP.repairDiscount);
}

/** 把背包里可卖物品的总价值算出来，供"一键出售"按钮提示用。 */
export function inventorySellTotal(inventory: Partial<Record<ItemId, number>>): number {
  let total = 0;
  for (const id of Object.keys(inventory) as ItemId[]) {
    const qty = inventory[id] ?? 0;
    if (qty > 0) total += sellValue(id, qty);
  }
  return total;
}
