import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MUSEUM } from '../../config/constants.ts';
import { useGameStore } from '../../store/useGameStore.ts';
import { KenneyBugModel, KenneyFishModel } from '../world/KenneyModels.tsx';

const HALF = MUSEUM.interiorSize / 2;

const FISH_ENTRIES = [
  { id: 'fish_common', label: '鲈鱼', icon: '🐟', color: '#6a9a8a' },
  { id: 'fish_rare', label: '金鱼', icon: '🐠', color: '#d4a040' },
  { id: 'fish_legend', label: '鲨鱼', icon: '🦈', color: '#607080' },
] as const;

const BUG_ENTRIES = [
  { id: 'bug_common', label: '蝴蝶', icon: '🦋', color: '#a0c860' },
  { id: 'bug_rare', label: '萤火虫', icon: '✨', color: '#60a8d0' },
] as const;

export function MuseumInterior() {
  const scene = useGameStore((s) => s.scene);
  if (scene !== 'museum') return null;

  return (
    <group>
      <InteriorShell />
      <FishTankWall />
      <BugDisplayWall />
      <DonationDesk />
      <CompletionPlaque />
    </group>
  );
}

function InteriorShell() {
  return (
    <group>
      {/* 大理石地板 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[MUSEUM.interiorSize, MUSEUM.interiorSize]} />
        <meshStandardMaterial color="#e8e0d4" flatShading roughness={0.7} />
      </mesh>
      <MuseumDressing />
      {/* 地板装饰线 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[6, 6.3, 32]} />
        <meshBasicMaterial color="#c8b898" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      {/* 后墙 */}
      <mesh position={[0, 3, -HALF]} receiveShadow castShadow>
        <boxGeometry args={[MUSEUM.interiorSize, 6, 0.3]} />
        <meshStandardMaterial color="#f0e8dc" flatShading roughness={1} />
      </mesh>
      {/* 前墙 */}
      <mesh position={[0, 3, HALF]} receiveShadow castShadow>
        <boxGeometry args={[MUSEUM.interiorSize, 6, 0.3]} />
        <meshStandardMaterial color="#f0e8dc" flatShading roughness={1} />
      </mesh>
      <mesh position={[-HALF, 3, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.3, 6, MUSEUM.interiorSize]} />
        <meshStandardMaterial color="#f0e8dc" flatShading roughness={1} />
      </mesh>
      <mesh position={[HALF, 3, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.3, 6, MUSEUM.interiorSize]} />
        <meshStandardMaterial color="#f0e8dc" flatShading roughness={1} />
      </mesh>
      {/* 天花板 */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 6, 0]}>
        <planeGeometry args={[MUSEUM.interiorSize, MUSEUM.interiorSize]} />
        <meshStandardMaterial color="#f5f0e8" flatShading roughness={1} />
      </mesh>
      {/* 出口地毯 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, HALF - 0.8]}>
        <planeGeometry args={[2, 1.4]} />
        <meshStandardMaterial color="#6a4a3a" flatShading roughness={1} />
      </mesh>
      {/* 照明 */}
      <pointLight position={[0, 5.5, 0]} intensity={0.8} distance={28} color="#ffe8c8" />
      <pointLight position={[-7, 4, -HALF + 3]} intensity={0.4} distance={14} color="#c8e0ff" />
      <pointLight position={[7, 4, -HALF + 3]} intensity={0.4} distance={14} color="#c8e0ff" />
      <pointLight position={[0, 3, HALF - 4]} intensity={0.3} distance={12} color="#ffd8a0" />
      <ambientLight intensity={0.45} color="#fff5e8" />
    </group>
  );
}

