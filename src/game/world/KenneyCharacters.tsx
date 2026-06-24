import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MutableRefObject, RefObject } from 'react';

const ANIMAL_PATHS = {
  cat: '/assets/models/kenney/animals/animal-cat.glb',
  dog: '/assets/models/kenney/animals/animal-dog.glb',
} as const;
(Object.values(ANIMAL_PATHS) as string[]).forEach((p) => useGLTF.preload(p));

export interface PlayerLimbRefs {
  legLeft: THREE.Object3D;
  legRight: THREE.Object3D;
  armLeft: THREE.Object3D;
  armRight: THREE.Object3D;
  bodyGroup: THREE.Group;
}

type CharacterStyle = 'player' | 'mira' | 'tao' | 'lina';

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
  const cfg = STYLE[style];
  const bodyRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!limbRefsRef || !bodyRef.current || !leftLegRef.current || !rightLegRef.current || !leftArmRef.current || !rightArmRef.current) return;
    limbRefsRef.current = {
      legLeft: leftLegRef.current,
      legRight: rightLegRef.current,
      armLeft: leftArmRef.current,
      armRight: rightArmRef.current,
      bodyGroup: bodyRef.current,
    };
    return () => {
      limbRefsRef.current = null;
    };
  }, [limbRefsRef]);

  return (
    <group ref={bodyRef}>
      <group ref={leftLegRef} position={[-0.16, 0.62, 0]}>
        <Leg color={cfg.pants} shoeColor={cfg.shoes} />
      </group>
      <group ref={rightLegRef} position={[0.16, 0.62, 0]}>
        <Leg color={cfg.pants} shoeColor={cfg.shoes} />
      </group>

      <mesh position={[0, 1.08, 0]} scale={[1.05, 1, 0.78]} castShadow receiveShadow>
        <capsuleGeometry args={[0.31, 0.36, 5, 8]} />
        <meshStandardMaterial color={cfg.shirt} flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 0.78, 0.205]} castShadow>
        <boxGeometry args={[0.7, 0.14, 0.08]} />
        <meshStandardMaterial color={cfg.accent} flatShading roughness={1} />
      </mesh>

      <group ref={leftArmRef} position={[-0.43, 1.25, 0]}>
        <Arm color={cfg.skin} sleeveColor={cfg.shirt} flip={-1} />
      </group>
      <group ref={rightArmRef} position={[0.43, 1.25, 0]}>
        <Arm color={cfg.skin} sleeveColor={cfg.shirt} flip={1} />
      </group>

      <mesh position={[0, 1.63, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.27, 12, 10]} />
        <meshStandardMaterial color={cfg.skin} flatShading roughness={0.92} />
      </mesh>
      <mesh position={[-0.28, 1.65, 0]} castShadow>
        <sphereGeometry args={[0.065, 7, 5]} />
        <meshStandardMaterial color={cfg.skin} flatShading roughness={0.92} />
      </mesh>
      <mesh position={[0.28, 1.65, 0]} castShadow>
        <sphereGeometry args={[0.065, 7, 5]} />
        <meshStandardMaterial color={cfg.skin} flatShading roughness={0.92} />
      </mesh>
      <mesh position={[0, 1.78, -0.035]} scale={[1, 0.58, 0.9]} castShadow>
        <sphereGeometry args={[0.29, 10, 8]} />
        <meshStandardMaterial color={cfg.hair} flatShading roughness={1} />
      </mesh>
      <Face />
      <RoleDetails style={style} cfg={cfg} />
    </group>
  );
}

function Leg({ color, shoeColor }: { color: string; shoeColor: string }) {
  return (
    <group>
      <mesh position={[0, -0.28, 0]} castShadow>
        <boxGeometry args={[0.2, 0.56, 0.22]} />
        <meshStandardMaterial color={color} flatShading roughness={1} />
      </mesh>
      <mesh position={[0, -0.6, 0.05]} castShadow>
        <boxGeometry args={[0.24, 0.12, 0.34]} />
        <meshStandardMaterial color={shoeColor} flatShading roughness={1} />
      </mesh>
    </group>
  );
}

function Arm({ color, sleeveColor, flip }: { color: string; sleeveColor: string; flip: 1 | -1 }) {
  return (
    <group rotation={[0, 0, flip * 0.08]}>
      <mesh position={[0, -0.14, 0]} castShadow>
        <boxGeometry args={[0.18, 0.34, 0.2]} />
        <meshStandardMaterial color={sleeveColor} flatShading roughness={1} />
      </mesh>
      <mesh position={[0, -0.45, 0]} castShadow>
        <boxGeometry args={[0.16, 0.34, 0.18]} />
        <meshStandardMaterial color={color} flatShading roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.66, 0.02]} castShadow>
        <sphereGeometry args={[0.1, 8, 6]} />
        <meshStandardMaterial color={color} flatShading roughness={0.95} />
      </mesh>
    </group>
  );
}

