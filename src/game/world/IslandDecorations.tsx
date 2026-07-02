import { useMemo } from 'react';
import * as THREE from 'three';
import { MAP_LAYOUT } from '../../config/mapLayout.ts';
import { useGameStore } from '../../store/useGameStore.ts';
import { groundHeight } from '../../systems/terrain.ts';
import { acceptsBuildingDecoration, acceptsRoadDecoration } from '../../systems/placement.ts';
import { currentEvent } from '../../config/events.ts';
import { KenneyFence } from './KenneyModels.tsx';

interface Decoration { x: number; z: number; kind: 'fence' | 'lamp' | 'sign'; rot?: number }

function useDecorations(): Decoration[] {
  return useMemo(() => {
    const decos: Decoration[] = [];
    for (const road of MAP_LAYOUT.roads) {
      const dx = road.to[0] - road.from[0];
      const dz = road.to[1] - road.from[1];
      const len = Math.hypot(dx, dz);
      if (len <= 0.01) continue;
      const nx = -dz / len;
      const nz = dx / len;
      for (let i = 0; i <= Math.floor(len / 6); i++) {
        const t = len > 0 ? (i * 6) / len : 0.5;
        [-1, 1].forEach((side) => {
          if ((i + side + road.from[0]) % 3 === 0) return;
          decos.push({
            x: road.from[0] + dx * t + nx * side * (road.width + 0.95),
            z: road.from[1] + dz * t + nz * side * (road.width + 0.95),
            kind: 'fence',
            rot: Math.atan2(dx, dz),
          });
        });
      }
    }
    decos.push({ x: MAP_LAYOUT.plaza.pos[0] - 4, z: MAP_LAYOUT.plaza.pos[2] + 3, kind: 'lamp' });
    decos.push({ x: MAP_LAYOUT.plaza.pos[0] + 4, z: MAP_LAYOUT.plaza.pos[2] - 2, kind: 'lamp' });
    decos.push({ x: MAP_LAYOUT.shop.pos[0] - 3.5, z: MAP_LAYOUT.shop.pos[2] + 3.8, kind: 'lamp' });
    decos.push({ x: MAP_LAYOUT.museum.pos[0] - 4.2, z: MAP_LAYOUT.museum.pos[2] + 4.2, kind: 'lamp' });
    decos.push({ x: MAP_LAYOUT.plaza.pos[0] + 2, z: MAP_LAYOUT.plaza.pos[2] + 1, kind: 'sign' });
    decos.push({ x: MAP_LAYOUT.waterfall.pool[0] + 1, z: MAP_LAYOUT.waterfall.pool[2] - 7, kind: 'sign' });
    MAP_LAYOUT.bridges.forEach((bridge) => {
      const [length, , width] = bridge.size;
      const tx = Math.cos(bridge.rotation);
      const tz = -Math.sin(bridge.rotation);
      const nx = Math.sin(bridge.rotation);
      const nz = Math.cos(bridge.rotation);
      [-1, 1].forEach((end) => {
        const side = end > 0 ? 1 : -1;
        decos.push({
          x: bridge.pos[0] + tx * end * (length / 2 + 1.7) + nx * side * (width / 2 + 2.2),
          z: bridge.pos[2] + tz * end * (length / 2 + 1.7) + nz * side * (width / 2 + 2.2),
          kind: 'lamp',
        });
      });
    });
    MAP_LAYOUT.npcs.forEach((npc) => {
      decos.push({ x: npc.homePos[0] - 2.8, z: npc.homePos[2] + 3.0, kind: 'lamp' });
    });
    return decos;
  }, []);
}

export function IslandDecorations() {
  const day = useGameStore((s) => s.clock.day);
  const decos = useDecorations();
  const ev = currentEvent(day);

  return (
    <group>
      {decos.map((d, i) => {
        const y = groundHeight(d.x, d.z);
        if (d.kind === 'fence') {
          if (!acceptsRoadDecoration(d.x, d.z)) return null;
          return (
            <group key={i} position={[d.x, y + 0.08, d.z]} rotation={[0, d.rot ?? 0, 0]}>
              <KenneyFence broken={i % 7 === 0} />
            </group>
          );
        }
        if (!acceptsBuildingDecoration(d.x, d.z)) return null;
        if (d.kind === 'lamp')
          return (
            <group key={i} position={[d.x, y, d.z]}>
              <mesh position={[0, 1.0, 0]}><cylinderGeometry args={[0.04, 0.06, 2.0, 6]} /><meshStandardMaterial color="#4a3a2a" flatShading roughness={1} /></mesh>
              <mesh position={[0, 1.85, 0]}><sphereGeometry args={[0.06, 8, 8]} /><meshBasicMaterial color="#ffe8b0" /></mesh>
            </group>
          );
        if (d.kind === 'sign')
          return (
            <group key={i} position={[d.x, y, d.z]}>
              <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.04, 0.04, 1.4, 6]} /><meshStandardMaterial color="#5a3a1a" flatShading roughness={1} /></mesh>
              <mesh position={[0, 1.4, 0]} rotation={[0, 0, 0]}><planeGeometry args={[0.8, 0.5]} /><meshStandardMaterial color="#e8dcc0" flatShading side={THREE.DoubleSide} /></mesh>
            </group>
          );
        return null;
      })}
      {/* 节庆装饰 */}
      {ev && ev.hasDecorations && <FestivalDecorations eventId={ev.id} />}
    </group>
  );
}

const EVENT_COLORS: Record<string, string> = {
  cherry_blossom: '#f0a0b0',
  summer_festival: '#40a0d0',
  halloween: '#d08030',
  winter_holiday: '#80c0e0',
};

const FEST_DECOS: Record<string, { x: number; z: number }[]> = {
  cherry_blossom: [
    { x: 3, z: 16 }, { x: 6, z: 14 }, { x: 14, z: 10 },
    { x: 8, z: 20 }, { x: -2, z: 12 },
  ],
  summer_festival: [
    { x: 8, z: 18 }, { x: 12, z: 16 }, { x: 10, z: 22 },
    { x: 10, z: 18 }, { x: 14, z: 14 },
  ],
  halloween: [
    { x: 12, z: 10 }, { x: 16, z: 14 }, { x: -20, z: 18 },
    { x: 30, z: 30 }, { x: 32, z: -18 },
  ],
  winter_holiday: [
    { x: 0, z: 12 }, { x: 4, z: 14 }, { x: 10, z: 16 },
    { x: -22, z: 18 }, { x: 14, z: 12 },
  ],
};

function FestivalDecorations({ eventId }: { eventId: string }) {
  const positions = FEST_DECOS[eventId] ?? [];
  const color = EVENT_COLORS[eventId] ?? '#e8a33d';

  return (
    <group>
      {positions.map((p, i) => {
        if (!acceptsBuildingDecoration(p.x, p.z)) return null;
        const y = groundHeight(p.x, p.z);
        return (
          <group key={i} position={[p.x, y, p.z]}>
            {/* 旗帜杆 */}
            <mesh position={[0, 1.5, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 3.0, 6]} />
              <meshStandardMaterial color="#5a3a1a" flatShading />
            </mesh>
            {/* 装饰物 */}
            <mesh position={[0, 2.8, 0]}>
              <sphereGeometry args={[0.1, 8, 8]} />
              <meshBasicMaterial color={color} />
            </mesh>
            {eventId === 'halloween' && (
              <mesh position={[0, 2.5, 0.3]} rotation={[0, 0, 0]}>
                <sphereGeometry args={[0.12, 8, 8]} />
                <meshBasicMaterial color="#d08030" />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
