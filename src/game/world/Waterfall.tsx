import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MAP_LAYOUT } from '../../config/mapLayout.ts';
import { groundHeight } from '../../systems/terrain.ts';
import { useOcclusionOpacity } from '../controllers/useOcclusionOpacity.ts';

interface WaterfallProps {
  pos: [number, number, number];
  width?: number;
}

interface SprayDrop {
  x: number;
  y: number;
  z: number;
  size: number;
  speed: number;
  phase: number;
}

function WaterCurtain({ width, height }: { width: number; height: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => new THREE.PlaneGeometry(width, height, 9, 24), [height, width]);
  const basePositions = useMemo(() => Float32Array.from(geometry.attributes.position.array as Float32Array), [geometry]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const attr = mesh.geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const t = state.clock.elapsedTime * 3.2;
    for (let i = 0; i < attr.count; i++) {
      const ix = i * 3;
      const x = basePositions[ix];
      const y = basePositions[ix + 1];
      const u = x / width + 0.5;
      const v = y / height + 0.5;
      const taper = 0.82 + v * 0.18;
      arr[ix] = x * taper + Math.sin(t + u * 7 + v * 11) * 0.03;
      arr[ix + 1] = y;
      arr[ix + 2] = Math.sin(t * 1.2 + u * 9) * 0.07 + Math.sin(t * 2.0 + v * 18) * 0.04;
    }
    attr.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, -height / 2, 0.18]}>
      <meshStandardMaterial
        color="#82d8f2"
        emissive="#5ab7da"
        emissiveIntensity={0.12}
        transparent
        opacity={0.56}
        roughness={0.04}
        metalness={0.04}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function WaterLines({ width, height }: { width: number; height: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const lines = useMemo(() => {
    const group = new THREE.Group();
    for (let i = 0; i < 26; i++) {
      const t = i / 25;
      const x = (t - 0.5) * width * (0.72 + Math.sin(i * 1.7) * 0.08);
      const top = -0.05 - Math.sin(i * 2.1) * 0.08;
      const bottom = -height + 0.25 + Math.cos(i * 1.3) * 0.15;
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, top, 0.25),
        new THREE.Vector3(x + Math.sin(i) * 0.08, bottom, 0.32),
      ]);
      const mat = new THREE.LineBasicMaterial({
        color: i % 4 === 0 ? '#ffffff' : '#c9f4ff',
        transparent: true,
        opacity: i % 4 === 0 ? 0.58 : 0.34,
        depthWrite: false,
      });
      group.add(new THREE.Line(geo, mat));
    }
    return group;
  }, [height, width]);

  useFrame((state) => {
    if (groupRef.current) groupRef.current.position.y = -((state.clock.elapsedTime * 1.25) % 0.4);
  });

  return <primitive ref={groupRef} object={lines} />;
}

