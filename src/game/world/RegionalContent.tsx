import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LANDMARKS } from '../../config/landmarks.ts';
import { WORLD_FEATURES, type WorldFeatureId } from '../../config/worldFeatures.ts';
import { useGameStore } from '../../store/useGameStore.ts';
import { groundHeight } from '../../systems/terrain.ts';
import { soundManager } from '../../systems/audio.ts';
import { useGameRefs } from '../controllers/gameRefsContext.ts';
import { LowPolyBoat } from './BoatModel.tsx';
import { KenneyBush } from './KenneyModels.tsx';

const feature = (id: WorldFeatureId) => WORLD_FEATURES.find((entry) => entry.id === id)!;

export function RegionalContent() {
  return (
    <group>
      <RuinAtmosphere />
      <RuinPuzzle />
      <VillageStalls />
      <BeachActivities />
      <RegionalAmbient />
    </group>
  );
}

function RuinAtmosphere() {
  const fireflies = useMemo(() => Array.from({ length: 28 }, (_, i) => {
    const angle = i * 2.399;
    const radius = 2.5 + (i % 7) * 1.15;
    return {
      x: LANDMARKS.forestRuins.center.x + Math.cos(angle) * radius,
      z: LANDMARKS.forestRuins.center.z + Math.sin(angle) * radius,
      phase: i * 0.73,
      y: 0.9 + (i % 5) * 0.42,
    };
  }), []);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const t = state.clock.elapsedTime;
    group.children.forEach((child, i) => {
      const point = fireflies[i];
      child.position.x = point.x + Math.sin(t * 0.55 + point.phase) * 0.65;
      child.position.z = point.z + Math.cos(t * 0.47 + point.phase) * 0.55;
      child.position.y = groundHeight(point.x, point.z) + point.y + Math.sin(t * 1.3 + point.phase) * 0.28;
      child.scale.setScalar(0.75 + Math.sin(t * 3 + point.phase) * 0.25);
    });
  });

  return (
    <group>
      <group ref={groupRef}>
        {fireflies.map((point, i) => (
          <mesh key={i} position={[point.x, groundHeight(point.x, point.z) + point.y, point.z]}>
            <sphereGeometry args={[0.07, 6, 5]} />
            <meshBasicMaterial color={i % 3 === 0 ? '#a8f2be' : '#e8ef7a'} />
          </mesh>
        ))}
      </group>
      {LANDMARKS.forestRuins.pillars.map((pillar, i) => (
        <group key={pillar.id} position={[pillar.x, groundHeight(pillar.x, pillar.z), pillar.z]}>
          {[0.45, 1.15, 1.85].map((y, j) => (
            <mesh key={y} position={[0.43 * Math.sin(i + j), y, 0.43 * Math.cos(i + j)]} rotation={[0, i + j, 0.3]}>
              <torusGeometry args={[0.38 + j * 0.05, 0.055, 5, 10, Math.PI * 1.3]} />
              <meshStandardMaterial color="#517a42" flatShading roughness={1} />
            </mesh>
          ))}
        </group>
      ))}
      {LANDMARKS.forestRuins.shrubs.map((shrub, i) => (
        <group key={shrub.id} position={[shrub.x, groundHeight(shrub.x, shrub.z) + 0.02, shrub.z]} scale={[1.15, 0.5, 1.15]}>
          <KenneyBush variant={i + 1} size={1.1} />
        </group>
      ))}
    </group>
  );
}

