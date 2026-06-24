import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import * as THREE from 'three';
import type { ItemId } from '../../config/items.ts';

function applyModelQuality(root: THREE.Object3D, opacity = 1) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    const clonedMaterials = materials.map((material) => {
      const cloned = material.clone();
      if (cloned instanceof THREE.MeshStandardMaterial) {
        cloned.flatShading = true;
        cloned.roughness = Math.max(cloned.roughness, 0.86);
        cloned.metalness = Math.min(cloned.metalness, 0.05);
        cloned.color.offsetHSL(0, 0.04, -0.015);
      }
      cloned.transparent = opacity < 0.98;
      cloned.opacity = opacity;
      cloned.depthWrite = opacity >= 0.98;
      cloned.needsUpdate = true;
      return cloned;
    });
    child.material = Array.isArray(child.material) ? clonedMaterials : clonedMaterials[0];
  });
}

function useAutoCenteredModel(path: string, targetSize: number, opacity = 1) {
  const { scene } = useGLTF(path);
  return useMemo(() => {
    const clone = scene.clone();
    applyModelQuality(clone, opacity);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? targetSize / maxDim : 1;
    const group = new THREE.Group();
    group.add(clone);
    clone.position.set(-center.x, -box.min.y, -center.z);
    group.scale.setScalar(scale);
    return group;
  }, [scene, targetSize, opacity]);
}

// ── Trees ──
const TREE_PATHS = [
  '/assets/models/kenney/trees/tree_default.glb',
  '/assets/models/kenney/trees/tree_oak.glb',
  '/assets/models/kenney/trees/tree_cone.glb',
  '/assets/models/kenney/trees/tree_detailed.glb',
  '/assets/models/kenney/trees/tree_fat.glb',
  '/assets/models/kenney/trees/tree_tall.glb',
  '/assets/models/kenney/trees/tree_pineDefaultA.glb',
  '/assets/models/kenney/trees/tree_pineDefaultB.glb',
];
TREE_PATHS.forEach((p) => useGLTF.preload(p));

export function KenneyTree({ variant, opacity = 1 }: { variant: number; opacity?: number }) {
  const path = TREE_PATHS[variant % TREE_PATHS.length];
  const group = useAutoCenteredModel(path, 1.12, opacity);
  return <primitive object={group} />;
}

// ── Furniture ──
// 路径表，偏移由 autoCenter 自动计算 bounding box 居中
interface FurnitureCfg { path: string }
const FURNITURE_CFG: Record<string, FurnitureCfg> = {
  furniture_stool:     { path: '/assets/models/kenney/furniture/stoolBar.glb' },
  furniture_table:     { path: '/assets/models/kenney/furniture/tableRound.glb' },
  furniture_bed:       { path: '/assets/models/kenney/furniture/bedSingle.glb' },
  furniture_lamp:      { path: '/assets/models/kenney/furniture/lampRoundFloor.glb' },
  furniture_rug:       { path: '/assets/models/kenney/furniture/rugRounded.glb' },
  furniture_chair:     { path: '/assets/models/kenney/furniture/chair.glb' },
  furniture_sofa:      { path: '/assets/models/kenney/furniture/loungeSofa.glb' },
  furniture_bookcase:  { path: '/assets/models/kenney/furniture/bookcaseClosed.glb' },
  furniture_desk:      { path: '/assets/models/kenney/furniture/desk.glb' },
  furniture_coffeeTable: { path: '/assets/models/kenney/furniture/tableCoffee.glb' },
  furniture_bench:     { path: '/assets/models/kenney/furniture/bench.glb' },
  furniture_sideTable: { path: '/assets/models/kenney/furniture/sideTable.glb' },
  furniture_cabinet:   { path: '/assets/models/kenney/furniture/kitchenCabinet.glb' },
  furniture_lampTable: { path: '/assets/models/kenney/furniture/lampRoundTable.glb' },
  furniture_rugSquare: { path: '/assets/models/kenney/furniture/rugSquare.glb' },
};
Object.values(FURNITURE_CFG).forEach((c) => useGLTF.preload(c.path));

