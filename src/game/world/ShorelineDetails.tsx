import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WORLD } from '../../config/constants.ts';
import { groundHeight, groundKind, riverAmount } from '../../systems/terrain.ts';
import { acceptsShoreDecoration } from '../../systems/placement.ts';
import { useGameRefs } from '../controllers/gameRefsContext.ts';

interface Patch {
  x: number;
  z: number;
  sx: number;
  sz: number;
  rot: number;
}

interface Reed {
  x: number;
  z: number;
  s: number;
  rot: number;
  phase: number;
}

interface Pebble {
  x: number;
  z: number;
  s: number;
  rot: number;
}

interface Chunk<T> {
  id: string;
  center: [number, number, number];
  items: T[];
}

const SHORE_CHUNK_SIZE = 26;
const SHORE_VISIBLE_RADIUS = 58;

function chunkByGrid<T extends { x: number; z: number }>(items: T[], chunkSize: number): Chunk<T>[] {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const gx = Math.floor(item.x / chunkSize);
    const gz = Math.floor(item.z / chunkSize);
    const key = `${gx}:${gz}`;
    const bucket = grouped.get(key);
    if (bucket) bucket.push(item);
    else grouped.set(key, [item]);
  }
  return Array.from(grouped, ([id, bucket]) => {
    let sx = 0;
    let sz = 0;
    bucket.forEach((item) => {
      sx += item.x;
      sz += item.z;
    });
    return { id, center: [sx / bucket.length, 0, sz / bucket.length], items: bucket };
  });
}

function makeRng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

function isNearWaterEdge(x: number, z: number): boolean {
  if (!acceptsShoreDecoration(x, z)) return false;
  const river = riverAmount(x, z);
  if (river > 0.24 && river < 0.52) return true;
  const waterNeighbor =
    groundKind(x + 1.4, z) === 'water' ||
    groundKind(x - 1.4, z) === 'water' ||
    groundKind(x, z + 1.4) === 'water' ||
    groundKind(x, z - 1.4) === 'water';
  return waterNeighbor;
}

function riverEdgeStrength(x: number, z: number): number {
  if (!acceptsShoreDecoration(x, z)) return 0;
  const river = riverAmount(x, z);
  if (river <= 0.12 || river >= 0.56) return 0;
  const edge = 1 - Math.abs(river - 0.32) / 0.22;
  return THREE.MathUtils.clamp(edge, 0, 1);
}

