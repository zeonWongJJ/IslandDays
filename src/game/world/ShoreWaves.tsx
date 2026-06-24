import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WORLD } from '../../config/constants.ts';

const WAVE_COUNT = 60;
const SHORE_RADIUS = WORLD.size / 2 * 0.78;

const foamGeo = new THREE.CircleGeometry(0.55, 7);

interface Foam {
  x: number; z: number; phase: number; speed: number; scale: number; mat: THREE.MeshBasicMaterial;
}
const foamData: Foam[] = [];
for (let i = 0; i < WAVE_COUNT; i++) {
  const angle = (i / WAVE_COUNT) * Math.PI * 2;
  const r = SHORE_RADIUS + (Math.random() - 0.5) * 2.5;
  foamData.push({
    x: Math.cos(angle) * r,
    z: Math.sin(angle) * r,
    phase: (i / WAVE_COUNT) * Math.PI * 2 + Math.random() * 0.8,
    speed: 0.5 + Math.random() * 0.4,
    scale: 0.7 + Math.random() * 0.6,
    mat: new THREE.MeshBasicMaterial({
      color: '#eef4ff',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  });
}

export function ShoreWaves() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < WAVE_COUNT; i++) {
      const fd = foamData[i];
      const wave = Math.sin(t * fd.speed + fd.phase);
      const active = Math.max(0, wave);
      fd.mat.opacity = active * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      {foamData.map((fd, i) => (
        <mesh
          key={i}
          position={[fd.x, 0.02, fd.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={fd.scale}
          geometry={foamGeo}
          material={fd.mat}
        />
      ))}
    </group>
  );
}
