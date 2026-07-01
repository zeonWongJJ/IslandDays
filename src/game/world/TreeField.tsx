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
  const { playerRef } = useGameRefs();
  const timerRef = useRef(0);
  const [lodCenter, setLodCenter] = useState<[number, number]>(() => {
    const player = useGameStore.getState().player.pos;
    return [player[0], player[2]];
  });
  const visibleTrees = useMemo(
    () => trees.filter((tree) => acceptsTreePlacement(tree.pos[0], tree.pos[2])),
    [trees],
  );

  useFrame((_, dt) => {
    timerRef.current += dt;
    if (timerRef.current < 0.35) return;
    timerRef.current = 0;
    const player = playerRef.current;
    if (!player) return;
    setLodCenter((current) => {
      const dx = player.position.x - current[0];
      const dz = player.position.z - current[1];
      return dx * dx + dz * dz >= 36 ? [player.position.x, player.position.z] : current;
    });
  });

  return (
    <group>
      {visibleTrees.map((tree) => {
        const distSq = (lodCenter[0] - tree.pos[0]) ** 2 + (lodCenter[1] - tree.pos[2]) ** 2;
        if (distSq <= 60 * 60) return <Tree key={tree.id} data={tree} />;
        if (distSq <= 142 * 142) return <DistantTree key={tree.id} data={tree} />;
        return null;
      })}
    </group>
  );
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
