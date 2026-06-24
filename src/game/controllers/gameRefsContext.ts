// GameRefs 的上下文与 hook（非组件文件，避免 react-refresh 限制）。
// Provider 组件在 GameRefs.tsx 中。

import { createContext, useContext, type RefObject } from 'react';
import type * as THREE from 'three';

export interface GameRefs {
  playerRef: RefObject<THREE.Group | null>;
  cameraYawRef: RefObject<number>;
  cameraDistanceRef: RefObject<number>;
}

export const GameRefsContext = createContext<GameRefs | null>(null);

export function useGameRefs(): GameRefs {
  const ctx = useContext(GameRefsContext);
  if (!ctx) throw new Error('useGameRefs 必须在 GameRefsProvider 内使用');
  return ctx;
}
