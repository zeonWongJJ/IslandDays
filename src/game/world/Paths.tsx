import { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore.ts';
import { groundHeight } from '../../systems/terrain.ts';

const PATH_COLORS: Record<string, string> = {
  stone: '#8a8a8a',
  brick: '#b84a3a',
  wood: '#c0906a',
  dirt: '#8a7a5a',
};

const pathGeo = new THREE.PlaneGeometry(0.92, 0.92);

const sharedMats: Record<string, THREE.MeshStandardMaterial> = {};

function getMat(type: string): THREE.MeshStandardMaterial {
  if (!sharedMats[type]) {
    sharedMats[type] = new THREE.MeshStandardMaterial({
      color: PATH_COLORS[type] ?? '#888',
      flatShading: true,
      roughness: 0.9,
      metalness: 0,
    });
  }
  return sharedMats[type];
}

export function Paths() {
  const paths = useGameStore((s) => s.paths);

  const meshes = useMemo(() => {
    return paths.map((p) => {
      const [x, , z] = p.pos;
      const y = groundHeight(x, z);
      return (
        <mesh
          key={p.id}
          position={[x, y + 0.04, z]}
          rotation={[-Math.PI / 2, 0, 0]}
          geometry={pathGeo}
          material={getMat(p.type)}
          receiveShadow
        />
      );
    });
  }, [paths]);

  return <group>{meshes}</group>;
}
