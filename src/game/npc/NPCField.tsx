import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { NPCS, npcPositionAt, type NpcDef } from '../../config/npcs.ts';
import { HOUSE, TREE } from '../../config/constants.ts';
import { MAP_LAYOUT } from '../../config/mapLayout.ts';
import { useGameStore } from '../../store/useGameStore.ts';
import { blocksWalking, groundHeight, nearestWalkable } from '../../systems/terrain.ts';
import { getStaticObstacles, type StaticObstacle } from '../../systems/staticObstacles.ts';
import { useOcclusionOpacity } from '../controllers/useOcclusionOpacity.ts';
import { useGameTimeRef } from '../useGameTimeRef.ts';
import { KenneyNPC, type NpcActivity } from '../world/KenneyCharacters.tsx';
import { BuildingYard, Chimney, LowPolyBuilding, Planters, PorchColumns } from '../world/BuildingKit.tsx';
import { KenneyFlower, KenneyLog } from '../world/KenneyModels.tsx';

const NPC_CHARACTER_MAP: Record<string, number> = { mira: 1, tao: 2, lina: 3 };
const NPC_YARD_VARIANT: Record<string, number> = { mira: 0, tao: 1, lina: 2 };
const NPC_STYLE_MAP = { mira: 'mira', tao: 'tao', lina: 'lina' } as const;
const NPC_MODEL_YAW_OFFSET = Math.PI;
const NPC_BODY_RADIUS = 0.52;

export function NPCField() {
  const scene = useGameStore((s) => s.scene);
  const trees = useGameStore((s) => s.trees);
  const navigationObstacles = useMemo<StaticObstacle[]>(() => [
    ...getStaticObstacles(),
    { id: 'player-house', label: '玩家房屋', pos: HOUSE.pos, radius: HOUSE.radius + 0.4 },
    { id: 'shop-building', label: '商店', pos: MAP_LAYOUT.shop.pos, radius: 3.7 },
    { id: 'museum-building', label: '博物馆', pos: MAP_LAYOUT.museum.pos, radius: 4.5 },
    ...NPCS.map((resident) => ({
      id: `${resident.id}-house`,
      label: '居民房屋',
      pos: resident.homePos,
      radius: 3.45,
    })),
    ...trees
      .filter((tree) => tree.state === 'intact')
      .map((tree) => ({
        id: tree.id,
        label: '树木',
        pos: tree.pos,
        radius: TREE.radius + 0.2,
      })),
  ], [trees]);
  if (scene !== 'island') return null;

  return (
    <group>
      {NPCS.map((npc) => (
        <group key={npc.id}>
          <NPCHouse npc={npc} />
          <NPC npc={npc} obstacles={navigationObstacles} />
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
        <CareerYard npcId={npc.id} />
        <mesh position={[0.68, 1.95, 2.02]}>
          <sphereGeometry args={[0.085, 8, 6]} />
          <meshBasicMaterial color="#ffe0a0" />
        </mesh>
      </LowPolyBuilding>
    </group>
  );
}

function CareerYard({ npcId }: { npcId: NpcDef['id'] }) {
  if (npcId === 'mira') {
    return (
      <group position={[-3.25, 0, -0.2]}>
        {[-0.55, 0, 0.55].map((z, row) => (
          <group key={z} position={[0, 0, z]}>
            <mesh position={[0, 0.07, 0]} receiveShadow>
              <boxGeometry args={[1.65, 0.14, 0.38]} />
              <meshStandardMaterial color="#73523a" flatShading roughness={1} />
            </mesh>
            {[-0.55, 0, 0.55].map((x, column) => (
              <group key={x} position={[x, 0.15, 0]} scale={0.55 + ((row + column) % 2) * 0.1}>
                <KenneyFlower variant={row + column} />
              </group>
            ))}
          </group>
        ))}
      </group>
    );
  }
  if (npcId === 'tao') {
    return (
      <group position={[3.1, 0, -0.35]}>
        {[-0.65, 0.65].map((x) => (
          <mesh key={x} position={[x, 0.72, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.07, 1.45, 7]} />
            <meshStandardMaterial color="#65452d" flatShading roughness={1} />
          </mesh>
        ))}
        <mesh position={[0, 1.3, 0]} castShadow>
          <boxGeometry args={[1.5, 0.1, 0.12]} />
          <meshStandardMaterial color="#765334" flatShading roughness={1} />
        </mesh>
        {[-0.42, 0, 0.42].map((x, index) => (
          <mesh key={x} position={[x, 0.72, 0.08]} rotation={[0, 0, -0.12 + index * 0.12]} castShadow>
            <cylinderGeometry args={[0.018, 0.026, 1.05, 6]} />
            <meshStandardMaterial color={index === 1 ? '#50788d' : '#6a4a2b'} flatShading roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0.9, 0.22, 0.15]} castShadow>
          <cylinderGeometry args={[0.24, 0.18, 0.4, 10]} />
          <meshStandardMaterial color="#7d9aaa" flatShading roughness={0.82} />
        </mesh>
      </group>
    );
  }
  return (
    <group position={[-3.2, 0, -0.35]}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.16, 0.72]} />
        <meshStandardMaterial color="#8a5c34" flatShading roughness={1} />
      </mesh>
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, 0.27, 0]} castShadow>
          <boxGeometry args={[0.14, 0.55, 0.55]} />
          <meshStandardMaterial color="#674329" flatShading roughness={1} />
        </mesh>
      ))}
      <group position={[1.3, 0, 0.15]} rotation={[0, 0.4, 0]}>
        <KenneyLog stack />
      </group>
      <mesh position={[-0.2, 0.74, 0]} rotation={[0, 0, -0.35]} castShadow>
        <boxGeometry args={[0.7, 0.08, 0.18]} />
        <meshStandardMaterial color="#74797d" flatShading roughness={0.65} metalness={0.18} />
      </mesh>
    </group>
  );
}

