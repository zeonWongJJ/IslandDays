import { LANDMARKS } from '../config/landmarks.ts';
import { MAP_LAYOUT } from '../config/mapLayout.ts';
import type { SaveData } from './save.ts';

export type RegionId = 'ruins' | 'beach' | 'village';

export interface RegionObjective {
  id: string;
  region: RegionId;
  regionName: string;
  icon: string;
  title: string;
  detail: string;
  progress: number;
  total: number;
  completed: boolean;
  x: number;
  z: number;
}

interface RegionObjectiveState {
  clock: SaveData['clock'];
  social: SaveData['social'];
  regionProgress: SaveData['regionProgress'];
  volleyball: { active: boolean; hits: number };
}

export function getRegionObjectives(state: RegionObjectiveState): RegionObjective[] {
  const day = state.clock.day;
  const daily = state.social.daily;
  const shellCount = ['beach_shell_1', 'beach_shell_2', 'beach_shell_3', 'beach_shell_4', 'beach_shell_5']
    .filter((id) => state.regionProgress.collectedShells[`${id}:${day}`]).length;
  const ruinDailyComplete = daily['ruin:trial'] === day;
  const ruinStarted = daily['ruin:started'] === day;
  const ruinProgress = state.regionProgress.ruinChestOpened
    ? ruinDailyComplete
      ? 3
      : ruinStarted
        ? state.regionProgress.ruinRunes
        : 0
    : state.regionProgress.ruinRunes;
  const stallCount = ['mira', 'tao', 'lina']
    .filter((id) => daily[`stall:${id}`] === day).length;

  return [
    {
      id: 'ruin-trial',
      region: 'ruins',
      regionName: '森林遗迹',
      icon: '◆',
      title: state.regionProgress.ruinChestOpened ? '每日符文试炼' : '解除遗迹封印',
      detail: state.regionProgress.ruinChestOpened ? '依次触碰风、水、林符文' : '点亮符文并打开中央宝箱',
      progress: state.regionProgress.ruinChestOpened ? ruinProgress : state.regionProgress.ruinRunes,
      total: state.regionProgress.ruinChestOpened ? 3 : 4,
      completed: state.regionProgress.ruinChestOpened ? ruinDailyComplete : false,
      x: LANDMARKS.forestRuins.center.x,
      z: LANDMARKS.forestRuins.center.z,
    },
    {
      id: 'beach-shells',
      region: 'beach',
      regionName: '南岸海滩',
      icon: '🐚',
      title: '寻找彩色贝壳',
      detail: '收集今天散落在海滩的贝壳',
      progress: shellCount,
      total: 5,
      completed: shellCount >= 5,
      x: LANDMARKS.beachClub.center.x,
      z: LANDMARKS.beachClub.center.z,
    },
    {
      id: 'beach-volleyball',
      region: 'beach',
      regionName: '南岸海滩',
      icon: '●',
      title: '沙滩排球挑战',
      detail: '连续三次把握时机完成击球',
      progress: state.regionProgress.volleyballDay === day ? 3 : state.volleyball.hits,
      total: 3,
      completed: state.regionProgress.volleyballDay === day,
      x: LANDMARKS.beachClub.center.x,
      z: LANDMARKS.beachClub.center.z,
    },
    {
      id: 'village-market',
      region: 'village',
      regionName: '居民广场',
      icon: '▦',
      title: '今日集市巡游',
      detail: '拜访米拉、阿陶和莉娜的职业摊位',
      progress: stallCount,
      total: 3,
      completed: daily['village:market'] === day,
      x: MAP_LAYOUT.plaza.pos[0],
      z: MAP_LAYOUT.plaza.pos[2],
    },
  ];
}