// 自动居中：将 GLB 的 bounding box 底部中心对齐到原点，统一缩放
const AUTO_SCALE = 2.0;

function useAutoCenteredFurniture(path: string) {
  const { scene } = useGLTF(path);
  return useMemo(() => {
    const clone = scene.clone();
    applyModelQuality(clone);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const s = maxDim > 0 ? AUTO_SCALE / maxDim : 1;
    const group = new THREE.Group();
    group.add(clone);
    clone.position.set(-center.x, -box.min.y, -center.z);
    group.scale.setScalar(s);
    return group;
  }, [scene]);
}

export function KenneyFurniture({ itemId }: { itemId: string }) {
  const cfg = FURNITURE_CFG[itemId] ?? FURNITURE_CFG.furniture_stool;
  const group = useAutoCenteredFurniture(cfg.path);
  return <primitive object={group} />;
}

// ── Decorations ──
const FLOWER_PATHS = [
  '/assets/models/kenney/plants/flower_redA.glb',
  '/assets/models/kenney/plants/flower_purpleA.glb',
  '/assets/models/kenney/plants/flower_yellowA.glb',
  '/assets/models/kenney/plants/grass.glb',
  '/assets/models/kenney/rocks/rock_smallA.glb',
];
FLOWER_PATHS.forEach((p) => useGLTF.preload(p));

const ROCK_PATHS = [
  '/assets/models/kenney/rocks/rock_smallA.glb',
  '/assets/models/kenney/rocks/rock_smallB.glb',
  '/assets/models/kenney/rocks/rock_smallC.glb',
  '/assets/models/kenney/rocks/rock_smallFlatA.glb',
  '/assets/models/kenney/rocks/rock_smallFlatB.glb',
];
ROCK_PATHS.forEach((p) => useGLTF.preload(p));

const FENCE_PATH = '/assets/models/kenney/misc/fence_simple.glb';
const FENCE_PLANKS_PATH = '/assets/models/kenney/misc/fence_planks.glb';
const LOG_PATH = '/assets/models/kenney/misc/log.glb';
const LOG_STACK_PATH = '/assets/models/kenney/misc/log_stack.glb';
const BUSH_PATHS = [
  '/assets/models/kenney/plants/plant_bush.glb',
  '/assets/models/kenney/plants/plant_bushSmall.glb',
  '/assets/models/kenney/plants/plant_bushLarge.glb',
];
[FENCE_PATH, FENCE_PLANKS_PATH, LOG_PATH, LOG_STACK_PATH, ...BUSH_PATHS].forEach((p) => useGLTF.preload(p));

const FISH_MODEL_PATH = '/assets/models/kenney/animals/animal-fish.glb';
const BUG_MODEL_PATHS = [
  '/assets/models/kenney/animals/animal-bee.glb',
  '/assets/models/kenney/animals/animal-bee.glb',
];
[FISH_MODEL_PATH, ...BUG_MODEL_PATHS].forEach((p) => useGLTF.preload(p));

interface DropModelCfg {
  path: string;
  size: number;
  y?: number;
  rotation?: [number, number, number];
}

