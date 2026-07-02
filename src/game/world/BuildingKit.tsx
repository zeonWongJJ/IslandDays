import { useEffect, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { KenneyBush, KenneyLog } from './KenneyModels.tsx';

interface WindowSpec {
  x: number;
  y: number;
  z: number;
  side?: 'front' | 'left' | 'right';
  w?: number;
  h?: number;
}

interface BuildingProps {
  width: number;
  depth: number;
  wallHeight: number;
  wallColor: string;
  trimColor: string;
  roofColor: string;
  roofRadius: number;
  roofHeight: number;
  roofOpacity: number;
  foundationColor?: string;
  doorWidth?: number;
  doorHeight?: number;
  doorColor?: string;
  signColor?: string;
  awningColor?: string;
  windows?: WindowSpec[];
  children?: ReactNode;
}

export function LowPolyBuilding({
  width,
  depth,
  wallHeight,
  wallColor,
  trimColor,
  roofColor,
  roofRadius,
  roofHeight,
  roofOpacity,
  foundationColor = '#8a7a6a',
  doorWidth = 1.2,
  doorHeight = 1.9,
  doorColor = '#5a3a1a',
  signColor,
  awningColor,
  windows = [],
  children,
}: BuildingProps) {
  const buildingRef = useRef<THREE.Group>(null);
  const frontZ = depth / 2;
  const backZ = -depth / 2;
  const sideX = width / 2;
  const roofWidth = Math.min(width + 1.3, roofRadius * 1.45);
  const roofDepth = depth + 1.35;
  const roofAngle = Math.atan2(roofHeight, roofDepth * 0.5);
  const roofPlaneLength = roofDepth * 0.58;
  const roofY = wallHeight + roofHeight * 0.45;
  const sidingRows = Math.max(3, Math.floor(wallHeight / 0.55));

  useEffect(() => {
    buildingRef.current?.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        if (!(material instanceof THREE.MeshStandardMaterial) && !(material instanceof THREE.MeshBasicMaterial)) return;
        if (material.userData.baseOpacity === undefined) {
          material.userData.baseOpacity = material.opacity;
          material.userData.baseTransparent = material.transparent;
          material.userData.baseDepthWrite = material.depthWrite;
        }
        const baseOpacity = Number(material.userData.baseOpacity);
        const faded = roofOpacity < 0.98;
        material.transparent = faded || Boolean(material.userData.baseTransparent);
        material.opacity = baseOpacity * roofOpacity;
        material.depthWrite = faded ? false : Boolean(material.userData.baseDepthWrite);
        material.needsUpdate = true;
      });
    });
  }, [roofOpacity]);

  return (
    <group ref={buildingRef}>
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[width + 0.8, 0.16, depth + 0.8]} />
        <meshStandardMaterial color={foundationColor} flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 0.13, frontZ + 0.38]} receiveShadow>
        <boxGeometry args={[doorWidth + 0.9, 0.26, 0.75]} />
        <meshStandardMaterial color={foundationColor} flatShading roughness={1} />
      </mesh>

      <mesh position={[0, wallHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, wallHeight, depth]} />
        <meshStandardMaterial color={wallColor} flatShading roughness={1} />
      </mesh>
      {[-sideX - 0.04, sideX + 0.04].map((x) => (
        <mesh key={x} position={[x, wallHeight / 2, frontZ + 0.04]} castShadow>
          <boxGeometry args={[0.16, wallHeight + 0.12, 0.16]} />
          <meshStandardMaterial color={trimColor} flatShading roughness={1} />
        </mesh>
      ))}
      {Array.from({ length: sidingRows }, (_, index) => {
        const y = 0.62 + index * 0.52;
        return (
          <mesh key={index} position={[0, y, frontZ + 0.055]}>
            <boxGeometry args={[width - 0.4, 0.045, 0.06]} />
            <meshStandardMaterial color={trimColor} flatShading roughness={1} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[width + 0.15, 0.28, depth + 0.15]} />
        <meshStandardMaterial color={trimColor} flatShading roughness={1} />
      </mesh>
      <mesh position={[0, wallHeight + 0.04, 0]}>
        <boxGeometry args={[width + 0.25, 0.16, depth + 0.25]} />
        <meshStandardMaterial color={trimColor} flatShading roughness={1} />
      </mesh>

      <mesh position={[0, roofY, roofDepth * 0.24]} castShadow rotation={[roofAngle, 0, 0]}>
        <boxGeometry args={[roofWidth, 0.26, roofPlaneLength]} />
        <meshStandardMaterial
          color={roofColor}
          flatShading
          roughness={1}
          transparent={roofOpacity < 0.98}
          opacity={roofOpacity}
          depthWrite={roofOpacity >= 0.98}
        />
      </mesh>
      <mesh position={[0, roofY, -roofDepth * 0.24]} castShadow rotation={[-roofAngle, 0, 0]}>
        <boxGeometry args={[roofWidth, 0.26, roofPlaneLength]} />
        <meshStandardMaterial
          color={roofColor}
          flatShading
          roughness={1}
          transparent={roofOpacity < 0.98}
          opacity={roofOpacity}
          depthWrite={roofOpacity >= 0.98}
        />
      </mesh>
      <mesh position={[0, wallHeight + roofHeight + 0.03, 0]} castShadow>
        <boxGeometry args={[roofWidth + 0.25, 0.18, 0.22]} />
        <meshStandardMaterial color={roofColor} flatShading roughness={0.7} />
      </mesh>
      <mesh position={[0, wallHeight + 0.16, frontZ + 0.18]} castShadow>
        <boxGeometry args={[width + 0.85, 0.18, 0.38]} />
        <meshStandardMaterial color={roofColor} flatShading roughness={1} />
      </mesh>
      <mesh position={[0, wallHeight + 0.16, backZ - 0.18]} castShadow>
        <boxGeometry args={[width + 0.85, 0.18, 0.38]} />
        <meshStandardMaterial color={roofColor} flatShading roughness={1} />
      </mesh>
      <mesh position={[-sideX - 0.18, wallHeight + 0.16, 0]} castShadow>
        <boxGeometry args={[0.32, 0.16, depth + 0.7]} />
        <meshStandardMaterial color={roofColor} flatShading roughness={1} />
      </mesh>
      <mesh position={[sideX + 0.18, wallHeight + 0.16, 0]} castShadow>
        <boxGeometry args={[0.32, 0.16, depth + 0.7]} />
        <meshStandardMaterial color={roofColor} flatShading roughness={1} />
      </mesh>

      {[-1, 1].map((side) => (
        <group key={`gutter-${side}`}>
          <mesh
            position={[0, wallHeight + 0.08, side * (depth / 2 + 0.43)]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.055, 0.055, width + 0.65, 8]} />
            <meshStandardMaterial color="#6d6256" flatShading roughness={0.85} metalness={0.08} />
          </mesh>
          <mesh position={[sideX + 0.28, wallHeight * 0.47, side * (depth / 2 + 0.43)]} castShadow>
            <cylinderGeometry args={[0.045, 0.045, wallHeight * 0.92, 7]} />
            <meshStandardMaterial color="#6d6256" flatShading roughness={0.85} metalness={0.08} />
          </mesh>
        </group>
      ))}

      {!awningColor && (
        <mesh position={[0, doorHeight + 0.32, frontZ + 0.3]} rotation={[0.12, 0, 0]} castShadow>
          <boxGeometry args={[doorWidth + 0.75, 0.12, 0.62]} />
          <meshStandardMaterial color={roofColor} flatShading roughness={1} />
        </mesh>
      )}

      <Door width={doorWidth} height={doorHeight} z={frontZ + 0.05} color={doorColor} trimColor={trimColor} />
      {windows.map((window, index) => <Window key={index} {...window} trimColor={trimColor} />)}

      {signColor && (
        <group>
          <mesh position={[0, wallHeight - 0.45, frontZ + 0.08]} castShadow>
            <boxGeometry args={[Math.min(width - 1.4, 3.5), 0.46, 0.12]} />
            <meshStandardMaterial color={signColor} flatShading roughness={0.8} />
          </mesh>
          <mesh position={[0, wallHeight - 0.43, frontZ + 0.15]}>
            <boxGeometry args={[Math.min(width - 2.0, 2.7), 0.12, 0.06]} />
            <meshBasicMaterial color="#5a3a1f" />
          </mesh>
        </group>
      )}

      {awningColor && (
        <group>
          <mesh position={[0, doorHeight + 0.25, frontZ + 0.25]} rotation={[0.18, 0, 0]} castShadow>
            <boxGeometry args={[doorWidth + 2.1, 0.08, 0.65]} />
            <meshStandardMaterial color={awningColor} flatShading roughness={1} />
          </mesh>
          <mesh position={[0, doorHeight + 0.42, frontZ - 0.02]} rotation={[0.32, 0, 0]} castShadow>
            <boxGeometry args={[doorWidth + 2.1, 0.08, 0.42]} />
            <meshStandardMaterial color={awningColor} flatShading roughness={1} />
          </mesh>
        </group>
      )}

      {children}
    </group>
  );
}

