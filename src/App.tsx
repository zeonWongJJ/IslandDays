// 应用根：Canvas（3D 场景）+ HTML 覆盖层 UI。
// Canvas 配置阴影、色调映射、相机初值；UI 在 Canvas 外读取同一 store。

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import * as THREE from 'three';
import { Experience } from './game/Experience.tsx';
import { GameUI } from './game/ui/GameUI.tsx';
import './game/ui/game.css';

function LoadingScreen() {
  return <div className="loading">正在登岛…</div>;
}

export default function App() {
  return (
    <>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        camera={{ position: [0, 8, 18], fov: 50, near: 0.1, far: 360 }}
        onCreated={({ scene }) => {
          // 初始天空色；DayNight 会按游戏时钟持续更新。
          scene.background = new THREE.Color('#bfe0f5');
        }}
      >
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
      </Canvas>
      <Suspense fallback={<LoadingScreen />}>
        <GameUI />
      </Suspense>
    </>
  );
}
