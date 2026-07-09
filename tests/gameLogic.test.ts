import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ITEMS } from '../src/config/items.ts';
import { LANDMARKS } from '../src/config/landmarks.ts';
import { MAP_LAYOUT } from '../src/config/mapLayout.ts';
import { NPCS, npcPositionAt, npcScheduleAt } from '../src/config/npcs.ts';
import { WORLD_FEATURES } from '../src/config/worldFeatures.ts';
import { findInteractionTarget } from '../src/game/interactions.ts';
import { getStaticObstacles } from '../src/systems/staticObstacles.ts';
import { blocksWalking, groundHeight, groundKind, resolveWalkableStep, riverAmount } from '../src/systems/terrain.ts';
import { buildSpatialGrid, querySpatialGrid } from '../src/systems/spatialGrid.ts';
import { getRegionObjectives } from '../src/systems/regionObjectives.ts';
import type { TreeData } from '../src/systems/save.ts';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length() {
    return this.data.size;
  }

  clear() {
    this.data.clear();
  }

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }

  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.data.delete(key);
  }

  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

let useGameStore: (typeof import('../src/store/useGameStore.ts'))['useGameStore'];

beforeAll(async () => {
  vi.stubGlobal('localStorage', new MemoryStorage());
  ({ useGameStore } = await import('../src/store/useGameStore.ts'));
});

beforeEach(() => {
  localStorage.clear();
  const current = useGameStore.getState();
  useGameStore.setState({
    player: { ...current.player, bells: 1000 },
    inventory: {},
    tools: { axe: 30 },
    toolLevel: {},
    paths: [],
    toasts: [],
  });
});

describe('原子交易', () => {
  it('矿石不足时升级工具不会扣除铃钱', () => {
    useGameStore.getState().upgradeTool('axe');

    const state = useGameStore.getState();
    expect(state.player.bells).toBe(1000);
    expect(state.toolLevel.axe).toBeUndefined();
  });

  it('家具达到堆叠上限时不会消耗材料', () => {
    useGameStore.setState({
      inventory: {
        recipe_stool: 1,
        furniture_stool: ITEMS.furniture_stool.stack,
        wood: 3,
        branch: 2,
      },
    });

    expect(useGameStore.getState().craftFurniture('furniture_stool')).toBe(false);
    const inventory = useGameStore.getState().inventory;
    expect(inventory.wood).toBe(3);
    expect(inventory.branch).toBe(2);
  });
});

describe('游泳互动', () => {
  it('游泳时忽略岸上的树并优先返回上岸目标', () => {
    let waterPoint: [number, number] | null = null;
    for (let x = -100; x <= 100 && !waterPoint; x += 1) {
      for (let z = -100; z <= 100; z += 1) {
        if (groundKind(x, z) !== 'water') continue;
        if (groundKind(x + 1, z) !== 'water') {
          waterPoint = [x, z];
          break;
        }
      }
    }
    expect(waterPoint).not.toBeNull();
    const [x, z] = waterPoint!;
    const tree: TreeData = {
      id: 'shore-tree',
      pos: [x, 0, z],
      hp: 3,
      state: 'intact',
      regrowAt: null,
      variant: 0,
      fruit: null,
      fruitCount: 0,
      fruitReadyAt: null,
      maturityAt: null,
    };

    const target = findInteractionTarget({
      playerX: x,
      playerZ: z,
      trees: [tree],
      fishSpots: [],
      bugs: [],
      plants: [],
      rocks: [],
      paths: [],
      minutes: 720,
      swimming: true,
    });

    expect(target?.kind).toBe('water');
  });
});

describe('空间网格', () => {
  it('能查询当前单元和相邻单元中的对象', () => {
    const items = [
      { id: 'left', pos: [11, 0] as const },
      { id: 'right', pos: [13, 0] as const },
      { id: 'far', pos: [40, 0] as const },
    ];
    const grid = buildSpatialGrid(items, (item) => item.pos, 12);

    expect(querySpatialGrid(grid, 12, 0, 2).map((item) => item.id).sort()).toEqual(['left', 'right']);
  });
});

