import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { WORLD } from '../../config/constants.ts';
import { MAP_LAYOUT } from '../../config/mapLayout.ts';
import { groundHeight, groundKind } from '../../systems/terrain.ts';
import { acceptsGrassDecoration, isFlatDrySurface } from '../../systems/placement.ts';
import { useGameRefs } from '../controllers/gameRefsContext.ts';
import { KenneyBush } from './KenneyModels.tsx';

function makeRng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

const ROCK_COLOR = '#8a8378';
const FLOWER_COLORS = ['#e8635a', '#e8c24a', '#c98ad6', '#e8e8e8', '#d65a8a'];
const BEACH_ROCK_COLOR = '#b8a890';
const CLIFF_PLANT_COLOR = '#7a9a5a';
const LOW_GRASS_A = '#82b650';
const LOW_GRASS_B = '#5f8c3b';
const DETAIL_CHUNK_SIZE = 24;
const DETAIL_VISIBLE_RADIUS = 54;

interface FlowerInstance {
  x: number;
  z: number;
  s: number;
  rot: number;
  color: string;
}

interface GrassInstance {
  x: number;
  z: number;
  s: number;
  rot: number;
  variant: 0 | 1 | 2;
}

interface LowGrassInstance {
  x: number;
  z: number;
  s: number;
  rot: number;
  lean: number;
}

interface Chunk<T> {
  id: string;
  center: [number, number, number];
  items: T[];
}

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

