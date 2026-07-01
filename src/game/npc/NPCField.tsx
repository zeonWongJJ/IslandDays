import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { NPCS, npcPositionAt, type NpcDef } from '../../config/npcs.ts';
import { useGameStore } from '../../store/useGameStore.ts';
import { groundHeight } from '../../systems/terrain.ts';
import { getStaticObstacles, type StaticObstacle } from '../../systems/staticObstacles.ts';
import { useOcclusionOpacity } from '../controllers/useOcclusionOpacity.ts';
import { useGameTimeRef } from '../useGameTimeRef.ts';
import { KenneyNPC, type NpcActivity } from '../world/KenneyCharacters.tsx';
import { BuildingYard, Chimney, LowPolyBuilding, Planters, PorchColumns } from '../world/BuildingKit.tsx';

const NPC_CHARACTER_MAP: Record<string, number> = { mira: 1, tao: 2, lina: 3 };
const NPC_YARD_VARIANT: Record<string, number> = { mira: 0, tao: 1, lina: 2 };
const NPC_STYLE_MAP = { mira: 'mira', tao: 'tao', lina: 'lina' } as const;
const NPC_MODEL_YAW_OFFSET = Math.PI;
const NPC_BODY_RADIUS = 0.52;

export function NPCField() {
  const scene = useGameStore((s) => s.scene);
  if (scene !== 'island') return null;

  return (
    <group>
      {NPCS.map((npc) => (
        <group key={npc.id}>
          <NPCHouse npc={npc} />
          <NPC npc={npc} />
        </group>
      ))}
    </group>
  );
}

function NPCHouse({ npc }: { npc: NpcDef }) {
  const [x, , z] = npc.homePos;
  const y = useMemo(() => groundHeight(x, z), [x, z]);
  const roofOpacity = useOcclusionOpacity(x, z, 3.6, 0.16);

  return (
    <group position={[x, y, z]}>
      <LowPolyBuilding
        width={4.4}
        depth={3.7}
        wallHeight={2.45}
        wallColor={npc.homeColor}
        trimColor="#f2e6d2"
        roofColor="#7f4a35"
        roofRadius={3.45}
        roofHeight={1.75}
        roofOpacity={roofOpacity}
        foundationColor="#8fb060"
        doorWidth={0.95}
        doorHeight={1.65}
        windows={[
          { x: -1.25, y: 1.55, z: 1.9, w: 0.7, h: 0.55 },
          { x: 1.25, y: 1.55, z: 1.9, w: 0.7, h: 0.55 },
          { x: -2.24, y: 1.45, z: -0.55, side: 'left', w: 0.62, h: 0.55 },
        ]}
      >
        <Chimney x={1.2} z={-0.75} y={3.65} />
        <PorchColumns width={2.2} z={2.18} height={1.75} />
        <Planters z={2.28} spread={1.6} />
        <BuildingYard
          width={4.4}
          depth={3.7}
          variantOffset={NPC_YARD_VARIANT[npc.id] ?? 0}
          logs={npc.id === 'lina'}
        />
        <mesh position={[0.68, 1.95, 2.02]}>
          <sphereGeometry args={[0.085, 8, 6]} />
          <meshBasicMaterial color="#ffe0a0" />
        </mesh>
      </LowPolyBuilding>
    </group>
  );
}