describe('行走通行', () => {
  it('斜向碰到水岸时会沿可走方向滑动', () => {
    let sample: [number, number] | null = null;
    for (let x = -90; x <= 90 && !sample; x += 1) {
      for (let z = -90; z <= 90; z += 1) {
        if (!blocksWalking(x, z) && blocksWalking(x + 1, z + 1) && !blocksWalking(x, z + 1)) {
          sample = [x, z];
          break;
        }
      }
    }
    expect(sample).not.toBeNull();
    const [x, z] = sample!;
    const resolved = resolveWalkableStep(x, z, x + 1, z + 1);
    expect(resolved).not.toEqual([x, z]);
    expect(blocksWalking(resolved[0], resolved[1])).toBe(false);
  });

  it('两座桥的中心通道从两端到桥面均可通行', () => {
    for (const bridge of MAP_LAYOUT.bridges) {
      const halfLength = bridge.size[0] / 2;
      for (let offset = -halfLength - 4; offset <= halfLength + 4; offset += 0.5) {
        expect(blocksWalking(bridge.pos[0] + offset, bridge.pos[2])).toBe(false);
      }
    }
  });

  it('主路采样点不会被河流或陡坡截断', () => {
    for (const road of MAP_LAYOUT.roads) {
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        const x = road.from[0] + (road.to[0] - road.from[0]) * t;
        const z = road.from[1] + (road.to[1] - road.from[1]) * t;
        expect(blocksWalking(x, z)).toBe(false);
      }
    }
  });
});

describe('瀑布地形', () => {
  it('崖口与水潭具备足够的真实落差', () => {
    const lip = MAP_LAYOUT.waterfall.dropPos;
    const pool = MAP_LAYOUT.waterfall.pool;
    expect(groundHeight(lip[0], lip[2]) - groundHeight(pool[0], pool[2])).toBeGreaterThan(2);
  });

  it('高位溪流高于下游水潭', () => {
    const top = MAP_LAYOUT.waterfall.top;
    const pool = MAP_LAYOUT.waterfall.pool;
    expect(groundHeight(top[0], top[2])).toBeGreaterThan(groundHeight(pool[0], pool[2]) + 2);
  });

  it('水潭不会被道路地形覆盖', () => {
    const pool = MAP_LAYOUT.waterfall.pool;
    expect(groundKind(pool[0], pool[2])).toBe('water');
  });
});

describe('景观落点', () => {
  it('普通景观、障碍和交互点不会落在河流或水面里', () => {
    const points: Array<{ id: string; x: number; z: number }> = [];
    const add = (id: string, x: number, z: number) => points.push({ id, x, z });
    const addMany = (items: readonly { id: string; x: number; z: number }[]) => {
      items.forEach((item) => add(item.id, item.x, item.z));
    };

    addMany(LANDMARKS.camp.tents);
    add('camp-fire', LANDMARKS.camp.fire.x, LANDMARKS.camp.fire.z);
    add('camp-log-stack', LANDMARKS.camp.logStack.x, LANDMARKS.camp.logStack.z);
    addMany(LANDMARKS.camp.fences);
    addMany(LANDMARKS.orchard.trees);
    addMany(LANDMARKS.orchard.bushes);
    addMany(LANDMARKS.forestEntrance.logs);
    addMany(LANDMARKS.forestEntrance.bushes);
    addMany(LANDMARKS.garden.beds);
    add('garden-picnic', LANDMARKS.garden.picnic.x, LANDMARKS.garden.picnic.z);
    add('garden-scarecrow', LANDMARKS.garden.scarecrow.x, LANDMARKS.garden.scarecrow.z);
    addMany(LANDMARKS.garden.fences);
    addMany(LANDMARKS.lookout.benches);
    addMany(LANDMARKS.lookout.shrubs);
    addMany(LANDMARKS.beachClub.umbrellas);
    addMany(LANDMARKS.beachClub.loungers);
    addMany(LANDMARKS.beachClub.volleyballPosts);
    addMany(LANDMARKS.forestRuins.pillars);
    addMany(LANDMARKS.forestRuins.stones);
    addMany(LANDMARKS.forestRuins.shrubs);
    addMany(LANDMARKS.forestRuins.trees);
    WORLD_FEATURES.forEach((feature) => add(feature.id, feature.x, feature.z));
    getStaticObstacles().forEach((obstacle) => add(obstacle.id, obstacle.pos[0], obstacle.pos[2]));

    for (const point of points) {
      expect(
        groundKind(point.x, point.z) !== 'water' &&
        riverAmount(point.x, point.z) <= 0.45 &&
        groundHeight(point.x, point.z) >= -0.95,
      ).toBe(true);
    }
  });
});

