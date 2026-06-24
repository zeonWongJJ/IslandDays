import { MAP_LAYOUT } from '../config/mapLayout.ts';
import { LANDMARKS } from '../config/landmarks.ts';
import type { Vec3 } from './save.ts';
import { bridgeClearance, roadClearance } from './placement.ts';
import { WORLD_FEATURES } from '../config/worldFeatures.ts';

export interface StaticObstacle {
  id: string;
  label: string;
  pos: Vec3;
  radius: number;
}

function bridgeLampObstacles(): StaticObstacle[] {
  return MAP_LAYOUT.bridges.flatMap((bridge) => {
    const [length, , width] = bridge.size;
    const tx = Math.cos(bridge.rotation);
    const tz = -Math.sin(bridge.rotation);
    const nx = Math.sin(bridge.rotation);
    const nz = Math.cos(bridge.rotation);
    return [-1, 1].map((end) => {
      const side = end > 0 ? 1 : -1;
      return {
        id: `${bridge.id}-lamp-${end}`,
        label: '桥头路灯',
        pos: [
          bridge.pos[0] + tx * end * (length / 2 + 1.7) + nx * side * (width / 2 + 2.2),
          0,
          bridge.pos[2] + tz * end * (length / 2 + 1.7) + nz * side * (width / 2 + 2.2),
        ] as Vec3,
        radius: 0.36,
      };
    });
  });
}

function npcLampObstacles(): StaticObstacle[] {
  return MAP_LAYOUT.npcs.map((npc) => ({
    id: `${npc.id}-home-lamp`,
    label: '居民门口路灯',
    pos: [npc.homePos[0] - 2.8, 0, npc.homePos[2] + 3.0] as Vec3,
    radius: 0.36,
  }));
}

