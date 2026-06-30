import { Fragment, useMemo } from 'react';
import * as THREE from 'three';
import { LANDMARKS } from '../../config/landmarks.ts';
import { LowPolyBoat } from './BoatModel.tsx';
import { groundHeight } from '../../systems/terrain.ts';
import { KenneyBush, KenneyFence, KenneyLog, KenneyTree } from './KenneyModels.tsx';

interface Pos2 {
  x: number;
  z: number;
}

function yAt(x: number, z: number, offset = 0): number {
  return groundHeight(x, z) + offset;
}

function PlankDeck({ width, depth }: { width: number; depth: number }) {
  const planks = useMemo(() => {
    const count = Math.max(3, Math.floor(width / 0.55));
    return Array.from({ length: count }, (_, i) => -width / 2 + (i + 0.5) * (width / count));
  }, [width]);

  return (
    <group>
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.2, 0.12, depth + 0.2]} />
        <meshStandardMaterial color="#5b3720" flatShading roughness={1} />
      </mesh>
      {planks.map((x, index) => (
        <mesh key={index} position={[x, 0.18, 0]} castShadow receiveShadow>
          <boxGeometry args={[width / planks.length - 0.05, 0.12, depth]} />
          <meshStandardMaterial color={index % 2 === 0 ? '#9b6538' : '#86552f'} flatShading roughness={1} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (width / 2 + 0.12), -0.35, 0]} castShadow>
          <boxGeometry args={[0.22, 0.95, 0.22]} />
          <meshStandardMaterial color="#4a2c18" flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function FishingPier({ x, z, rot = 0 }: Pos2 & { rot?: number }) {
  const y = yAt(x, z, 0.08);
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      <PlankDeck width={4.4} depth={2.6} />
      <group position={[-2.2, 0.16, -1.65]} rotation={[0, Math.PI / 2, 0]}>
        <KenneyFence />
      </group>
      <group position={[2.2, 0.16, -1.65]} rotation={[0, Math.PI / 2, 0]}>
        <KenneyFence />
      </group>
      <mesh position={[0.9, 0.32, 0.2]} rotation={[0, 0.35, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 1.8, 6]} />
        <meshStandardMaterial color="#5a321d" flatShading roughness={1} />
      </mesh>
      <mesh position={[1.55, 0.2, 0.72]} castShadow>
        <boxGeometry args={[0.7, 0.28, 0.45]} />
        <meshStandardMaterial color="#a87842" flatShading roughness={1} />
      </mesh>
      <mesh position={[1.55, 0.42, 0.72]} castShadow>
        <boxGeometry args={[0.62, 0.08, 0.5]} />
        <meshStandardMaterial color="#6b3d22" flatShading roughness={1} />
      </mesh>
    </group>
  );
}

function Tent({ x, z, color = '#b66a3c', rot = 0 }: Pos2 & { color?: string; rot?: number }) {
  const y = yAt(x, z, 0.02);
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.62, 0]} castShadow receiveShadow>
        <coneGeometry args={[1.55, 1.35, 4]} />
        <meshStandardMaterial color={color} flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 0.28, 0.7]} rotation={[-0.55, 0, 0]} castShadow>
        <planeGeometry args={[0.72, 0.9]} />
        <meshStandardMaterial color="#2b241c" side={THREE.DoubleSide} flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.8, 18]} />
        <meshBasicMaterial color="#2d281e" transparent opacity={0.16} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Campfire({ x, z }: Pos2) {
  const y = yAt(x, z, 0.02);
  return (
    <group position={[x, y, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[0.55, 0.75, 12]} />
        <meshStandardMaterial color="#72675b" flatShading roughness={1} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <group key={i} rotation={[0, (i / 3) * Math.PI, Math.PI / 2]}>
          <KenneyLog />
        </group>
      ))}
      <mesh position={[0, 0.42, 0]} castShadow>
        <coneGeometry args={[0.32, 0.78, 5]} />
        <meshBasicMaterial color="#f18a32" />
      </mesh>
      <mesh position={[0.03, 0.55, 0.02]} castShadow>
        <coneGeometry args={[0.2, 0.58, 5]} />
        <meshBasicMaterial color="#ffd66a" />
      </mesh>
    </group>
  );
}

