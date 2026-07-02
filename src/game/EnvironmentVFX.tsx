import { Fragment, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WORLD } from '../config/constants.ts';
import { MAP_LAYOUT } from '../config/mapLayout.ts';
import { seasonOf } from '../config/weather.ts';
import { useGameStore } from '../store/useGameStore.ts';
import { groundHeight } from '../systems/terrain.ts';

const SEASON_TERRAIN_TINT: Record<string, THREE.Color> = {
  spring: new THREE.Color(0.88, 1.0, 0.82),
  summer: new THREE.Color(1.0, 1.0, 0.92),
  fall: new THREE.Color(1.0, 0.88, 0.72),
  winter: new THREE.Color(1.08, 1.05, 1.15),
};

const CLOUD_ALPHA = 0.40;

const CLOUD_OFFSETS: [number, number, number][] = [
  [-50, 34, -40],
  [30, 30, -60],
  [-20, 38, 20],
  [55, 32, 40],
  [-60, 36, 50],
  [10, 28, -20],
  [70, 35, -30],
  [-40, 40, -10],
  [0, 32, 70],
  [-70, 37, -50],
];

export function EnvironmentVFX() {
  const day = useGameStore((s) => s.clock.day);
  const season = seasonOf(day);
  const tintColor = SEASON_TERRAIN_TINT[season] ?? SEASON_TERRAIN_TINT.summer;
  const size = WORLD.size + WORLD.waterBorder;

  return (
    <group>
      {Clouds()}
      <RiverMist />
      <ForestMist />
      <WaterfallMist />
      <mesh position={[0, 0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size * 2, size * 2]} />
        <meshBasicMaterial color={tintColor} transparent opacity={0.1} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Clouds() {
  const groupRef = useRef<THREE.Group>(null);
  const clouds = useMemo(() => {
    return CLOUD_OFFSETS.map(([x, y, z]) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      const count = 3 + Math.floor(Math.abs(Math.sin(x * 0.7 + z * 0.3)) * 4);
      for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(3 + Math.abs(Math.sin(x * i * 0.5)) * 5, 8, 6),
          new THREE.MeshBasicMaterial({ color: '#f8f4f0', transparent: true, opacity: CLOUD_ALPHA, depthWrite: false }),
        );
        const angle = (i / count) * Math.PI * 2 + x;
        const r = 4 + Math.abs(Math.sin(z * 0.5 + i)) * 6;
        mesh.position.set(Math.cos(angle) * r, Math.sin(angle * 0.7) * 1.2, Math.sin(angle) * r);
        mesh.scale.y = 0.35 + Math.abs(Math.sin(x + z + i)) * 0.25;
        g.add(mesh);
      }
      return g;
    });
  }, []);

  useFrame((_, dt) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        child.position.x += dt * (1.5 + i * 0.3) * 0.3;
        child.position.z += dt * 0.15;
        if (child.position.x > 100) child.position.x = -100;
        if (child.position.z > 100) child.position.z = -100;
      });
    }
  });

  return <group ref={groupRef}>{clouds.map((c, i) => <primitive key={i} object={c} />)}</group>;
}

interface MistPatch {
  x: number;
  z: number;
  y: number;
  sx: number;
  sz: number;
  phase: number;
  opacity: number;
  color: string;
}

interface MistBillboardPatch {
  x: number;
  z: number;
  y: number;
  width: number;
  height: number;
  phase: number;
  opacity: number;
  color: string;
}

function useMistTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    if (!context) return null;

    const gradient = context.createRadialGradient(64, 35, 2, 64, 35, 61);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
    gradient.addColorStop(0.34, 'rgba(255, 255, 255, 0.68)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    result.minFilter = THREE.LinearFilter;
    result.magFilter = THREE.LinearFilter;
    return result;
  }, []);

  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

