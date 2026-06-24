// 游戏时钟与系统循环：每帧推进游戏时间，并定期检查树桩重生。
// 这是个“无渲染”组件，只跑逻辑，返回 null。

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { useGameStore } from '../store/useGameStore.ts';

export function ClockSystem() {
  const tickClock = useGameStore((s) => s.tickClock);
  const regrowDue = useGameStore((s) => s.regrowDue);
  const clockTimer = useRef(1);
  const regrowTimer = useRef(0);

  useFrame((_, dt) => {
    clockTimer.current += dt;
    if (clockTimer.current >= 1) {
      clockTimer.current = 0;
      tickClock();
    }
    regrowTimer.current += dt;
    if (regrowTimer.current > 1) {
      regrowTimer.current = 0;
      regrowDue();
    }
  });

  return null;
}