function CampSite() {
  const [tentA, tentB] = LANDMARKS.camp.tents;
  const fire = LANDMARKS.camp.fire;
  const logStack = LANDMARKS.camp.logStack;
  return (
    <group>
      <Tent x={tentA.x} z={tentA.z} rot={tentA.rot} />
      <Tent x={tentB.x} z={tentB.z} color="#476f8f" rot={tentB.rot} />
      <Campfire x={fire.x} z={fire.z} />
      <group position={[logStack.x, yAt(logStack.x, logStack.z), logStack.z]} rotation={[0, logStack.rot ?? 0, 0]}>
        <KenneyLog stack />
      </group>
      {LANDMARKS.camp.fences.map((p, i) => (
        <group key={i} position={[p.x, yAt(p.x, p.z, 0.05), p.z]} rotation={[0, p.rot, 0]}>
          <KenneyFence broken={i === 2} />
        </group>
      ))}
    </group>
  );
}

function OrchardTree({ x, z, variant }: Pos2 & { variant: number }) {
  const y = yAt(x, z);
  const fruitColor = variant % 2 === 0 ? '#d84a32' : '#e2b343';
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.78, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1.55, 7]} />
        <meshStandardMaterial color="#6f421f" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 1.74, 0]} castShadow>
        <dodecahedronGeometry args={[0.92, 0]} />
        <meshStandardMaterial color={variant % 3 === 0 ? '#5e903d' : '#6da245'} flatShading roughness={1} />
      </mesh>
      {[-0.42, 0.12, 0.45].map((fx, i) => (
        <mesh key={i} position={[fx, 1.58 + i * 0.12, i === 1 ? 0.42 : -0.25]} castShadow>
          <sphereGeometry args={[0.12, 8, 6]} />
          <meshStandardMaterial color={fruitColor} flatShading roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function Orchard() {
  return (
    <group>
      {LANDMARKS.orchard.trees.map((p, i) => <OrchardTree key={p.id} x={p.x} z={p.z} variant={i} />)}
      {LANDMARKS.orchard.bushes.map((p, i) => (
        <group key={p.id} position={[p.x, yAt(p.x, p.z), p.z]} rotation={[0, p.rot ?? 0, 0]}>
          <KenneyBush variant={i} size={0.95} />
        </group>
      ))}
    </group>
  );
}

function ForestEntrance() {
  return (
    <group>
      {LANDMARKS.forestEntrance.logs.map((p, i) => (
        <group key={p.id} position={[p.x, yAt(p.x, p.z), p.z]} rotation={[0, p.rot, 0]}>
          <KenneyLog stack={i % 2 === 0} />
        </group>
      ))}
      {LANDMARKS.forestEntrance.bushes.map((p, i) => (
        <group key={p.id} position={[p.x, yAt(p.x, p.z), p.z]} rotation={[0, p.rot ?? 0, 0]}>
          <KenneyBush variant={i} size={1.2} />
        </group>
      ))}
    </group>
  );
}

function GardenBed({ x, z, rot = 0, variant }: Pos2 & { rot?: number; variant: number }) {
  const y = yAt(x, z, 0.03);
  const plantColor = variant % 2 === 0 ? '#6c9f3f' : '#8cad48';
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.13, 0]} receiveShadow>
        <boxGeometry args={[2.7, 0.26, 1.55]} />
        <meshStandardMaterial color="#684126" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 0.28, 0]} receiveShadow>
        <boxGeometry args={[2.45, 0.12, 1.3]} />
        <meshStandardMaterial color="#4c3525" flatShading roughness={1} />
      </mesh>
      {[-0.82, 0, 0.82].flatMap((px, column) =>
        [-0.38, 0.38].map((pz, row) => (
          <group key={`${column}-${row}`} position={[px, 0.5, pz]}>
            <mesh castShadow>
              <coneGeometry args={[0.18, 0.45 + ((column + row + variant) % 2) * 0.12, 6]} />
              <meshStandardMaterial color={plantColor} flatShading roughness={1} />
            </mesh>
            {(column + row + variant) % 3 === 0 && (
              <mesh position={[0.05, -0.06, 0.02]} castShadow>
                <sphereGeometry args={[0.1, 7, 5]} />
                <meshStandardMaterial color="#d96b3d" flatShading roughness={0.9} />
              </mesh>
            )}
          </group>
        )),
      )}
    </group>
  );
}