function RuinPuzzle() {
  const progress = useGameStore((s) => s.regionProgress);
  const daily = useGameStore((s) => s.social.daily);
  const day = useGameStore((s) => s.clock.day);
  const runeIds: WorldFeatureId[] = ['ruin_rune_1', 'ruin_rune_2', 'ruin_rune_3'];
  const center = LANDMARKS.forestRuins.center;
  const y = groundHeight(center.x, center.z);
  const currentRunes = progress.ruinChestOpened && daily['ruin:started'] !== day ? 0 : progress.ruinRunes;

  return (
    <group>
      {runeIds.map((id, i) => {
        const point = feature(id);
        const active = currentRunes >= i + 1;
        return (
          <group key={id} position={[point.x, groundHeight(point.x, point.z) + 1.05, point.z]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.3, 0.065, 6, 12]} />
              <meshStandardMaterial
                color={active ? '#89e8c0' : '#617067'}
                emissive={active ? '#3ba879' : '#000000'}
                emissiveIntensity={active ? 1.6 : 0}
                flatShading
              />
            </mesh>
            {active && <pointLight color="#75efb5" intensity={0.7} distance={4} />}
          </group>
        );
      })}
      <group position={[center.x, y + 0.72, center.z]}>
        <mesh castShadow rotation={[0, progress.ruinChestOpened ? -0.5 : 0, 0]}>
          <boxGeometry args={[1.35, 0.72, 0.9]} />
          <meshStandardMaterial color="#68472b" flatShading roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.05, 0.47]}>
          <boxGeometry args={[0.26, 0.32, 0.08]} />
          <meshStandardMaterial color="#d5ad4f" metalness={0.35} roughness={0.55} />
        </mesh>
      </group>
    </group>
  );
}

function Stall({ id, color, canopy, goods }: { id: WorldFeatureId; color: string; canopy: string; goods: string }) {
  const point = feature(id);
  const y = groundHeight(point.x, point.z);
  return (
    <group position={[point.x, y, point.z]}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 0.18, 1.25]} />
        <meshStandardMaterial color={color} flatShading roughness={1} />
      </mesh>
      {[-0.95, 0.95].map((x) => (
        <mesh key={x} position={[x, 1.4, -0.45]} castShadow>
          <boxGeometry args={[0.1, 2.6, 0.1]} />
          <meshStandardMaterial color="#5d3e29" flatShading roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 2.55, -0.05]} rotation={[0.08, 0, 0]} castShadow>
        <boxGeometry args={[2.9, 0.15, 1.8]} />
        <meshStandardMaterial color={canopy} flatShading roughness={1} />
      </mesh>
      {[-0.65, 0, 0.65].map((x, i) => (
        <mesh key={x} position={[x, 0.78, 0]} castShadow>
          <sphereGeometry args={[0.18 + i * 0.025, 7, 5]} />
          <meshStandardMaterial color={goods} flatShading roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 1.65, -0.55]}>
        <boxGeometry args={[1.45, 0.48, 0.08]} />
        <meshStandardMaterial color="#eee1bd" flatShading roughness={1} />
      </mesh>
    </group>
  );
}

function VillageStalls() {
  return (
    <group>
      <Stall id="village_stall_mira" color="#a87255" canopy="#d66b8a" goods="#e9bc48" />
      <Stall id="village_stall_tao" color="#8a684b" canopy="#548eb4" goods="#82c8d7" />
      <Stall id="village_stall_lina" color="#9c724d" canopy="#d19a49" goods="#7a4b2c" />
    </group>
  );
}