export function Decorations() {
  const rockRef = useRef<THREE.InstancedMesh>(null);
  const beachRockRef = useRef<THREE.InstancedMesh>(null);
  const cliffPlantRef = useRef<THREE.InstancedMesh>(null);
  const leafLitterRef = useRef<THREE.InstancedMesh>(null);

  const { rocks, flowers, grasses, groundGrassA, groundGrassB, beachRocks, cliffPlants, bushes, leafLitter } = useMemo(() => {
    const rng = makeRng(20240620);
    const half = WORLD.size / 2;
    const rocks: { x: number; z: number; s: number; rot: number }[] = [];
    const flowers: FlowerInstance[] = [];
    const grasses: GrassInstance[] = [];
    const groundGrassA: LowGrassInstance[] = [];
    const groundGrassB: LowGrassInstance[] = [];
    const beachRocks: { x: number; z: number; s: number; rot: number }[] = [];
    const cliffPlants: { x: number; z: number; s: number; rot: number }[] = [];
    const bushes: { x: number; z: number; s: number; rot: number; variant: number }[] = [];
    const leafLitter: { x: number; z: number; sx: number; sz: number; rot: number }[] = [];

    const acceptsGrass = (x: number, z: number) => {
      if (Math.hypot(x, z) < 2.5) return false;
      return acceptsGrassDecoration(x, z);
    };
    const addFlower = (x: number, z: number, scale = 1) => {
      if (!acceptsGrass(x, z)) return;
      flowers.push({
        x,
        z,
        s: (0.5 + rng() * 0.5) * scale,
        rot: rng() * Math.PI * 2,
        color: FLOWER_COLORS[Math.floor(rng() * FLOWER_COLORS.length)],
      });
    };
    const grassVariantAt = (x: number, z: number): 0 | 1 | 2 => {
      const forest = MAP_LAYOUT.zones.westForest;
      const river = MAP_LAYOUT.zones.northRiver;
      if (Math.hypot(x - forest.center[0], z - forest.center[2]) < forest.radius * 1.18) return 2;
      if (Math.hypot(x - river.center[0], z - river.center[2]) < river.radius * 1.08) return 1;
      return 0;
    };
    const addGrassBlade = (x: number, z: number, scale = 1, forcedVariant?: 0 | 1 | 2) => {
      if (!acceptsGrass(x, z)) return;
      const variant = forcedVariant ?? grassVariantAt(x, z);
      const zoneScale = variant === 2 ? 0.78 : variant === 1 ? 0.86 : 0.62;
      grasses.push({ x, z, s: (0.62 + rng() * 0.72) * scale * zoneScale, rot: rng() * Math.PI * 2, variant });
    };
    const addLowGrass = (x: number, z: number, scale = 1) => {
      if (!acceptsGrass(x, z)) return;
      const village = MAP_LAYOUT.zones.village;
      const inVillage = Math.hypot(x - village.center[0], z - village.center[2]) < village.radius * 1.08;
      if (inVillage && rng() > 0.32) return;
      const blade = {
        x,
        z,
        s: (0.45 + rng() * 0.75) * scale,
        rot: rng() * Math.PI * 2,
        lean: (rng() - 0.5) * 0.28,
      };
      if (rng() > 0.45) groundGrassA.push(blade);
      else groundGrassB.push(blade);
    };

    for (let i = 0; i < 90; i++) {
      const x = (rng() * 2 - 1) * half * 0.92;
      const z = (rng() * 2 - 1) * half * 0.92;
      if (Math.hypot(x, z) < 4) continue;
      const kind = groundKind(x, z);
      if (kind !== 'grass' && kind !== 'rock') continue;
      if (!isFlatDrySurface(x, z, kind === 'rock' ? 1.1 : 0.85)) continue;
      rocks.push({ x, z, s: 0.4 + rng() * 0.7, rot: rng() * Math.PI * 2 });
    }
    for (let i = 0; i < 350; i++) {
      const x = (rng() * 2 - 1) * half * 0.92;
      const z = (rng() * 2 - 1) * half * 0.92;
      if (Math.hypot(x, z) < 3) continue;
      addFlower(x, z);
    }
    const flowerBeds = [
      { x: MAP_LAYOUT.home.pos[0] - 6.8, z: MAP_LAYOUT.home.pos[2] + 7.6, radius: 5.5 },
      { x: MAP_LAYOUT.plaza.pos[0] + 1.5, z: MAP_LAYOUT.plaza.pos[2] + 7.2, radius: 5.0 },
      { x: MAP_LAYOUT.shop.pos[0] - 6.8, z: MAP_LAYOUT.shop.pos[2] + 5.8, radius: 4.5 },
    ];
    for (const bed of flowerBeds) {
      for (let i = 0; i < 70; i++) {
        const angle = rng() * Math.PI * 2;
        const r = Math.sqrt(rng()) * bed.radius;
        addFlower(bed.x + Math.cos(angle) * r, bed.z + Math.sin(angle) * r, 1.08);
      }
    }
    for (let i = 0; i < 1250; i++) {
      const x = (rng() * 2 - 1) * half * 0.95;
      const z = (rng() * 2 - 1) * half * 0.95;
      addGrassBlade(x, z);
    }
    const forest = MAP_LAYOUT.zones.westForest;
    for (let i = 0; i < 850; i++) {
      const angle = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * forest.radius;
      addGrassBlade(forest.center[0] + Math.cos(angle) * r, forest.center[2] + Math.sin(angle) * r, 1.16, 2);
    }
    const riverZone = MAP_LAYOUT.zones.northRiver;
    for (let i = 0; i < 420; i++) {
      const angle = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * riverZone.radius;
      addGrassBlade(riverZone.center[0] + Math.cos(angle) * r, riverZone.center[2] + Math.sin(angle) * r, 0.92, 1);
    }
    for (let i = 0; i < 3200; i++) {
      const x = (rng() * 2 - 1) * half * 0.96;
      const z = (rng() * 2 - 1) * half * 0.96;
      addLowGrass(x, z);
    }
    for (let i = 0; i < 1800; i++) {
      const angle = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * forest.radius * 1.1;
      addLowGrass(forest.center[0] + Math.cos(angle) * r, forest.center[2] + Math.sin(angle) * r, 1.18);
    }
    for (let i = 0; i < 42; i++) {
      const angle = rng() * Math.PI * 2;
      const r = 5 + Math.sqrt(rng()) * forest.radius * 1.05;
      const x = forest.center[0] + Math.cos(angle) * r;
      const z = forest.center[2] + Math.sin(angle) * r;
      if (!acceptsGrass(x, z)) continue;
      bushes.push({ x, z, s: 0.55 + rng() * 0.55, rot: rng() * Math.PI * 2, variant: Math.floor(rng() * 3) });
    }
    for (let i = 0; i < 150; i++) {
      const angle = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * forest.radius * 1.12;
      const x = forest.center[0] + Math.cos(angle) * r;
      const z = forest.center[2] + Math.sin(angle) * r;
      if (!acceptsGrass(x, z)) continue;
      leafLitter.push({
        x,
        z,
        sx: 0.18 + rng() * 0.32,
        sz: 0.08 + rng() * 0.18,
        rot: rng() * Math.PI,
      });
    }
    for (let i = 0; i < 40; i++) {
      const x = (rng() * 2 - 1) * half * 0.92;
      const z = (rng() * 2 - 1) * half * 0.92;
      if (groundKind(x, z) !== 'sand') continue;
      beachRocks.push({ x, z, s: 0.2 + rng() * 0.3, rot: rng() * Math.PI * 2 });
    }
    for (let i = 0; i < 60; i++) {
      const x = (rng() * 2 - 1) * half * 0.88;
      const z = (rng() * 2 - 1) * half * 0.88;
      if (groundKind(x, z) !== 'rock') continue;
      cliffPlants.push({ x, z, s: 0.4 + rng() * 0.4, rot: rng() * Math.PI * 2 });
    }
    return { rocks, flowers, grasses, groundGrassA, groundGrassB, beachRocks, cliffPlants, bushes, leafLitter };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const flowerChunks = useMemo(() => chunkByGrid(flowers, DETAIL_CHUNK_SIZE), [flowers]);
  const grassChunks = useMemo(
    () => ([0, 1, 2] as const).flatMap((variant) =>
      chunkByGrid(grasses.filter((grass) => grass.variant === variant), DETAIL_CHUNK_SIZE)
        .map((chunk) => ({ ...chunk, id: `${variant}:${chunk.id}`, variant })),
    ),
    [grasses],
  );
  const lowGrassAChunks = useMemo(() => chunkByGrid(groundGrassA, DETAIL_CHUNK_SIZE), [groundGrassA]);
  const lowGrassBChunks = useMemo(() => chunkByGrid(groundGrassB, DETAIL_CHUNK_SIZE), [groundGrassB]);

  useLayoutEffect(() => {
    if (rockRef.current) {
      rocks.forEach((r, i) => {
        const y = groundHeight(r.x, r.z);
        dummy.position.set(r.x, y + r.s * 0.3, r.z);
        dummy.rotation.set(0, r.rot, 0);
        dummy.scale.set(r.s, r.s * 0.7, r.s);
        dummy.updateMatrix();
        rockRef.current!.setMatrixAt(i, dummy.matrix);
      });
      rockRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [rocks, dummy]);

  useLayoutEffect(() => {
    if (!beachRockRef.current) return;
    beachRocks.forEach((r, i) => {
      const y = groundHeight(r.x, r.z);
      dummy.position.set(r.x, y + 0.05, r.z);
      dummy.rotation.set(0, r.rot, 0);
      dummy.scale.set(r.s, r.s * 0.6, r.s);
      dummy.updateMatrix();
      beachRockRef.current!.setMatrixAt(i, dummy.matrix);
    });
    beachRockRef.current.instanceMatrix.needsUpdate = true;
  }, [beachRocks, dummy]);

  useLayoutEffect(() => {
    if (!cliffPlantRef.current) return;
    cliffPlants.forEach((p, i) => {
      const y = groundHeight(p.x, p.z);
      dummy.position.set(p.x, y + 0.15, p.z);
      dummy.rotation.set(0, p.rot, 0);
      dummy.scale.set(p.s, p.s * 0.5, p.s);
      dummy.updateMatrix();
      cliffPlantRef.current!.setMatrixAt(i, dummy.matrix);
    });
    cliffPlantRef.current.instanceMatrix.needsUpdate = true;
  }, [cliffPlants, dummy]);

  useLayoutEffect(() => {
    if (!leafLitterRef.current) return;
    leafLitter.forEach((leaf, index) => {
      const y = groundHeight(leaf.x, leaf.z);
      dummy.position.set(leaf.x, y + 0.028, leaf.z);
      dummy.rotation.set(-Math.PI / 2, 0, leaf.rot);
      dummy.scale.set(leaf.sx, leaf.sz, 1);
      dummy.updateMatrix();
      leafLitterRef.current!.setMatrixAt(index, dummy.matrix);
      leafLitterRef.current!.setColorAt(index, new THREE.Color(index % 3 === 0 ? '#8b6840' : index % 3 === 1 ? '#9b7545' : '#6f5938'));
    });
    leafLitterRef.current.instanceMatrix.needsUpdate = true;
    if (leafLitterRef.current.instanceColor) leafLitterRef.current.instanceColor.needsUpdate = true;
  }, [dummy, leafLitter]);

  return (
    <group>
      <instancedMesh ref={rockRef} args={[undefined, undefined, rocks.length]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color={ROCK_COLOR} flatShading roughness={1} />
      </instancedMesh>

      {flowerChunks.map((chunk) => (
        <FlowerChunk key={chunk.id} chunk={chunk} />
      ))}
      {grassChunks.map((chunk) => (
        <GrassChunk key={chunk.id} chunk={chunk} variant={chunk.variant} />
      ))}
      {lowGrassAChunks.map((chunk) => (
        <LowGrassChunk key={chunk.id} chunk={chunk} color={LOW_GRASS_A} variant="a" />
      ))}
      {lowGrassBChunks.map((chunk) => (
        <LowGrassChunk key={chunk.id} chunk={chunk} color={LOW_GRASS_B} variant="b" />
      ))}

      <instancedMesh ref={beachRockRef} args={[undefined, undefined, beachRocks.length]} castShadow>
        <dodecahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial color={BEACH_ROCK_COLOR} flatShading roughness={1} />
      </instancedMesh>

      <instancedMesh ref={cliffPlantRef} args={[undefined, undefined, cliffPlants.length]} castShadow>
        <coneGeometry args={[0.25, 0.4, 5]} />
        <meshStandardMaterial color={CLIFF_PLANT_COLOR} flatShading roughness={1} />
      </instancedMesh>

      <instancedMesh ref={leafLitterRef} args={[undefined, undefined, leafLitter.length]} receiveShadow>
        <circleGeometry args={[0.5, 7]} />
        <meshStandardMaterial vertexColors roughness={1} polygonOffset polygonOffsetFactor={-1} />
      </instancedMesh>

      {bushes.map((bush, index) => (
        <group
          key={`forest-bush-${index}`}
          position={[bush.x, groundHeight(bush.x, bush.z), bush.z]}
          rotation={[0, bush.rot, 0]}
          scale={[bush.s, bush.s * 0.72, bush.s]}
        >
          <KenneyBush variant={bush.variant} size={1.05} />
        </group>
      ))}
    </group>
  );
}

function FlowerChunk({ chunk }: { chunk: Chunk<FlowerInstance> }) {
  const groupRef = useRef<THREE.Group>(null);
  const stemRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const checkRef = useRef(0);
  const { playerRef } = useGameRefs();

  useLayoutEffect(() => {
    const stem = stemRef.current;
    const head = headRef.current;
    if (!stem || !head) return;
    stem.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    head.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    chunk.items.forEach((f, i) => {
      const y = groundHeight(f.x, f.z);
      dummy.position.set(f.x, y + f.s * 0.3, f.z);
      dummy.rotation.set(0, f.rot, 0);
      dummy.scale.set(f.s, f.s, f.s);
      dummy.updateMatrix();
      stem.setMatrixAt(i, dummy.matrix);
      dummy.position.set(f.x, y + f.s * 0.7, f.z);
      dummy.updateMatrix();
      head.setMatrixAt(i, dummy.matrix);
      head.setColorAt(i, new THREE.Color(f.color));
    });
    stem.instanceMatrix.needsUpdate = true;
    head.instanceMatrix.needsUpdate = true;
    if (head.instanceColor) head.instanceColor.needsUpdate = true;
  }, [chunk.items, dummy]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    const player = playerRef.current;
    if (!group || !player) return;
    checkRef.current += delta;
    if (checkRef.current > 0.25) {
      checkRef.current = 0;
      const dx = player.position.x - chunk.center[0];
      const dz = player.position.z - chunk.center[2];
      group.visible = dx * dx + dz * dz <= DETAIL_VISIBLE_RADIUS * DETAIL_VISIBLE_RADIUS;
    }
    if (!group.visible || !stemRef.current || !headRef.current) return;
    const t = state.clock.elapsedTime;
    chunk.items.forEach((f, i) => {
      const y = groundHeight(f.x, f.z);
      const phase = t * 1.9 + f.x * 0.23 + f.z * 0.17;
      const sway = Math.sin(phase) * 0.12 + Math.sin(phase * 1.7) * 0.035;
      const bendX = Math.cos(f.rot) * sway;
      const bendZ = Math.sin(f.rot) * sway;
      dummy.position.set(f.x, y + f.s * 0.3, f.z);
      dummy.rotation.set(bendX * 0.35, f.rot, bendZ * 0.35);
      dummy.scale.set(f.s, f.s, f.s);
      dummy.updateMatrix();
      stemRef.current!.setMatrixAt(i, dummy.matrix);
      dummy.position.set(f.x + bendZ * 0.08, y + f.s * 0.7, f.z - bendX * 0.08);
      dummy.rotation.set(bendX * 0.2, f.rot, bendZ * 0.2);
      dummy.updateMatrix();
      headRef.current!.setMatrixAt(i, dummy.matrix);
    });
    stemRef.current.instanceMatrix.needsUpdate = true;
    headRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={stemRef} args={[undefined, undefined, chunk.items.length]} castShadow>
        <cylinderGeometry args={[0.025, 0.03, 0.5, 6]} />
        <meshStandardMaterial color="#4a7a3a" flatShading roughness={1} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined, undefined, chunk.items.length]} castShadow>
        <icosahedronGeometry args={[0.12, 0]} />
        <meshStandardMaterial flatShading roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

const GRASS_MODEL_PATHS = [
  'assets/models/kenney/plants/grass.glb',
  'assets/models/kenney/plants/grass_large.glb',
  'assets/models/kenney/plants/grass_leafs.glb',
] as const;
GRASS_MODEL_PATHS.forEach((path) => useGLTF.preload(path));

function GrassChunk({ chunk, variant }: { chunk: Chunk<GrassInstance>; variant: 0 | 1 | 2 }) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const checkRef = useRef(0);
  const { playerRef } = useGameRefs();
  const { scene } = useGLTF(GRASS_MODEL_PATHS[variant]);
  const source = useMemo(() => {
    let mesh: THREE.Mesh | null = null;
    scene.traverse((child) => {
      if (!mesh && child instanceof THREE.Mesh) mesh = child;
    });
    if (!mesh) return null;
    const found = mesh as THREE.Mesh;
    scene.updateMatrixWorld(true);
    const geometry = found.geometry.clone();
    geometry.applyMatrix4(found.matrixWorld);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (box) {
      const targetHeight = variant === 0 ? 0.48 : variant === 1 ? 0.72 : 0.58;
      const height = Math.max(0.001, box.max.y - box.min.y);
      geometry.translate(0, -box.min.y, 0);
      geometry.scale(targetHeight / height, targetHeight / height, targetHeight / height);
    }
    return geometry;
  }, [scene, variant]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    chunk.items.forEach((g, i) => {
      const y = groundHeight(g.x, g.z);
      dummy.position.set(g.x, y, g.z);
      dummy.rotation.set(0, g.rot, 0);
      dummy.scale.set(g.s, g.s, g.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [chunk.items, dummy]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    const player = playerRef.current;
    if (!group || !player || !meshRef.current) return;
    checkRef.current += delta;
    if (checkRef.current > 0.25) {
      checkRef.current = 0;
      const dx = player.position.x - chunk.center[0];
      const dz = player.position.z - chunk.center[2];
      group.visible = dx * dx + dz * dz <= DETAIL_VISIBLE_RADIUS * DETAIL_VISIBLE_RADIUS;
    }
    if (!group.visible) return;
    const t = state.clock.elapsedTime;
    chunk.items.forEach((g, i) => {
      const y = groundHeight(g.x, g.z);
      const phase = t * 2.2 + g.x * 0.19 - g.z * 0.21;
      const sway = Math.sin(phase) * 0.16 + Math.sin(phase * 1.6) * 0.05;
      const bendX = Math.cos(g.rot) * sway;
      const bendZ = Math.sin(g.rot) * sway;
      dummy.position.set(g.x + bendZ * 0.05, y, g.z - bendX * 0.05);
      dummy.rotation.set(bendX * 0.45, g.rot, bendZ * 0.45);
      dummy.scale.set(g.s, g.s, g.s);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      {source && (
        <instancedMesh
          ref={meshRef}
          args={[source, undefined, chunk.items.length]}
          castShadow={variant !== 0}
          receiveShadow
        >
          <meshStandardMaterial
            color={variant === 0 ? '#6f9e45' : variant === 1 ? '#668d42' : '#4f793c'}
            flatShading
            roughness={1}
            metalness={0}
          />
        </instancedMesh>
      )}
    </group>
  );
}

function LowGrassChunk({ chunk, color, variant }: { chunk: Chunk<LowGrassInstance>; color: string; variant: 'a' | 'b' }) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const checkRef = useRef(0);
  const { playerRef } = useGameRefs();

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    chunk.items.forEach((g, i) => {
      const y = groundHeight(g.x, g.z);
      const yOffset = variant === 'a' ? 0.13 * g.s : 0.1 * g.s;
      dummy.position.set(g.x, y + yOffset, g.z);
      dummy.rotation.set(variant === 'a' ? g.lean : g.lean * 0.6, g.rot, variant === 'a' ? -g.lean * 0.4 : -g.lean);
      dummy.scale.set(g.s, variant === 'a' ? g.s : g.s * 0.85, g.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [chunk.items, dummy, variant]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    const player = playerRef.current;
    if (!group || !player || !meshRef.current) return;
    checkRef.current += delta;
    if (checkRef.current > 0.25) {
      checkRef.current = 0;
      const dx = player.position.x - chunk.center[0];
      const dz = player.position.z - chunk.center[2];
      group.visible = dx * dx + dz * dz <= DETAIL_VISIBLE_RADIUS * DETAIL_VISIBLE_RADIUS;
    }
    if (!group.visible) return;
    const t = state.clock.elapsedTime;
    chunk.items.forEach((g, i) => {
      const y = groundHeight(g.x, g.z);
      const phase = variant === 'a' ? t * 2.6 + g.x * 0.33 + g.z * 0.12 : t * 2.35 + g.x * 0.22 - g.z * 0.29;
      const sway = Math.sin(phase) * (variant === 'a' ? 0.16 : 0.13) + Math.sin(phase * (variant === 'a' ? 1.9 : 1.7)) * (variant === 'a' ? 0.04 : 0.035);
      const yOffset = variant === 'a' ? 0.13 * g.s : 0.1 * g.s;
      dummy.position.set(g.x + Math.sin(g.rot) * sway * 0.03, y + yOffset, g.z + Math.cos(g.rot) * sway * 0.03);
      dummy.rotation.set(
        variant === 'a' ? g.lean + sway * 0.28 : g.lean * 0.6 + sway * 0.22,
        g.rot,
        variant === 'a' ? -g.lean * 0.4 + sway * 0.2 : -g.lean + sway * 0.18,
      );
      dummy.scale.set(g.s, variant === 'a' ? g.s : g.s * 0.85, g.s);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, chunk.items.length]} castShadow>
        <coneGeometry args={variant === 'a' ? [0.055, 0.32, 4] : [0.045, 0.26, 4]} />
        <meshStandardMaterial color={color} flatShading roughness={1} />
      </instancedMesh>
    </group>
  );
}