function PicnicTable({ x, z, rot = 0 }: Pos2 & { rot?: number }) {
  const y = yAt(x, z, 0.03);
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.18, 1.05]} />
        <meshStandardMaterial color="#a46a39" flatShading roughness={1} />
      </mesh>
      {[-0.82, 0.82].map((side) => (
        <mesh key={side} position={[0, 0.38, side]} castShadow>
          <boxGeometry args={[2.2, 0.16, 0.34]} />
          <meshStandardMaterial color="#8c572f" flatShading roughness={1} />
        </mesh>
      ))}
      {[-0.75, 0.75].map((side) => (
        <group key={side} position={[side, 0.34, 0]}>
          <mesh rotation={[0, 0, 0.24 * side]} castShadow>
            <boxGeometry args={[0.16, 0.75, 0.16]} />
            <meshStandardMaterial color="#5b3822" flatShading roughness={1} />
          </mesh>
          <mesh position={[0, 0, 0.1]} rotation={[0, 0, -0.24 * side]} castShadow>
            <boxGeometry args={[0.16, 0.75, 0.16]} />
            <meshStandardMaterial color="#5b3822" flatShading roughness={1} />
          </mesh>
        </group>
      ))}
      <mesh position={[0.45, 0.87, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.18, 0.22, 8]} />
        <meshStandardMaterial color="#d9b56f" flatShading roughness={0.9} />
      </mesh>
    </group>
  );
}

function Scarecrow({ x, z, rot = 0 }: Pos2 & { rot?: number }) {
  const y = yAt(x, z);
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 1.05, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 2.1, 6]} />
        <meshStandardMaterial color="#684226" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 1.55, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 1.75, 6]} />
        <meshStandardMaterial color="#684226" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 1.9, 0]} castShadow>
        <sphereGeometry args={[0.3, 8, 6]} />
        <meshStandardMaterial color="#d6b27a" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 2.18, 0]} castShadow>
        <coneGeometry args={[0.48, 0.38, 8]} />
        <meshStandardMaterial color="#9d6431" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 1.38, 0]} castShadow>
        <boxGeometry args={[1.55, 0.7, 0.18]} />
        <meshStandardMaterial color="#b15f3e" flatShading roughness={1} />
      </mesh>
    </group>
  );
}

function CommunityGarden() {
  return (
    <group>
      {LANDMARKS.garden.beds.map((bed, i) => (
        <GardenBed key={bed.id} x={bed.x} z={bed.z} rot={bed.rot} variant={i} />
      ))}
      <PicnicTable
        x={LANDMARKS.garden.picnic.x}
        z={LANDMARKS.garden.picnic.z}
        rot={LANDMARKS.garden.picnic.rot}
      />
      <Scarecrow
        x={LANDMARKS.garden.scarecrow.x}
        z={LANDMARKS.garden.scarecrow.z}
        rot={LANDMARKS.garden.scarecrow.rot}
      />
      {LANDMARKS.garden.fences.map((fence, i) => (
        <group key={fence.id} position={[fence.x, yAt(fence.x, fence.z, 0.05), fence.z]} rotation={[0, fence.rot, 0]}>
          <KenneyFence broken={i === 5} />
        </group>
      ))}
    </group>
  );
}

function Bench({ x, z, rot = 0 }: Pos2 & { rot?: number }) {
  const y = yAt(x, z, 0.03);
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.46, 0]} castShadow>
        <boxGeometry args={[2.1, 0.18, 0.5]} />
        <meshStandardMaterial color="#96603a" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 0.83, 0.22]} rotation={[-0.12, 0, 0]} castShadow>
        <boxGeometry args={[2.1, 0.62, 0.16]} />
        <meshStandardMaterial color="#82502e" flatShading roughness={1} />
      </mesh>
      {[-0.75, 0.75].map((side) => (
        <mesh key={side} position={[side, 0.22, 0]} castShadow>
          <boxGeometry args={[0.16, 0.5, 0.16]} />
          <meshStandardMaterial color="#4f3525" flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function LookoutPlatform() {
  const center = LANDMARKS.lookout.center;
  const y = yAt(center.x, center.z, 0.05);
  return (
    <group>
      <group position={[center.x, y, center.z]}>
        <PlankDeck width={8.5} depth={5.8} />
        {[-3.5, -1.75, 0, 1.75, 3.5].map((x) => (
          <group key={`north-${x}`} position={[x, 0.2, -3.05]} rotation={[0, Math.PI / 2, 0]}>
            <KenneyFence />
          </group>
        ))}
        {[-2.2, 0, 2.2].map((z) => (
          <Fragment key={`side-${z}`}>
            <group position={[-4.45, 0.2, z]}><KenneyFence /></group>
            <group position={[4.45, 0.2, z]}><KenneyFence /></group>
          </Fragment>
        ))}
        <group position={[0, 0.42, -1.25]} rotation={[0, -0.35, 0]}>
          <mesh position={[0, 0.9, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.22, 0.32, 1.2, 8]} />
            <meshStandardMaterial color="#4b5660" flatShading roughness={0.72} metalness={0.18} />
          </mesh>
          <mesh position={[0.15, 0.25, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.08, 1.25, 7]} />
            <meshStandardMaterial color="#4a3a2d" flatShading roughness={1} />
          </mesh>
        </group>
      </group>
      {LANDMARKS.lookout.benches.map((bench) => (
        <Bench key={bench.id} x={bench.x} z={bench.z} rot={bench.rot} />
      ))}
      {LANDMARKS.lookout.shrubs.map((shrub, i) => (
        <group key={shrub.id} position={[shrub.x, yAt(shrub.x, shrub.z), shrub.z]} rotation={[0, shrub.rot, 0]}>
          <KenneyBush variant={i} size={1.15} />
        </group>
      ))}
    </group>
  );
}

function BeachUmbrella({ x, z, rot = 0, color }: Pos2 & { rot?: number; color: string }) {
  const y = yAt(x, z);
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 1.25, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.075, 2.5, 7]} />
        <meshStandardMaterial color="#7b5436" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 2.35, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
        <coneGeometry args={[1.55, 0.55, 12]} />
        <meshStandardMaterial color={color} flatShading roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.72, 18]} />
        <meshBasicMaterial color="#d7c391" transparent opacity={0.18} depthWrite={false} />
      </mesh>
    </group>
  );
}

