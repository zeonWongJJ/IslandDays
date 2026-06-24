import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameRefs } from '../controllers/gameRefsContext.ts';

interface MountainRangeDef {
  angle: number;
  distance: number;
  scale: number;
  color: string;
  snow: boolean;
  peaks: number[];
}

const MOUNTAIN_RANGES: MountainRangeDef[] = [
  { angle: -0.35, distance: 210, scale: 1.0, color: '#74837a', snow: false, peaks: [11, 17, 13, 20] },
  { angle: 0.95, distance: 225, scale: 1.06, color: '#687873', snow: true, peaks: [15, 22, 18, 25] },
  { angle: 2.45, distance: 215, scale: 0.96, color: '#778477', snow: false, peaks: [12, 18, 14, 21] },
  { angle: 4.05, distance: 230, scale: 1.04, color: '#697971', snow: true, peaks: [14, 23, 17, 26] },
  { angle: 5.35, distance: 218, scale: 0.92, color: '#79867a', snow: false, peaks: [10, 16, 13, 19] },
];

function MountainRange({ def }: { def: MountainRangeDef }) {
  const range = useMemo(() => {
    const group = new THREE.Group();
    const totalWidth = def.peaks.length * 21 * def.scale;
    def.peaks.forEach((height, index) => {
      const width = (25 + (index % 3) * 5) * def.scale;
      const depth = (16 + ((index + 1) % 3) * 4) * def.scale;
      const x = -totalWidth / 2 + index * 21 * def.scale;
      const peak = new THREE.Mesh(
        new THREE.ConeGeometry(width * 0.55, height * def.scale, 6),
        new THREE.MeshStandardMaterial({
          color: index % 2 === 0 ? def.color : new THREE.Color(def.color).offsetHSL(0, 0.02, -0.055),
          flatShading: true,
          roughness: 1,
        }),
      );
      peak.position.set(x, height * def.scale * 0.5 - 5.8, (index % 2) * 8 - 4);
      peak.scale.z = depth / width;
      peak.rotation.y = index * 0.37;
      group.add(peak);

      if (def.snow && height >= 21) {
        const capHeight = height * def.scale * 0.24;
        const cap = new THREE.Mesh(
          new THREE.ConeGeometry(width * 0.23, capHeight, 6),
          new THREE.MeshStandardMaterial({ color: '#dce4df', flatShading: true, roughness: 0.94 }),
        );
        cap.position.set(x, height * def.scale - capHeight * 0.53 - 5.8, peak.position.z);
        cap.scale.z = depth / width;
        cap.rotation.y = peak.rotation.y;
        group.add(cap);
      }
    });
    return group;
  }, [def]);

  const x = Math.cos(def.angle) * def.distance;
  const z = Math.sin(def.angle) * def.distance;
  return <primitive object={range} position={[x, -2.5, z]} rotation={[0, -def.angle + Math.PI / 2, 0]} />;
}

function DistantIsland({
  position,
  scale,
  lighthouse = false,
}: {
  position: [number, number, number];
  scale: number;
  lighthouse?: boolean;
}) {
  return (
    <group position={position} scale={scale} frustumCulled={false}>
      <mesh position={[0, 0.4, 0]} scale={[2.8, 0.55, 1.8]}>
        <dodecahedronGeometry args={[4.5, 0]} />
        <meshStandardMaterial color="#52664d" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, -0.55, 0]} scale={[3.2, 0.25, 2.0]}>
        <dodecahedronGeometry args={[4.7, 0]} />
        <meshStandardMaterial color="#8d8068" flatShading roughness={1} />
      </mesh>
      {[-5, -2.2, 2.3, 5].map((x, i) => (
        <group key={x} position={[x, 2.1 + (i % 2) * 0.4, i % 2 === 0 ? 1.5 : -1]}>
          <mesh position={[0, -0.9, 0]}>
            <cylinderGeometry args={[0.16, 0.22, 1.8, 6]} />
            <meshStandardMaterial color="#65442c" flatShading roughness={1} />
          </mesh>
          <mesh scale={[1, 1.25, 1]}>
            <dodecahedronGeometry args={[1.15, 0]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#446444' : '#56744d'} flatShading roughness={1} />
          </mesh>
        </group>
      ))}
      {lighthouse && <Lighthouse />}
    </group>
  );
}

