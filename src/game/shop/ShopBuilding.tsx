import { useMemo } from 'react';
import { MAP_LAYOUT } from '../../config/mapLayout.ts';
import { useGameStore } from '../../store/useGameStore.ts';
import { groundHeight } from '../../systems/terrain.ts';
import { useOcclusionOpacity } from '../controllers/useOcclusionOpacity.ts';
import { BuildingYard, LowPolyBuilding, Planters, ShopCrates } from '../world/BuildingKit.tsx';

export function ShopBuilding() {
  const scene = useGameStore((s) => s.scene);
  const [x, , z] = MAP_LAYOUT.shop.pos;
  const y = useMemo(() => groundHeight(x, z), [x, z]);
  const roofOpacity = useOcclusionOpacity(x, z, 4.4, 0.16);

  if (scene !== 'island') return null;

  return (
    <group position={[x, y, z]}>
      <LowPolyBuilding
        width={5.4}
        depth={4.4}
        wallHeight={2.7}
        wallColor="#e8d0a8"
        trimColor="#c0a880"
        roofColor="#3f6f4c"
        roofRadius={4.2}
        roofHeight={1.7}
        roofOpacity={roofOpacity}
        doorWidth={1.15}
        doorHeight={1.9}
        signColor="#f3e3a6"
        awningColor="#c04040"
        windows={[
          { x: -1.55, y: 1.75, z: 2.26, w: 0.85, h: 0.7 },
          { x: 1.55, y: 1.75, z: 2.26, w: 0.85, h: 0.7 },
        ]}
      >
        <Planters z={2.9} spread={1.75} />
        <ShopCrates z={2.82} spread={2.15} />
        <BuildingYard width={5.4} depth={4.4} variantOffset={1} />
      </LowPolyBuilding>
    </group>
  );
}