function BeachLounger({ x, z, rot = 0, color }: Pos2 & { rot?: number; color: string }) {
  const y = yAt(x, z, 0.04);
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.34, 0.22]} rotation={[-0.18, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.82, 0.12, 1.65]} />
        <meshStandardMaterial color={color} flatShading roughness={0.96} />
      </mesh>
      <mesh position={[0, 0.68, -0.62]} rotation={[-0.72, 0, 0]} castShadow>
        <boxGeometry args={[0.82, 0.12, 0.9]} />
        <meshStandardMaterial color={color} flatShading roughness={0.96} />
      </mesh>
      {[-0.3, 0.3].flatMap((px) =>
        [-0.52, 0.62].map((pz) => (
          <mesh key={`${px}-${pz}`} position={[px, 0.16, pz]} castShadow>
            <boxGeometry args={[0.08, 0.35, 0.08]} />
            <meshStandardMaterial color="#6a4731" flatShading roughness={1} />
          </mesh>
        )),
      )}
    </group>
  );
}

function VolleyballCourt() {
  const [a, b] = LANDMARKS.beachClub.volleyballPosts;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = Math.hypot(dx, dz);
  const centerX = (a.x + b.x) * 0.5;
  const centerZ = (a.z + b.z) * 0.5;
  const centerY = (yAt(a.x, a.z) + yAt(b.x, b.z)) * 0.5;
  const rotation = Math.atan2(dx, dz);
  return (
    <group>
      {[a, b].map((post) => (
        <group key={post.id} position={[post.x, yAt(post.x, post.z), post.z]}>
          <mesh position={[0, 1.15, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.075, 2.3, 8]} />
            <meshStandardMaterial color="#e8e1cf" flatShading roughness={0.9} />
          </mesh>
          <mesh position={[0, 2.28, 0]} castShadow>
            <sphereGeometry args={[0.09, 8, 6]} />
            <meshStandardMaterial color="#d96848" flatShading roughness={0.9} />
          </mesh>
        </group>
      ))}
      <group position={[centerX, centerY + 1.45, centerZ]} rotation={[0, rotation, 0]}>
        <mesh>
          <planeGeometry args={[length, 1.35, 8, 3]} />
          <meshStandardMaterial color="#f1ede3" wireframe transparent opacity={0.72} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -1.42, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[length + 3, 5.2]} />
          <meshBasicMaterial color="#d8bb79" transparent opacity={0.18} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

function BeachedBoat() {
  const boat = LANDMARKS.beachClub.boat;
  const y = Math.max(yAt(boat.x, boat.z, 0.08), -1.02);
  return (
    <group position={[boat.x, y, boat.z]} rotation={[0, boat.rot, -0.08]}>
      <LowPolyBoat color="#b35d3c" deckColor="#e1c692" />
      <mesh position={[0.8, 0.7, -0.2]} rotation={[0.08, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.035, 0.045, 3.2, 6]} />
        <meshStandardMaterial color="#6a3f25" flatShading roughness={1} />
      </mesh>
    </group>
  );
}

function BeachClub() {
  return (
    <group>
      {LANDMARKS.beachClub.umbrellas.map((umbrella, i) => (
        <BeachUmbrella
          key={umbrella.id}
          x={umbrella.x}
          z={umbrella.z}
          rot={umbrella.rot}
          color={i === 0 ? '#e26f50' : '#4f91a8'}
        />
      ))}
      {LANDMARKS.beachClub.loungers.map((lounger, i) => (
        <BeachLounger
          key={lounger.id}
          x={lounger.x}
          z={lounger.z}
          rot={lounger.rot}
          color={i % 2 === 0 ? '#f0d574' : '#6eabc0'}
        />
      ))}
      <VolleyballCourt />
      <BeachedBoat />
    </group>
  );
}

function RuinPillar({ x, z, rot = 0, variant }: Pos2 & { rot?: number; variant: number }) {
  const y = yAt(x, z);
  const height = 2.4 + (variant % 3) * 0.55;
  return (
    <group position={[x, y, z]} rotation={[0, rot, variant === 2 ? 0.12 : 0]}>
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.75, 0.92, 0.24, 7]} />
        <meshStandardMaterial color="#77786c" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, height * 0.5 + 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.52, height, 8]} />
        <meshStandardMaterial color={variant % 2 === 0 ? '#8b8b7d' : '#74786d'} flatShading roughness={1} />
      </mesh>
      <mesh position={[0, height + 0.28, 0]} castShadow>
        <boxGeometry args={[1.05, 0.22, 1.05]} />
        <meshStandardMaterial color="#85877b" flatShading roughness={1} />
      </mesh>
      <group position={[0.32, height * 0.62, 0.4]}>
        <KenneyBush variant={variant} size={0.55} />
      </group>
    </group>
  );
}

