import { useMemo } from 'react';
import * as THREE from 'three';

export function LowPolyBoat({
  color = '#a95638',
  deckColor = '#dfc38f',
  sail = false,
}: {
  color?: string;
  deckColor?: string;
  sail?: boolean;
}) {
  const hull = useMemo(() => createHullGeometry(), []);

  return (
    <group>
      <mesh geometry={hull} position={[0, 0.22, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={color} flatShading roughness={0.92} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.68, 0.05]} castShadow>
        <boxGeometry args={[1.35, 0.14, 2.75]} />
        <meshStandardMaterial color={deckColor} flatShading roughness={1} />
      </mesh>
      {[-0.72, 0, 0.72].map((z) => (
        <mesh key={z} position={[0, 0.86, z]} castShadow>
          <boxGeometry args={[1.2, 0.1, 0.15]} />
          <meshStandardMaterial color="#6f452a" flatShading roughness={1} />
        </mesh>
      ))}
      {sail && (
        <>
          <mesh position={[0, 2.0, 0]}>
            <cylinderGeometry args={[0.035, 0.05, 3.1, 6]} />
            <meshStandardMaterial color="#674229" flatShading roughness={1} />
          </mesh>
          <mesh position={[0.06, 2.15, 0.4]} rotation={[0, -0.18, 0]}>
            <planeGeometry args={[1.65, 2.35]} />
            <meshStandardMaterial color="#efe1bb" side={THREE.DoubleSide} flatShading roughness={1} />
          </mesh>
        </>
      )}
    </group>
  );
}

function createHullGeometry(): THREE.BufferGeometry {
  const vertices = new Float32Array([
    -0.82, 0.42, -1.45, 0.82, 0.42, -1.45, -0.42, -0.45, -1.18, 0.42, -0.45, -1.18,
    -0.68, 0.42, 1.25, 0.68, 0.42, 1.25, -0.28, -0.35, 1.62, 0.28, -0.35, 1.62,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex([
    0, 2, 4, 2, 6, 4,
    1, 5, 3, 3, 5, 7,
    0, 1, 2, 1, 3, 2,
    4, 6, 5, 5, 6, 7,
    2, 3, 6, 3, 7, 6,
  ]);
  geometry.computeVertexNormals();
  return geometry;
}
