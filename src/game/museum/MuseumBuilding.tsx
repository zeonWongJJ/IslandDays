import { useMemo } from 'react';
import { MAP_LAYOUT } from '../../config/mapLayout.ts';
import { useGameStore } from '../../store/useGameStore.ts';
import { groundHeight } from '../../systems/terrain.ts';
import { useOcclusionOpacity } from '../controllers/useOcclusionOpacity.ts';
import { BuildingYard, LowPolyBuilding, MuseumSteps, Planters, PorchColumns } from '../world/BuildingKit.tsx';

export function MuseumBuilding() {
  const scene = useGameStore((s) => s.scene);
  const [x, , z] = MAP_LAYOUT.museum.pos;
  const y = useMemo(() => groundHeight(x, z), [x, z]);
  const roofOpacity = useOcclusionOpacity(x, z, 5.6, 0.3);

  if (scene !== 'island') return null;

  return (
    <group position={[x, y, z]}>
      <LowPolyBuilding
        width={8}
        depth={6}
        wallHeight={4}
        wallColor="#f0e8dc"
        trimColor="#c8b8a0"
        roofColor="#6a4a3a"
        roofRadius={6.2}
        roofHeight={2.6}
        roofOpacity={roofOpacity}
        doorWidth={2}
        doorHeight={2.8}
        signColor="#3a5a8a"
        windows={[
          { x: -2.8, y: 2.55, z: 3.06, w: 1.0, h: 1.15 },
          { x: 2.8, y: 2.55, z: 3.06, w: 1.0, h: 1.15 },
          { x: -4.05, y: 2.55, z: 0, side: 'left', w: 1.0, h: 1.15 },
          { x: 4.05, y: 2.55, z: 0, side: 'right', w: 1.0, h: 1.15 },
        ]}
      >
        <MuseumSteps width={5.6} z={3.25} />
        <PorchColumns width={4.4} z={3.22} height={4.2} />
        <Planters z={3.9} spread={1.45} />
        <BuildingYard width={8} depth={6} variantOffset={2} />
      </LowPolyBuilding>
    </group>
  );
}