function Face() {
  return (
    <group>
      <mesh position={[-0.09, 1.65, 0.245]}>
        <sphereGeometry args={[0.026, 6, 6]} />
        <meshBasicMaterial color="#171717" />
      </mesh>
      <mesh position={[0.09, 1.65, 0.245]}>
        <sphereGeometry args={[0.026, 6, 6]} />
        <meshBasicMaterial color="#171717" />
      </mesh>
      <mesh position={[0, 1.56, 0.252]} scale={[1.35, 0.35, 0.3]}>
        <sphereGeometry args={[0.028, 6, 6]} />
        <meshBasicMaterial color="#7a3d34" />
      </mesh>
    </group>
  );
}

function RoleDetails({ style, cfg }: { style: CharacterStyle; cfg: StyleConfig }) {
  if (style === 'player') {
    return (
      <group>
        <mesh position={[0, 1.93, 0.02]} castShadow>
          <cylinderGeometry args={[0.34, 0.31, 0.14, 12]} />
          <meshStandardMaterial color={cfg.accent} flatShading roughness={1} />
        </mesh>
        <mesh position={[0, 1.88, 0.28]} castShadow>
          <boxGeometry args={[0.62, 0.07, 0.2]} />
          <meshStandardMaterial color={cfg.accent} flatShading roughness={1} />
        </mesh>
        <mesh position={[0, 1.06, -0.25]} castShadow>
          <boxGeometry args={[0.48, 0.58, 0.16]} />
          <meshStandardMaterial color="#586b88" flatShading roughness={1} />
        </mesh>
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
        <mesh position={[0, 0.98, 0.22]} castShadow>
          <boxGeometry args={[0.48, 0.44, 0.08]} />
          <meshStandardMaterial color="#f3d0dc" flatShading roughness={1} />
        </mesh>
      </group>
    );
  }
  if (style === 'tao') {
    return (
      <group>
        <mesh position={[0, 1.9, 0.03]} castShadow>
          <cylinderGeometry args={[0.36, 0.32, 0.15, 12]} />
          <meshStandardMaterial color={cfg.hair} flatShading roughness={1} />
        </mesh>
        <mesh position={[0, 1.83, 0.28]} castShadow>
          <boxGeometry args={[0.66, 0.06, 0.22]} />
          <meshStandardMaterial color={cfg.hair} flatShading roughness={1} />
        </mesh>
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
  phaseOffset = 0,
  style = 'mira',
}: {
  characterIndex: number;
  moving?: boolean;
  movingRef?: RefObject<boolean>;
  phaseOffset?: number;
  style?: Exclude<CharacterStyle, 'player'>;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const legLeftRef = useRef<THREE.Object3D | null>(null);
  const legRightRef = useRef<THREE.Object3D | null>(null);
  const armLeftRef = useRef<THREE.Object3D | null>(null);
  const armRightRef = useRef<THREE.Object3D | null>(null);
  const npcLimbRefs = useMemo<MutableRefObject<PlayerLimbRefs | null>>(
    () => ({
      current: null,
    }),
    [],
  );

  useEffect(() => {
    const limbs = npcLimbRefs.current;
    legLeftRef.current = limbs?.legLeft ?? null;
    legRightRef.current = limbs?.legRight ?? null;
    armLeftRef.current = limbs?.armLeft ?? null;
    armRightRef.current = limbs?.armRight ?? null;
  }, [npcLimbRefs]);

  useFrame((state) => {
    const t = state.clock.elapsedTime + phaseOffset;
    const isMoving = movingRef?.current ?? moving;
    animateCharacterParts(
      {
        legLeft: legLeftRef.current,
        legRight: legRightRef.current,
        armLeft: armLeftRef.current,
        armRight: armRightRef.current,
      },
      t * (isMoving ? 7.2 : 2.4),
      isMoving ? 1 : 0.08,
    );
    if (rootRef.current) {
      rootRef.current.position.y = isMoving ? Math.abs(Math.sin(t * 7.2)) * 0.045 : Math.sin(t * 1.8) * 0.012;
      rootRef.current.rotation.z = isMoving ? Math.sin(t * 7.2) * 0.03 : Math.sin(t * 1.2) * 0.006;
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
        cloned.color.offsetHSL(0, 0.03, -0.01);
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
