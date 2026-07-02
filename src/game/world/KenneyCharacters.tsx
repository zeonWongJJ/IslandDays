import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MutableRefObject, RefObject } from 'react';
import { CLOTHING_COLORS } from '../../config/items.ts';
import { useGameStore } from '../../store/useGameStore.ts';

type CharacterStyle = 'player' | 'mira' | 'tao' | 'lina';

const ANIMAL_PATHS = {
  cat: 'assets/models/kenney/animals/animal-cat.glb',
  dog: 'assets/models/kenney/animals/animal-dog.glb',
} as const;
const CHARACTER_PATHS: Record<CharacterStyle, string> = {
  player: 'assets/models/kenney/characters/character-e.glb',
  mira: 'assets/models/kenney/characters/character-n.glb',
  tao: 'assets/models/kenney/characters/character-p.glb',
  lina: 'assets/models/kenney/characters/character-f.glb',
};
(Object.values({ ...ANIMAL_PATHS, ...CHARACTER_PATHS }) as string[]).forEach((p) => useGLTF.preload(p));

export interface PlayerLimbRefs {
  legLeft: THREE.Object3D;
  legRight: THREE.Object3D;
  armLeft: THREE.Object3D;
  armRight: THREE.Object3D;
  bodyGroup: THREE.Group;
}

interface StyleConfig {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  shoes: string;
  accent: string;
}

const STYLE: Record<CharacterStyle, StyleConfig> = {
  player: { skin: '#f0bf8f', hair: '#463126', shirt: '#f08a45', pants: '#35b89a', shoes: '#304a70', accent: '#526b90' },
  mira: { skin: '#f0c49a', hair: '#5a2f3f', shirt: '#d85f86', pants: '#7bbf7a', shoes: '#6a4b5e', accent: '#e6bf58' },
  tao: { skin: '#e8b98a', hair: '#2e3f58', shirt: '#4d88c7', pants: '#385f83', shoes: '#283348', accent: '#7ca15e' },
  lina: { skin: '#e6b07e', hair: '#6a4529', shirt: '#d59a3e', pants: '#5f8a70', shoes: '#4f3a2a', accent: '#7d5736' },
};

interface CharacterModelProps {
  style: CharacterStyle;
  limbRefsRef?: MutableRefObject<PlayerLimbRefs | null>;
}

function CharacterModel({ style, limbRefsRef }: CharacterModelProps) {
  const clothing = useGameStore((s) => s.clothing);
  const { scene } = useGLTF(CHARACTER_PATHS[style]);
  const cfg = useMemo(() => {
    if (style !== 'player') return STYLE[style];
    const base = STYLE.player;
    return {
      ...base,
      shirt: clothing.shirt ? CLOTHING_COLORS[clothing.shirt] : base.shirt,
      pants: clothing.pants ? CLOTHING_COLORS[clothing.pants] : base.pants,
      shoes: clothing.shoes ? CLOTHING_COLORS[clothing.shoes] : base.shoes,
      accent: clothing.hat ? CLOTHING_COLORS[clothing.hat] : base.accent,
    };
  }, [clothing, style]);
  const bodyRef = useRef<THREE.Group>(null);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    prepareScene(clone);
    if (style === 'player' && clothing.shirt) tintCharacterPart(clone, 'torso', cfg.shirt);
    if (style === 'player' && clothing.pants) {
      tintCharacterPart(clone, 'leg-left', cfg.pants);
      tintCharacterPart(clone, 'leg-right', cfg.pants);
    }
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = 1.86 / Math.max(size.y, 0.001);
    clone.position.set(-center.x, -box.min.y, -center.z);
    return {
      root: clone,
      scale,
      legLeft: findPart(clone, ['leg-left']),
      legRight: findPart(clone, ['leg-right']),
      armLeft: findPart(clone, ['arm-left']),
      armRight: findPart(clone, ['arm-right']),
    };
  }, [cfg.pants, cfg.shirt, clothing.pants, clothing.shirt, scene, style]);

  useEffect(() => {
    if (!limbRefsRef || !bodyRef.current || !model.legLeft || !model.legRight || !model.armLeft || !model.armRight) return;
    limbRefsRef.current = {
      legLeft: model.legLeft,
      legRight: model.legRight,
      armLeft: model.armLeft,
      armRight: model.armRight,
      bodyGroup: bodyRef.current,
    };
    return () => {
      limbRefsRef.current = null;
    };
  }, [limbRefsRef, model]);

  return (
    <group ref={bodyRef}>
      <group scale={model.scale}>
        <primitive object={model.root} />
      </group>
      <RoleDetails style={style} cfg={cfg} showPlayerHat={style !== 'player' || clothing.hat !== null} />
      {style === 'player' && clothing.shoes && (
        <>
          <mesh position={[-0.17, 0.13, 0.1]} castShadow>
            <boxGeometry args={[0.23, 0.12, 0.34]} />
            <meshStandardMaterial color={cfg.shoes} flatShading roughness={1} />
          </mesh>
          <mesh position={[0.17, 0.13, 0.1]} castShadow>
            <boxGeometry args={[0.23, 0.12, 0.34]} />
            <meshStandardMaterial color={cfg.shoes} flatShading roughness={1} />
          </mesh>
        </>
      )}
    </group>
  );
}

