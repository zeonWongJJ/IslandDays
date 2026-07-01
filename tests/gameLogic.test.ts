import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ITEMS } from '../src/config/items.ts';
import { findInteractionTarget } from '../src/game/interactions.ts';
import { groundKind } from '../src/systems/terrain.ts';
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
