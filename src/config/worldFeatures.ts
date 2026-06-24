import { LANDMARKS } from './landmarks.ts';
import { MAP_LAYOUT } from './mapLayout.ts';

export type WorldFeatureId =
  | 'ruin_rune_1'
  | 'ruin_rune_2'
  | 'ruin_rune_3'
  | 'ruin_chest'
  | 'beach_shell_1'
  | 'beach_shell_2'
  | 'beach_shell_3'
  | 'beach_shell_4'
  | 'beach_shell_5'
  | 'beach_volleyball'
  | 'village_stall_mira'
  | 'village_stall_tao'
  | 'village_stall_lina';

export interface WorldFeaturePoint {
  id: WorldFeatureId;
  x: number;
  z: number;
  radius: number;
  hint: string;
}

const ruinStones = LANDMARKS.forestRuins.stones;

export const WORLD_FEATURES: WorldFeaturePoint[] = [
  { id: 'ruin_rune_1', x: ruinStones[0].x, z: ruinStones[0].z, radius: 2.2, hint: '按 E 触碰风之符文' },
  { id: 'ruin_rune_2', x: ruinStones[1].x, z: ruinStones[1].z, radius: 2.2, hint: '按 E 触碰水之符文' },
  { id: 'ruin_rune_3', x: ruinStones[2].x, z: ruinStones[2].z, radius: 2.2, hint: '按 E 触碰林之符文' },
  {
    id: 'ruin_chest',
    x: LANDMARKS.forestRuins.center.x,
    z: LANDMARKS.forestRuins.center.z,
    radius: 2.5,
    hint: '按 E 查看遗迹宝箱',
  },
  { id: 'beach_shell_1', x: 31.2, z: -66.5, radius: 1.8, hint: '按 E 捡起贝壳' },
  { id: 'beach_shell_2', x: 36.8, z: -69.5, radius: 1.8, hint: '按 E 捡起贝壳' },
  { id: 'beach_shell_3', x: 42.5, z: -67.2, radius: 1.8, hint: '按 E 捡起贝壳' },
  { id: 'beach_shell_4', x: 47.5, z: -65.8, radius: 1.8, hint: '按 E 捡起贝壳' },
  { id: 'beach_shell_5', x: 50.5, z: -71.2, radius: 1.8, hint: '按 E 捡起贝壳' },
  { id: 'beach_volleyball', x: 41.5, z: -55, radius: 3.2, hint: '按 E 挑战沙滩排球' },
  {
    id: 'village_stall_mira',
    x: MAP_LAYOUT.plaza.pos[0] - 5.5,
    z: MAP_LAYOUT.plaza.pos[2] + 4.8,
    radius: 2.2,
    hint: '按 E 看看花艺摊',
  },
  {
    id: 'village_stall_tao',
    x: MAP_LAYOUT.plaza.pos[0] + 5.5,
    z: MAP_LAYOUT.plaza.pos[2] + 4.2,
    radius: 2.2,
    hint: '按 E 看看渔具摊',
  },
  {
    id: 'village_stall_lina',
    x: MAP_LAYOUT.plaza.pos[0] + 5,
    z: MAP_LAYOUT.plaza.pos[2] - 4.8,
    radius: 2.2,
    hint: '按 E 看看木工摊',
  },
];

export function worldFeatureById(id: WorldFeatureId): WorldFeaturePoint {
  return WORLD_FEATURES.find((feature) => feature.id === id) ?? WORLD_FEATURES[0];
}
