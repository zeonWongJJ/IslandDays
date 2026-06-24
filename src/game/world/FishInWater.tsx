import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore.ts';
import { fishWaterPos } from '../../systems/worldgen.ts';
import { KenneyFishModel } from './KenneyModels.tsx';

// 每条鱼在创建时随机确定大小和游泳参数
interface FishAnim {
  radius: number;
  speed: number;
  phase: number;
  yOffset: number;
  ySpeed: number;
  flip: number;
}

function makeAnim(): FishAnim {
  return {
    radius: 0.6 + Math.random() * 1.8,
    speed: 0.3 + Math.random() * 0.5,
    phase: Math.random() * Math.PI * 2,
    yOffset: Math.random() * 0.3,
    ySpeed: 0.4 + Math.random() * 0.6,
    flip: Math.random() > 0.5 ? 1 : -1,
  };
}

function FishSprite({ waterPos }: { waterPos: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  const anim = useMemo(() => makeAnim(), []);
  const basePos = useMemo(() => new THREE.Vector3(waterPos[0], waterPos[1], waterPos[2]), [waterPos]);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const a = anim;
    const angle = t * a.speed + a.phase;
    g.position.x = basePos.x + Math.cos(angle) * a.radius;
    g.position.z = basePos.z + Math.sin(angle) * a.flip * a.radius * 0.6;
    g.position.y = basePos.y + 0.2 + Math.sin(t * a.ySpeed + a.phase) * a.yOffset;
    // 鱼面向运动方向
    g.rotation.y = -angle + Math.PI / 2 + (a.flip === -1 ? Math.PI : 0);
    // 轻微摆动
    g.rotation.z = Math.sin(t * 2 + a.phase) * 0.08;
  });

  return (
    <group ref={groupRef}>
      <KenneyFishModel size={0.4 + anim.radius * 0.08} />
    </group>
  );
}

export function FishInWater() {
  const fishSpots = useGameStore((s) => s.fishSpots);

  const waterPositions = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    for (const spot of fishSpots) {
      map.set(spot.id, fishWaterPos(spot));
    }
    return map;
  }, [fishSpots]);

  return (
    <group>
      {fishSpots.map((spot) => {
        if (spot.state === 'cooling') return null;
        const wp = waterPositions.get(spot.id);
        if (!wp) return null;
        return <FishSprite key={spot.id} waterPos={wp} />;
      })}
    </group>
  );
}