function Spray({ width, height }: { width: number; height: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const drops = useMemo<SprayDrop[]>(() => {
    return Array.from({ length: 72 }, (_, i) => {
      const a = Math.sin(i * 18.23) * 43758.5453;
      const b = Math.sin(i * 9.71 + 2.3) * 21453.123;
      const c = Math.sin(i * 5.33 - 1.4) * 36512.4;
      const r1 = a - Math.floor(a);
      const r2 = b - Math.floor(b);
      const r3 = c - Math.floor(c);
      return {
        x: (r1 - 0.5) * width * 1.35,
        y: -height * (0.1 + r2 * 0.85),
        z: 0.12 + (r3 - 0.5) * 0.45,
        size: 0.025 + r1 * 0.055,
        speed: 0.75 + r2 * 0.95,
        phase: r3 * Math.PI * 2,
      };
    });
  }, [height, width]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    drops.forEach((drop, i) => {
      dummy.position.set(drop.x, drop.y, drop.z);
      dummy.scale.setScalar(drop.size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [drops, dummy]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    drops.forEach((drop, i) => {
      const y = -((t * drop.speed + Math.abs(drop.y)) % height);
      const bottom = THREE.MathUtils.smoothstep(-y / height, 0.66, 1);
      dummy.position.set(
        drop.x + Math.sin(t * 2.1 + drop.phase) * 0.08 + drop.x * bottom * 0.18,
        y,
        drop.z + Math.cos(t * 1.8 + drop.phase) * 0.08 + bottom * 0.35,
      );
      dummy.scale.setScalar(drop.size * (1 + bottom * 1.6));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, drops.length]}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshBasicMaterial color="#e7faff" transparent opacity={0.4} depthWrite={false} />
    </instancedMesh>
  );
}

function Pool({ width, height, offsetZ }: { width: number; height: number; offsetZ: number }) {
  const foamRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    const group = foamRef.current;
    if (!group) return;
    const t = state.clock.elapsedTime;
    group.children.forEach((child, i) => {
      child.rotation.z += 0.004 + i * 0.001;
      const s = 1 + Math.sin(t * (1.2 + i * 0.18) + i) * 0.07;
      child.scale.set(s, s, s);
    });
  });

  return (
    <group position={[0, -height - 0.08, offsetZ]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[width * 1.05, 32]} />
        <meshStandardMaterial color="#3e8cad" transparent opacity={0.68} roughness={0.08} metalness={0.08} depthWrite={false} />
      </mesh>
      <group ref={foamRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <mesh>
          <ringGeometry args={[width * 0.3, width * 0.68, 32]} />
          <meshBasicMaterial color="#f3fdff" transparent opacity={0.52} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[width * 0.2, -0.08, 0]}>
          <ringGeometry args={[width * 0.12, width * 0.34, 24]} />
          <meshBasicMaterial color="#d9f7ff" transparent opacity={0.36} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * width * 0.82, 0.03, -0.05]} scale={[0.9, 0.34, 0.62]} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial color="#6a665d" flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function CliffAccent({ width, height }: { width: number; height: number }) {
  return (
    <group>
      <mesh position={[0, 0.02, 0.12]} scale={[1.2, 0.26, 0.22]} castShadow receiveShadow>
        <dodecahedronGeometry args={[width * 0.58, 0]} />
        <meshStandardMaterial color="#716a5d" flatShading roughness={1} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * width * 0.64, -height * 0.45, 0.08]} scale={[0.42, height * 0.62, 0.34]} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.62, 0]} />
          <meshStandardMaterial color={side < 0 ? '#6b665c' : '#605c53'} flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function LipFlow({ width, length }: { width: number; length: number }) {
  return (
    <mesh position={[0, 0.06, length * 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width * 0.88, length, 5, 4]} />
      <meshStandardMaterial
        color="#63bddd"
        emissive="#3a8faf"
        emissiveIntensity={0.08}
        transparent
        opacity={0.72}
        roughness={0.08}
        metalness={0.04}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

export function Waterfall({ pos, width = 2.15 }: WaterfallProps) {
  const [x, , z] = pos;
  const groupRef = useRef<THREE.Group>(null);
  const occlusionOpacity = useOcclusionOpacity(x, z, 3.1, 0.025);
  const layout = useMemo(() => {
    const [poolX, , poolZ] = MAP_LAYOUT.waterfall.pool;
    const lipY = groundHeight(x, z) + 0.18;
    const poolY = groundHeight(poolX, poolZ) + 0.12;
    return {
      lipY,
      fallHeight: Math.max(2.4, lipY - poolY),
      poolOffsetZ: Math.min(3.8, Math.hypot(poolX - x, poolZ - z) * 0.48),
      yaw: Math.atan2(poolX - x, poolZ - z),
    };
  }, [x, z]);

  useEffect(() => {
    groupRef.current?.traverse((child) => {
      if (!(child instanceof THREE.Mesh) && !(child instanceof THREE.Line)) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        if (material.userData.waterfallBaseOpacity === undefined) {
          material.userData.waterfallBaseOpacity = material.opacity;
          material.userData.waterfallBaseTransparent = material.transparent;
          material.userData.waterfallBaseDepthWrite = material.depthWrite;
        }
        const faded = occlusionOpacity < 0.98;
        material.opacity = Number(material.userData.waterfallBaseOpacity) * occlusionOpacity;
        material.transparent = faded || Boolean(material.userData.waterfallBaseTransparent);
        material.depthWrite = faded ? false : Boolean(material.userData.waterfallBaseDepthWrite);
        material.needsUpdate = true;
      });
    });
  }, [occlusionOpacity]);

  const curtainOffset = 1.35;

  return (
    <group ref={groupRef} position={[x, layout.lipY, z]} rotation={[0, layout.yaw, 0]}>
      <LipFlow width={width} length={curtainOffset + 0.12} />
      <group position={[0, 0, curtainOffset]}>
        <CliffAccent width={width} height={layout.fallHeight} />
        <WaterCurtain width={width} height={layout.fallHeight} />
        <WaterCurtain width={width * 0.62} height={layout.fallHeight * 0.96} />
        <WaterLines width={width * 0.95} height={layout.fallHeight} />
        <Spray width={width} height={layout.fallHeight} />
      </group>
      <Pool width={width * 1.2} height={layout.fallHeight} offsetZ={layout.poolOffsetZ} />
    </group>
  );
}
