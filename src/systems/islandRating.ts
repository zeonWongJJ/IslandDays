// 岛屿评级系统
// 基于装饰物、路径、花/树、家具、捐赠等计算评级

import type { SaveData } from './save.ts';

export interface RatingFactors {
  trees: number;
  flowers: number;
  paths: number;
  furniture: number;
  donations: number;
  collection: number;
  npcs: number;
  drops: number; // 负面因素
}

export interface IslandRating {
  score: number;
  stars: number;
  factors: RatingFactors;
  tips: string[];
}

const WEIGHTS = {
  trees: 0.8,
  flowers: 2,
  paths: 1,
  furniture: 0.5,
  donations: 3,
  collection: 0.8,
  npcs: 4,
  drops: -0.5,
};

const STAR_THRESHOLDS = [0, 25, 60, 110, 180, 270];

export function calculateIslandRating(data: SaveData): IslandRating {
  const factors: RatingFactors = {
    trees: Math.min(30, data.trees.filter((t) => t.state === 'intact').length),
    flowers: data.plants.filter((p) => p.itemId === 'flower_seed' && p.stage >= 1).length,
    paths: data.paths.length,
    furniture: data.house.rooms.living.placed.length
      + data.house.rooms.bedroom.placed.length
      + data.house.rooms.kitchen.placed.length,
    donations: Object.keys(data.museumDonations).length,
    collection: Object.keys(data.collection).length,
    npcs: Object.values(data.npcAffinity).filter((affinity) => affinity > 0).length,
    drops: data.drops.length,
  };

  let score = 0;
  score += factors.trees * WEIGHTS.trees;
  score += factors.flowers * WEIGHTS.flowers;
  score += factors.paths * WEIGHTS.paths;
  score += factors.furniture * WEIGHTS.furniture;
  score += factors.donations * WEIGHTS.donations;
  score += factors.collection * WEIGHTS.collection;
  score += factors.npcs * WEIGHTS.npcs;
  score += factors.drops * WEIGHTS.drops;

  score = Math.max(0, Math.round(score));

  let stars = 0;
  for (let i = STAR_THRESHOLDS.length - 1; i >= 0; i--) {
    if (score >= STAR_THRESHOLDS[i]) {
      stars = i;
      break;
    }
  }

  const tips: string[] = [];
  if (factors.trees < 20) tips.push('多种些树，让岛屿更绿');
  if (factors.flowers < 10) tips.push('种些花，提升美观度');
  if (factors.paths < 15) tips.push('多铺些路，方便行走');
  if (factors.furniture < 5) tips.push('在屋里多摆些家具');
  if (factors.donations < 5) tips.push('多捐赠鱼虫给博物馆');
  if (factors.drops > 10) tips.push('地上杂物太多，捡起来或卖掉');

  return { score, stars, factors, tips };
}

export function ratingStarsText(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}

export function ratingGrade(stars: number): string {
  if (stars >= 5) return 'S';
  if (stars >= 4) return 'A';
  if (stars >= 3) return 'B';
  if (stars >= 2) return 'C';
  if (stars >= 1) return 'D';
  return 'F';
}