export function ShorelineDetails() {
  const riverMudRef = useRef<THREE.InstancedMesh>(null);
  const wetRef = useRef<THREE.InstancedMesh>(null);
  const foamRef = useRef<THREE.InstancedMesh>(null);
  const pebbleRef = useRef<THREE.InstancedMesh>(null);

  const { riverMudPatches, wetPatches, foamPatches, reeds, pebbles } = useMemo(() => {
    const rng = makeRng(20240623);
    const half = WORLD.size / 2;
    const riverMudPatches: Patch[] = [];
    const wetPatches: Patch[] = [];
    const foamPatches: Patch[] = [];
    const reeds: Reed[] = [];
    const pebbles: Pebble[] = [];

    for (let i = 0; i < 3800; i++) {
      const x = (rng() * 2 - 1) * half * 0.98;
      const z = (rng() * 2 - 1) * half * 0.98;
      if (!isNearWaterEdge(x, z)) continue;
      const h = groundHeight(x, z);
      const riverEdge = riverEdgeStrength(x, z);

      if (riverEdge > 0 && rng() < 0.78) {
        const dx = riverAmount(x + 1.4, z) - riverAmount(x - 1.4, z);
        const dz = riverAmount(x, z + 1.4) - riverAmount(x, z - 1.4);
        riverMudPatches.push({
          x: x + (rng() - 0.5) * 0.45,
          z: z + (rng() - 0.5) * 0.45,
          sx: 0.95 + riverEdge * 1.4 + rng() * 0.9,
          sz: 0.18 + riverEdge * 0.34 + rng() * 0.18,
          rot: Math.atan2(-dx, dz) + (rng() - 0.5) * 0.65,
        });
      }

      if (rng() > 0.34) {
        wetPatches.push({
          x,
          z,
          sx: 0.7 + rng() * 1.5 + riverEdge * 0.65,
          sz: 0.22 + rng() * 0.65 + riverEdge * 0.14,
          rot: rng() * Math.PI,
        });
      }
      if (rng() > (riverEdge > 0 ? 0.62 : 0.76)) {
        foamPatches.push({
          x: x + (rng() - 0.5) * 0.5,
          z: z + (rng() - 0.5) * 0.5,
          sx: 0.35 + rng() * 1.0 + riverEdge * 0.45,
          sz: 0.045 + rng() * 0.12,
          rot: rng() * Math.PI,
        });
      }
      if (rng() > (riverEdge > 0 ? 0.54 : 0.68) && h > -0.75) {
        reeds.push({
          x: x + (rng() - 0.5) * 0.8,
          z: z + (rng() - 0.5) * 0.8,
          s: 0.65 + rng() * 0.75 + riverEdge * 0.28,
          rot: rng() * Math.PI * 2,
          phase: rng() * Math.PI * 2,
        });
      }
      if (rng() > 0.52) {
        pebbles.push({
          x: x + (rng() - 0.5) * 0.7,
          z: z + (rng() - 0.5) * 0.7,
          s: 0.08 + rng() * 0.18,
          rot: rng() * Math.PI,
        });
      }
    }

    return { riverMudPatches, wetPatches, foamPatches, reeds, pebbles };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const reedChunks = useMemo(() => chunkByGrid(reeds, SHORE_CHUNK_SIZE), [reeds]);

  useLayoutEffect(() => {
    if (!riverMudRef.current || !wetRef.current || !foamRef.current || !pebbleRef.current) return;
    riverMudPatches.forEach((p, i) => {
      const y = groundHeight(p.x, p.z);
      dummy.position.set(p.x, y + 0.012, p.z);
      dummy.rotation.set(-Math.PI / 2, 0, p.rot);
      dummy.scale.set(p.sx, p.sz, 1);
      dummy.updateMatrix();
      riverMudRef.current!.setMatrixAt(i, dummy.matrix);
    });
    wetPatches.forEach((p, i) => {
      const y = groundHeight(p.x, p.z);
      dummy.position.set(p.x, y + 0.018, p.z);
      dummy.rotation.set(-Math.PI / 2, 0, p.rot);
      dummy.scale.set(p.sx, p.sz, 1);
      dummy.updateMatrix();
      wetRef.current!.setMatrixAt(i, dummy.matrix);
    });
    foamPatches.forEach((p, i) => {
      const y = groundHeight(p.x, p.z);
      dummy.position.set(p.x, y + 0.03, p.z);
      dummy.rotation.set(-Math.PI / 2, 0, p.rot);
      dummy.scale.set(p.sx, p.sz, 1);
      dummy.updateMatrix();
      foamRef.current!.setMatrixAt(i, dummy.matrix);
    });
    pebbles.forEach((p, i) => {
      const y = groundHeight(p.x, p.z);
      dummy.position.set(p.x, y + p.s * 0.2, p.z);
      dummy.rotation.set(0, p.rot, 0);
      dummy.scale.set(p.s, p.s * 0.42, p.s);
      dummy.updateMatrix();
      pebbleRef.current!.setMatrixAt(i, dummy.matrix);
    });
    riverMudRef.current.instanceMatrix.needsUpdate = true;
    wetRef.current.instanceMatrix.needsUpdate = true;
    foamRef.current.instanceMatrix.needsUpdate = true;
    pebbleRef.current.instanceMatrix.needsUpdate = true;
  }, [dummy, foamPatches, pebbles, riverMudPatches, wetPatches]);

  return (
    <group>
      <instancedMesh ref={riverMudRef} args={[undefined, undefined, riverMudPatches.length]} receiveShadow>
        <circleGeometry args={[0.5, 14]} />
        <meshStandardMaterial color="#5f6641" transparent opacity={0.36} roughness={1} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={wetRef} args={[undefined, undefined, wetPatches.length]} receiveShadow>
        <circleGeometry args={[0.5, 16]} />
        <meshStandardMaterial color="#716b54" transparent opacity={0.34} roughness={1} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={foamRef} args={[undefined, undefined, foamPatches.length]} receiveShadow>
        <circleGeometry args={[0.5, 10]} />
        <meshBasicMaterial color="#e4f5ee" transparent opacity={0.27} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={pebbleRef} args={[undefined, undefined, pebbles.length]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#a79a82" flatShading roughness={1} />
      </instancedMesh>
      {reedChunks.map((chunk) => (
        <ReedChunk key={chunk.id} chunk={chunk} />
      ))}
    </group>
  );
}

function ReedChunk({ chunk }: { chunk: Chunk<Reed> }) {
  const groupRef = useRef<THREE.Group>(null);
  const reedRef = useRef<THREE.InstancedMesh>(null);
  const reedTipRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const checkRef = useRef(0);
  const { playerRef } = useGameRefs();

  useLayoutEffect(() => {
    const reed = reedRef.current;
    const tip = reedTipRef.current;
    if (!reed || !tip) return;
    reed.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    tip.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    chunk.items.forEach((r, i) => {
      const y = groundHeight(r.x, r.z);
      dummy.position.set(r.x, y + 0.34 * r.s, r.z);
      dummy.rotation.set(0, r.rot, 0);
      dummy.scale.set(r.s, r.s, r.s);
      dummy.updateMatrix();
      reed.setMatrixAt(i, dummy.matrix);
      dummy.position.set(r.x, y + 0.75 * r.s, r.z);
      dummy.updateMatrix();
      tip.setMatrixAt(i, dummy.matrix);
    });
    reed.instanceMatrix.needsUpdate = true;
    tip.instanceMatrix.needsUpdate = true;
  }, [chunk.items, dummy]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    const player = playerRef.current;
    const reed = reedRef.current;
    const tip = reedTipRef.current;
    if (!group || !player || !reed || !tip) return;
    checkRef.current += delta;
    if (checkRef.current > 0.25) {
      checkRef.current = 0;
      const dx = player.position.x - chunk.center[0];
      const dz = player.position.z - chunk.center[2];
      group.visible = dx * dx + dz * dz <= SHORE_VISIBLE_RADIUS * SHORE_VISIBLE_RADIUS;
    }
    if (!group.visible) return;
    const t = state.clock.elapsedTime;
    chunk.items.forEach((r, i) => {
      const y = groundHeight(r.x, r.z);
      const sway = Math.sin(t * 1.8 + r.phase) * 0.14;
      const bendX = Math.cos(r.rot) * sway;
      const bendZ = Math.sin(r.rot) * sway;
      dummy.position.set(r.x, y + 0.34 * r.s, r.z);
      dummy.rotation.set(bendX, r.rot, bendZ);
      dummy.scale.set(r.s, r.s, r.s);
      dummy.updateMatrix();
      reed.setMatrixAt(i, dummy.matrix);

      dummy.position.set(r.x + bendZ * 0.18, y + 0.75 * r.s, r.z - bendX * 0.18);
      dummy.rotation.set(bendX * 0.5, r.rot, bendZ * 0.5);
      dummy.scale.set(r.s, r.s, r.s);
      dummy.updateMatrix();
      tip.setMatrixAt(i, dummy.matrix);
    });
    reed.instanceMatrix.needsUpdate = true;
    tip.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={reedRef} args={[undefined, undefined, chunk.items.length]} castShadow>
        <cylinderGeometry args={[0.025, 0.035, 0.72, 5]} />
        <meshStandardMaterial color="#527a3d" flatShading roughness={1} />
      </instancedMesh>
      <instancedMesh ref={reedTipRef} args={[undefined, undefined, chunk.items.length]} castShadow>
        <coneGeometry args={[0.055, 0.18, 5]} />
        <meshStandardMaterial color="#9a7a4a" flatShading roughness={1} />
      </instancedMesh>
    </group>
  );
}
