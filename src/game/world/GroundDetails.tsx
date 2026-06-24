import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { HOUSE } from '../../config/constants.ts';
import { MAP_LAYOUT } from '../../config/mapLayout.ts';
import { groundHeight, groundKind, riverAmount } from '../../systems/terrain.ts';

interface DetailInstance {
  x: number;
  z: number;
  sx: number;
  sz: number;
  rot: number;
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

function acceptsSurface(x: number, z: number): boolean {
  const kind = groundKind(x, z);
  if (kind === 'water' || kind === 'rock' || kind === 'sand') return false;
  if (riverAmount(x, z) > 0.25) return false;
  return groundHeight(x, z) > -0.2;
}

function addDoorPath(
  stones: DetailInstance[],
  worn: DetailInstance[],
  x: number,
  z: number,
  length: number,
  width: number,
  rng: () => number,
) {
  const count = Math.max(3, Math.floor(length / 0.85));
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1);
    const px = x + (rng() - 0.5) * width * 0.35;
    const pz = z + 2.35 + t * length;
    if (!acceptsSurface(px, pz)) continue;
    stones.push({
      x: px,
      z: pz,
      sx: 0.55 + rng() * 0.25,
      sz: 0.36 + rng() * 0.18,
      rot: (rng() - 0.5) * 0.5,
    });
  }
  for (let i = 0; i < count + 2; i++) {
    const t = i / Math.max(1, count + 1);
    const px = x + (rng() - 0.5) * width;
    const pz = z + 2.0 + t * (length + 1.0);
    if (!acceptsSurface(px, pz)) continue;
    worn.push({
      x: px,
      z: pz,
      sx: 0.9 + rng() * 0.8,
      sz: 0.45 + rng() * 0.5,
      rot: rng() * Math.PI,
    });
  }
}

function addPlazaPaving(
  stones: DetailInstance[],
  worn: DetailInstance[],
  x: number,
  z: number,
  radius: number,
  rng: () => number,
) {
  for (let i = 0; i < 54; i++) {
    const angle = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * radius;
    const px = x + Math.cos(angle) * r;
    const pz = z + Math.sin(angle) * r;
    if (!acceptsSurface(px, pz)) continue;
    worn.push({
      x: px,
      z: pz,
      sx: 1.0 + rng() * 1.8,
      sz: 0.55 + rng() * 1.0,
      rot: rng() * Math.PI,
    });
  }
  for (let i = 0; i < 22; i++) {
    const angle = (i / 22) * Math.PI * 2 + (rng() - 0.5) * 0.12;
    const px = x + Math.cos(angle) * radius * 0.72;
    const pz = z + Math.sin(angle) * radius * 0.72;
    if (!acceptsSurface(px, pz)) continue;
    stones.push({
      x: px,
      z: pz,
      sx: 0.62 + rng() * 0.28,
      sz: 0.38 + rng() * 0.18,
      rot: angle + Math.PI / 2,
    });
  }
}

