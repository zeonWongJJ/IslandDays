// 共享 ref 上下文的 Provider 组件。
// 在组件间传递“每帧都在变”的实时数据，避免走 zustand（会触发 persist 写 localStorage）。
//
// 持有：
// - playerRef: 玩家 Group 的 ref（实时世界位置/朝向在此读取）
// - cameraYawRef: 相机绕玩家的水平转角（鼠标拖拽改变它）
// - cameraDistanceRef: 相机距离（滚轮缩放）

import { useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { GameRefsContext, type GameRefs } from './gameRefsContext.ts';

export function GameRefsProvider({ children }: { children: ReactNode }) {
  const playerRef = useRef<THREE.Group | null>(null);
  const cameraYawRef = useRef<number>(Math.PI); // 初始相机在玩家身后（+Z 方向）
  const cameraDistanceRef = useRef<number>(13);
  const value: GameRefs = { playerRef, cameraYawRef, cameraDistanceRef };
  return <GameRefsContext.Provider value={value}>{children}</GameRefsContext.Provider>;
}
