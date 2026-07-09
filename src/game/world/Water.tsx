import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WORLD } from '../../config/constants.ts';
import { groundKind, riverAmount } from '../../systems/terrain.ts';

interface RiverPatch {
  x: number;
  z: number;
  sx: number;
  sz: number;
  rot: number;
  phase: number;
  kind: 'flow' | 'foam';
}

function makeRiverPatches(): RiverPatch[] {
  const patches: RiverPatch[] = [];
  const half = WORLD.size / 2;
  for (let x = -half + 4; x <= half - 4; x += 2.8) {
    for (let z = -half + 4; z <= half - 4; z += 2.8) {
      const river = riverAmount(x, z);
      if (river < 0.5 || groundKind(x, z) !== 'water') continue;
      const noise = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
      const rnd = noise - Math.floor(noise);
      if (rnd < 0.38) continue;
      const dx = riverAmount(x + 1.2, z) - riverAmount(x - 1.2, z);
      const dz = riverAmount(x, z + 1.2) - riverAmount(x, z - 1.2);
      const edge = Math.hypot(dx, dz);
      const tangent = Math.atan2(-dx, dz);
      patches.push({
        x: x + (rnd - 0.5) * 0.7,
        z: z + (Math.sin(noise * 0.37) - 0.5) * 0.7,
        sx: edge > 0.12 ? 0.55 + rnd * 0.85 : 1.35 + rnd * 1.6,
        sz: edge > 0.12 ? 0.045 + rnd * 0.08 : 0.055 + rnd * 0.12,
        rot: tangent + (rnd - 0.5) * 0.45,
        phase: rnd * Math.PI * 2,
        kind: edge > 0.12 ? 'foam' : 'flow',
      });
    }
  }
  return patches.slice(0, 220);
}

export function Water() {
  const meshRef = useRef<THREE.Mesh>(null);
  const geoRef = useRef<THREE.BufferGeometry>(null);
  const foamRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  const size = WORLD.size + WORLD.waterBorder * 2 + 20;
  const seg = 48;
  const halfSize = WORLD.size / 2;
  const waterEdge = halfSize + WORLD.waterBorder * 0.3;

  useFrame((_, delta) => {
    const geo = geoRef.current;
    if (!geo) return;
    timeRef.current += delta * 0.8;
    const t = timeRef.current;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < pos.count; i++) {
      const i3 = i * 3;
      const x = arr[i3];
      const y = arr[i3 + 1];
      const dist = Math.sqrt(x * x + y * y);
      const islandEdge = waterEdge;
      const amp = THREE.MathUtils.clamp((dist - islandEdge) / 20, 0.04, 0.3);
      const wave =
        Math.sin(x * 0.15 + t * 1.2) * 0.3 +
        Math.sin(y * 0.12 + t * 0.9 + 1.5) * 0.25 +
        Math.sin((x + y) * 0.08 + t * 1.8) * 0.2;
      arr[i3 + 2] = -wave * amp;
    }
    pos.needsUpdate = true;

    // shore foam ring: subtle opacity pulse
    if (foamRef.current) {
      const mat = foamRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.15 + Math.sin(t * 0.6) * 0.05;
    }
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.4, 0]}
        receiveShadow
      >
        <planeGeometry ref={geoRef} args={[size, size, seg, seg]} />
        <meshPhysicalMaterial
          color="#3395bd"
          transparent
          opacity={0.52}
          roughness={0.18}
          metalness={0.12}
          envMapIntensity={0.72}
          clearcoat={0.42}
          clearcoatRoughness={0.4}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* shore foam ring */}
      <mesh
        ref={foamRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.2, 0]}
      >
        <ringGeometry args={[halfSize - 2, halfSize + 4, 64]} />
        <meshBasicMaterial
          color="#d0eaf0"
          transparent
          opacity={0.15}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <RiverWaterAccents />
    </group>
  );
}

function RiverWaterAccents() {
  const flowRef = useRef<THREE.InstancedMesh>(null);
  const foamRef = useRef<THREE.InstancedMesh>(null);
  const flowMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const foamMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const patches = useMemo(() => makeRiverPatches(), []);
  const flow = useMemo(() => patches.filter((patch) => patch.kind === 'flow'), [patches]);
  const foam = useMemo(() => patches.filter((patch) => patch.kind === 'foam'), [patches]);

  useLayoutEffect(() => {
    const flowMesh = flowRef.current;
    const foamMesh = foamRef.current;
    if (!flowMesh || !foamMesh) return;
    flow.forEach((patch, index) => {
      dummy.position.set(patch.x, -1.08, patch.z);
      dummy.rotation.set(-Math.PI / 2, 0, patch.rot);
      dummy.scale.set(patch.sx, patch.sz, 1);
      dummy.updateMatrix();
      flowMesh.setMatrixAt(index, dummy.matrix);
    });
    foam.forEach((patch, index) => {
      dummy.position.set(patch.x, -1.04, patch.z);
      dummy.rotation.set(-Math.PI / 2, 0, patch.rot);
      dummy.scale.set(patch.sx, patch.sz, 1);
      dummy.updateMatrix();
      foamMesh.setMatrixAt(index, dummy.matrix);
    });
    flowMesh.instanceMatrix.needsUpdate = true;
    foamMesh.instanceMatrix.needsUpdate = true;
  }, [dummy, flow, foam]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (flowMaterialRef.current) flowMaterialRef.current.opacity = 0.16 + Math.sin(t * 0.8) * 0.035;
    if (foamMaterialRef.current) foamMaterialRef.current.opacity = 0.18 + Math.sin(t * 1.2 + 0.8) * 0.05;
  });

  return (
    <group>
      <instancedMesh ref={flowRef} args={[undefined, undefined, flow.length]}>
        <circleGeometry args={[0.5, 10]} />
        <meshBasicMaterial
          ref={flowMaterialRef}
          color="#9bdff0"
          transparent
          opacity={0.18}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>
      <instancedMesh ref={foamRef} args={[undefined, undefined, foam.length]}>
        <circleGeometry args={[0.5, 8]} />
        <meshBasicMaterial
          ref={foamMaterialRef}
          color="#f0fdff"
          transparent
          opacity={0.2}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>
    </group>
  );
}