function StandingStone({ x, z, rot = 0, variant }: Pos2 & { rot?: number; variant: number }) {
  const y = yAt(x, z);
  return (
    <group position={[x, y, z]} rotation={[0, rot, (variant % 2 === 0 ? 1 : -1) * 0.08]}>
      <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.82 + (variant % 3) * 0.12, 0]} />
        <meshStandardMaterial color={variant % 2 === 0 ? '#6d746a' : '#7e8175'} flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 1.05, 0.7]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.045, 5, 10]} />
        <meshBasicMaterial color="#a8c9a0" transparent opacity={0.72} />
      </mesh>
    </group>
  );
}

function ForestRuins() {
  const center = LANDMARKS.forestRuins.center;
  const y = yAt(center.x, center.z, 0.05);
  return (
    <group>
      <group position={[center.x, y, center.z]}>
        <mesh position={[0, 0.12, 0]} receiveShadow>
          <cylinderGeometry args={[3.3, 3.7, 0.24, 12]} />
          <meshStandardMaterial color="#686d63" flatShading roughness={1} />
        </mesh>
        <mesh position={[0, 0.42, 0]} castShadow>
          <cylinderGeometry args={[1.15, 1.4, 0.6, 8]} />
          <meshStandardMaterial color="#85877b" flatShading roughness={1} />
        </mesh>
        <mesh position={[0, 0.77, 0]}>
          <octahedronGeometry args={[0.32, 0]} />
          <meshStandardMaterial color="#8fc4af" emissive="#3f7565" emissiveIntensity={0.7} flatShading roughness={0.65} />
        </mesh>
      </group>
      {LANDMARKS.forestRuins.pillars.map((pillar, i) => (
        <RuinPillar key={pillar.id} x={pillar.x} z={pillar.z} rot={pillar.rot} variant={i} />
      ))}
      {LANDMARKS.forestRuins.stones.map((stone, i) => (
        <StandingStone key={stone.id} x={stone.x} z={stone.z} rot={stone.rot} variant={i} />
      ))}
      {LANDMARKS.forestRuins.shrubs.map((shrub, i) => (
        <group key={shrub.id} position={[shrub.x, yAt(shrub.x, shrub.z), shrub.z]} rotation={[0, shrub.rot, 0]}>
          <KenneyBush variant={i} size={1.25} />
        </group>
      ))}
      {LANDMARKS.forestRuins.trees.map((tree, i) => (
        <group
          key={tree.id}
          position={[tree.x, yAt(tree.x, tree.z), tree.z]}
          rotation={[0, tree.rot, 0]}
          scale={[3.3 + (i % 3) * 0.25, 3.3 + (i % 3) * 0.25, 3.3 + (i % 3) * 0.25]}
        >
          <KenneyTree variant={i + 2} />
        </group>
      ))}
    </group>
  );
}

export function MapLandmarks() {
  return (
    <group>
      {LANDMARKS.piers.map((pier) => <FishingPier key={pier.id} x={pier.x} z={pier.z} rot={pier.rot} />)}
      <CampSite />
      <Orchard />
      <ForestEntrance />
      <CommunityGarden />
      <LookoutPlatform />
      <BeachClub />
      <ForestRuins />
    </group>
  );
}
