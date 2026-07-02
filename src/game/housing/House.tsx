import { useMemo } from 'react';
import { HOUSE } from '../../config/constants.ts';
import { useGameStore } from '../../store/useGameStore.ts';
import { groundHeight } from '../../systems/terrain.ts';
import { useOcclusionOpacity } from '../controllers/useOcclusionOpacity.ts';
import { BuildingYard, Chimney, LowPolyBuilding, Planters } from '../world/BuildingKit.tsx';

export function House() {
  const scene = useGameStore((s) => s.scene);
  const [hx, , hz] = HOUSE.pos;
  const y = useMemo(() => groundHeight(hx, hz), [hx, hz]);
  const roofOpacity = useOcclusionOpacity(hx, hz, 4.8, 0.01);

  if (scene !== 'island') return null;

  return (
    <group position={[hx, y, hz]}>
      <LowPolyBuilding
        width={6}
        depth={5}
        wallHeight={3}
        wallColor="#f0e4d0"
        trimColor="#c8b898"
        roofColor="#8a4030"
        roofRadius={4.8}
        roofHeight={2}
        roofOpacity={roofOpacity}
        doorWidth={1.1}
        doorHeight={1.8}
        signColor="#3a5a8a"
        windows={[
          { x: -1.8, y: 1.9, z: 2.56 },
          { x: 1.8, y: 1.9, z: 2.56 },
          { x: -3.05, y: 1.9, z: 0, side: 'left' },
          { x: 3.05, y: 1.9, z: 0, side: 'right' },
        ]}
      >
        <Chimney x={1.45} y={4.55} z={-1.0} />
        <Planters z={3.05} spread={1.25} />
        <BuildingYard width={6} depth={5} logs />
        <mesh position={[0.78, 2.15, 2.7]}>
          <sphereGeometry args={[0.1, 8, 6]} />
          <meshBasicMaterial color="#ffd991" />
        </mesh>
        <pointLight position={[0.78, 2.15, 2.85]} color="#ffd18a" intensity={0.65} distance={5.5} decay={2} />
      </LowPolyBuilding>
    </group>
  );
}