function MuseumDressing() {
  const tileLines = [-0.66, -0.33, 0, 0.33, 0.66].map((t) => t * HALF);
  return (
    <group>
      {tileLines.map((x) => (
        <mesh key={`tile-x-${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.014, 0]}>
          <planeGeometry args={[0.045, MUSEUM.interiorSize - 0.8]} />
          <meshBasicMaterial color="#cbbda8" transparent opacity={0.42} />
        </mesh>
      ))}
      {tileLines.map((z) => (
        <mesh key={`tile-z-${z}`} rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.015, z]}>
          <planeGeometry args={[0.045, MUSEUM.interiorSize - 0.8]} />
          <meshBasicMaterial color="#cbbda8" transparent opacity={0.32} />
        </mesh>
      ))}

      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * (HALF - 0.28), 0.55, 0]}>
            <boxGeometry args={[0.28, 0.34, MUSEUM.interiorSize - 0.8]} />
            <meshStandardMaterial color="#c8b8a0" flatShading roughness={1} />
          </mesh>
          <mesh position={[0, 0.55, side * (HALF - 0.28)]}>
            <boxGeometry args={[MUSEUM.interiorSize - 0.8, 0.34, 0.28]} />
            <meshStandardMaterial color="#c8b8a0" flatShading roughness={1} />
          </mesh>
        </group>
      ))}

      {[-6.5, 6.5].map((x) => (
        <group key={`column-${x}`}>
          <MuseumColumn x={x} z={-HALF + 2.0} />
          <MuseumColumn x={x} z={HALF - 3.0} />
        </group>
      ))}

      {[-5, 0, 5].map((x) => (
        <mesh key={`ceiling-${x}`} position={[x, 5.88, 0]} castShadow>
          <boxGeometry args={[0.22, 0.2, MUSEUM.interiorSize - 1.2]} />
          <meshStandardMaterial color="#d8ccb8" flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function MuseumColumn({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 2.65, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.34, 0.42, 5.3, 8]} />
        <meshStandardMaterial color="#e5dccd" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 0.18, 0]} receiveShadow>
        <boxGeometry args={[1.0, 0.36, 1.0]} />
        <meshStandardMaterial color="#c8b8a0" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 5.32, 0]} castShadow>
        <boxGeometry args={[1.0, 0.34, 1.0]} />
        <meshStandardMaterial color="#d2c4ad" flatShading roughness={1} />
      </mesh>
    </group>
  );
}

function FishTankWall() {
  const donations = useGameStore((s) => s.museumDonations);
  const swimmRef = useRef(0);

  useFrame((_, dt) => {
    swimmRef.current += dt * 0.5;
  });

  const startX = -7;
  return (
    <group position={[0, 0, -HALF + 1]}>
      <mesh position={[0, 2.5, 0.15]}>
        <boxGeometry args={[18, 5, 0.08]} />
        <meshBasicMaterial color="#2a4a6a" transparent opacity={0.15} />
      </mesh>
      {FISH_ENTRIES.map((fish, i) => {
        const donated = !!donations[fish.id];
        const x = startX + i * 6.5;
        return (
          <group key={fish.id} position={[x, 2.8, 0]}>
            {/* 鱼缸玻璃 */}
            <mesh position={[0, 0, 0.6]}>
              <boxGeometry args={[4.5, 3.6, 1.2]} />
              <meshPhysicalMaterial
                color={donated ? '#b0d8e8' : '#d0d8dc'}
                transparent
                opacity={donated ? 0.25 : 0.15}
                roughness={0.1}
                metalness={0}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* 鱼缸底座 */}
            <mesh position={[0, -2, 0]}>
              <boxGeometry args={[4.8, 0.4, 1.6]} />
              <meshStandardMaterial color="#c8b898" flatShading roughness={1} />
            </mesh>
            {/* 缸内底板（沙子） */}
            <mesh position={[0, -1.85, 0]}>
              <boxGeometry args={[4.3, 0.08, 1.0]} />
              <meshStandardMaterial color="#d4c098" flatShading roughness={1} />
            </mesh>
            {/* 水草装饰 */}
            <mesh position={[-1.2, -0.8, 0.3]}>
              <cylinderGeometry args={[0.02, 0.08, 0.5, 4]} />
              <meshStandardMaterial color="#4a8a4a" />
            </mesh>
            <mesh position={[1.4, -0.5, -0.2]}>
              <cylinderGeometry args={[0.02, 0.06, 0.3, 4]} />
              <meshStandardMaterial color="#4a8a4a" />
            </mesh>
            {/* 鱼模型（捐赠后显示） */}
            {donated && <FishModel index={i} />}
            {/* 标签 */}
            <mesh position={[0, -2.25, 0.8]}>
              <planeGeometry args={[2.4, 0.2]} />
              <meshBasicMaterial color={donated ? '#4a7a4a' : '#8a7a62'} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function FishModel({ index }: { index: number }) {
  const ref = useRef<THREE.Group>(null);
  const phase = index * 2.3;

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * 0.8 + phase;
    ref.current.position.x = Math.sin(t) * 1.2;
    ref.current.position.y = Math.sin(t * 1.3) * 0.3;
    ref.current.rotation.x = Math.sin(t * 0.7) * 0.1;
    ref.current.rotation.z = Math.sin(t * 1.1) * 0.06;
    ref.current.rotation.y += 0.01;
  });

  return (
    <group ref={ref} position={[0, 0, 0]} scale={0.58}>
      <KenneyFishModel size={1.0} />
    </group>
  );
}

function BugDisplayWall() {
  const donations = useGameStore((s) => s.museumDonations);

  return (
    <group position={[0, 0, HALF - 1.5]}>
      {BUG_ENTRIES.map((bug, i) => {
        const donated = !!donations[bug.id];
        const x = -2 + i * 5.5;
        return (
          <group key={bug.id} position={[x, 1.8, 0]}>
            {/* 展示柜底座 */}
            <mesh position={[0, -1.2, 0]}>
              <boxGeometry args={[2.8, 1.2, 2]} />
              <meshStandardMaterial color="#d8d0c0" flatShading roughness={1} />
            </mesh>
            {/* 玻璃盖 */}
            <mesh position={[0, 0.4, 0]}>
              <boxGeometry args={[2.6, 0.8, 1.8]} />
              <meshPhysicalMaterial
                color="#e8f0f4"
                transparent
                opacity={0.2}
                roughness={0.1}
                metalness={0}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* 展示台面 */}
            <mesh position={[0, -0.6, 0]}>
              <boxGeometry args={[2.4, 0.08, 1.6]} />
              <meshStandardMaterial color="#f0e8d8" flatShading roughness={0.6} />
            </mesh>
            {/* 绒布内衬 */}
            <mesh position={[0, -0.65, 0]}>
              <boxGeometry args={[2.2, 0.04, 1.4]} />
              <meshBasicMaterial color={donated ? '#4a7a6a' : '#8a7060'} />
            </mesh>
            {/* 虫图标（捐赠后显示） */}
            {donated && (
              <group position={[0, 0.05, 0]} scale={0.72}>
                <KenneyBugModel variant={i} />
              </group>
            )}
            {/* 标签 */}
            <mesh position={[0, -1.6, 0.9]}>
              <planeGeometry args={[1.8, 0.18]} />
              <meshBasicMaterial color={donated ? '#4a7a4a' : '#8a7a62'} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function DonationDesk() {
  const donations = useGameStore((s) => s.museumDonations);
  const total = MUSEUM.donateableItems.length;
  const donated = MUSEUM.donateableItems.filter((id) => donations[id]).length;

  return (
    <group position={[0, 0, HALF - 6]}>
      {/* 柜台 */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[4, 2, 1.4]} />
        <meshStandardMaterial color="#c8b898" flatShading roughness={1} />
      </mesh>
      {/* 台面 */}
      <mesh position={[0, 2.05, 0]}>
        <boxGeometry args={[4.2, 0.12, 1.6]} />
        <meshStandardMaterial color="#e8ddd0" flatShading roughness={0.6} />
      </mesh>
      {/* 捐赠进度牌 */}
      <mesh position={[0, 2.6, 0]}>
        <planeGeometry args={[2.4, 0.3]} />
        <meshBasicMaterial color={donated === total ? '#4a8a3a' : '#5a5a5a'} />
      </mesh>
    </group>
  );
}

function CompletionPlaque() {
  const donations = useGameStore((s) => s.museumDonations);
  const claimed = useGameStore((s) => s.museumRewardClaimed);
  const total = MUSEUM.donateableItems.length;
  const donated = MUSEUM.donateableItems.filter((id) => donations[id]).length;
  const complete = donated === total;

  return (
    <group position={[-HALF + 1.5, 3.5, -HALF + 2]}>
      {/* 展示台 */}
      <mesh position={[0, -1, 0]}>
        <boxGeometry args={[1.6, 2, 0.6]} />
        <meshStandardMaterial color="#8a7a6a" flatShading roughness={1} />
      </mesh>
      {/* 牌匾 */}
      <mesh position={[0, 0.4, 0.35]}>
        <boxGeometry args={[1.2, 0.8, 0.06]} />
        <meshStandardMaterial
          color={complete ? '#c8a040' : '#6a5a4a'}
          flatShading
          metalness={complete ? 0.3 : 0}
          roughness={0.4}
        />
      </mesh>
      {/* 进度文字（用平面带颜色模拟） */}
      <mesh position={[0, 0.4, 0.4]}>
        <planeGeometry args={[1.0, 0.5]} />
        <meshBasicMaterial color={complete ? '#f0d878' : '#9a8a78'} />
      </mesh>
      <mesh position={[0, -0.2, 0.4]}>
        <planeGeometry args={[0.6, 0.08]} />
        <meshBasicMaterial color={claimed ? '#6aaa4a' : '#8a7a62'} />
      </mesh>
    </group>
  );
}