function Lighthouse() {
  return (
    <group position={[0, 2.2, 0]}>
      <mesh position={[0, 2.6, 0]} castShadow>
        <cylinderGeometry args={[0.65, 1.05, 5.2, 10]} />
        <meshStandardMaterial color="#e9e2d2" flatShading roughness={0.92} />
      </mesh>
      {[0.4, 2.2, 4].map((y) => (
        <mesh key={y} position={[0, y + 0.4, 0]}>
          <cylinderGeometry args={[1.08 - y * 0.08, 1.1 - y * 0.08, 0.38, 10]} />
          <meshStandardMaterial color="#b85542" flatShading roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 5.45, 0]}>
        <cylinderGeometry args={[0.82, 0.82, 0.65, 10]} />
        <meshStandardMaterial color="#9fc5ce" transparent opacity={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[0, 6.05, 0]}>
        <coneGeometry args={[1.05, 0.72, 10]} />
        <meshStandardMaterial color="#873a31" flatShading roughness={1} />
      </mesh>
      <pointLight position={[0, 5.5, 0]} color="#fff0b0" intensity={1.1} distance={18} />
    </group>
  );
}

function SailingShip({
  start,
  scale,
  speed,
  color,
}: {
  start: [number, number, number];
  scale: number;
  speed: number;
  color: string;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const t = state.clock.elapsedTime * speed;
    group.position.x = start[0] + Math.sin(t) * 18;
    group.position.z = start[2] + Math.cos(t * 0.7) * 5;
    group.position.y = start[1] + Math.sin(t * 4) * 0.08;
    group.rotation.y = 0.82 + Math.cos(t) * 0.25;
    group.rotation.z = Math.sin(t * 3) * 0.018;
  });

  return (
    <group ref={groupRef} position={start} scale={scale} frustumCulled={false}>
      <mesh position={[0, 0.28, 0]} scale={[1, 0.55, 1]}>
        <cylinderGeometry args={[1.25, 1.7, 5.6, 8, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={color} flatShading roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[2.3, 0.18, 4.6]} />
        <meshStandardMaterial color="#c69a63" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 3.2, 0]}>
        <cylinderGeometry args={[0.08, 0.11, 6.2, 7]} />
        <meshStandardMaterial color="#65442b" flatShading roughness={1} />
      </mesh>
      <mesh position={[0.12, 3.45, 0.65]} rotation={[0, 0.12, 0]}>
        <planeGeometry args={[3.4, 4.8]} />
        <meshStandardMaterial color="#f0e3c3" side={THREE.DoubleSide} flatShading roughness={0.96} />
      </mesh>
      <mesh position={[-0.08, 4.5, -1.3]} rotation={[0, -0.15, 0]}>
        <planeGeometry args={[2.3, 2.9]} />
        <meshStandardMaterial color="#dfcfae" side={THREE.DoubleSide} flatShading roughness={0.96} />
      </mesh>
      <mesh position={[0.08, 6.15, 0]}>
        <boxGeometry args={[1.3, 0.65, 0.05]} />
        <meshStandardMaterial color="#c45443" flatShading roughness={1} />
      </mesh>
    </group>
  );
}

export function BackgroundScenery() {
  const horizonRef = useRef<THREE.Group>(null);
  const { playerRef } = useGameRefs();

  useFrame(() => {
    const horizon = horizonRef.current;
    const player = playerRef.current;
    if (!horizon || !player) return;
    horizon.position.x = player.position.x;
    horizon.position.z = player.position.z;
  });

  return (
    <group ref={horizonRef}>
      {MOUNTAIN_RANGES.map((range, index) => <MountainRange key={index} def={range} />)}
      <DistantIsland position={[168, -2.4, -142]} scale={0.9} lighthouse />
      <DistantIsland position={[-182, -2.7, 128]} scale={0.72} />
      <DistantIsland position={[132, -2.8, 176]} scale={0.58} />
      <SailingShip start={[132, -1.25, -158]} scale={0.72} speed={0.028} color="#914d38" />
      <SailingShip start={[-155, -1.3, -126]} scale={0.52} speed={0.02} color="#4e6f83" />
    </group>
  );
}
