import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WORLD } from '../../config/constants.ts';

export function Water() {
  const meshRef = useRef<THREE.Mesh>(null);
  const geoRef = useRef<THREE.BufferGeometry>(null);
  const timeRef = useRef(0);

  const size = WORLD.size + WORLD.waterBorder * 2 + 20;
  const seg = 100;

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
      const y = arr[i3 + 1]; // local Y = world -Z after mesh rotation
      const dist = Math.sqrt(x * x + y * y);
      const islandEdge = WORLD.size / 2 + WORLD.waterBorder * 0.3;
      const amp = THREE.MathUtils.clamp((dist - islandEdge) / 20, 0.04, 0.3);
      const wave =
        Math.sin(x * 0.15 + t * 1.2) * 0.3 +
        Math.sin(y * 0.12 + t * 0.9 + 1.5) * 0.25 +
        Math.sin((x + y) * 0.08 + t * 1.8) * 0.2;
      // local Z → world Y after rotateX(-PI/2); negate so crest goes up
      arr[i3 + 2] = -wave * amp;
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -1.4, 0]}
      receiveShadow
    >
      <planeGeometry ref={geoRef} args={[size, size, seg, seg]} />
      <meshStandardMaterial
        color="#3a72a8"
        transparent
        opacity={0.5}
        roughness={0.1}
        metalness={0.15}
      />
    </mesh>
  );
}
