import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BUG, FISH, HOUSE, WORLD } from '../../config/constants.ts';
import { MAP_LAYOUT } from '../../config/mapLayout.ts';
import { NPCS, npcPositionAt } from '../../config/npcs.ts';
import { ANIMALS, animalPositionAt } from '../../config/animals.ts';
import { useGameStore } from '../../store/useGameStore.ts';
import { groundHeight } from '../../systems/terrain.ts';
import { BRIDGE_WALK_HEIGHT, BRIDGES } from '../../systems/terrain.ts';
import { fishWaterPos } from '../../systems/worldgen.ts';
import { useGameRefs } from '../controllers/gameRefsContext.ts';
import { useGameTimeRef } from '../useGameTimeRef.ts';

interface MarkerProps {
  pos: [number, number, number];
  radius: number;
  color: string;
  label?: string;
  always?: boolean;
}

interface SmoothMarkerProps {
  npcId?: string;
  animalId?: string;
  yOffset: number;
  radius: number;
  color: string;
  label?: string;
  always?: boolean;
}

export function InteractionMarkers() {
  const scene = useGameStore((s) => s.scene);
  const trees = useGameStore((s) => s.trees);
  const fishSpots = useGameStore((s) => s.fishSpots);
  const bugs = useGameStore((s) => s.bugs);
  if (scene !== 'island') return null;

  return (
    <group>
      <Marker pos={[HOUSE.pos[0], groundHeight(HOUSE.pos[0], HOUSE.pos[2]) + 2.7, HOUSE.pos[2] + 2.8]} radius={HOUSE.interactRadius} color="#f0c36a" label="E" always />
      <Marker
        pos={[MAP_LAYOUT.shop.pos[0], groundHeight(MAP_LAYOUT.shop.pos[0], MAP_LAYOUT.shop.pos[2]) + 3.1, MAP_LAYOUT.shop.pos[2] + 2.5]}
        radius={MAP_LAYOUT.shop.interactRadius}
        color="#6fbf73"
        label="E"
        always
      />
      {BRIDGES.map((bridge) => (
        <Marker
          key={bridge.id}
          pos={[bridge.pos[0], BRIDGE_WALK_HEIGHT + 1.15, bridge.pos[2]]}
          radius={14}
          color="#f0b45a"
          always
        />
      ))}
      {NPCS.map((npc) => (
        <SmoothMarker
          key={npc.id}
          npcId={npc.id}
          yOffset={2.25}
          radius={WORLD.interactRadius}
          color={npc.color}
          label="E"
          always
        />
      ))}
      {ANIMALS.map((animal) => (
        <SmoothMarker
          key={animal.id}
          animalId={animal.id}
          yOffset={1.35}
          radius={WORLD.interactRadius}
          color={animal.color}
          label="E"
        />
      ))}
      {fishSpots.map((spot) => {
        if (spot.state !== 'idle') return null;
        const p = fishWaterPos(spot);
        return <Marker key={spot.id} pos={[p[0], p[1] + 0.65, p[2]]} radius={FISH.interactRadius + 1.5} color="#8fd3ff" />;
      })}
      {bugs.map((bug) => {
        if (bug.state !== 'active') return null;
        return (
          <Marker
            key={bug.id}
            pos={[bug.pos[0], groundHeight(bug.pos[0], bug.pos[2]) + 1.9, bug.pos[2]]}
            radius={BUG.alertRadius + 1}
            color={bug.variant === 1 ? '#fff0a0' : '#e7b7ff'}
          />
        );
      })}
      {trees.map((tree) => {
        if (tree.state !== 'intact') return null;
        return (
          <Marker
            key={tree.id}
            pos={[tree.pos[0], groundHeight(tree.pos[0], tree.pos[2]) + 3.8, tree.pos[2]]}
            radius={WORLD.interactRadius}
            color="#cfe77a"
          />
        );
      })}
    </group>
  );
}

function Marker({ pos, radius, color, label, always = false }: MarkerProps) {
  const { playerRef } = useGameRefs();
  const groupRef = useRef<THREE.Group>(null);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 }), [color]);
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide }), [color]);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const player = playerRef.current;
    const dist = player ? Math.hypot(player.position.x - pos[0], player.position.z - pos[2]) : Infinity;
    const visible = always || dist <= radius;
    group.visible = visible;
    if (!visible) return;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.12;
    group.scale.setScalar(pulse);
    group.position.y = pos[1] + Math.sin(state.clock.elapsedTime * 2.2) * 0.08;
  });

  return (
    <group ref={groupRef} position={pos}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.34, 20]} />
        <primitive object={ringMat} attach="material" />
      </mesh>
      {label && (
        <mesh>
          <circleGeometry args={[0.28, 20]} />
          <primitive object={mat} attach="material" />
        </mesh>
      )}
    </group>
  );
}

function SmoothMarker({ npcId, animalId, yOffset, radius, color, label, always = false }: SmoothMarkerProps) {
  const { playerRef } = useGameRefs();
  const groupRef = useRef<THREE.Group>(null);
  const tRef = useGameTimeRef();
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 }), [color]);
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide }), [color]);
  const npc = useMemo(() => npcId ? NPCS.find((n) => n.id === npcId) : undefined, [npcId]);
  const animal = useMemo(() => animalId ? ANIMALS.find((a) => a.id === animalId) : undefined, [animalId]);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const t = tRef.current;
    let px: number, pz: number;
    if (npc) {
      const p = npcPositionAt(npc, t);
      px = p[0]; pz = p[2];
    } else if (animal) {
      const p = animalPositionAt(animal, t);
      px = p[0]; pz = p[2];
    } else return;
    const y = groundHeight(px, pz);
    const player = playerRef.current;
    const dist = player ? Math.hypot(player.position.x - px, player.position.z - pz) : Infinity;
    const visible = always || dist <= radius;
    group.visible = visible;
    if (!visible) return;
    group.position.set(px, y + yOffset, pz);
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.12;
    group.scale.setScalar(pulse);
    group.position.y = y + yOffset + Math.sin(state.clock.elapsedTime * 2.2) * 0.08;
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.34, 20]} />
        <primitive object={ringMat} attach="material" />
      </mesh>
      {label && (
        <mesh>
          <circleGeometry args={[0.28, 20]} />
          <primitive object={mat} attach="material" />
        </mesh>
      )}
    </group>
  );
}
