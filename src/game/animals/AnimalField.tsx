import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { ANIMALS, animalPositionAt, type AnimalDef } from '../../config/animals.ts';
import { useGameStore } from '../../store/useGameStore.ts';
import { groundHeight } from '../../systems/terrain.ts';
import { useGameTimeRef } from '../useGameTimeRef.ts';
import { KenneyAnimal } from '../world/KenneyCharacters.tsx';

export function AnimalField() {
  const scene = useGameStore((s) => s.scene);
  if (scene !== 'island') return null;

  return (
    <group>
      {ANIMALS.map((animal) => (
        <Animal key={animal.id} animal={animal} />
      ))}
    </group>
  );
}

function Animal({ animal }: { animal: AnimalDef }) {
  const groupRef = useRef<THREE.Group>(null);
  const gameTimeRef = useGameTimeRef();

  useFrame(() => {
    const t = gameTimeRef.current;
    const pos = animalPositionAt(animal, t);
    const ahead = animalPositionAt(animal, t + 0.2);
    const x = pos[0], z = pos[2];
    const y = groundHeight(x, z);
    const yaw = Math.atan2(ahead[0] - x, ahead[2] - z);
    const bob = Math.abs(Math.sin(t * 4.5 + animal.offsetMinutes)) * 0.035;
    const roll = Math.sin(t * 4.5 + animal.offsetMinutes) * 0.035;
    if (groupRef.current) {
      groupRef.current.position.set(x, y + bob, z);
      groupRef.current.rotation.set(0, yaw, roll);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.42, 18]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.18} />
      </mesh>
      <KenneyAnimal kind={animal.kind} />
    </group>
  );
}
