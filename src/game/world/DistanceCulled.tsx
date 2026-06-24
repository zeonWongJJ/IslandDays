import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameRefs } from '../controllers/gameRefsContext.ts';

interface DistanceCulledProps {
  center: [number, number, number];
  radius?: number;
  children: ReactNode;
}

export function DistanceCulled({ center, radius = 95, children }: DistanceCulledProps) {
  const groupRef = useRef<THREE.Group>(null);
  const elapsedRef = useRef(0);
  const { playerRef } = useGameRefs();

  useFrame((_, delta) => {
    elapsedRef.current += delta;
    if (elapsedRef.current < 0.25) return;
    elapsedRef.current = 0;
    const group = groupRef.current;
    const player = playerRef.current;
    if (!group || !player) return;
    const dx = player.position.x - center[0];
    const dz = player.position.z - center[2];
    group.visible = dx * dx + dz * dz <= radius * radius;
  });

  return <group ref={groupRef}>{children}</group>;
}
