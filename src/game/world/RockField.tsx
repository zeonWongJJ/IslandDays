import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore.ts';
import { groundHeight } from '../../systems/terrain.ts';
import { useGameRefs } from '../controllers/gameRefsContext.ts';
import { KenneyRock } from './KenneyModels.tsx';

const CULL_RADIUS = 95;
const CULL_RADIUS_SQ = CULL_RADIUS * CULL_RADIUS;

export function RockField() {
  const rocks = useGameStore((s) => s.rocks);
  const groupRef = useRef<THREE.Group>(null);
  const checkRef = useRef(0);
  const { playerRef } = useGameRefs();

  useFrame((_, delta) => {
    const group = groupRef.current;
    const player = playerRef.current;
    if (!group || !player) return;
    checkRef.current += delta;
    if (checkRef.current < 0.3) return;
    checkRef.current = 0;
    const px = player.position.x;
    const pz = player.position.z;
    for (let i = 0; i < group.children.length; i++) {
      const child = group.children[i];
      const dx = child.position.x - px;
      const dz = child.position.z - pz;
      child.visible = dx * dx + dz * dz <= CULL_RADIUS_SQ;
    }
  });

  return (
    <group ref={groupRef}>
      {rocks.map((r, index) => (
        <Rock key={r.id} pos={r.pos} depleted={r.state === 'depleted'} variant={index} />
      ))}
    </group>
  );
}

function Rock({ pos, depleted, variant }: { pos: number[]; depleted: boolean; variant: number }) {
  const y = groundHeight(pos[0], pos[2]);
  const rotationY = ((variant * 1.73) % 1) * Math.PI * 2;
  const scaleX = depleted ? 0.72 : 0.9 + ((variant * 17) % 5) * 0.04;
  const scaleY = depleted ? 0.72 : 0.9 + ((variant * 11) % 4) * 0.05;
  const scaleZ = depleted ? 0.72 : 0.92 + ((variant * 7) % 5) * 0.035;
  return (
    <group position={[pos[0], y, pos[2]]} rotation={[0, rotationY, 0]} scale={[scaleX, scaleY, scaleZ]}>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.72, 16]} />
        <meshBasicMaterial color="#2e2b24" transparent opacity={0.15} depthWrite={false} />
      </mesh>
      <KenneyRock variant={variant} />
      {depleted && (
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.55, 14]} />
          <meshBasicMaterial color="#4a3a2a" transparent opacity={0.22} />
        </mesh>
      )}
    </group>
  );
}
