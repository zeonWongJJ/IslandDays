// 大头菜市场系统
// 周日买入，周中卖出，价格随机波动

import { CLOCK } from '../config/constants.ts';

export interface TurnipMarket {
  /** 本周周日对应的日期编号 */
  weekStartDay: number;
  /** 本周买入价（周日固定） */
  buyPrice: number;
  /** 当前卖出价（AM/PM 各变一次） */
  sellPrice: number;
  /** 下次价格变化时间（游戏分钟） */
  nextPriceChange: number;
  /** 大头菜过期时间（下周日 00:00 游戏分钟） */
  spoilAt: number;
}

export interface TurnipPriceHistory {
  /** 周一至周六的 AM/PM 价格 */
  prices: number[];
}

const BASE_BUY_PRICE = 90;
const BUY_PRICE_RANGE = 10; // 80-99

export function generateBuyPrice(rng: () => number): number {
  return BASE_BUY_PRICE + Math.floor(rng() * BUY_PRICE_RANGE * 2) - BUY_PRICE_RANGE;
}

export function generateSellPrice(buyPrice: number, rng: () => number): number {
  // 卖出价随机波动，可能高于或低于买入价
  const volatility = 0.3 + rng() * 0.4; // 30%-70% 波动
  const direction = rng() > 0.5 ? 1 : -1; // 50% 概率涨跌
  const change = Math.floor(buyPrice * volatility * direction);
  return Math.max(10, buyPrice + change); // 最低 10 铃
}

export function createTurnipMarket(day: number, minutes: number, rng: () => number): TurnipMarket {
  const buyPrice = generateBuyPrice(rng);
  const sellPrice = generateSellPrice(buyPrice, rng);
  
  // 下次价格变化：今天 12:00 或明天 00:00
  const currentMinutesInDay = minutes % CLOCK.minutesPerDay;
  const noon = 12 * 60;
  const nextPriceChange = currentMinutesInDay < noon
    ? day * CLOCK.minutesPerDay + noon
    : (day + 1) * CLOCK.minutesPerDay;
  
  // 过期时间：下周日 00:00
  const dayOfWeek = day % 7;
  const daysUntilNextSunday = (7 - dayOfWeek) % 7 || 7;
  const spoilAt = (day + daysUntilNextSunday) * CLOCK.minutesPerDay;
  
  return { weekStartDay: day, buyPrice, sellPrice, nextPriceChange, spoilAt };
}

export function updateTurnipPrice(market: TurnipMarket, rng: () => number): TurnipMarket {
  const newSellPrice = generateSellPrice(market.buyPrice, rng);
  const nextPriceChange = market.nextPriceChange + CLOCK.minutesPerDay / 2; // 12 小时后
  
  return {
    ...market,
    sellPrice: newSellPrice,
    nextPriceChange,
  };
}

export function isTurnipSpoiled(market: TurnipMarket, currentMinute: number): boolean {
  return currentMinute >= market.spoilAt;
}

export function isTurnipPriceChangeDue(market: TurnipMarket, currentMinute: number): boolean {
  return currentMinute >= market.nextPriceChange;
}

export function getTurnipProfit(sellPrice: number, buyPrice: number): number {
  return sellPrice - buyPrice;
}

export function getTurnipProfitPercent(sellPrice: number, buyPrice: number): number {
  return Math.round(((sellPrice - buyPrice) / buyPrice) * 100);
}
