import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const CLOUD_SHADOW_COUNT = 6;
const HALF = 100;

interface CloudShadow {
  x: number; z: number; w: number; d: number; speed: number; angle: number; phase: number;
}
const cloudShadows: CloudShadow[] = [];
for (let i = 0; i < CLOUD_SHADOW_COUNT; i++) {
  cloudShadows.push({
    x: (Math.random() - 0.5) * HALF * 2,
    z: (Math.random() - 0.5) * HALF * 2,
    w: 25 + Math.random() * 40,
    d: 15 + Math.random() * 25,
    speed: 2 + Math.random() * 3,
    angle: Math.random() * Math.PI * 2,
    phase: Math.random() * 100,
  });
}

const tex = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(0.4, 'rgba(0,0,0,0.5)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
})();

export function CloudShadows() {
  const meshesRef = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < CLOUD_SHADOW_COUNT; i++) {
      const mesh = meshesRef.current[i];
      if (!mesh) continue;
      const cs = cloudShadows[i];
      const dx = Math.cos(cs.angle) * (t * cs.speed + cs.phase);
      const dz = Math.sin(cs.angle) * (t * cs.speed * 0.6 + cs.phase);
      const x = ((cs.x + dx) % (HALF * 2) + HALF * 2) % (HALF * 2) - HALF;
      const z = ((cs.z + dz) % (HALF * 2) + HALF * 2) % (HALF * 2) - HALF;
      mesh.position.set(x, 10, z);
    }
  });

  return (
    <group>
      {cloudShadows.map((cs, i) => (
        <mesh
          key={i}
          ref={(el) => { meshesRef.current[i] = el; }}
          position={[cs.x, 10, cs.z]}
          rotation={[-Math.PI / 2, 0, cs.angle]}
        >
          <planeGeometry args={[cs.w, cs.d]} />
          <meshBasicMaterial
            map={tex}
            transparent
            opacity={0.3}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