export function GroundDetails() {
  const pebbleRef = useRef<THREE.InstancedMesh>(null);
  const shoulderRef = useRef<THREE.InstancedMesh>(null);
  const stoneRef = useRef<THREE.InstancedMesh>(null);
  const wornRef = useRef<THREE.InstancedMesh>(null);
  const roadWearRef = useRef<THREE.InstancedMesh>(null);
  const rutRef = useRef<THREE.InstancedMesh>(null);

  const { pebbles, shoulders, stones, worn, roadWear, ruts } = useMemo(() => {
    const rng = makeRng(20240622);
    const pebbles: DetailInstance[] = [];
    const shoulders: DetailInstance[] = [];
    const stones: DetailInstance[] = [];
    const worn: DetailInstance[] = [];
    const roadWear: DetailInstance[] = [];
    const ruts: DetailInstance[] = [];

    for (const road of MAP_LAYOUT.roads) {
      const dx = road.to[0] - road.from[0];
      const dz = road.to[1] - road.from[1];
      const len = Math.hypot(dx, dz);
      if (len <= 0.01) continue;
      const tx = dx / len;
      const tz = dz / len;
      const nx = -tz;
      const nz = tx;
      const steps = Math.floor(len / 1.15);
      for (let i = 0; i <= steps; i++) {
        const baseT = i / Math.max(1, steps);
        const cx = road.from[0] + dx * baseT + (rng() - 0.5) * tx * 0.8;
        const cz = road.from[1] + dz * baseT + (rng() - 0.5) * tz * 0.8;
        if (acceptsSurface(cx, cz) && rng() > 0.1) {
          roadWear.push({
            x: cx + (rng() - 0.5) * road.width * 0.55,
            z: cz + (rng() - 0.5) * road.width * 0.55,
            sx: 0.75 + rng() * 1.35,
            sz: 0.3 + rng() * 0.75,
            rot: Math.atan2(tx, tz) + (rng() - 0.5) * 0.5,
          });
        }
        if (i % 2 === 0) {
          for (const side of [-1, 1]) {
            const x = cx + nx * side * road.width * 0.36 + (rng() - 0.5) * 0.25;
            const z = cz + nz * side * road.width * 0.36 + (rng() - 0.5) * 0.25;
            if (!acceptsSurface(x, z)) continue;
            ruts.push({
              x,
              z,
              sx: 0.46 + rng() * 0.5,
              sz: 0.09 + rng() * 0.08,
              rot: Math.atan2(tx, tz) + (rng() - 0.5) * 0.18,
            });
          }
        }
        for (const side of [-1, 1]) {
          const edgeOffset = road.width + 0.18 + rng() * 0.7;
          const x = cx + nx * side * edgeOffset;
          const z = cz + nz * side * edgeOffset;
          if (!acceptsSurface(x, z)) continue;
          if (rng() > 0.38) {
            shoulders.push({
              x,
              z,
              sx: 0.45 + rng() * 0.85,
              sz: 0.18 + rng() * 0.4,
              rot: Math.atan2(tx, tz) + (rng() - 0.5) * 0.7,
            });
          }
          if (rng() > 0.2) {
            pebbles.push({
              x: x + (rng() - 0.5) * 0.5,
              z: z + (rng() - 0.5) * 0.5,
              sx: 0.09 + rng() * 0.12,
              sz: 0.07 + rng() * 0.11,
              rot: rng() * Math.PI,
            });
          }
        }
      }
    }

    addDoorPath(stones, worn, HOUSE.pos[0], HOUSE.pos[2], 4.2, 2.4, rng);
    addDoorPath(stones, worn, MAP_LAYOUT.shop.pos[0], MAP_LAYOUT.shop.pos[2], 3.2, 2.3, rng);
    addDoorPath(stones, worn, MAP_LAYOUT.museum.pos[0], MAP_LAYOUT.museum.pos[2], 4.0, 3.4, rng);
    addPlazaPaving(stones, worn, MAP_LAYOUT.plaza.pos[0], MAP_LAYOUT.plaza.pos[2], 5.8, rng);
    addPlazaPaving(stones, worn, MAP_LAYOUT.shop.pos[0], MAP_LAYOUT.shop.pos[2] + 2.3, 3.6, rng);
    addPlazaPaving(stones, worn, MAP_LAYOUT.museum.pos[0], MAP_LAYOUT.museum.pos[2] + 3.0, 4.2, rng);
    MAP_LAYOUT.npcs.forEach((npc, index) => {
      addDoorPath(stones, worn, npc.homePos[0], npc.homePos[2], 3.0 + index * 0.35, 2.0, rng);
    });

    return { pebbles, shoulders, stones, worn, roadWear, ruts };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    if (!pebbleRef.current || !shoulderRef.current || !stoneRef.current || !wornRef.current || !roadWearRef.current || !rutRef.current) return;

    roadWear.forEach((p, i) => {
      const y = groundHeight(p.x, p.z);
      dummy.position.set(p.x, y + 0.018, p.z);
      dummy.rotation.set(-Math.PI / 2, 0, p.rot);
      dummy.scale.set(p.sx, p.sz, 1);
      dummy.updateMatrix();
      roadWearRef.current!.setMatrixAt(i, dummy.matrix);
    });
    ruts.forEach((p, i) => {
      const y = groundHeight(p.x, p.z);
      dummy.position.set(p.x, y + 0.026, p.z);
      dummy.rotation.set(-Math.PI / 2, 0, p.rot);
      dummy.scale.set(p.sx, p.sz, 1);
      dummy.updateMatrix();
      rutRef.current!.setMatrixAt(i, dummy.matrix);
    });
    pebbles.forEach((p, i) => {
      const y = groundHeight(p.x, p.z);
      dummy.position.set(p.x, y + 0.035, p.z);
      dummy.rotation.set(0, p.rot, 0);
      dummy.scale.set(p.sx, 0.08, p.sz);
      dummy.updateMatrix();
      pebbleRef.current!.setMatrixAt(i, dummy.matrix);
    });
    shoulders.forEach((p, i) => {
      const y = groundHeight(p.x, p.z);
      dummy.position.set(p.x, y + 0.025, p.z);
      dummy.rotation.set(-Math.PI / 2, 0, p.rot);
      dummy.scale.set(p.sx, p.sz, 1);
      dummy.updateMatrix();
      shoulderRef.current!.setMatrixAt(i, dummy.matrix);
    });
    stones.forEach((p, i) => {
      const y = groundHeight(p.x, p.z);
      dummy.position.set(p.x, y + 0.045, p.z);
      dummy.rotation.set(-Math.PI / 2, 0, p.rot);
      dummy.scale.set(p.sx, p.sz, 1);
      dummy.updateMatrix();
      stoneRef.current!.setMatrixAt(i, dummy.matrix);
    });
    worn.forEach((p, i) => {
      const y = groundHeight(p.x, p.z);
      dummy.position.set(p.x, y + 0.02, p.z);
      dummy.rotation.set(-Math.PI / 2, 0, p.rot);
      dummy.scale.set(p.sx, p.sz, 1);
      dummy.updateMatrix();
      wornRef.current!.setMatrixAt(i, dummy.matrix);
    });

    pebbleRef.current.instanceMatrix.needsUpdate = true;
    shoulderRef.current.instanceMatrix.needsUpdate = true;
    stoneRef.current.instanceMatrix.needsUpdate = true;
    wornRef.current.instanceMatrix.needsUpdate = true;
    roadWearRef.current.instanceMatrix.needsUpdate = true;
    rutRef.current.instanceMatrix.needsUpdate = true;
  }, [dummy, pebbles, roadWear, ruts, shoulders, stones, worn]);

  return (
    <group>
      <instancedMesh ref={roadWearRef} args={[undefined, undefined, roadWear.length]} receiveShadow>
        <circleGeometry args={[0.5, 16]} />
        <meshStandardMaterial color="#8f6b3f" transparent opacity={0.3} roughness={1} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={rutRef} args={[undefined, undefined, ruts.length]} receiveShadow>
        <circleGeometry args={[0.5, 12]} />
        <meshStandardMaterial color="#6f5637" transparent opacity={0.28} roughness={1} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={wornRef} args={[undefined, undefined, worn.length]} receiveShadow>
        <circleGeometry args={[0.45, 14]} />
        <meshStandardMaterial color="#9b7b4e" transparent opacity={0.34} roughness={1} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={shoulderRef} args={[undefined, undefined, shoulders.length]} receiveShadow>
        <circleGeometry args={[0.42, 12]} />
        <meshStandardMaterial color="#8f7448" transparent opacity={0.28} roughness={1} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={stoneRef} args={[undefined, undefined, stones.length]} castShadow receiveShadow>
        <circleGeometry args={[0.48, 12]} />
        <meshStandardMaterial color="#c7b58f" flatShading roughness={1} />
      </instancedMesh>
      <instancedMesh ref={pebbleRef} args={[undefined, undefined, pebbles.length]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#a99a82" flatShading roughness={1} />
      </instancedMesh>
    </group>
  );
}
