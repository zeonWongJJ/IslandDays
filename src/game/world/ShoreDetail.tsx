import { useMemo } from 'react';
import { WORLD } from '../../config/constants.ts';
import { groundHeight, groundKind } from '../../systems/terrain.ts';
import { KenneyShoreRock } from './KenneyModels.tsx';

interface RockDef {
  pos: [number, number, number];
  scale: number;
  rot: number;
  rotX: number;
  rotZ: number;
  variant: number;
}

let _seed = 12345;
function rand(): number {
  _seed = (_seed * 16807) % 2147483647;
  return (_seed - 1) / 2147483646;
}

function generateRocks(): RockDef[] {
  const result: RockDef[] = [];
  const r = WORLD.size / 2 + WORLD.waterBorder * 0.15;
  const count = 60;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.3;
    const spread = 2 + rand() * 5;
    const x = Math.cos(angle) * (r + (rand() - 0.5) * spread);
    const z = Math.sin(angle) * (r + (rand() - 0.5) * spread);
    const h = groundHeight(x, z);
    const kind = groundKind(x, z);
    if (kind !== 'sand' && kind !== 'rock') continue;
    if (h < -1.2 || h > 1.0) continue;
    const scale = 0.15 + rand() * 0.35;
    const rot = rand() * Math.PI * 2;
    const rotX = rand() * 0.5;
    const rotZ = rand() * 0.5;
    const variant = Math.floor(rand() * 5);
    result.push({ pos: [x, h, z], scale, rot, rotX, rotZ, variant });
  }
  return result;
}

const _cachedRocks = generateRocks();

export function ShoreDetail() {
  const rocks = useMemo(() => _cachedRocks, []);

  return (
    <group>
      {rocks.map((r, i) => (
        <group
          key={i}
          position={r.pos}
          rotation={[r.rotX, r.rot, r.rotZ]}
        >
          <KenneyShoreRock variant={r.variant} size={0.45 + r.scale} />
        </group>
      ))}
    </group>
  );
}
