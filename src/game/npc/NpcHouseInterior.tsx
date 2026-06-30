// NPC 房屋室内：每个 NPC 有独特的内部装修

import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore.ts';

const WALL_H = 3.5;
const HALF = 4.5;

export function NpcHouseInterior() {
  const scene = useGameStore((s) => s.scene);
  const npcId = useGameStore((s) => s.npcHouseId);
  if (scene !== 'npchouse' || !npcId) return null;

  return (
    <group>
      <BaseRoom />
      {npcId === 'mira' && <MiraInterior />}
      {npcId === 'tao' && <TaoInterior />}
      {npcId === 'lina' && <LinaInterior />}
    </group>
  );
}

function BaseRoom() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[HALF * 2, HALF * 2]} />
        <meshStandardMaterial color="#c8b898" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, WALL_H / 2, -HALF]} receiveShadow castShadow>
        <boxGeometry args={[HALF * 2, WALL_H, 0.2]} />
        <meshStandardMaterial color="#f0e8dc" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, WALL_H / 2, HALF]} receiveShadow castShadow>
        <boxGeometry args={[HALF * 2, WALL_H, 0.2]} />
        <meshStandardMaterial color="#f0e8dc" flatShading roughness={1} />
      </mesh>
      <mesh position={[-HALF, WALL_H / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.2, WALL_H, HALF * 2]} />
        <meshStandardMaterial color="#f0e8dc" flatShading roughness={1} />
      </mesh>
      <mesh position={[HALF, WALL_H / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.2, WALL_H, HALF * 2]} />
        <meshStandardMaterial color="#f0e8dc" flatShading roughness={1} />
      </mesh>
      {/* 出口地毯 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, HALF - 0.5]}>
        <planeGeometry args={[1.4, 1.0]} />
        <meshStandardMaterial color="#6a4a3a" flatShading roughness={1} />
      </mesh>
      <pointLight position={[0, 3, 0]} intensity={0.7} distance={16} color="#ffd9a0" />
      <ambientLight intensity={0.5} color="#fff0e0" />
    </group>
  );
}

function MiraInterior() {
  const wallColor = '#f5d8d8';
  const accent = '#d66b8a';
  return (
    <group>
      <ThemedWalls color={wallColor} />
      <mesh position={[0, 0.65, -3]} rotation={[0, 0, 0]}>
        <boxGeometry args={[1.8, 0.14, 0.8]} />
        <meshStandardMaterial color="#b88a5a" flatShading roughness={1} />
      </mesh>
      {[-2, 0, 2].map((x) => (
        <mesh key={`mira-pot-${x}`} position={[x, 0.3, -3.6]} castShadow>
          <cylinderGeometry args={[0.12, 0.16, 0.35, 7]} />
          <meshStandardMaterial color="#8a6030" flatShading roughness={1} />
        </mesh>
      ))}
      {[-2, 0, 2].map((x) => (
        <mesh key={`mira-flower-${x}`} position={[x, 0.65, -3.6]} castShadow>
          <sphereGeometry args={[0.14, 7, 5]} />
          <meshStandardMaterial color={x === -2 ? '#f06a8a' : x === 0 ? '#f0d06a' : '#c06af0'} flatShading roughness={0.8} />
        </mesh>
      ))}
      {/* 花架 */}
      <mesh position={[-3.2, 1.2, -2]} castShadow>
        <boxGeometry args={[0.08, 1.6, 0.6]} />
        <meshStandardMaterial color="#7a5a3a" flatShading roughness={1} />
      </mesh>
      <mesh position={[-3.2, 2.0, -2]} castShadow>
        <boxGeometry args={[0.6, 0.08, 0.6]} />
        <meshStandardMaterial color="#7a5a3a" flatShading roughness={1} />
      </mesh>
      <mesh position={[-3.2, 2.25, -2]}>
        <sphereGeometry args={[0.12, 6, 5]} />
        <meshStandardMaterial color="#f09a5a" flatShading roughness={0.8} />
      </mesh>
      {/* 地毯 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, -0.5]}>
        <planeGeometry args={[2.0, 1.4]} />
        <meshStandardMaterial color={accent} flatShading roughness={1} transparent opacity={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -0.5]}>
        <ringGeometry args={[0.4, 0.5, 16]} />
        <meshBasicMaterial color="#f0d4a0" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[2, 2.5, -3]} intensity={0.35} distance={8} color="#ffb0a0" />
    </group>
  );
}

function TaoInterior() {
  const wallColor = '#c8dce8';
  return (
    <group>
      <ThemedWalls color={wallColor} />
      {/* 鱼缸 */}
      <group position={[-3.2, 1.2, -3.2]}>
        <mesh castShadow>
          <boxGeometry args={[1.0, 0.8, 0.6]} />
          <meshStandardMaterial color="#8ac8e0" flatShading transparent opacity={0.35} roughness={0.1} metalness={0.05} />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[0.9, 0.12, 0.5]} />
          <meshStandardMaterial color="#c0d8a0" flatShading roughness={1} />
        </mesh>
        <mesh position={[0, -0.2, 0.2]}>
          <sphereGeometry args={[0.06, 6, 4]} />
          <meshBasicMaterial color="#e08a3a" />
        </mesh>
        <mesh position={[-0.2, 0, 0.15]}>
          <sphereGeometry args={[0.04, 6, 4]} />
          <meshBasicMaterial color="#c06a3a" />
        </mesh>
      </group>
      {/* 钓鱼装备架 */}
      <mesh position={[3.2, 0.9, -2]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 1.5, 6]} />
        <meshStandardMaterial color="#6a4a2a" flatShading roughness={1} />
      </mesh>
      <mesh position={[3.2, 1.8, -2]} rotation={[0.4, 0, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 1.2, 6]} />
        <meshStandardMaterial color="#6a4a2a" flatShading roughness={1} />
      </mesh>
      {/* 凳子 */}
      <mesh position={[2.5, 0.4, -0.5]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.5, 7]} />
        <meshStandardMaterial color="#8a603a" flatShading roughness={1} />
      </mesh>
      <mesh position={[2.5, 0.72, -0.5]} castShadow>
        <cylinderGeometry args={[0.24, 0.24, 0.08, 7]} />
        <meshStandardMaterial color="#6a4a2a" flatShading roughness={1} />
      </mesh>
      {/* 地毯 - 水波纹 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0.5]}>
        <planeGeometry args={[2.0, 1.8]} />
        <meshStandardMaterial color="#5a7a9a" flatShading roughness={1} transparent opacity={0.35} />
      </mesh>
      <pointLight position={[-2, 2.5, -2]} intensity={0.3} distance={8} color="#a0d0ff" />
    </group>
  );
}

function LinaInterior() {
  const wallColor = '#e0d0b8';
  return (
    <group>
      <ThemedWalls color={wallColor} />
      {/* 工作台 */}
      <mesh position={[-2.5, 0.7, -3]} castShadow>
        <boxGeometry args={[1.8, 0.12, 0.9]} />
        <meshStandardMaterial color="#a07a4a" flatShading roughness={1} />
      </mesh>
      <mesh position={[-2.5, 0.35, -3]} castShadow>
        <boxGeometry args={[1.7, 0.5, 0.8]} />
        <meshStandardMaterial color="#7a5a3a" flatShading roughness={1} />
      </mesh>
      {/* 工具挂板 */}
      <mesh position={[-2.5, 2.2, -3.8]} castShadow>
        <boxGeometry args={[1.6, 1.2, 0.06]} />
        <meshStandardMaterial color="#6a4a2a" flatShading roughness={1} />
      </mesh>
      <mesh position={[-2.8, 2.3, -3.7]} rotation={[0, 0, 0.2]} castShadow>
        <boxGeometry args={[0.06, 0.5, 0.04]} />
        <meshStandardMaterial color="#b0b0b0" flatShading metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[-2.2, 2.2, -3.7]} rotation={[0, 0, -0.15]} castShadow>
        <boxGeometry args={[0.2, 0.06, 0.35]} />
        <meshStandardMaterial color="#8a7a5a" flatShading roughness={1} />
      </mesh>
      {/* 木料堆 */}
      <group position={[3.2, 0.2, -3]}>
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={`lina-log-${i}`} position={[0, i * 0.12 + 0.06, 0]} rotation={[0, i * 0.5, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 0.5, 7]} />
            <meshStandardMaterial color="#7a5a3a" flatShading roughness={1} />
          </mesh>
        ))}
      </group>
      {/* 锯木架 */}
      <mesh position={[2.5, 0.35, -1.5]} rotation={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[1.2, 0.08, 0.12]} />
        <meshStandardMaterial color="#6a4a2a" flatShading roughness={1} />
      </mesh>
      <mesh position={[2.3, 0.1, -1.45]} castShadow>
        <boxGeometry args={[0.08, 0.55, 0.08]} />
        <meshStandardMaterial color="#6a4a2a" flatShading roughness={1} />
      </mesh>
      <mesh position={[2.7, 0.1, -1.55]} castShadow>
        <boxGeometry args={[0.08, 0.55, 0.08]} />
        <meshStandardMaterial color="#6a4a2a" flatShading roughness={1} />
      </mesh>
      {/* 地毯 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.5, 0.015, 0.8]}>
        <planeGeometry args={[1.8, 1.4]} />
        <meshStandardMaterial color="#6a7a4a" flatShading roughness={1} transparent opacity={0.4} />
      </mesh>
      <pointLight position={[-2, 2.5, -2.5]} intensity={0.4} distance={9} color="#ffd080" />
    </group>
  );
}

function ThemedWalls({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, WALL_H / 2, -HALF]} receiveShadow castShadow>
        <boxGeometry args={[HALF * 2, WALL_H, 0.2]} />
        <meshStandardMaterial color={color} flatShading roughness={1} />
      </mesh>
      <mesh position={[0, WALL_H / 2, HALF]} receiveShadow castShadow>
        <boxGeometry args={[HALF * 2, WALL_H, 0.2]} />
        <meshStandardMaterial color={color} flatShading roughness={1} />
      </mesh>
      <mesh position={[-HALF, WALL_H / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.2, WALL_H, HALF * 2]} />
        <meshStandardMaterial color={color} flatShading roughness={1} />
      </mesh>
      <mesh position={[HALF, WALL_H / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.2, WALL_H, HALF * 2]} />
        <meshStandardMaterial color={color} flatShading roughness={1} />
      </mesh>
    </group>
  );
}