function tintCharacterPart(root: THREE.Object3D, name: string, color: string) {
  const part = findPart(root, [name]);
  part?.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshBasicMaterial) {
        material.color.set(color);
      }
    });
  });
}

function RoleDetails({ style, cfg, showPlayerHat }: { style: CharacterStyle; cfg: StyleConfig; showPlayerHat: boolean }) {
  if (style === 'player') {
    return (
      <group>
        {showPlayerHat && (
          <>
            <mesh position={[0, 1.93, 0.02]} castShadow>
              <cylinderGeometry args={[0.34, 0.31, 0.14, 12]} />
              <meshStandardMaterial color={cfg.accent} flatShading roughness={1} />
            </mesh>
            <mesh position={[0, 1.88, 0.28]} castShadow>
              <boxGeometry args={[0.62, 0.07, 0.2]} />
              <meshStandardMaterial color={cfg.accent} flatShading roughness={1} />
            </mesh>
          </>
        )}
      </group>
    );
  }
  if (style === 'mira') {
    return (
      <group>
        <mesh position={[0.2, 1.88, 0.18]} rotation={[0.25, 0, -0.5]} castShadow>
          <coneGeometry args={[0.09, 0.2, 5]} />
          <meshStandardMaterial color={cfg.accent} flatShading roughness={1} />
        </mesh>
      </group>
    );
  }
  if (style === 'tao') {
    return (
      <group>
        <mesh position={[0.42, 1.0, -0.02]} rotation={[0.22, 0, -0.28]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.82, 8]} />
          <meshStandardMaterial color="#76512d" flatShading roughness={1} />
        </mesh>
      </group>
    );
  }
  return (
    <group>
      <mesh position={[0, 1.0, 0.22]} castShadow>
        <boxGeometry args={[0.52, 0.58, 0.08]} />
        <meshStandardMaterial color="#7d5736" flatShading roughness={1} />
      </mesh>
      <mesh position={[0.4, 1.1, 0.12]} rotation={[0, 0, 0.35]} castShadow>
        <boxGeometry args={[0.12, 0.44, 0.1]} />
        <meshStandardMaterial color="#6e4b30" flatShading roughness={1} />
      </mesh>
    </group>
  );
}

interface CharacterParts {
  legLeft: THREE.Object3D | null;
  legRight: THREE.Object3D | null;
  armLeft: THREE.Object3D | null;
  armRight: THREE.Object3D | null;
}

export type NpcActivity = 'idle' | 'walk' | 'wave' | 'work' | 'rest';

function animateCharacterParts(parts: CharacterParts, phase: number, amount: number) {
  const legSwing = 0.48 * amount;
  const armSwing = 0.38 * amount;
  if (parts.legLeft) parts.legLeft.rotation.x = Math.sin(phase) * legSwing;
  if (parts.legRight) parts.legRight.rotation.x = Math.sin(phase + Math.PI) * legSwing;
  if (parts.armLeft) parts.armLeft.rotation.x = Math.sin(phase + Math.PI) * armSwing;
  if (parts.armRight) parts.armRight.rotation.x = Math.sin(phase) * armSwing;
}

export function KenneyPlayer({
  limbRefs,
}: {
  characterIndex?: number;
  limbRefs: MutableRefObject<PlayerLimbRefs | null>;
}) {
  return <CharacterModel style="player" limbRefsRef={limbRefs} />;
}

