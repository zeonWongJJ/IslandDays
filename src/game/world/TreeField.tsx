// 树木群：从 store 读取所有树并渲染。
// 树的碰撞与交互在 Player.tsx 中处理，这里只负责表现。

import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../../store/useGameStore.ts';
import { acceptsTreePlacement } from '../../systems/placement.ts';
import type { TreeData } from '../../systems/save.ts';
import { groundHeight } from '../../systems/terrain.ts';
import { useGameRefs } from '../controllers/gameRefsContext.ts';
import { Tree } from './Tree.tsx';

export function TreeField() {
  const trees = useGameStore((s) => s.trees);
  const visibleTrees = trees.filter((tree) => acceptsTreePlacement(tree.pos[0], tree.pos[2]));
  return (
    <group>
      {visibleTrees.map((t) => (
        <TreeLOD key={t.id} data={t} />
      ))}
    </group>
  );
}

function TreeLOD({ data }: { data: TreeData }) {
  const timerRef = useRef(0);
  const { playerRef } = useGameRefs();
  const [level, setLevel] = useState<'near' | 'far' | 'hidden'>(() => {
    const player = useGameStore.getState().player.pos;
    const distSq = (player[0] - data.pos[0]) ** 2 + (player[2] - data.pos[2]) ** 2;
    return distSq <= 62 * 62 ? 'near' : distSq <= 142 * 142 ? 'far' : 'hidden';
  });

  useFrame((_, dt) => {
    timerRef.current += dt;
    if (timerRef.current < 0.3) return;
    timerRef.current = 0;
    const player = playerRef.current;
    if (!player) return;
    const distSq = (player.position.x - data.pos[0]) ** 2 + (player.position.z - data.pos[2]) ** 2;
    const next = distSq <= 58 * 58 ? 'near' : distSq <= 142 * 142 ? 'far' : 'hidden';
    setLevel((current) => current === next ? current : next);
  });

  if (level === 'near') return <Tree data={data} />;
  if (level === 'far') return <DistantTree data={data} />;
  return null;
}

function DistantTree({ data }: { data: TreeData }) {
  const [x, , z] = data.pos;
  const y = useMemo(() => groundHeight(x, z), [x, z]);
  const palm = data.variant >= 9;
  const color = data.state === 'stump'
    ? '#72533a'
    : data.variant % 3 === 0
      ? '#476d3e'
      : data.variant % 3 === 1
        ? '#3f6540'
        : '#557846';

  if (data.state === 'stump') {
    return (
      <mesh position={[x, y + 0.2, z]}>
        <cylinderGeometry args={[0.3, 0.4, 0.4, 6]} />
        <meshBasicMaterial color={color} />
      </mesh>
    );
  }

  return (
    <group position={[x, y, z]}>
      <mesh position={[0, palm ? 1.4 : 1.1, 0]}>
        <cylinderGeometry args={[0.16, 0.24, palm ? 2.8 : 2.2, 6]} />
        <meshBasicMaterial color="#65452d" />
      </mesh>
      <mesh position={[0, palm ? 3.0 : 2.8, 0]} scale={palm ? [1.25, 0.55, 1.25] : [1.15, 1.3, 1.15]}>
        {palm ? <dodecahedronGeometry args={[1, 0]} /> : <icosahedronGeometry args={[1, 1]} />}
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}
