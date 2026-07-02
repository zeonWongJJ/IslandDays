import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ITEMS } from '../src/config/items.ts';
import { MAP_LAYOUT } from '../src/config/mapLayout.ts';
import { findInteractionTarget } from '../src/game/interactions.ts';
import { blocksWalking, groundHeight, groundKind, resolveWalkableStep } from '../src/systems/terrain.ts';
import { buildSpatialGrid, querySpatialGrid } from '../src/systems/spatialGrid.ts';
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
