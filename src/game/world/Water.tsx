import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WORLD } from '../../config/constants.ts';

export function Water() {
  const meshRef = useRef<THREE.Mesh>(null);
  const geoRef = useRef<THREE.BufferGeometry>(null);
  const foamRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  const size = WORLD.size + WORLD.waterBorder * 2 + 20;
  const seg = 100;
  const halfSize = WORLD.size / 2;
  const waterEdge = halfSize + WORLD.waterBorder * 0.3;

  useFrame((_, delta) => {
    const geo = geoRef.current;
    if (!geo) return;
    timeRef.current += delta * 0.8;
    const t = timeRef.current;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < pos.count; i++) {
      const i3 = i * 3;
      const x = arr[i3];
      const y = arr[i3 + 1];
      const dist = Math.sqrt(x * x + y * y);
      const islandEdge = waterEdge;
      const amp = THREE.MathUtils.clamp((dist - islandEdge) / 20, 0.04, 0.3);
      const wave =
        Math.sin(x * 0.15 + t * 1.2) * 0.3 +
        Math.sin(y * 0.12 + t * 0.9 + 1.5) * 0.25 +
        Math.sin((x + y) * 0.08 + t * 1.8) * 0.2;
      arr[i3 + 2] = -wave * amp;
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    // shore foam ring: subtle opacity pulse
    if (foamRef.current) {
      const mat = foamRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.15 + Math.sin(t * 0.6) * 0.05;
    }
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.4, 0]}
        receiveShadow
      >
        <planeGeometry ref={geoRef} args={[size, size, seg, seg]} />
        <meshPhysicalMaterial
          color="#3a9ac8"
          transparent
          opacity={0.55}
          roughness={0.15}
          metalness={0.2}
          envMapIntensity={0.6}
          clearcoat={0.3}
          clearcoatRoughness={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* shore foam ring */}
      <mesh
        ref={foamRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.2, 0]}
      >
        <ringGeometry args={[halfSize - 2, halfSize + 4, 64]} />
        <meshBasicMaterial
          color="#d0eaf0"
          transparent
          opacity={0.15}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
