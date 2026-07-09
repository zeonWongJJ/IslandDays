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
  { angle: -0.35, distance: 205, scale: 1.0, color: '#71827b', snow: false, peaks: [9, 14, 11, 16, 10] },
  { angle: 0.95, distance: 218, scale: 1.04, color: '#667a78', snow: true, peaks: [12, 17, 14, 19, 13] },
  { angle: 2.45, distance: 208, scale: 0.96, color: '#78877c', snow: false, peaks: [10, 15, 12, 17, 11] },
  { angle: 4.05, distance: 222, scale: 1.02, color: '#657774', snow: true, peaks: [12, 18, 14, 20, 13] },
  { angle: 5.35, distance: 212, scale: 0.94, color: '#7b897d', snow: false, peaks: [8, 13, 10, 15, 9] },
];

function MountainRange({ def }: { def: MountainRangeDef }) {
  const range = useMemo(() => {
    const group = new THREE.Group();
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: def.color,
      flatShading: true,
      roughness: 1,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    const shadeMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(def.color).offsetHSL(0, 0.02, -0.055),
      flatShading: true,
      roughness: 1,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
    });
    const foothillMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(def.color).offsetHSL(0.01, 0.035, 0.035),
      flatShading: true,
      roughness: 1,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const snowMaterial = new THREE.MeshStandardMaterial({
      color: '#dce4df',
      flatShading: true,
      roughness: 0.94,
      transparent: true,
      opacity: 0.76,
      depthWrite: false,
    });
    const totalWidth = def.peaks.length * 18 * def.scale;
    def.peaks.forEach((height, index) => {
      const width = (22 + (index % 3) * 4) * def.scale;
      const depth = (14 + ((index + 1) % 3) * 3) * def.scale;
      const x = -totalWidth / 2 + index * 18 * def.scale;
      const peak = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1, 1),
        index % 2 === 0 ? baseMaterial : shadeMaterial,
      );
      peak.position.set(x, height * def.scale * 0.34 - 5.8, (index % 2) * 7 - 3.5);
      peak.scale.set(width * 0.58, height * def.scale * 0.58, depth * 0.62);
      peak.rotation.y = index * 0.37;
      peak.rotation.z = (index % 2 === 0 ? -1 : 1) * 0.08;
      group.add(peak);

      const foothill = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1, 0),
        foothillMaterial,
      );
      foothill.position.set(x + width * 0.34, -3.5, peak.position.z + depth * 0.2);
      foothill.scale.set(width * 0.52, height * 0.22, depth * 0.72);
      group.add(foothill);

      if (def.snow && height >= 17) {
        const cap = new THREE.Mesh(
          new THREE.IcosahedronGeometry(1, 1),
          snowMaterial,
        );
        cap.position.set(x, peak.position.y + height * 0.42, peak.position.z);
        cap.scale.set(width * 0.22, height * 0.16, depth * 0.24);
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

function HorizonHaze() {
  const bands = [
    { x: 0, z: -174, y: 9, rotation: 0, width: 320, height: 32, opacity: 0.13 },
    { x: 0, z: 176, y: 9, rotation: Math.PI, width: 320, height: 30, opacity: 0.12 },
    { x: 176, z: 0, y: 8.4, rotation: Math.PI / 2, width: 300, height: 28, opacity: 0.1 },
    { x: -176, z: 0, y: 8.4, rotation: -Math.PI / 2, width: 300, height: 28, opacity: 0.1 },
  ];

  return (
    <group>
      {bands.map((band, index) => (
        <mesh
          key={index}
          position={[band.x, band.y, band.z]}
          rotation={[0, band.rotation, 0]}
          renderOrder={-10}
          frustumCulled={false}
        >
          <planeGeometry args={[band.width, band.height]} />
          <meshBasicMaterial
            color="#d9e7e2"
            transparent
            opacity={band.opacity}
            depthWrite={false}
            side={THREE.DoubleSide}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  );
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
        <meshStandardMaterial color="#5b6e61" flatShading roughness={1} transparent opacity={0.72} depthWrite={false} />
      </mesh>
      <mesh position={[0, -0.55, 0]} scale={[3.2, 0.25, 2.0]}>
        <dodecahedronGeometry args={[4.7, 0]} />
        <meshStandardMaterial color="#978b76" flatShading roughness={1} transparent opacity={0.66} depthWrite={false} />
      </mesh>
      {[-5, -2.2, 2.3, 5].map((x, i) => (
        <group key={x} position={[x, 2.1 + (i % 2) * 0.4, i % 2 === 0 ? 1.5 : -1]}>
          <mesh position={[0, -0.9, 0]}>
            <cylinderGeometry args={[0.16, 0.22, 1.8, 6]} />
            <meshStandardMaterial color="#6e5139" flatShading roughness={1} transparent opacity={0.72} depthWrite={false} />
          </mesh>
          <mesh scale={[1, 1.25, 1]}>
            <dodecahedronGeometry args={[1.15, 0]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? '#526c58' : '#63795d'}
              flatShading
              roughness={1}
              transparent
              opacity={0.68}
              depthWrite={false}
            />
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
        <meshStandardMaterial color="#e9e2d2" flatShading roughness={0.92} transparent opacity={0.82} depthWrite={false} />
      </mesh>
      {[0.4, 2.2, 4].map((y) => (
        <mesh key={y} position={[0, y + 0.4, 0]}>
          <cylinderGeometry args={[1.08 - y * 0.08, 1.1 - y * 0.08, 0.38, 10]} />
          <meshStandardMaterial color="#b85542" flatShading roughness={0.9} transparent opacity={0.8} depthWrite={false} />
        </mesh>
      ))}
      <mesh position={[0, 5.45, 0]}>
        <cylinderGeometry args={[0.82, 0.82, 0.65, 10]} />
        <meshStandardMaterial color="#9fc5ce" transparent opacity={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[0, 6.05, 0]}>
        <coneGeometry args={[1.05, 0.72, 10]} />
        <meshStandardMaterial color="#873a31" flatShading roughness={1} transparent opacity={0.8} depthWrite={false} />
      </mesh>
      <pointLight position={[0, 5.5, 0]} color="#fff0b0" intensity={1.1} distance={18} />
    </group>
  );
}

function RuinSilhouette({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={0.9} frustumCulled={false}>
      {[-4.6, -1.4, 2.2, 5.4].map((x, index) => (
        <mesh key={x} position={[x, 2.2 + (index % 2) * 0.9, 0]}>
          <boxGeometry args={[0.8, 5.8 + (index % 2) * 2, 0.8]} />
          <meshStandardMaterial color="#69716b" flatShading roughness={1} transparent opacity={0.58} depthWrite={false} />
        </mesh>
      ))}
      <mesh position={[0.6, 6.2, 0]} rotation={[0, 0, 0.08]}>
        <boxGeometry args={[8.8, 0.55, 0.9]} />
        <meshStandardMaterial color="#5c655f" flatShading roughness={1} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <mesh position={[-5.8, 0.3, 0.2]} rotation={[0.12, 0, -0.2]}>
        <dodecahedronGeometry args={[1.6, 0]} />
        <meshStandardMaterial color="#5c645e" flatShading roughness={1} transparent opacity={0.48} depthWrite={false} />
      </mesh>
    </group>
  );
}

function DistantWaterfallSilhouette({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={0.86} frustumCulled={false}>
      <mesh position={[0, 4.8, 0]} scale={[4.2, 3.8, 1.5]}>
        <dodecahedronGeometry args={[2.5, 0]} />
        <meshStandardMaterial color="#66726a" flatShading roughness={1} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <mesh position={[0, 2.7, -0.18]}>
        <planeGeometry args={[3.4, 5.6]} />
        <meshBasicMaterial color="#bdd9dc" transparent opacity={0.28} depthWrite={false} side={THREE.DoubleSide} fog={false} />
      </mesh>
      <mesh position={[0, 0.4, -0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.6, 12]} />
        <meshBasicMaterial color="#d9efef" transparent opacity={0.2} depthWrite={false} fog={false} />
      </mesh>
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
  const hullGeometry = useMemo(() => createBoatHullGeometry(), []);

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
      <mesh geometry={hullGeometry} position={[0, 0.18, 0]}>
        <meshStandardMaterial color={color} flatShading roughness={0.9} side={THREE.DoubleSide} transparent opacity={0.78} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.72, 0.1]}>
        <boxGeometry args={[2.15, 0.16, 4.05]} />
        <meshStandardMaterial color="#c69a63" flatShading roughness={1} transparent opacity={0.78} depthWrite={false} />
      </mesh>
      <mesh position={[0, 1.08, 1.35]}>
        <boxGeometry args={[1.55, 0.62, 1.05]} />
        <meshStandardMaterial color="#d9c49d" flatShading roughness={1} transparent opacity={0.76} depthWrite={false} />
      </mesh>
      <mesh position={[0, 3.2, 0]}>
        <cylinderGeometry args={[0.08, 0.11, 6.2, 7]} />
        <meshStandardMaterial color="#65442b" flatShading roughness={1} transparent opacity={0.78} depthWrite={false} />
      </mesh>
      <mesh position={[0.12, 3.4, 0.45]} rotation={[0, 0.12, 0]}>
        <planeGeometry args={[3.0, 4.25]} />
        <meshStandardMaterial color="#f0e3c3" side={THREE.DoubleSide} flatShading roughness={0.96} transparent opacity={0.76} depthWrite={false} />
      </mesh>
      <mesh position={[-0.08, 4.5, -1.3]} rotation={[0, -0.15, 0]}>
        <planeGeometry args={[2.3, 2.9]} />
        <meshStandardMaterial color="#dfcfae" side={THREE.DoubleSide} flatShading roughness={0.96} transparent opacity={0.74} depthWrite={false} />
      </mesh>
      <mesh position={[0.08, 6.15, 0]}>
        <boxGeometry args={[1.3, 0.65, 0.05]} />
        <meshStandardMaterial color="#c45443" flatShading roughness={1} transparent opacity={0.76} depthWrite={false} />
      </mesh>
    </group>
  );
}

function createBoatHullGeometry(): THREE.BufferGeometry {
  const vertices = new Float32Array([
    -1.25, 0.55, -2.05, 1.25, 0.55, -2.05, -0.72, -0.6, -1.7, 0.72, -0.6, -1.7,
    -1.05, 0.55, 1.8, 1.05, 0.55, 1.8, -0.5, -0.45, 2.25, 0.5, -0.45, 2.25,
  ]);
  const indices = [
    0, 2, 4, 2, 6, 4,
    1, 5, 3, 3, 5, 7,
    0, 1, 2, 1, 3, 2,
    4, 6, 5, 5, 6, 7,
    2, 3, 6, 3, 7, 6,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
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
      <HorizonHaze />
      {MOUNTAIN_RANGES.map((range, index) => <MountainRange key={index} def={range} />)}
      <DistantIsland position={[168, -2.4, -142]} scale={0.9} lighthouse />
      <DistantIsland position={[-182, -2.7, 128]} scale={0.72} />
      <DistantIsland position={[132, -2.8, 176]} scale={0.58} />
      <RuinSilhouette position={[-152, -1.8, 104]} rotation={0.42} />
      <DistantWaterfallSilhouette position={[-104, -2.2, 170]} rotation={-0.26} />
      <SailingShip start={[132, -1.25, -158]} scale={0.72} speed={0.028} color="#914d38" />
      <SailingShip start={[-155, -1.3, -126]} scale={0.52} speed={0.02} color="#4e6f83" />
    </group>
  );
}
