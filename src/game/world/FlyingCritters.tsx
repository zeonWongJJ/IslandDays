import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MAP_LAYOUT } from '../../config/mapLayout.ts';

const BUTTERFLY_COUNT = 20;
const SEAGULL_COUNT = 6;

interface Butterfly {
  origin: [number, number, number];
  phase: number;
  speed: number;
  radius: number;
  color: string;
}
interface Seagull {
  origin: [number, number, number];
  phase: number;
  speed: number;
  radius: number;
}

function makeButterflyTex(color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = color;
  // two wings shape
  ctx.beginPath();
  ctx.ellipse(6, 4, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(10, 4, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSeagullTex() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, 32, 16);
  ctx.fillStyle = '#ffffff';
  // V shape wings
  ctx.beginPath();
  ctx.moveTo(16, 2);
  ctx.lineTo(0, 14);
  ctx.lineTo(10, 12);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(16, 2);
  ctx.lineTo(32, 14);
  ctx.lineTo(22, 12);
  ctx.closePath();
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const COLORS = ['#e8a040', '#d06050', '#c080e0', '#60b0d0', '#d0c040'];
const BUTTERFLIES: Butterfly[] = [];
for (let i = 0; i < BUTTERFLY_COUNT; i++) {
  const cx = MAP_LAYOUT.home.pos[0] + (Math.random() - 0.5) * 20;
  const cz = MAP_LAYOUT.home.pos[2] + (Math.random() - 0.5) * 20;
  BUTTERFLIES.push({
    origin: [cx, 0.6, cz],
    phase: Math.random() * Math.PI * 2,
    speed: 0.4 + Math.random() * 0.5,
    radius: 3 + Math.random() * 5,
    color: COLORS[i % COLORS.length],
  });
}

const SEAGULLS: Seagull[] = [];
for (let i = 0; i < SEAGULL_COUNT; i++) {
  const angle = (i / SEAGULL_COUNT) * Math.PI * 2 + Math.random() * 0.3;
  const r = 55 + Math.random() * 20;
  SEAGULLS.push({
    origin: [Math.cos(angle) * r, 6 + Math.random() * 4, Math.sin(angle) * r],
    phase: Math.random() * Math.PI * 2,
    speed: 0.3 + Math.random() * 0.2,
    radius: 10 + Math.random() * 15,
  });
}

const seagullTex = makeSeagullTex();

function ButterflySprite({ bf }: { bf: Butterfly }) {
  const ref = useRef<THREE.Sprite>(null);
  const tex = useMemo(() => makeButterflyTex(bf.color), [bf.color]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const sp = ref.current;
    if (!sp) return;
    const s = bf.speed;
    const ph = bf.phase;
    const r = bf.radius;
    const x = bf.origin[0] + Math.sin(t * s * 0.7 + ph) * r * 0.6;
    const z = bf.origin[2] + Math.cos(t * s * 0.5 + ph * 1.3) * r * 0.5;
    const y = bf.origin[1] + Math.sin(t * s * 1.2 + ph * 0.9) * 0.5 + 0.3;
    sp.position.set(x, y, z);
    const flap = 0.8 + Math.abs(Math.sin(t * 6 + ph)) * 0.4;
    sp.scale.set(0.4 * flap, 0.3, 1);
  });

  return (
    <sprite ref={ref} scale={[0.4, 0.3, 1]} renderOrder={3}>
      <spriteMaterial map={tex} transparent depthWrite={false} />
    </sprite>
  );
}

function SeagullSprite({ sg }: { sg: Seagull }) {
  const ref = useRef<THREE.Sprite>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const sp = ref.current;
    if (!sp) return;
    const angle = t * sg.speed + sg.phase;
    const r = sg.radius;
    const cx = sg.origin[0];
    const cz = sg.origin[2];
    const x = cx + Math.cos(angle) * r;
    const z = cz + Math.sin(angle) * r;
    const y = sg.origin[1] + Math.sin(angle * 2) * 1.5;
    sp.position.set(x, y, z);
    const flap = 0.6 + Math.abs(Math.sin(t * 3 + sg.phase)) * 0.5;
    sp.scale.set(1.2 * flap, 0.5, 0);
  });

  return (
    <sprite ref={ref} scale={[1.2, 0.5, 0]} renderOrder={3}>
      <spriteMaterial map={seagullTex} transparent depthWrite={false} />
    </sprite>
  );
}

export function FlyingCritters() {
  return (
    <group>
      {BUTTERFLIES.map((bf, i) => <ButterflySprite key={`bf-${i}`} bf={bf} />)}
      {SEAGULLS.map((sg, i) => <SeagullSprite key={`sg-${i}`} sg={sg} />)}
    </group>
  );
}