function AnimatedMist({ patches, speed = 1 }: { patches: MistPatch[]; speed?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useMistTexture();
  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const t = state.clock.elapsedTime * speed;
    group.children.forEach((child, i) => {
      const patch = patches[i];
      child.position.x = patch.x + Math.sin(t * 0.13 + patch.phase) * 1.7;
      child.position.z = patch.z + Math.cos(t * 0.1 + patch.phase) * 0.95;
      child.position.y = patch.y + Math.sin(t * 0.22 + patch.phase) * 0.04;
      const pulse = 1 + Math.sin(t * 0.38 + patch.phase) * 0.1;
      child.scale.set(patch.sx * pulse, patch.sz * pulse, 1);
    });
  });

  return (
    <group ref={groupRef}>
      {patches.map((patch, i) => (
        <mesh key={i} position={[patch.x, patch.y, patch.z]} rotation={[-Math.PI / 2, 0, patch.phase]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={texture}
            color={patch.color}
            transparent
            opacity={patch.opacity}
            depthWrite={false}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function MistBillboards({ patches, speed = 1 }: { patches: MistBillboardPatch[]; speed?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useMistTexture();

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const t = state.clock.elapsedTime * speed;
    group.children.forEach((child, i) => {
      const patch = patches[i];
      child.position.x = patch.x + Math.sin(t * 0.12 + patch.phase) * 1.2;
      child.position.z = patch.z + Math.cos(t * 0.09 + patch.phase) * 0.7;
      child.position.y = patch.y + Math.sin(t * 0.2 + patch.phase) * 0.12;
      const breathe = 1 + Math.sin(t * 0.27 + patch.phase) * 0.08;
      child.scale.set(patch.width * breathe, patch.height * breathe, 1);
    });
  });

  if (!texture) return null;
  return (
    <group ref={groupRef}>
      {patches.map((patch, i) => (
        <sprite
          key={i}
          position={[patch.x, patch.y, patch.z]}
          scale={[patch.width, patch.height, 1]}
          renderOrder={4}
        >
          <spriteMaterial
            map={texture}
            color={patch.color}
            transparent
            opacity={patch.opacity}
            depthWrite={false}
            depthTest
            fog={false}
          />
        </sprite>
      ))}
    </group>
  );
}

function RiverMist() {
  const patches = useMemo<MistPatch[]>(() => {
    const riverX = -16;
    return Array.from({ length: 20 }, (_, i) => {
      const t = i / 19;
      const z = -92 + t * 184;
      const x = riverX + Math.sin(t * Math.PI * 4) * 7 + Math.sin(i * 1.9) * 2;
      return {
        x,
        z,
        y: 0.26 + (i % 3) * 0.08,
        sx: 8 + Math.abs(Math.sin(i * 2.1)) * 8,
        sz: 3.5 + Math.abs(Math.cos(i * 1.7)) * 4.5,
        phase: i * 0.73,
        opacity: 0.1,
        color: '#e6efe7',
      };
    });
  }, []);
  const billboards = useMemo<MistBillboardPatch[]>(() => {
    return Array.from({ length: 10 }, (_, i) => {
      const t = i / 9;
      const z = -86 + t * 172;
      const x = -16 + Math.sin(t * Math.PI * 4) * 7 + Math.sin(i * 2.4) * 1.7;
      return {
        x,
        z,
        y: 1.35 + (i % 4) * 0.22,
        width: 10 + Math.abs(Math.sin(i * 1.7)) * 7,
        height: 2.2 + Math.abs(Math.cos(i * 1.3)) * 1.6,
        phase: i * 0.81,
        opacity: 0.08,
        color: '#eaf3ee',
      };
    });
  }, []);
  return (
    <Fragment>
      <AnimatedMist patches={patches} />
      <MistBillboards patches={billboards} speed={0.8} />
    </Fragment>
  );
}

function ForestMist() {
  const patches = useMemo<MistPatch[]>(() => {
    const center = MAP_LAYOUT.zones.westForest.center;
    return Array.from({ length: 18 }, (_, i) => {
      const a = i * 2.399;
      const r = 4 + Math.sqrt(i + 1) * 4.6;
      return {
        x: center[0] + Math.cos(a) * r,
        z: center[2] + Math.sin(a) * r,
        y: 0.68 + (i % 4) * 0.1,
        sx: 9 + Math.abs(Math.sin(i * 1.3)) * 10,
        sz: 5 + Math.abs(Math.cos(i * 0.9)) * 7,
        phase: i * 0.91,
        opacity: 0.15,
        color: '#d7e5d1',
      };
    });
  }, []);
  const billboards = useMemo<MistBillboardPatch[]>(() => {
    const center = MAP_LAYOUT.zones.westForest.center;
    return Array.from({ length: 14 }, (_, i) => {
      const a = i * 2.399;
      const r = 7 + Math.sqrt(i + 1) * 5.2;
      const x = center[0] + Math.cos(a) * r;
      const z = center[2] + Math.sin(a) * r;
      const height = 4.2 + Math.abs(Math.sin(i * 1.4)) * 3.2;
      return {
        x,
        z,
        y: groundHeight(x, z) + height * 0.42,
        width: 15 + Math.abs(Math.cos(i * 1.1)) * 13,
        height,
        phase: i * 1.03,
        opacity: 0.17,
        color: '#dce9d8',
      };
    });
  }, []);
  return (
    <Fragment>
      <AnimatedMist patches={patches} speed={0.72} />
      <MistBillboards patches={billboards} speed={0.58} />
    </Fragment>
  );
}

function WaterfallMist() {
  const patches = useMemo<MistPatch[]>(() => {
    const pool = MAP_LAYOUT.waterfall.pool;
    return Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2;
      const r = 1.2 + (i % 3) * 0.9;
      return {
        x: pool[0] + Math.cos(a) * r,
        z: pool[2] + Math.sin(a) * r,
        y: 0.38 + (i % 2) * 0.12,
        sx: 2.8 + (i % 3) * 1.1,
        sz: 1.7 + (i % 2) * 0.8,
        phase: i * 1.17,
        opacity: 0.1,
        color: '#eef8f8',
      };
    });
  }, []);
  const billboards = useMemo<MistBillboardPatch[]>(() => {
    const pool = MAP_LAYOUT.waterfall.pool;
    return Array.from({ length: 4 }, (_, i) => {
      const a = (i / 4) * Math.PI * 2;
      const r = 0.8 + (i % 2) * 0.7;
      const height = 1.2 + (i % 2) * 0.45;
      return {
        x: pool[0] + Math.cos(a) * r,
        z: pool[2] + Math.sin(a) * r,
        y: 0.55 + height * 0.3,
        width: 2.4 + (i % 2) * 1.1,
        height,
        phase: i * 1.21,
        opacity: 0.08,
        color: '#f2fbff',
      };
    });
  }, []);
  return (
    <Fragment>
      <AnimatedMist patches={patches} speed={1.2} />
      <MistBillboards patches={billboards} speed={1.15} />
    </Fragment>
  );
}
