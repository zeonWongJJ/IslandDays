import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore.ts';

const RAY_COUNT = 5;
const RAY_SPREAD = 40;

interface GodRay {
  x: number; z: number; w: number; h: number; phase: number; speed: number;
}
const rays: GodRay[] = [];
for (let i = 0; i < RAY_COUNT; i++) {
  const angle = Math.random() * Math.PI * 2;
  const r = 10 + Math.random() * RAY_SPREAD;
  rays.push({
    x: Math.cos(angle) * r,
    z: Math.sin(angle) * r,
    w: 3 + Math.random() * 5,
    h: 12 + Math.random() * 10,
    phase: Math.random() * 10,
    speed: 0.15 + Math.random() * 0.2,
  });
}

const rayGeo = new THREE.ConeGeometry(1, 1, 4, 1, true);
const rayMat = new THREE.MeshBasicMaterial({
  color: '#fffbe8',
  transparent: true,
  opacity: 0.06,
  depthWrite: false,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
});

export function GodRays() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const hour = useGameStore.getState().clock.minutes / 60;
    const isDay = hour > 6 && hour < 18;
    const isLowSun = hour > 6 && hour < 9 || hour > 16 && hour < 18;
    const baseOpacity = isDay ? (isLowSun ? 0.08 : 0.04) : 0;

    if (groupRef.current) {
      groupRef.current.visible = baseOpacity > 0;
      if (!groupRef.current.visible) return;
    }

    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      const ray = rays[i];
      if (!ray) return;
      const breathe = Math.sin(t * ray.speed + ray.phase) * 0.5 + 0.5;
      child.position.set(ray.x, ray.h * 0.5, ray.z);
      child.scale.set(ray.w * (0.7 + breathe * 0.3), ray.h, ray.w * (0.7 + breathe * 0.3));
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity = baseOpacity * (0.5 + breathe * 0.5);
    });
  });

  return (
    <group ref={groupRef}>
      {rays.map((_, i) => (
        <mesh key={i} geometry={rayGeo} material={rayMat} />
      ))}
    </group>
  );
}
