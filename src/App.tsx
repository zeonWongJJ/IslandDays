// 应用根：Canvas（3D 场景）+ HTML 覆盖层 UI。
// Canvas 配置阴影、色调映射、相机初值；UI 在 Canvas 外读取同一 store。
// 标题画面在 booted=false 时显示，Canvas 始终挂载以预加载资源。

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import * as THREE from 'three';
import { Experience } from './game/Experience.tsx';
import { GameUI } from './game/ui/GameUI.tsx';
import { TitleScreen } from './game/ui/TitleScreen.tsx';
import { useGameStore } from './store/useGameStore.ts';
import './game/ui/game.css';

export default function App() {
  const booted = useGameStore((s) => s.booted);

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
          scene.background = new THREE.Color('#bfe0f5');
        }}
      >
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
      </Canvas>
      {booted ? (
        <Suspense fallback={null}>
          <GameUI />
        </Suspense>
      ) : (
        <TitleScreen />
      )}
    </>
  );
}
