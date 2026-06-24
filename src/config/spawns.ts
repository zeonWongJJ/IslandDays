import type { Season } from './constants.ts';
import type { BugItemId, FishItemId } from './items.ts';

interface TimeRange {
  start: number;
  end: number;
}

interface FishSpawnEntry {
  itemId: FishItemId;
  seasons: Season[];
  hours: TimeRange[];
  weight: number;
}

interface BugSpawnEntry {
  itemId: BugItemId;
  seasons: Season[];
  hours: TimeRange[];
  weight: number;
}

/** 鱼种出没表：按季节和时段筛选可用鱼种 */
const FISH_SPAWN: FishSpawnEntry[] = [
  { itemId: 'fish_common', seasons: ['spring', 'summer', 'fall', 'winter'], hours: [], weight: 60 },
  { itemId: 'fish_rare',   seasons: ['summer'], hours: [{ start: 19, end: 6 }], weight: 20 },
  { itemId: 'fish_legend', seasons: ['summer'], hours: [{ start: 8, end: 18 }], weight: 5 },
];

/** 虫种出没表 */
const BUG_SPAWN: BugSpawnEntry[] = [
  { itemId: 'bug_common', seasons: ['spring', 'summer'], hours: [{ start: 6, end: 18 }], weight: 70 },
  { itemId: 'bug_rare',   seasons: ['summer'], hours: [{ start: 19, end: 5 }], weight: 25 },
];

export function seasonFromDay(day: number, seasonStart: Record<Season, number>): Season {
  const d = day % 365;
  if (d >= seasonStart.winter || d < seasonStart.spring) return 'winter';
  if (d >= seasonStart.fall) return 'fall';
  if (d >= seasonStart.summer) return 'summer';
  return 'spring';
}

function inTimeRange(hours: TimeRange[], gameHour: number): boolean {
  if (hours.length === 0) return true;
  return hours.some((r) => {
    if (r.start <= r.end) return gameHour >= r.start && gameHour < r.end;
    return gameHour >= r.start || gameHour < r.end;
  });
}

function pick(r: number, entries: { itemId: string; weight: number }[]): string {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let roll = r * total;
  for (const e of entries) {
    roll -= e.weight;
    if (roll <= 0) return e.itemId;
  }
  return entries[entries.length - 1].itemId;
}

export function rollFish(r: number, day: number, minutes: number, seasonStart: Record<Season, number>): FishItemId {
  const season = seasonFromDay(day, seasonStart);
  const gameHour = minutes / 60;
  const available = FISH_SPAWN.filter(
    (e) => e.seasons.includes(season) && inTimeRange(e.hours, gameHour),
  );
  if (available.length === 0) return 'fish_common';
  return pick(r, available) as FishItemId;
}

export function rollBug(r: number, day: number, minutes: number, seasonStart: Record<Season, number>): BugItemId {
  const season = seasonFromDay(day, seasonStart);
  const gameHour = minutes / 60;
  const available = BUG_SPAWN.filter(
    (e) => e.seasons.includes(season) && inTimeRange(e.hours, gameHour),
  );
  if (available.length === 0) return 'bug_common';
  return pick(r, available) as BugItemId;
}