function NPC({ npc, obstacles }: { npc: NpcDef; obstacles: StaticObstacle[] }) {
  const groupRef = useRef<THREE.Group>(null);
  const debugLineRef = useRef<THREE.Line>(null);
  const debugWaypointRef = useRef<THREE.Mesh>(null);
  const movingRef = useRef(false);
  const activityRef = useRef<NpcActivity>('idle');
  const workPropRef = useRef<THREE.Group>(null);
  const restPropRef = useRef<THREE.Group>(null);
  const previousPositionRef = useRef(new THREE.Vector2());
  const navigatorPositionRef = useRef(new THREE.Vector2());
  const waypointRef = useRef(new THREE.Vector2());
  const initializedRef = useRef(false);
  const facingRef = useRef(0);
  const avoidanceSideRef = useRef(npc.id === 'tao' ? -1 : 1);
  const stuckRef = useRef({ elapsed: 0, bestDistance: Number.POSITIVE_INFINITY, recoveries: 0 });
  const gameTimeRef = useGameTimeRef();
  const npcObstacles = useMemo(
    () => obstacles.filter((obstacle) => obstacle.id !== `${npc.id}-house`),
    [npc.id, obstacles],
  );
  const debugGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9), 3));
    return geometry;
  }, []);
  const debugLine = useMemo(
    () => new THREE.Line(debugGeometry, new THREE.LineBasicMaterial({ color: '#ffcf40' })),
    [debugGeometry],
  );

  useFrame((state, delta) => {
    const t = gameTimeRef.current;
    const destination = npcPositionAt(npc, t);
    if (!initializedRef.current) {
      const safe = nearestWalkable(destination[0], destination[2]);
      navigatorPositionRef.current.set(safe[0], safe[2]);
      previousPositionRef.current.copy(navigatorPositionRef.current);
      initializedRef.current = true;
    }

    const current = navigatorPositionRef.current;
    const target = new THREE.Vector2(destination[0], destination[2]);
    const targetDistance = current.distanceTo(target);
    const waypoint = chooseNpcWaypoint(current, target, npcObstacles, avoidanceSideRef.current);
    waypointRef.current.copy(waypoint);
    const movement = waypoint.clone().sub(current);
    const movementDistance = movement.length();
    const step = Math.min(movementDistance, delta * 1.35);
    if (movementDistance > 0.001) {
      movement.multiplyScalar(step / movementDistance);
      const candidateX = current.x + movement.x;
      const candidateZ = current.y + movement.y;
      if (!blocksWalking(candidateX, candidateZ)) current.set(candidateX, candidateZ);
    }

    const stuck = stuckRef.current;
    if (targetDistance + 0.08 < stuck.bestDistance) {
      stuck.bestDistance = targetDistance;
      stuck.elapsed = 0;
    } else if (targetDistance > 0.75) {
      stuck.elapsed += delta;
    }
    if (stuck.elapsed > 1.6) {
      avoidanceSideRef.current *= -1;
      stuck.elapsed = 0;
      stuck.bestDistance = targetDistance;
      stuck.recoveries += 1;
      if (stuck.recoveries >= 3) {
        const safe = nearestWalkable(destination[0], destination[2]);
        current.set(safe[0], safe[2]);
        stuck.recoveries = 0;
      }
    } else if (targetDistance < 0.5) {
      stuck.recoveries = 0;
      stuck.bestDistance = targetDistance;
    }

    const x = current.x, z = current.y;
    const y = groundHeight(x, z);
    const dx = x - previousPositionRef.current.x;
    const dz = z - previousPositionRef.current.y;
    const frameDistance = Math.hypot(dx, dz);
    movingRef.current = frameDistance > 0.00008;
    if (movingRef.current) {
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
    const debugVisible = navigationDebugEnabled();
    if (debugLineRef.current) debugLineRef.current.visible = debugVisible;
    const positions = debugGeometry.getAttribute('position') as THREE.BufferAttribute;
    positions.setXYZ(0, x, y + 0.08, z);
    positions.setXYZ(1, waypoint.x, groundHeight(waypoint.x, waypoint.y) + 0.08, waypoint.y);
    positions.setXYZ(2, destination[0], groundHeight(destination[0], destination[2]) + 0.08, destination[2]);
    positions.needsUpdate = true;
    debugGeometry.computeBoundingSphere();
    if (debugWaypointRef.current) {
      debugWaypointRef.current.visible = debugVisible;
      debugWaypointRef.current.position.set(waypoint.x, groundHeight(waypoint.x, waypoint.y) + 0.18, waypoint.y);
    }
  });

  return (
    <>
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
      <primitive ref={debugLineRef} object={debugLine} />
      <mesh ref={debugWaypointRef}>
        <sphereGeometry args={[0.14, 8, 6]} />
        <meshBasicMaterial color="#ff5b45" depthTest={false} />
      </mesh>
    </>
  );
}

