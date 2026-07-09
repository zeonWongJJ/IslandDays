// 地面掉落物：树枝/木材等。
// 每个掉落物是一个低多边形小块+阴影，颜色按物品区分。
// 拾取逻辑在 Player.tsx（靠近自动捡起）。

import { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore.ts';
import { type ItemId } from '../../config/items.ts';
import { groundHeight } from '../../systems/terrain.ts';
import { KenneyDropModel } from './KenneyModels.tsx';

const ITEM_COLOR: Record<ItemId, string> = {
  branch: '#8a6a3a',
  wood: '#c89a5a',
  stone: '#9a9a9a',
  fish_common: '#7fa8c9',
  fish_crucian: '#7ab88a',
  fish_carp: '#c9b84a',
  fish_bluegill: '#4a7fc9',
  fish_loach: '#8a6a40',
  fish_salmon: '#c9704a',
  fish_mackerel: '#4a6a8a',
  fish_rare: '#e8b84a',
  fish_mahi_mahi: '#40c0a0',
  fish_legend: '#c9604a',
  bug_common: '#c9a8d6',
  bug_cicada: '#5a7a3a',
  bug_beetle: '#3a2a1a',
  bug_dragonfly: '#6ab0d8',
  bug_moth: '#8a6a5a',
  bug_rare: '#e8e8a0',
  sapling: '#4a8a3a',
  flower_seed: '#d66ba8',
  tomato_seed: '#cc4444',
  carrot_seed: '#ee8833',
  wheat_seed: '#ddcc66',
  tomato: '#cc4444',
  carrot: '#ee8833',
  wheat: '#ddcc66',
  coconut: '#6a4a1a',
  driftwood: '#9a8a6a',
  apple: '#e03030',
  orange: '#f0a030',
  peach: '#f0b0a0',
  cherry: '#c02040',
  apple_sapling: '#4a8a3a',
  orange_sapling: '#4a8a3a',
  peach_sapling: '#4a8a3a',
  cherry_sapling: '#4a8a3a',
  turnip: '#e8e8d0',
  shell: '#f0e8e0',
  starfish: '#e8a0a0',
  sea_urchin: '#4a4a4a',
  hat_red: '#e03030',
  hat_blue: '#3060e0',
  hat_green: '#30a030',
  shirt_red: '#e03030',
  shirt_blue: '#3060e0',
  shirt_green: '#30a030',
  pants_blue: '#3060e0',
  pants_brown: '#8a5a2a',
  pants_green: '#30a030',
  shoes_red: '#e03030',
  shoes_blue: '#3060e0',
  shoes_brown: '#8a5a2a',
  path_stone: '#8a8a8a',
  path_brick: '#b84a3a',
  path_wood: '#c0906a',
  path_dirt: '#8a7a5a',
  iron_ore: '#7a7a8a',
  gold_ore: '#e8c840',
  furniture_stool: '#b08a5a',
  furniture_table: '#a07a4a',
  furniture_bed: '#c0906a',
  furniture_lamp: '#e8d860',
  furniture_rug: '#d6806a',
  furniture_chair: '#b08a5a',
  furniture_sofa: '#c06040',
  furniture_bookcase: '#8a6a3a',
  furniture_desk: '#a07a4a',
  furniture_coffeeTable: '#b0906a',
  furniture_bench: '#c0906a',
  furniture_sideTable: '#a08a5a',
  furniture_cabinet: '#7a5a3a',
  furniture_lampTable: '#e8d860',
  furniture_rugSquare: '#d6806a',
  recipe_stool: '#d8c890',
  recipe_table: '#d8c890',
  recipe_bed: '#d8c890',
  recipe_lamp: '#d8c890',
  recipe_rug: '#d8c890',
  recipe_chair: '#d8c890',
  recipe_sofa: '#d8c890',
  recipe_bookcase: '#d8c890',
  recipe_desk: '#d8c890',
  recipe_coffeeTable: '#d8c890',
  recipe_bench: '#d8c890',
  recipe_sideTable: '#d8c890',
  recipe_cabinet: '#d8c890',
  recipe_lampTable: '#d8c890',
  recipe_rugSquare: '#d8c890',
};

export function Drops() {
  const drops = useGameStore((s) => s.drops);
  return (
    <group>
      {drops.map((d) => (
        <Drop key={d.id} itemId={d.itemId} pos={d.pos} />
      ))}
    </group>
  );
}

function Drop({ itemId, pos }: { itemId: ItemId; pos: [number, number, number] }) {
  const color = ITEM_COLOR[itemId] ?? '#cccccc';
  const geo = useMemo(() => new THREE.DodecahedronGeometry(0.18, 0), []);
  const [x, , z] = pos;
  const y = useMemo(() => groundHeight(x, z), [x, z]);
  return (
    <group position={[x, y + 0.2, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, 0]}>
        <circleGeometry args={[0.3, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.2} />
      </mesh>
      <KenneyDropModel
        itemId={itemId}
        fallback={
        <mesh geometry={geo} castShadow>
          <meshStandardMaterial color={color} flatShading roughness={0.9} />
        </mesh>
        }
      />
    </group>
  );
}