const DROP_MODEL_CFG: Partial<Record<ItemId, DropModelCfg>> = {
  branch: { path: '/assets/models/kenney/misc/log.glb', size: 0.55, y: -0.02, rotation: [0, 0.4, Math.PI / 2] },
  wood: { path: '/assets/models/kenney/misc/log_stack.glb', size: 0.85 },
  stone: { path: '/assets/models/kenney/rocks/rock_smallFlatA.glb', size: 0.55 },
  iron_ore: { path: '/assets/models/kenney/rocks/rock_smallB.glb', size: 0.6 },
  gold_ore: { path: '/assets/models/kenney/rocks/rock_smallC.glb', size: 0.6 },
  sapling: { path: '/assets/models/kenney/plants/plant_bushSmall.glb', size: 0.65 },
  flower_seed: { path: '/assets/models/kenney/plants/flower_redA.glb', size: 0.5 },
  fish_common: { path: FISH_MODEL_PATH, size: 0.55, rotation: [0, -Math.PI / 2, 0] },
  fish_rare: { path: FISH_MODEL_PATH, size: 0.62, rotation: [0, -Math.PI / 2, 0] },
  fish_legend: { path: FISH_MODEL_PATH, size: 0.72, rotation: [0, -Math.PI / 2, 0] },
  bug_common: { path: BUG_MODEL_PATHS[0], size: 0.5 },
  bug_rare: { path: BUG_MODEL_PATHS[0], size: 0.58 },
};
Object.values(DROP_MODEL_CFG).forEach((cfg) => useGLTF.preload(cfg.path));

export function KenneyFlower({ variant = 0 }: { variant?: number }) {
  const path = FLOWER_PATHS[variant % 3];
  const { scene } = useGLTF(path);
  const clone = useMemo(() => scene.clone(), [scene]);
  return <primitive object={clone} />;
}

export function KenneyGrass() {
  const { scene } = useGLTF('/assets/models/kenney/plants/grass.glb');
  const clone = useMemo(() => scene.clone(), [scene]);
  return <primitive object={clone} />;
}

export function KenneyRock({ variant = 0 }: { variant?: number }) {
  const path = ROCK_PATHS[variant % ROCK_PATHS.length];
  const group = useAutoCenteredModel(path, 1.25);
  return <primitive object={group} />;
}

export function KenneyShoreRock({ variant = 0, size = 0.55 }: { variant?: number; size?: number }) {
  const path = ROCK_PATHS[variant % ROCK_PATHS.length];
  const group = useAutoCenteredModel(path, size);
  return <primitive object={group} />;
}

export function KenneyFence({ broken = false }: { broken?: boolean }) {
  const group = useAutoCenteredModel(broken ? FENCE_PLANKS_PATH : FENCE_PATH, broken ? 1.25 : 1.15);
  return <primitive object={group} />;
}

export function KenneyLog({ stack = false }: { stack?: boolean }) {
  const group = useAutoCenteredModel(stack ? LOG_STACK_PATH : LOG_PATH, stack ? 1.1 : 0.8);
  return <primitive object={group} />;
}

export function KenneyBush({ variant = 0, size = 0.85 }: { variant?: number; size?: number }) {
  const path = BUSH_PATHS[variant % BUSH_PATHS.length];
  const group = useAutoCenteredModel(path, size);
  return <primitive object={group} />;
}

export function KenneyFishModel({ size = 0.95 }: { size?: number }) {
  const group = useAutoCenteredModel(FISH_MODEL_PATH, size);
  return <primitive object={group} rotation={[0, -Math.PI / 2, 0]} />;
}

export function KenneyBugModel({ variant = 0 }: { variant?: number }) {
  const path = BUG_MODEL_PATHS[variant % BUG_MODEL_PATHS.length];
  const group = useAutoCenteredModel(path, variant === 1 ? 0.72 : 0.62);
  return <primitive object={group} />;
}

export function KenneyDropModel({ itemId, fallback }: { itemId: ItemId; fallback: ReactNode }) {
  const cfg = DROP_MODEL_CFG[itemId];
  const modelCfg = cfg ?? DROP_MODEL_CFG.stone!;
  const group = useAutoCenteredModel(modelCfg.path, modelCfg.size);
  if (!cfg) return <>{fallback}</>;
  return (
    <primitive
      object={group}
      position={[0, modelCfg.y ?? 0, 0]}
      rotation={modelCfg.rotation ?? [0, 0, 0]}
    />
  );
}