function BeachActivities() {
  const progress = useGameStore((s) => s.regionProgress);
  const day = useGameStore((s) => s.clock.day);
  const volleyball = useGameStore((s) => s.volleyball);
  const foamRef = useRef<THREE.Group>(null);
  const boatRef = useRef<THREE.Group>(null);
  const ballRef = useRef<THREE.Mesh>(null);
  const vbResetCheck = useRef(0);
  const shellIds = ['beach_shell_1', 'beach_shell_2', 'beach_shell_3', 'beach_shell_4', 'beach_shell_5'] as const;

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (foamRef.current) {
      foamRef.current.children.forEach((child, i) => {
        const pulse = 0.85 + Math.sin(t * 1.4 + i) * 0.18;
        child.scale.set(pulse, pulse, pulse);
      });
    }
    if (boatRef.current) {
      boatRef.current.position.y = -1.0 + Math.sin(t * 0.9) * 0.12;
      boatRef.current.rotation.z = Math.sin(t * 0.65) * 0.06;
      boatRef.current.position.x = 56 + Math.sin(t * 0.12) * 2.5;
    }
    if (ballRef.current) {
      const now = performance.now();
      if (volleyball.active && now > volleyball.expiresAt + 600) {
        vbResetCheck.current += delta;
        if (vbResetCheck.current > 0.5) {
          useGameStore.setState({ volleyball: { active: false, hits: 0, targetAt: 0, expiresAt: 0 } });
          vbResetCheck.current = 0;
        }
      } else {
        vbResetCheck.current = 0;
      }
      const challengePhase = volleyball.active
        ? THREE.MathUtils.clamp(1 - Math.abs(now - volleyball.targetAt) / 900, 0, 1)
        : Math.abs(Math.sin(t * 2.2));
      ballRef.current.position.y = groundHeight(41.5, -55) + 0.55 + challengePhase * 2.15;
      ballRef.current.position.x = 41.5 + Math.sin(t * 1.8) * (volleyball.active ? 0.8 : 0.25);
      ballRef.current.rotation.x += 0.025;
    }
  });

  return (
    <group>
      {shellIds.map((id, i) => {
        if (progress.collectedShells[`${id}:${day}`]) return null;
        const point = feature(id);
        return (
          <group key={id} position={[point.x, Math.max(groundHeight(point.x, point.z), -1.05) + 0.13, point.z]} rotation={[0, i * 0.9, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[0.28, 8, 5, 0, Math.PI]} />
              <meshStandardMaterial color={['#f2b6ad', '#f0d08a', '#c9a9db', '#9fd3cf', '#efb68d'][i]} flatShading roughness={0.86} />
            </mesh>
          </group>
        );
      })}
      <mesh ref={ballRef} position={[41.5, groundHeight(41.5, -55) + 1.1, -55]} castShadow>
        <sphereGeometry args={[0.32, 10, 8]} />
        <meshStandardMaterial color="#f4e7c8" flatShading roughness={0.8} />
      </mesh>
      <group ref={foamRef}>
        {Array.from({ length: 15 }, (_, i) => {
          const x = 28 + i * 1.8;
          const z = -72 + Math.sin(i * 0.8) * 1.1;
          return (
            <mesh key={i} position={[x, -1.27, z]} rotation={[-Math.PI / 2, 0, i * 0.4]}>
              <ringGeometry args={[0.28, 0.48 + (i % 3) * 0.15, 12]} />
              <meshBasicMaterial color="#eef9ff" transparent opacity={0.55} depthWrite={false} />
            </mesh>
          );
        })}
      </group>
      <group ref={boatRef} position={[56, -1, -76]} rotation={[0, -0.65, 0]}>
        <LowPolyBoat sail />
      </group>
    </group>
  );
}

function RegionalAmbient() {
  const { playerRef } = useGameRefs();
  const lastForestRef = useRef(0);
  const lastBeachRef = useRef(0);

  useFrame((state) => {
    const player = playerRef.current;
    if (!player || !soundManager.ready) return;
    const now = state.clock.elapsedTime;
    const ruinDist = Math.hypot(player.position.x - LANDMARKS.forestRuins.center.x, player.position.z - LANDMARKS.forestRuins.center.z);
    if (ruinDist < 18 && now - lastForestRef.current > 7) {
      soundManager.play('forestAmbient');
      lastForestRef.current = now;
    }
    const beachDist = Math.hypot(player.position.x - LANDMARKS.beachClub.center.x, player.position.z - LANDMARKS.beachClub.center.z);
    if (beachDist < 22 && now - lastBeachRef.current > 5) {
      soundManager.play('waveAmbient');
      lastBeachRef.current = now;
    }
  });

  return null;
}