function Door({ width, height, z, color, trimColor }: { width: number; height: number; z: number; color: string; trimColor: string }) {
  return (
    <group>
      <mesh position={[0, height / 2, z]} castShadow>
        <boxGeometry args={[width + 0.26, height + 0.22, 0.12]} />
        <meshStandardMaterial color={trimColor} flatShading roughness={1} />
      </mesh>
      <mesh position={[0, height / 2, z + 0.05]} castShadow>
        <boxGeometry args={[width, height, 0.08]} />
        <meshStandardMaterial color={color} flatShading roughness={1} />
      </mesh>
      <mesh position={[0, height * 0.52, z + 0.105]}>
        <boxGeometry args={[0.045, height * 0.72, 0.035]} />
        <meshBasicMaterial color="#382412" />
      </mesh>
      <mesh position={[0, height * 0.63, z + 0.11]}>
        <boxGeometry args={[width * 0.72, 0.045, 0.035]} />
        <meshBasicMaterial color="#382412" />
      </mesh>
      <mesh position={[0, height * 0.36, z + 0.11]}>
        <boxGeometry args={[width * 0.72, 0.045, 0.035]} />
        <meshBasicMaterial color="#382412" />
      </mesh>
      <mesh position={[width * 0.28, height * 0.52, z + 0.11]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#c8a040" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[0, height + 0.2, z + 0.06]} castShadow>
        <boxGeometry args={[width + 0.55, 0.12, 0.24]} />
        <meshStandardMaterial color={trimColor} flatShading roughness={1} />
      </mesh>
    </group>
  );
}

function Window({ x, y, z, side = 'front', w = 0.9, h = 0.85, trimColor }: WindowSpec & { trimColor: string }) {
  const rotationY = side === 'left' ? Math.PI / 2 : side === 'right' ? -Math.PI / 2 : 0;
  return (
    <group position={[x, y, z]} rotation={[0, rotationY, 0]}>
      <mesh>
        <boxGeometry args={[w + 0.12, h + 0.12, 0.06]} />
        <meshStandardMaterial color={trimColor} flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 0, 0.04]}>
        <boxGeometry args={[w, h, 0.04]} />
        <meshStandardMaterial color="#bfe0f5" flatShading emissive="#88aabb" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, 0, 0.075]}>
        <boxGeometry args={[0.045, h + 0.05, 0.035]} />
        <meshBasicMaterial color="#5a3a1a" />
      </mesh>
      <mesh position={[0, 0, 0.08]}>
        <boxGeometry args={[w + 0.05, 0.045, 0.035]} />
        <meshBasicMaterial color="#5a3a1a" />
      </mesh>
      <mesh position={[0, -h / 2 - 0.1, 0.09]} castShadow>
        <boxGeometry args={[w + 0.32, 0.12, 0.16]} />
        <meshStandardMaterial color={trimColor} flatShading roughness={1} />
      </mesh>
      <mesh position={[0, -h / 2 - 0.24, 0.12]} castShadow>
        <boxGeometry args={[w + 0.18, 0.16, 0.18]} />
        <meshStandardMaterial color="#8a5634" flatShading roughness={1} />
      </mesh>
      <mesh position={[-w * 0.25, -h / 2 - 0.1, 0.2]} castShadow>
        <sphereGeometry args={[0.08, 6, 6]} />
        <meshBasicMaterial color="#e0c85a" />
      </mesh>
      <mesh position={[w * 0.25, -h / 2 - 0.1, 0.2]} castShadow>
        <sphereGeometry args={[0.08, 6, 6]} />
        <meshBasicMaterial color="#d85f75" />
      </mesh>
    </group>
  );
}

