import { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore.ts';
import { groundHeight } from '../../systems/terrain.ts';

const holeGeo = new THREE.CircleGeometry(0.3, 12);
const sproutGeo = new THREE.ConeGeometry(0.15, 0.3, 6);
const trunkGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.6, 6);
const saplingCrownGeo = new THREE.ConeGeometry(0.25, 0.4, 6);
const grownTrunkGeo = new THREE.CylinderGeometry(0.1, 0.15, 0.8, 6);
const grownCrownGeo = new THREE.IcosahedronGeometry(0.5, 1);

const dirtMat = new THREE.MeshStandardMaterial({ color: '#6a4a2a', flatShading: true, roughness: 1 });
const sproutMat = new THREE.MeshStandardMaterial({ color: '#5aaa3a', flatShading: true, roughness: 0.9 });
const trunkMat = new THREE.MeshStandardMaterial({ color: '#8a6a3a', flatShading: true, roughness: 0.9 });
const leafMat = new THREE.MeshStandardMaterial({ color: '#4a9a3a', flatShading: true, roughness: 0.9 });
const flowerMat = new THREE.MeshStandardMaterial({ color: '#d66ba8', flatShading: true, roughness: 0.7 });

export function PlantedField() {
  const plants = useGameStore((s) => s.plants);
  return (
    <group>
      {plants.map((p) => (
        <PlantedPlant key={p.id} pos={p.pos} stage={p.stage} itemId={p.itemId} />
      ))}
    </group>
  );
}

function PlantedPlant({ pos, stage, itemId }: { pos: [number, number, number]; stage: number; itemId: string }) {
  const [x, , z] = pos;
  const y = useMemo(() => groundHeight(x, z), [x, z]);
  const isFlower = itemId === 'flower_seed';

  if (stage === -1) {
    return (
      <group position={[x, y + 0.01, z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={holeGeo} material={dirtMat} />
      </group>
    );
  }

  if (stage === 0) {
    const mat = isFlower ? flowerMat : sproutMat;
    return (
      <group position={[x, y, z]}>
        <mesh position={[0, 0.15, 0]} geometry={sproutGeo} material={mat} />
      </group>
    );
  }

  if (stage === 1) {
    const crownMat = isFlower ? flowerMat : leafMat;
    return (
      <group position={[x, y, z]}>
        <mesh position={[0, 0.3, 0]} geometry={trunkGeo} material={trunkMat} />
        <mesh position={[0, 0.7, 0]} geometry={saplingCrownGeo} material={crownMat} />
      </group>
    );
  }

  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.4, 0]} geometry={grownTrunkGeo} material={trunkMat} />
      <mesh position={[0, 1.0, 0]} geometry={grownCrownGeo} material={leafMat} />
    </group>
  );
}