function NPC({ npc }: { npc: NpcDef }) {
  const groupRef = useRef<THREE.Group>(null);
  const movingRef = useRef(false);
  const activityRef = useRef<NpcActivity>('idle');
  const workPropRef = useRef<THREE.Group>(null);
  const restPropRef = useRef<THREE.Group>(null);
  const previousPositionRef = useRef(new THREE.Vector2());
  const initializedRef = useRef(false);
  const facingRef = useRef(0);
  const gameTimeRef = useGameTimeRef();
  const obstacles = useMemo(() => getStaticObstacles(), []);

  useFrame((state, delta) => {
    const t = gameTimeRef.current;
    const pos = npcPositionAt(npc, t);
    const ahead = npcPositionAt(npc, t + 0.25);
    const adjusted = avoidRouteObstacles(pos[0], pos[2], ahead[0] - pos[0], ahead[2] - pos[2], obstacles, npc.id);
    const x = adjusted.x, z = adjusted.y;
    const y = groundHeight(x, z);
    const dx = initializedRef.current ? x - previousPositionRef.current.x : 0;
    const dz = initializedRef.current ? z - previousPositionRef.current.y : 0;
    const frameDistance = Math.hypot(dx, dz);
    movingRef.current = frameDistance > 0.00008;
    if (!initializedRef.current) {
      facingRef.current = Math.atan2(ahead[0] - x, ahead[2] - z) + NPC_MODEL_YAW_OFFSET;
      initializedRef.current = true;
    } else if (movingRef.current) {
      const targetYaw = Math.atan2(dx, dz) + NPC_MODEL_YAW_OFFSET;
      facingRef.current = lerpAngle(facingRef.current, targetYaw, Math.min(1, delta * 10));
    }
    previousPositionRef.current.set(x, z);
    const hour = t / 60;
    const waveCycle = (state.clock.elapsedTime + npc.homePos[0] * 0.7 + npc.homePos[2] * 0.3) % 14;
    activityRef.current = movingRef.current
      ? 'walk'
      : waveCycle < 2.4
        ? 'wave'
        : hour >= 10 && hour < 16
          ? 'work'
          : hour < 8 || hour >= 18
            ? 'rest'
            : 'idle';
    if (groupRef.current) {
      groupRef.current.position.set(x, y, z);
      groupRef.current.rotation.set(0, facingRef.current, 0);
    }
    if (workPropRef.current) {
      const working = activityRef.current === 'work';
      workPropRef.current.visible = working;
      workPropRef.current.rotation.z = working ? Math.sin(t * 0.22) * 0.08 : 0;
    }
    if (restPropRef.current) restPropRef.current.visible = activityRef.current === 'rest';
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.45, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.2} />
      </mesh>
      <KenneyNPC
        characterIndex={NPC_CHARACTER_MAP[npc.id] ?? 0}
        movingRef={movingRef}
        activityRef={activityRef}
        phaseOffset={npc.homePos[0] * 0.21 + npc.homePos[2] * 0.13}
        style={NPC_STYLE_MAP[npc.id]}
      />
      <group ref={workPropRef}>
        <NpcWorkProp npcId={npc.id} />
      </group>
      <group ref={restPropRef} position={[0, 0.18, -0.12]}>
        <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.72, 0.12, 0.52]} />
          <meshStandardMaterial color="#8a603d" flatShading roughness={1} />
        </mesh>
        <mesh position={[-0.25, -0.05, 0]} castShadow>
          <boxGeometry args={[0.1, 0.36, 0.1]} />
          <meshStandardMaterial color="#604126" flatShading roughness={1} />
        </mesh>
        <mesh position={[0.25, -0.05, 0]} castShadow>
          <boxGeometry args={[0.1, 0.36, 0.1]} />
          <meshStandardMaterial color="#604126" flatShading roughness={1} />
        </mesh>
      </group>
    </group>
  );
}

function avoidRouteObstacles(
  x: number,
  z: number,
  dx: number,
  dz: number,
  obstacles: StaticObstacle[],
  npcId: NpcDef['id'],
): THREE.Vector2 {
  const result = new THREE.Vector2(x, z);
  const length = Math.hypot(dx, dz);
  if (length < 0.0001) return result;
  const side = npcId === 'tao' ? -1 : 1;
  const perpendicular = new THREE.Vector2(-dz / length * side, dx / length * side);

  for (const obstacle of obstacles) {
    const clearance = obstacle.radius + NPC_BODY_RADIUS + 0.42;
    const ox = result.x - obstacle.pos[0];
    const oz = result.y - obstacle.pos[2];
    const distance = Math.hypot(ox, oz);
    if (distance >= clearance) continue;
    const influence = 1 - distance / clearance;
    result.addScaledVector(perpendicular, influence * clearance * 1.35);
  }
  return result;
}

function lerpAngle(current: number, target: number, amount: number): number {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * amount;
}

function NpcWorkProp({ npcId }: { npcId: NpcDef['id'] }) {
  if (npcId === 'mira') {
    return (
      <group position={[0.5, 0.72, 0.08]} rotation={[0, 0, -0.18]}>
        <mesh castShadow><cylinderGeometry args={[0.16, 0.22, 0.38, 8]} /><meshStandardMaterial color="#7aa6a0" flatShading roughness={0.9} /></mesh>
        <mesh position={[0.2, 0.05, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.035, 0.045, 0.42, 6]} />
          <meshStandardMaterial color="#657b70" flatShading />
        </mesh>
      </group>
    );
  }
  if (npcId === 'tao') {
    return (
      <group position={[0.47, 1.0, 0]} rotation={[0.18, 0, -0.28]}>
        <mesh castShadow><cylinderGeometry args={[0.025, 0.025, 1.25, 7]} /><meshStandardMaterial color="#6d4c2e" flatShading /></mesh>
        <mesh position={[0, 0.62, 0]}><sphereGeometry args={[0.055, 7, 5]} /><meshBasicMaterial color="#cfd8dd" /></mesh>
      </group>
    );
  }
  return (
    <group position={[0.48, 0.92, 0.08]} rotation={[0, 0, -0.42]}>
      <mesh castShadow><cylinderGeometry args={[0.055, 0.065, 0.8, 7]} /><meshStandardMaterial color="#704629" flatShading /></mesh>
      <mesh position={[0, 0.42, 0]} castShadow><boxGeometry args={[0.32, 0.2, 0.16]} /><meshStandardMaterial color="#73777b" flatShading roughness={0.72} metalness={0.12} /></mesh>
    </group>
  );
}