export function getStaticObstacles(): StaticObstacle[] {
  const camp = LANDMARKS.camp;
  return [
    ...bridgeLampObstacles(),
    ...npcLampObstacles(),
    { id: 'plaza-lamp-a', label: '广场路灯', pos: [MAP_LAYOUT.plaza.pos[0] - 4, 0, MAP_LAYOUT.plaza.pos[2] + 3], radius: 0.36 },
    { id: 'plaza-lamp-b', label: '广场路灯', pos: [MAP_LAYOUT.plaza.pos[0] + 4, 0, MAP_LAYOUT.plaza.pos[2] - 2], radius: 0.36 },
    { id: 'shop-lamp', label: '商店路灯', pos: [MAP_LAYOUT.shop.pos[0] - 3.5, 0, MAP_LAYOUT.shop.pos[2] + 3.8], radius: 0.36 },
    { id: 'museum-lamp', label: '博物馆路灯', pos: [MAP_LAYOUT.museum.pos[0] - 4.2, 0, MAP_LAYOUT.museum.pos[2] + 4.2], radius: 0.36 },
    { id: 'plaza-sign', label: '广场告示牌', pos: [MAP_LAYOUT.plaza.pos[0] + 2, 0, MAP_LAYOUT.plaza.pos[2] + 1], radius: 0.42 },
    { id: 'waterfall-sign', label: '瀑布告示牌', pos: [MAP_LAYOUT.waterfall.pool[0] + 4, 0, MAP_LAYOUT.waterfall.pool[2] - 2], radius: 0.42 },
    ...camp.tents.map((tent) => ({ id: tent.id, label: '帐篷', pos: [tent.x, 0, tent.z] as Vec3, radius: 1.55 })),
    { id: camp.fire.id, label: '篝火', pos: [camp.fire.x, 0, camp.fire.z] as Vec3, radius: 0.9 },
    { id: camp.logStack.id, label: '木头堆', pos: [camp.logStack.x, 0, camp.logStack.z] as Vec3, radius: 0.85 },
    ...camp.fences.map((fence) => ({ id: fence.id, label: '营地围栏', pos: [fence.x, 0, fence.z] as Vec3, radius: 0.55 })),
    ...LANDMARKS.orchard.trees.map((tree) => ({ id: tree.id, label: '果树', pos: [tree.x, 0, tree.z] as Vec3, radius: 1.05 })),
    ...LANDMARKS.orchard.bushes.map((bush) => ({ id: bush.id, label: '果园灌木', pos: [bush.x, 0, bush.z] as Vec3, radius: 0.75 })),
    ...LANDMARKS.forestEntrance.logs.map((log) => ({ id: log.id, label: '森林木头', pos: [log.x, 0, log.z] as Vec3, radius: 0.78 })),
    ...LANDMARKS.forestEntrance.bushes.map((bush) => ({ id: bush.id, label: '森林灌木', pos: [bush.x, 0, bush.z] as Vec3, radius: 0.82 })),
    ...LANDMARKS.garden.beds.map((bed) => ({ id: bed.id, label: '菜地', pos: [bed.x, 0, bed.z] as Vec3, radius: 1.45 })),
    { id: LANDMARKS.garden.picnic.id, label: '野餐桌', pos: [LANDMARKS.garden.picnic.x, 0, LANDMARKS.garden.picnic.z], radius: 1.45 },
    { id: LANDMARKS.garden.scarecrow.id, label: '稻草人', pos: [LANDMARKS.garden.scarecrow.x, 0, LANDMARKS.garden.scarecrow.z], radius: 0.5 },
    ...LANDMARKS.garden.fences.map((fence) => ({ id: fence.id, label: '菜园围栏', pos: [fence.x, 0, fence.z] as Vec3, radius: 0.55 })),
    { id: LANDMARKS.lookout.center.id, label: '观景台', pos: [LANDMARKS.lookout.center.x, 0, LANDMARKS.lookout.center.z], radius: 4.6 },
    ...LANDMARKS.lookout.benches.map((bench) => ({ id: bench.id, label: '观景长椅', pos: [bench.x, 0, bench.z] as Vec3, radius: 1.2 })),
    ...LANDMARKS.lookout.shrubs.map((shrub) => ({ id: shrub.id, label: '观景台灌木', pos: [shrub.x, 0, shrub.z] as Vec3, radius: 0.8 })),
    ...LANDMARKS.beachClub.umbrellas.map((umbrella) => ({ id: umbrella.id, label: '沙滩伞', pos: [umbrella.x, 0, umbrella.z] as Vec3, radius: 0.55 })),
    ...LANDMARKS.beachClub.loungers.map((lounger) => ({ id: lounger.id, label: '沙滩躺椅', pos: [lounger.x, 0, lounger.z] as Vec3, radius: 0.7 })),
    ...LANDMARKS.beachClub.volleyballPosts.map((post) => ({ id: post.id, label: '排球网柱', pos: [post.x, 0, post.z] as Vec3, radius: 0.32 })),
    { id: LANDMARKS.beachClub.boat.id, label: '搁浅小船', pos: [LANDMARKS.beachClub.boat.x, 0, LANDMARKS.beachClub.boat.z], radius: 1.75 },
    { id: LANDMARKS.forestRuins.center.id, label: '遗迹石台', pos: [LANDMARKS.forestRuins.center.x, 0, LANDMARKS.forestRuins.center.z], radius: 1.45 },
    ...LANDMARKS.forestRuins.pillars.map((pillar) => ({ id: pillar.id, label: '遗迹石柱', pos: [pillar.x, 0, pillar.z] as Vec3, radius: 0.72 })),
    ...LANDMARKS.forestRuins.stones.map((stone) => ({ id: stone.id, label: '遗迹立石', pos: [stone.x, 0, stone.z] as Vec3, radius: 0.82 })),
    ...LANDMARKS.forestRuins.shrubs.map((shrub) => ({ id: shrub.id, label: '遗迹灌木', pos: [shrub.x, 0, shrub.z] as Vec3, radius: 0.82 })),
    ...LANDMARKS.forestRuins.trees.map((tree) => ({ id: tree.id, label: '遗迹树林', pos: [tree.x, 0, tree.z] as Vec3, radius: 1.05 })),
    ...WORLD_FEATURES
      .filter((feature) => feature.id.startsWith('village_stall_'))
      .map((feature) => ({ id: feature.id, label: '居民摊位', pos: [feature.x, 0, feature.z] as Vec3, radius: 1.35 })),
  ];
}

export function collectStaticObstacleWarnings(): string[] {
  return getStaticObstacles()
    .filter((obstacle) => roadClearance(obstacle.pos[0], obstacle.pos[2]) < obstacle.radius * 0.5 || bridgeClearance(obstacle.pos[0], obstacle.pos[2]) < obstacle.radius * 0.5)
    .map((obstacle) =>
      `${obstacle.label} ${obstacle.id} 可能侵占通道: (${obstacle.pos[0].toFixed(1)}, ${obstacle.pos[2].toFixed(1)}) roadClear=${roadClearance(obstacle.pos[0], obstacle.pos[2]).toFixed(2)} bridgeClear=${bridgeClearance(obstacle.pos[0], obstacle.pos[2]).toFixed(2)}`,
    );
}
