import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore.ts';

const FIREFLY_COUNT = 80;
const SPREAD = 60;
const CENTER_Y = 1.2;

function makeFireflies() {
  const positions = new Float32Array(FIREFLY_COUNT * 3);
  const phases = new Float32Array(FIREFLY_COUNT);
  const speeds = new Float32Array(FIREFLY_COUNT);
  const offsets = new Float32Array(FIREFLY_COUNT);
  for (let i = 0; i < FIREFLY_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 8 + Math.random() * SPREAD;
    positions[i * 3] = Math.cos(angle) * r;
    positions[i * 3 + 1] = CENTER_Y + (Math.random() - 0.5) * 1.6;
    positions[i * 3 + 2] = Math.sin(angle) * r;
    phases[i] = Math.random() * Math.PI * 2;
    speeds[i] = 0.3 + Math.random() * 0.5;
    offsets[i] = Math.random() * 100;
  }
  return { positions, phases, speeds, offsets };
}

const data = makeFireflies();

const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255,255,200,1)');
  gradient.addColorStop(0.15, 'rgba(200,255,150,0.7)');
  gradient.addColorStop(0.5, 'rgba(180,255,100,0.15)');
  gradient.addColorStop(1, 'rgba(180,255,100,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(canvas);
}

const pointTex = glowTexture();

export function AmbientFX() {
  const pointsRef = useRef<THREE.Points>(null);
  const time = useRef(0);

  useFrame((state) => {
    time.current += state.clock.getDelta();
    const hour = useGameStore.getState().clock.minutes / 60;
    const isNight = hour < 5 || hour > 19.5;
    const fade = THREE.MathUtils.clamp(isNight ? 1 : (hour > 19 ? (hour - 19) * 2 : (5 - hour) * 2), 0, 1);

    const mat = pointsRef.current?.material as THREE.PointsMaterial | undefined;
    if (mat) {
      mat.opacity = fade * 0.7;
    }

    if (!pointsRef.current) return;
    const pos = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const t = time.current;
    for (let i = 0; i < FIREFLY_COUNT; i++) {
      const phase = data.phases[i];
      const speed = data.speeds[i];
      const off = data.offsets[i];
      const idx = i * 3;
      const angle = t * speed * 0.08 + phase;
      const driftX = Math.sin(angle + off * 0.1) * 0.5;
      const driftZ = Math.cos(angle * 0.7 + off * 0.15) * 0.5;
      const driftY = Math.sin(t * speed * 0.12 + phase * 2) * 0.3;
      const baseX = data.positions[idx];
      const baseY = data.positions[idx + 1];
      const baseZ = data.positions[idx + 2];
      arr[idx] = baseX + driftX;
      arr[idx + 1] = baseY + driftY;
      arr[idx + 2] = baseZ + driftZ;
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geo}>
      <pointsMaterial
        map={pointTex}
        size={0.5}
        sizeAttenuation
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color="#c8ff80"
      />
    </points>
  );
}
