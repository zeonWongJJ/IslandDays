// 虫刷新系统 + 虫群渲染。
//
// BugSystem：每帧调用 store.tickBugs 推进虫点状态（隐藏→激活→逃跑→冷却）。
//   这是一个“无渲染”组件，返回 null。
// BugField：渲染 active 状态的虫（蝴蝶/萤火虫），会扑腾翅膀/发光。
//   玩家靠近时虫会轻微飞起逃跑（视觉提示），但实际捕获在 Player 的 E 处理。

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore.ts';
import { useGameRefs } from '../controllers/gameRefsContext.ts';
import { groundHeight } from '../../systems/terrain.ts';
import { BUG } from '../../config/constants.ts';
import { KenneyBugModel } from '../world/KenneyModels.tsx';

export function BugSystem() {
  const tickBugs = useGameStore((s) => s.tickBugs);
  const timer = useRef(0);

  useFrame((state, dt) => {
    // 每 0.25 秒推进一次虫状态（避免每帧 setState）
    timer.current += dt;
    if (timer.current > 0.25) {
      timer.current = 0;
      const st = useGameStore.getState();
      const gameMin = st.clock.day * 1440 + st.clock.minutes;
      tickBugs(state.clock.elapsedTime, gameMin);
    }
  });

  return null;
}

export function BugField() {
  const bugs = useGameStore((s) => s.bugs);
  return (
    <group>
      {bugs.map((b) => {
        if (b.state !== 'active') return null;
        return <Bug key={b.id} pos={b.pos} variant={b.variant} />;
      })}
    </group>
  );
}

function Bug({ pos, variant }: { pos: [number, number, number]; variant: number }) {
  const { playerRef } = useGameRefs();
  const groupRef = useRef<THREE.Group>(null);
  const baseY = useMemo(() => groundHeight(pos[0], pos[2]) + 1.2, [pos]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const g = groupRef.current;
    if (!g) return;
    // 飘动
    g.position.y = baseY + Math.sin(t * 1.5) * 0.15;
    g.rotation.y = Math.sin(t * 0.7) * 0.5;
    g.rotation.z = Math.sin(t * 12) * 0.08;

    // 玩家靠近时惊飞：升高 + 远离玩家
    const p = playerRef.current;
    if (p) {
      const dx = g.position.x - p.position.x;
      const dz = g.position.z - p.position.z;
      const d = Math.hypot(dx, dz);
      if (d < BUG.alertRadius) {
        const flee = (BUG.alertRadius - d) / BUG.alertRadius;
        g.position.y = baseY + flee * 1.2 + Math.sin(t * 1.5) * 0.15;
        // 略微远离玩家方向漂移
        if (d > 0.01) {
          g.position.x += (dx / d) * flee * 0.02;
          g.position.z += (dz / d) * flee * 0.02;
        }
      }
    }
  });

  const isRare = variant === 1;
  return (
    <group ref={groupRef} position={[pos[0], baseY, pos[2]]}>
      <KenneyBugModel variant={variant} />
      {/* 稀有虫发光 */}
      {isRare && <pointLight color="#fff0a0" intensity={0.5} distance={1.5} />}
    </group>
  );
}
