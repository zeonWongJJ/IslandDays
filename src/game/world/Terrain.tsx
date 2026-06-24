import { useMemo } from 'react';
import * as THREE from 'three';
import { WORLD } from '../../config/constants.ts';
import { BRIDGE_DECK_Y, BRIDGE_WALK_HEIGHT, BRIDGES, groundHeight, groundKind, plazaPavingAmount, riverAmount, roadAmount, type GroundKind } from '../../systems/terrain.ts';

const KIND_COLORS: Record<GroundKind, THREE.Color> = {
  grass: new THREE.Color('#5e8a3c'),
  sand: new THREE.Color('#dac596'),
  rock: new THREE.Color('#8a8378'),
  dirt: new THREE.Color('#6b5238'),
  water: new THREE.Color('#3a72a8'),
  road: new THREE.Color('#b58b58'),
  foundation: new THREE.Color('#8fb060'),
  paving: new THREE.Color('#b8aa8e'),
};

// 简单的 2D 噪声函数，产生更自然的变化
function noise2D(x: number, z: number): number {
  const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function slopeAt(x: number, z: number): number {
  return (
    Math.abs(groundHeight(x + 0.8, z) - groundHeight(x - 0.8, z)) +
    Math.abs(groundHeight(x, z + 0.8) - groundHeight(x, z - 0.8))
  ) * 0.5;
}

function waterEdgeAmount(x: number, z: number): number {
  const offsets = [
    [1.6, 0],
    [-1.6, 0],
    [0, 1.6],
    [0, -1.6],
    [2.4, 1.2],
    [-2.4, -1.2],
  ] as const;
  let water = riverAmount(x, z) > 0.25 ? 0.45 : 0;
  for (const [dx, dz] of offsets) {
    if (groundKind(x + dx, z + dz) === 'water') water += 0.18;
  }
  return THREE.MathUtils.clamp(water, 0, 1);
}

function colorAt(x: number, z: number): THREE.Color {
  const kind = groundKind(x, z);
  const base = KIND_COLORS[kind].clone();
  const h = groundHeight(x, z);
  const slope = slopeAt(x, z);
  const shore = waterEdgeAmount(x, z);
  const road = roadAmount(x, z);
  if (kind === 'grass') {
    const t = THREE.MathUtils.clamp((h + 1) / 4, 0, 1);
    base.lerp(new THREE.Color('#86a947'), t * 0.5);
    const broad = noise2D(Math.floor(x * 0.11), Math.floor(z * 0.11));
    const patch = noise2D(Math.floor(x * 0.27 + 4.2), Math.floor(z * 0.27 - 1.5));
    base.lerp(new THREE.Color('#416c2d'), THREE.MathUtils.clamp((broad - 0.45) * 0.38, 0, 0.22));
    base.lerp(new THREE.Color('#91b85a'), THREE.MathUtils.clamp((patch - 0.55) * 0.28, 0, 0.16));
    base.lerp(new THREE.Color('#6f6a47'), shore * 0.34);
    base.lerp(new THREE.Color('#9a7a4d'), road * 0.18);
    base.lerp(new THREE.Color('#6f7650'), THREE.MathUtils.clamp(slope - 0.35, 0, 0.35));
  } else if (kind === 'rock') {
    base.lerp(new THREE.Color('#a99f90'), 0.25 + THREE.MathUtils.clamp(slope * 0.22, 0, 0.22));
    const patch = noise2D(Math.floor(x * 0.5), Math.floor(z * 0.5));
    base.offsetHSL(0, 0, (patch - 0.5) * 0.06);
  } else if (kind === 'foundation') {
    base.lerp(new THREE.Color('#a7bf74'), 0.35);
  } else if (kind === 'paving') {
    const tileX = Math.floor(x / 1.6);
    const tileZ = Math.floor(z / 1.6);
    const joint = Math.min(Math.abs((x / 1.6) - Math.round(x / 1.6)), Math.abs((z / 1.6) - Math.round(z / 1.6)));
    base.lerp(new THREE.Color('#d2c3a4'), 0.24 + plazaPavingAmount(x, z) * 0.12);
    if ((tileX + tileZ) % 2 === 0) base.lerp(new THREE.Color('#a89573'), 0.12);
    base.lerp(new THREE.Color('#756a5a'), THREE.MathUtils.clamp(0.12 - joint, 0, 0.12) * 2.6);
  } else if (kind === 'sand') {
    const wet = THREE.MathUtils.clamp(1 - (h + 0.2) / 0.7, 0, 0.5);
    base.lerp(new THREE.Color('#a99070'), Math.max(wet, shore * 0.42));
    const grain = noise2D(x * 0.3, z * 0.3);
    base.lerp(new THREE.Color('#f0d9a6'), THREE.MathUtils.clamp((grain - 0.48) * 0.16, 0, 0.12));
  } else if (kind === 'water') {
    const deep = THREE.MathUtils.clamp((-h - 0.3) / 2.0, 0, 1);
    base.lerp(new THREE.Color('#2a5a88'), deep * 0.55);
    base.lerp(new THREE.Color('#4f93b3'), (1 - deep) * 0.18);
  } else if (kind === 'road') {
    const centerWear = THREE.MathUtils.clamp(roadAmount(x, z), 0, 1);
    const grain = noise2D(x * 0.55 + 3, z * 0.55 - 2);
    base.lerp(new THREE.Color('#c69b62'), 0.28);
    base.lerp(new THREE.Color('#7e623e'), THREE.MathUtils.clamp((grain - 0.5) * 0.22, 0, 0.16));
    base.lerp(new THREE.Color('#d2b279'), centerWear * 0.12);
  } else if (kind === 'dirt') {
    base.lerp(new THREE.Color('#826642'), shore * 0.35);
  }
  const fine = noise2D(x * 0.5 + 0.3, z * 0.5 + 0.7);
  base.offsetHSL(0, 0, (fine - 0.5) * 0.04);
  return base;
}

export function Terrain() {
  const grassGeo = useMemo(() => {
    const size = WORLD.size + WORLD.waterBorder;
    const seg = 160;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = groundHeight(x, z);
      pos.setY(i, y);
      c.copy(colorAt(x, z));
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.computeVertexNormals();
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  return (
    <group>
      {/* 岛屿地形 */}
      <mesh geometry={grassGeo} receiveShadow castShadow>
        <meshStandardMaterial vertexColors flatShading roughness={0.95} metalness={0} />
      </mesh>

      {BRIDGES.map((bridge) => <Bridge key={bridge.id} bridge={bridge} />)}
    </group>
  );
}

function Bridge({ bridge }: { bridge: (typeof BRIDGES)[number] }) {
  const [length, thickness, width] = bridge.size;
  const plankCount = Math.max(8, Math.floor(length / 1.1));
  const postCount = Math.max(4, Math.floor(length / 2.2));
  const plankXs = Array.from({ length: plankCount }, (_, i) => -length / 2 + (i + 0.5) * (length / plankCount));
  const postXs = Array.from({ length: postCount }, (_, i) => -length / 2 + (i / (postCount - 1)) * length);
  const approachY = BRIDGE_WALK_HEIGHT + 0.03;

  return (
    <group position={[bridge.pos[0], BRIDGE_DECK_Y, bridge.pos[2]]} rotation={[0, bridge.rotation, 0]}>
      {[-1, 1].map((end) => (
        <group key={`approach-${end}`} position={[end * (length / 2 + 0.9), approachY - BRIDGE_DECK_Y, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[width * 1.35, 24]} />
            <meshStandardMaterial color="#b58b58" flatShading roughness={1} />
          </mesh>
          <mesh position={[end * 0.45, -0.03, 0]} rotation={[-Math.PI / 2, 0, end * 0.08]} receiveShadow>
            <circleGeometry args={[width * 0.62, 16]} />
            <meshStandardMaterial color="#c3a06f" flatShading roughness={1} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, -0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[length + 0.4, thickness, width + 0.2]} />
        <meshStandardMaterial color="#5f3a20" flatShading roughness={1} />
      </mesh>

      {plankXs.map((x, i) => (
        <mesh key={i} position={[x, 0.1, 0]} castShadow receiveShadow>
          <boxGeometry args={[length / plankCount - 0.08, 0.14, width + 0.05]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#9b6538' : '#85552f'} flatShading roughness={1} />
        </mesh>
      ))}

      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[0, 0.68, side * (width / 2 + 0.28)]} castShadow>
            <boxGeometry args={[length + 0.9, 0.18, 0.18]} />
            <meshStandardMaterial color="#3f2515" flatShading roughness={1} />
          </mesh>
          <mesh position={[0, 0.35, side * (width / 2 + 0.28)]} castShadow>
            <boxGeometry args={[length + 0.5, 0.12, 0.12]} />
            <meshStandardMaterial color="#5a341d" flatShading roughness={1} />
          </mesh>
          {postXs.map((x, i) => (
            <mesh key={i} position={[x, 0.3, side * (width / 2 + 0.28)]} castShadow>
              <boxGeometry args={[0.18, 0.72, 0.18]} />
              <meshStandardMaterial color="#4b2d18" flatShading roughness={1} />
            </mesh>
          ))}
        </group>
      ))}

      {[-1, 1].map((end) => (
        <group key={end} position={[end * (length / 2 + 0.55), -0.04, 0]}>
          <mesh rotation={[0, 0, end * -0.08]} receiveShadow castShadow>
            <boxGeometry args={[1.45, 0.2, width + 0.45]} />
            <meshStandardMaterial color="#8d6b47" flatShading roughness={1} />
          </mesh>
          <mesh position={[end * 0.66, -0.03, 0]} receiveShadow castShadow>
            <boxGeometry args={[0.72, 0.16, width + 0.65]} />
            <meshStandardMaterial color="#b58b58" flatShading roughness={1} />
          </mesh>
        </group>
      ))}

      {[-0.35, 0.35].map((z, i) => (
        <mesh key={i} position={[0, -0.7, z * width]} castShadow>
          <boxGeometry args={[length - 0.8, 0.42, 0.22]} />
          <meshStandardMaterial color="#3f2515" flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  );
}