describe('区域玩法', () => {
  it('海滩贝壳每天可以重新收集', () => {
    useGameStore.setState({
      clock: { day: 10, minutes: 720 },
      player: { ...useGameStore.getState().player, bells: 0 },
      regionProgress: { ruinRunes: 0, ruinChestOpened: false, collectedShells: {}, volleyballDay: null },
    });

    useGameStore.getState().interactWorldFeature('beach_shell_1');
    useGameStore.getState().interactWorldFeature('beach_shell_1');
    expect(useGameStore.getState().player.bells).toBe(80);

    useGameStore.setState({ clock: { day: 11, minutes: 720 } });
    useGameStore.getState().interactWorldFeature('beach_shell_1');
    expect(useGameStore.getState().player.bells).toBe(160);
  });

  it('遗迹宝箱开启后每天可重玩符文试炼', () => {
    useGameStore.setState({
      clock: { day: 20, minutes: 720 },
      player: { ...useGameStore.getState().player, bells: 0 },
      social: { daily: {} },
      regionProgress: { ruinRunes: 3, ruinChestOpened: true, collectedShells: {}, volleyballDay: null },
    });

    useGameStore.getState().interactWorldFeature('ruin_rune_1');
    useGameStore.getState().interactWorldFeature('ruin_rune_2');
    useGameStore.getState().interactWorldFeature('ruin_rune_3');

    expect(useGameStore.getState().player.bells).toBe(320);
    expect(useGameStore.getState().social.daily['ruin:trial']).toBe(20);
  });

  it('排球连续三次命中时机后才结算奖励', () => {
    const now = vi.spyOn(performance, 'now');
    useGameStore.setState({
      clock: { day: 30, minutes: 720 },
      player: { ...useGameStore.getState().player, bells: 0 },
      regionProgress: { ruinRunes: 0, ruinChestOpened: false, collectedShells: {}, volleyballDay: null },
      volleyball: { active: false, hits: 0, targetAt: 0, expiresAt: 0 },
    });

    now.mockReturnValueOnce(0);
    useGameStore.getState().interactWorldFeature('beach_volleyball');
    now.mockReturnValueOnce(900);
    useGameStore.getState().interactWorldFeature('beach_volleyball');
    now.mockReturnValueOnce(1780);
    useGameStore.getState().interactWorldFeature('beach_volleyball');
    now.mockReturnValueOnce(2780);
    useGameStore.getState().interactWorldFeature('beach_volleyball');

    expect(useGameStore.getState().player.bells).toBe(360);
    expect(useGameStore.getState().regionProgress.volleyballDay).toBe(30);
    now.mockRestore();
  });

  it('逛完三个居民摊位发放一次集市奖励', () => {
    useGameStore.setState({
      clock: { day: 40, minutes: 720 },
      player: { ...useGameStore.getState().player, bells: 0 },
      inventory: {},
      social: { daily: {} },
    });

    useGameStore.getState().interactWorldFeature('village_stall_mira');
    useGameStore.getState().interactWorldFeature('village_stall_tao');
    useGameStore.getState().interactWorldFeature('village_stall_lina');
    useGameStore.getState().interactWorldFeature('village_stall_lina');

    expect(useGameStore.getState().player.bells).toBe(420);
    expect(useGameStore.getState().social.daily['village:market']).toBe(40);
  });
});

describe('区域目标追踪', () => {
  it('按当天状态计算地图和任务进度', () => {
    const objectives = getRegionObjectives({
      clock: { day: 50, minutes: 720 },
      social: {
        daily: {
          'ruin:started': 50,
          'stall:mira': 50,
          'stall:tao': 50,
        },
      },
      regionProgress: {
        ruinRunes: 2,
        ruinChestOpened: true,
        collectedShells: {
          'beach_shell_1:50': true,
          'beach_shell_2:50': true,
          'beach_shell_3:49': true,
        },
        volleyballDay: null,
      },
      volleyball: { active: true, hits: 1 },
    });

    expect(objectives.find((objective) => objective.id === 'ruin-trial')?.progress).toBe(2);
    expect(objectives.find((objective) => objective.id === 'beach-shells')?.progress).toBe(2);
    expect(objectives.find((objective) => objective.id === 'beach-volleyball')?.progress).toBe(1);
    expect(objectives.find((objective) => objective.id === 'village-market')?.progress).toBe(2);
  });
});

describe('NPC 日程', () => {
  it('白天目标点按日程平滑移动，不会频繁跳点', () => {
    for (const npc of NPCS) {
      for (let minute = 7 * 60; minute < 21 * 60; minute += 10) {
        const a = npcPositionAt(npc, minute);
        const b = npcPositionAt(npc, minute + 5);
        const distance = Math.hypot(a[0] - b[0], a[2] - b[2]);
        expect(distance).toBeLessThan(4.5);
      }
    }
  });

  it('会在工作、集市和夜间休息之间切换状态', () => {
    for (const npc of NPCS) {
      expect(npcScheduleAt(npc, 9 * 60).activity).toBe('work');
      expect(npcScheduleAt(npc, 15 * 60).activity).toBe('work');
      expect(npcScheduleAt(npc, 22 * 60).activity).toBe('rest');
    }
  });
});