export function KenneyNPC({
  moving = false,
  movingRef,
  activityRef,
  phaseOffset = 0,
  style = 'mira',
}: {
  characterIndex: number;
  moving?: boolean;
  movingRef?: RefObject<boolean>;
  activityRef?: RefObject<NpcActivity>;
  phaseOffset?: number;
  style?: Exclude<CharacterStyle, 'player'>;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const npcLimbRefs = useRef<PlayerLimbRefs | null>(null);
  const walkBlendRef = useRef(0);

  useFrame((state, delta) => {
    const limbs = npcLimbRefs.current;
    const t = state.clock.elapsedTime + phaseOffset;
    const isMoving = movingRef?.current ?? moving;
    const activity = isMoving ? 'walk' : activityRef?.current ?? 'idle';
    walkBlendRef.current = THREE.MathUtils.damp(walkBlendRef.current, isMoving ? 1 : 0, 9, delta);
    const walkBlend = walkBlendRef.current;
    const parts = {
      legLeft: limbs?.legLeft ?? null,
      legRight: limbs?.legRight ?? null,
      armLeft: limbs?.armLeft ?? null,
      armRight: limbs?.armRight ?? null,
    };
    if (activity === 'walk' || walkBlend > 0.04) {
      animateCharacterParts(parts, t * 7.2, walkBlend);
    } else if (activity === 'wave') {
      if (parts.legLeft) parts.legLeft.rotation.x *= 0.82;
      if (parts.legRight) parts.legRight.rotation.x *= 0.82;
      if (parts.armLeft) {
        parts.armLeft.rotation.x *= 0.8;
        parts.armLeft.rotation.z *= 0.8;
      }
      if (parts.armRight) {
        parts.armRight.rotation.x = -1.45 + Math.sin(t * 7) * 0.18;
        parts.armRight.rotation.z = 0.55 + Math.sin(t * 7) * 0.16;
      }
    } else if (activity === 'work') {
      if (parts.legLeft) parts.legLeft.rotation.x = Math.sin(t * 2.2) * 0.05;
      if (parts.legRight) parts.legRight.rotation.x = Math.sin(t * 2.2 + Math.PI) * 0.05;
      if (parts.armLeft) {
        parts.armLeft.rotation.x = -0.55 + Math.sin(t * 3.4) * 0.32;
        parts.armLeft.rotation.z = -0.18;
      }
      if (parts.armRight) {
        parts.armRight.rotation.x = -0.8 + Math.sin(t * 3.4 + Math.PI) * 0.38;
        parts.armRight.rotation.z = 0.18;
      }
    } else if (activity === 'rest') {
      if (parts.legLeft) parts.legLeft.rotation.x += (0.68 - parts.legLeft.rotation.x) * 0.12;
      if (parts.legRight) parts.legRight.rotation.x += (0.68 - parts.legRight.rotation.x) * 0.12;
      if (parts.armLeft) parts.armLeft.rotation.x += (-0.22 - parts.armLeft.rotation.x) * 0.12;
      if (parts.armRight) parts.armRight.rotation.x += (-0.22 - parts.armRight.rotation.x) * 0.12;
    } else {
      animateCharacterParts(parts, t * 2.4, 0.08);
    }
    if (rootRef.current) {
      const restOffset = activity === 'rest' ? -0.24 : 0;
      const walkBob = Math.abs(Math.sin(t * 7.2)) * 0.045 * walkBlend;
      const idleBob = Math.sin(t * 1.8) * 0.012 * (1 - walkBlend);
      rootRef.current.position.y = restOffset + walkBob + idleBob;
      rootRef.current.rotation.x = activity === 'rest' ? -0.08 : 0;
      rootRef.current.rotation.z = Math.sin(t * 7.2) * 0.03 * walkBlend + Math.sin(t * 1.2) * 0.006 * (1 - walkBlend);
    }
  });

  return (
    <group ref={rootRef}>
      <CharacterModel style={style} limbRefsRef={npcLimbRefs} />
    </group>
  );
}

function autoCenterAndScale(src: THREE.Group, targetSize = 2.0): THREE.Group {
  const clone = src.clone();
  prepareScene(clone);
  const box = new THREE.Box3().setFromObject(clone);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const s = maxDim > 0 ? targetSize / maxDim : 1;
  const group = new THREE.Group();
  group.add(clone);
  clone.position.set(-center.x, -box.min.y, -center.z);
  group.scale.setScalar(s);
  return group;
}

function prepareScene(scene: THREE.Object3D) {
  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    const clonedMaterials = materials.map((material) => {
      const cloned = material.clone();
      if (cloned instanceof THREE.MeshStandardMaterial) {
        cloned.flatShading = true;
        cloned.roughness = Math.max(cloned.roughness, 0.88);
        cloned.metalness = Math.min(cloned.metalness, 0.05);
      }
      cloned.depthWrite = true;
      cloned.needsUpdate = true;
      return cloned;
    });
    child.material = Array.isArray(child.material) ? clonedMaterials : clonedMaterials[0];
  });
}

function findPart(root: THREE.Object3D, names: string[]): THREE.Object3D | null {
  let result: THREE.Object3D | null = null;
  root.traverse((child) => {
    if (!result && names.includes(child.name)) result = child;
  });
  return result;
}

export function KenneyAnimal({ kind }: { kind: 'cat' | 'dog' }) {
  const path = ANIMAL_PATHS[kind];
  const { scene } = useGLTF(path);
  const animationPartsRef = useRef<{ tail: THREE.Object3D | null; legs: THREE.Object3D[] }>({
    tail: null,
    legs: [],
  });
  const model = useMemo(() => {
    const clone = scene.clone();
    return {
      group: autoCenterAndScale(clone, 1.2),
      tail: findPart(clone, ['tail']),
      legs: [
        findPart(clone, ['leg-back-left']),
        findPart(clone, ['leg-back-right']),
        findPart(clone, ['leg-front-left']),
        findPart(clone, ['leg-front-right']),
      ].filter((part): part is THREE.Object3D => part !== null),
    };
  }, [scene]);

  useEffect(() => {
    animationPartsRef.current = {
      tail: model.tail,
      legs: model.legs,
    };
  }, [model]);

  useFrame((state) => {
    const parts = animationPartsRef.current;
    const t = state.clock.elapsedTime;
    if (parts.tail) parts.tail.rotation.y = Math.sin(t * 5.5) * 0.35;
    parts.legs.forEach((leg, i) => {
      leg.rotation.x = Math.sin(t * 7 + i * Math.PI) * 0.18;
    });
  });

  return <primitive object={model.group} />;
}