export function Chimney({ x, z, y = 4.4 }: { x: number; z: number; y?: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh castShadow>
        <boxGeometry args={[0.55, 0.9, 0.55]} />
        <meshStandardMaterial color="#6a5a4a" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 0.48, 0]}>
        <boxGeometry args={[0.68, 0.12, 0.68]} />
        <meshStandardMaterial color="#5a4a3a" flatShading roughness={1} />
      </mesh>
    </group>
  );
}

export function PorchColumns({ width, z, height }: { width: number; z: number; height: number }) {
  return (
    <group>
      {[-width / 2, 0, width / 2].map((x) => (
        <group key={x} position={[x, 0, z]}>
          <mesh position={[0, height / 2, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.28, height, 8]} />
            <meshStandardMaterial color="#f5ede0" flatShading roughness={1} />
          </mesh>
          <mesh position={[0, height + 0.08, 0]}>
            <boxGeometry args={[0.46, 0.12, 0.46]} />
            <meshStandardMaterial color="#e8ddd0" flatShading roughness={1} />
          </mesh>
          <mesh position={[0, 0.14, 0]}>
            <boxGeometry args={[0.5, 0.12, 0.5]} />
            <meshStandardMaterial color="#d8c8b0" flatShading roughness={1} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, height + 0.2, z]} castShadow>
        <boxGeometry args={[width + 1.0, 0.24, 0.48]} />
        <meshStandardMaterial color="#e8ddd0" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, height + 0.55, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <coneGeometry args={[0.58, width + 1.2, 3]} />
        <meshStandardMaterial color="#e8ddd0" flatShading roughness={1} />
      </mesh>
    </group>
  );
}

export function Planters({ z, spread = 1.25 }: { z: number; spread?: number }) {
  return (
    <group>
      {[-spread, spread].map((x, i) => (
        <group key={x} position={[x, 0.1, z]}>
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.16, 0.11, 0.3, 8]} />
            <meshStandardMaterial color="#a07040" flatShading roughness={1} />
          </mesh>
          <mesh position={[0, 0.36, 0]}>
            <dodecahedronGeometry args={[0.14, 0]} />
            <meshBasicMaterial color={i === 0 ? '#e06060' : '#e0a060'} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function ShopCrates({ z, spread = 2.15 }: { z: number; spread?: number }) {
  return (
    <group>
      {[-spread, spread].map((x, i) => (
        <group key={x} position={[x, 0.15, z]} rotation={[0, i === 0 ? -0.25 : 0.3, 0]}>
          <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.58, 0.36, 0.5]} />
            <meshStandardMaterial color="#9b6a3c" flatShading roughness={1} />
          </mesh>
          <mesh position={[0, 0.39, 0]} castShadow>
            <boxGeometry args={[0.62, 0.06, 0.54]} />
            <meshStandardMaterial color="#6f4828" flatShading roughness={1} />
          </mesh>
          <mesh position={[0, 0.28, 0.27]} castShadow>
            <boxGeometry args={[0.46, 0.045, 0.035]} />
            <meshBasicMaterial color="#5a351c" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function MuseumSteps({ width, z }: { width: number; z: number }) {
  return (
    <group>
      {[0, 1, 2].map((step) => (
        <mesh key={step} position={[0, 0.09 + step * 0.08, z + step * 0.38]} receiveShadow>
          <boxGeometry args={[width - step * 0.45, 0.16, 0.55]} />
          <meshStandardMaterial color={step % 2 === 0 ? '#c8b8a0' : '#d6c8b4'} flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

export function BuildingYard({
  width,
  depth,
  variantOffset = 0,
  logs = false,
}: {
  width: number;
  depth: number;
  variantOffset?: number;
  logs?: boolean;
}) {
  const sideX = width / 2 + 0.95;
  const backZ = -depth / 2 - 0.72;
  const frontZ = depth / 2 + 0.95;
  return (
    <group>
      <group position={[-width / 2 - 0.8, 0, frontZ]} rotation={[0, 0.35, 0]}>
        <KenneyBush variant={variantOffset} size={0.75} />
      </group>
      <group position={[width / 2 + 0.75, 0, frontZ - 0.25]} rotation={[0, -0.45, 0]}>
        <KenneyBush variant={variantOffset + 1} size={0.68} />
      </group>
      <group position={[width / 2 + 0.9, 0, backZ + 0.35]} rotation={[0, -0.9, 0]}>
        <KenneyBush variant={variantOffset + 2} size={0.9} />
      </group>

      {logs && (
        <group position={[-sideX + 0.65, 0, -depth / 2 + 0.35]} rotation={[0, 0.65, 0]}>
          <KenneyLog stack />
        </group>
      )}
    </group>
  );
}
