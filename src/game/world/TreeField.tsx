// 树木群：从 store 读取所有树并渲染。
// 树的碰撞与交互在 Player.tsx 中处理，这里只负责表现。

import { useGameStore } from '../../store/useGameStore.ts';
import { acceptsTreePlacement } from '../../systems/placement.ts';
import { DistanceCulled } from './DistanceCulled.tsx';
import { Tree } from './Tree.tsx';

export function TreeField() {
  const trees = useGameStore((s) => s.trees);
  const visibleTrees = trees.filter((tree) => acceptsTreePlacement(tree.pos[0], tree.pos[2]));
  return (
    <group>
      {visibleTrees.map((t) => (
        <DistanceCulled key={t.id} center={t.pos} radius={110}>
          <Tree data={t} />
        </DistanceCulled>
      ))}
    </group>
  );
}
