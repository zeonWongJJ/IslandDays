import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { NPCS } from '../../config/npcs.ts';
import { MAP_LAYOUT } from '../../config/mapLayout.ts';
import { groundHeight } from '../../systems/terrain.ts';

interface LampPos { x: number; z: number; hasLight: boolean }

function useLampPositions(): LampPos[] {
  return useMemo(() => {
    const lamps: LampPos[] = [];
    // 关键位置用真灯光
    for (const npc of NPCS) {
      lamps.push({ x: npc.homePos[0], z: npc.homePos[2], hasLight: true });
    }
    lamps.push({ x: MAP_LAYOUT.shop.pos[0], z: MAP_LAYOUT.shop.pos[2], hasLight: true });
    lamps.push({ x: MAP_LAYOUT.plaza.pos[0], z: MAP_LAYOUT.plaza.pos[2], hasLight: true });
    lamps.push({ x: MAP_LAYOUT.home.pos[0], z: MAP_LAYOUT.home.pos[2], hasLight: true });
    // 沿主路放装饰灯柱（无 real light，只有自发光小球）
    for (const road of MAP_LAYOUT.roads) {
      const dx = road.to[0] - road.from[0];
      const dz = road.to[1] - road.from[1];
      const len = Math.hypot(dx, dz);
      if (len <= 0.01) continue;
      const nx = -dz / len;
      const nz = dx / len;
      const count = Math.max(1, Math.floor(len / 16));
      for (let i = 0; i <= count; i++) {
        const t = count > 0 ? i / count : 0.5;
        const side = i % 2 === 0 ? 1 : -1;
        const shoulder = road.width + 1.15;
        lamps.push({
          x: road.from[0] + dx * t + nx * shoulder * side,
          z: road.from[1] + dz * t + nz * shoulder * side,
          hasLight: false,
        });
      }
    }
    return lamps;
  }, []);
}

export function IslandLights() {
  const lamps = useLampPositions();

  return (
    <group>
      {lamps.map((p, i) => (
        <Lamp key={i} x={p.x} z={p.z} hasLight={p.hasLight} />
      ))}
    </group>
  );
}

function Lamp({ x, z, hasLight }: { x: number; z: number; hasLight: boolean }) {
  const y = groundHeight(x, z);
  const groupRef = useRef<THREE.Group>(null);
  return (
    <group ref={groupRef} position={[x, y, z]}>
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 2.0, 6]} />
        <meshStandardMaterial color="#4a3a2a" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 2.0, 0]}>
        <coneGeometry args={[0.15, 0.2, 6]} />
        <meshStandardMaterial color="#5a4a3a" flatShading roughness={1} />
      </mesh>
      {/* 发光球 */}
      <mesh position={[0, 1.85, 0]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshBasicMaterial color="#ffe8b0" />
      </mesh>
      {hasLight && (
        <pointLight position={[0, 1.9, 0]} color="#ffd080" intensity={1.2} distance={12} decay={2} />
      )}
    </group>
  );
}
