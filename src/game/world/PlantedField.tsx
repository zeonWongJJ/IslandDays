import { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore.ts';
import { groundHeight } from '../../systems/terrain.ts';

const holeGeo = new THREE.CircleGeometry(0.3, 12);
const sproutGeo = new THREE.ConeGeometry(0.15, 0.3, 6);
const trunkGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.6, 6);
const saplingCrownGeo = new THREE.ConeGeometry(0.25, 0.4, 6);
const grownTrunkGeo = new THREE.CylinderGeometry(0.1, 0.15, 0.8, 6);

const dirtMat = new THREE.MeshStandardMaterial({ color: '#6a4a2a', flatShading: true, roughness: 1 });
const sproutMat = new THREE.MeshStandardMaterial({ color: '#5aaa3a', flatShading: true, roughness: 0.9 });
const trunkMat = new THREE.MeshStandardMaterial({ color: '#8a6a3a', flatShading: true, roughness: 0.9 });
const leafMat = new THREE.MeshStandardMaterial({ color: '#4a9a3a', flatShading: true, roughness: 0.9 });
const flowerMat = new THREE.MeshStandardMaterial({ color: '#d66ba8', flatShading: true, roughness: 0.7 });
const wateredTint = new THREE.MeshStandardMaterial({ color: '#4499dd', flatShading: true, roughness: 0.3, transparent: true, opacity: 0.4 });

const CROP_COLORS: Record<string, string> = {
  tomato_seed: '#cc4444',
  carrot_seed: '#ee8833',
  wheat_seed: '#ddcc66',
};
const CROP_GEO: Record<string, THREE.BufferGeometry> = {
  tomato_seed: new THREE.SphereGeometry(0.2, 6, 6),
  carrot_seed: new THREE.ConeGeometry(0.12, 0.35, 6),
  wheat_seed: new THREE.CylinderGeometry(0.08, 0.04, 0.45, 6),
};

export function PlantedField() {
  const plants = useGameStore((s) => s.plants);
  return (
    <group>
      {plants.map((p) => (
        <PlantedPlant key={p.id} pos={p.pos} stage={p.stage} itemId={p.itemId} wateredToday={p.wateredToday} />
      ))}
    </group>
  );
}

function PlantedPlant({ pos, stage, itemId, wateredToday }: { pos: [number, number, number]; stage: number; itemId: string; wateredToday: boolean }) {
  const [x, , z] = pos;
  const y = useMemo(() => groundHeight(x, z), [x, z]);
  const isFlower = itemId === 'flower_seed';
  const isCrop = itemId === 'tomato_seed' || itemId === 'carrot_seed' || itemId === 'wheat_seed';

  if (stage === -1) {
    return (
      <group position={[x, y + 0.01, z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={holeGeo} material={dirtMat} />
      </group>
    );
  }

  if (stage === 0) {
    const mat = isFlower ? flowerMat : isCrop ? new THREE.MeshStandardMaterial({ color: CROP_COLORS[itemId] ?? '#5aaa3a', flatShading: true, roughness: 0.9 }) : sproutMat;
    const geo = isCrop ? (CROP_GEO[itemId] ?? sproutGeo) : sproutGeo;
    return (
      <group position={[x, y, z]}>
        <mesh position={[0, 0.15, 0]} geometry={geo} material={mat} />
        {wateredToday && <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={new THREE.CircleGeometry(0.2, 8)} material={wateredTint} />}
      </group>
    );
  }

  if (stage === 1) {
    const crownMat = isFlower ? flowerMat : isCrop ? new THREE.MeshStandardMaterial({ color: CROP_COLORS[itemId] ?? leafMat.color, flatShading: true, roughness: 0.9 }) : leafMat;
    return (
      <group position={[x, y, z]}>
        <mesh position={[0, 0.3, 0]} geometry={trunkGeo} material={trunkMat} />
        <mesh position={[0, 0.7, 0]} geometry={saplingCrownGeo} material={crownMat} />
        {wateredToday && <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={new THREE.CircleGeometry(0.25, 8)} material={wateredTint} />}
      </group>
    );
  }

  // stage 2: grown
  const grownCrownMat = isFlower ? flowerMat : isCrop ? new THREE.MeshStandardMaterial({ color: CROP_COLORS[itemId] ?? '#4a9a3a', flatShading: true, roughness: 0.9 }) : leafMat;
  const grownCrownGeo2 = isCrop ? new THREE.SphereGeometry(0.4, 6, 6) : new THREE.IcosahedronGeometry(0.5, 1);
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.4, 0]} geometry={grownTrunkGeo} material={trunkMat} />
      <mesh position={[0, 1.0, 0]} geometry={grownCrownGeo2} material={grownCrownMat} />
      <mesh position={[0, 0.85, 0.25]} geometry={new THREE.SphereGeometry(0.12, 4, 4)} material={new THREE.MeshStandardMaterial({ color: '#ffff44', flatShading: true })} />
    </group>
  );
}