function chooseNpcWaypoint(
  current: THREE.Vector2,
  target: THREE.Vector2,
  obstacles: StaticObstacle[],
  side: number,
): THREE.Vector2 {
  const direction = target.clone().sub(current);
  const length = direction.length();
  if (length < 0.05) return target;
  direction.multiplyScalar(1 / length);
  let nearest: { obstacle: StaticObstacle; along: number; clearance: number } | null = null;
  for (const obstacle of obstacles) {
    const toObstacle = new THREE.Vector2(obstacle.pos[0] - current.x, obstacle.pos[2] - current.y);
    const along = toObstacle.dot(direction);
    if (along <= 0 || along >= Math.min(length, 7)) continue;
    const perpendicularDistance = Math.abs(toObstacle.x * direction.y - toObstacle.y * direction.x);
    const clearance = obstacle.radius + NPC_BODY_RADIUS + 0.55;
    if (perpendicularDistance >= clearance) continue;
    if (!nearest || along < nearest.along) nearest = { obstacle, along, clearance };
  }
  if (!nearest) return target;
  const perpendicular = new THREE.Vector2(-direction.y * side, direction.x * side);
  return new THREE.Vector2(nearest.obstacle.pos[0], nearest.obstacle.pos[2])
    .addScaledVector(perpendicular, nearest.clearance);
}

function lerpAngle(current: number, target: number, amount: number): number {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * amount;
}

function navigationDebugEnabled(): boolean {
  const settings = (window as unknown as Record<string, unknown>).__settings as { navigationDebug?: boolean } | undefined;
  return settings?.navigationDebug === true;
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
