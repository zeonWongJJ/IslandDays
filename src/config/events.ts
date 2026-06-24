// 节庆活动配置：按游戏日触发。

export interface EventDef {
  id: string;
  name: string;
  /** 活动起止日（含） */
  dayStart: number;
  dayEnd: number;
  /** 是否在岛上放置特殊装饰 */
  hasDecorations: boolean;
  /** 是否向 NPC 添加特殊台词 */
  hasDialogue: boolean;
  /** 特殊粒子效果 */
  particle?: 'petal' | 'firework' | 'snowflake';
}

export const EVENTS: EventDef[] = [
  {
    id: 'cherry_blossom',
    name: '🌸 樱花季',
    dayStart: 80,
    dayEnd: 90,
    hasDecorations: true,
    hasDialogue: true,
    particle: 'petal',
  },
  {
    id: 'summer_festival',
    name: '🎆 夏祭',
    dayStart: 190,
    dayEnd: 200,
    hasDecorations: true,
    hasDialogue: true,
    particle: 'firework',
  },
  {
    id: 'halloween',
    name: '🎃 万圣节',
    dayStart: 280,
    dayEnd: 290,
    hasDecorations: true,
    hasDialogue: true,
    particle: 'snowflake',
  },
  {
    id: 'winter_holiday',
    name: '🎄 冬季节日',
    dayStart: 355,
    dayEnd: 365,
    hasDecorations: true,
    hasDialogue: true,
    particle: 'snowflake',
  },
];

export function currentEvent(day: number): EventDef | null {
  // clock.day 是从 2024-01-01 起的绝对天数（1-indexed），需要 mod 365 映射到年内日
  const d = day % 365 || 365;
  for (const e of EVENTS) {
    if (d >= e.dayStart && d <= e.dayEnd) return e;
  }
  return null;
}
