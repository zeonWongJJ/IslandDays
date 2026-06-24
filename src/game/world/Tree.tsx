// 单棵树：Kenney GLB 模型 + 程序化树桩。
// 动画：
// - 命中晃动：整树左右摆动衰减（命中反馈）。
// - 倒下动画：intact→stump 时整棵树绕底部旋转 90° 倒下，
//   后半段树冠缩小消失；动画结束才切换到树桩显示。
// - 重生：stump→intact 时瞬间切回整树。

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { TREE } from '../../config/constants.ts';
import { seasonOf } from '../../config/weather.ts';
import type { TreeData, TreeState } from '../../systems/save.ts';
import { groundHeight } from '../../systems/terrain.ts';
import { useOcclusionOpacity } from '../controllers/useOcclusionOpacity.ts';
import { useGameStore } from '../../store/useGameStore.ts';
import { KenneyTree } from './KenneyModels.tsx';

export function Tree({ data }: { data: TreeData }) {
  const [x, , z] = data.pos;
  const y = useMemo(() => groundHeight(x, z), [x, z]);
  const day = useGameStore((s) => s.clock.day);
  const season = seasonOf(day);
  const floorDetails = useMemo(() => {
    const result: { x: number; z: number; s: number; rot: number; color: string }[] = [];
    let seed = (data.variant + 1) * 9301 + Math.floor((x + 80) * 17) + Math.floor((z + 80) * 31);
    const next = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967295;
    };
    const colors = ['#5d8f39', '#6fa143', '#466f31'];
    for (let i = 0; i < 7; i++) {
      const a = next() * Math.PI * 2;
      const r = 0.55 + next() * 0.65;
      result.push({
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        s: 0.45 + next() * 0.35,
        rot: next() * Math.PI * 2,
        color: colors[Math.floor(next() * colors.length)],
      });
    }
    return result;
  }, [data.variant, x, z]);

  // 整棵树组（用于倒下旋转，支点在底部）
  const wholeRef = useRef<THREE.Group>(null);
  // 树冠组（用于命中晃动 + 倒下时缩小消失）
  const crownRef = useRef<THREE.Group>(null);

  // 显示状态：倒下动画期间保持 'intact'，动画结束才切 'stump'
  const [displayState, setDisplayState] = useState<TreeState>(data.state);
  const prevStateRef = useRef<TreeState>(data.state);
  const prevHpRef = useRef(data.hp);
  const fallingRef = useRef(false);
  const fallProgressRef = useRef(0);
  const hitShakeRef = useRef(0);
  const crownOpacity = useOcclusionOpacity(x, z, 3.0, 0.28);

  useFrame((state, dt) => {
    const elapsed = state.clock.elapsedTime;
    // ── 检测 hp 减少 → 触发命中晃动 ──
    if (prevHpRef.current !== data.hp) {
      if (data.hp < prevHpRef.current && data.state === 'intact') {
        hitShakeRef.current = 1;
      }
      prevHpRef.current = data.hp;
    }

    // ── 检测 state 变化 ──
    if (prevStateRef.current !== data.state) {
      if (prevStateRef.current === 'intact' && data.state === 'stump') {
        // 触发倒下动画，延迟切换显示
        fallingRef.current = true;
        fallProgressRef.current = 0;
      } else {
        // 其他变化（如 stump→intact 重生）直接同步显示
        setDisplayState(data.state);
      }
      prevStateRef.current = data.state;
    }

    // ── 晃动衰减 ──
    if (hitShakeRef.current > 0) {
      hitShakeRef.current = Math.max(0, hitShakeRef.current - dt * 3);
    }

    // ── 倒下动画推进 ──
    if (fallingRef.current) {
      fallProgressRef.current = Math.min(1, fallProgressRef.current + dt * 2.2);
      if (fallProgressRef.current >= 1) {
        fallingRef.current = false;
        setDisplayState('stump');
      }
    }

    // ── 命中晃动 + 微风：树冠左右摆动 ──
    if (crownRef.current) {
      const s = hitShakeRef.current;
      const windA = elapsed * 1.35 + x * 0.13 + z * 0.09;
      const windB = elapsed * 1.9 + x * 0.05 - z * 0.11;
      const windZ = Math.sin(windA) * 0.025 + Math.sin(windB) * 0.012;
      const windX = Math.sin(windA * 0.8) * 0.014;
      const windOffsetX = Math.sin(windA) * 0.018;
      if (s > 0) {
        const hit = elapsed * 18;
        crownRef.current.rotation.z = windZ + Math.sin(hit * 2.3) * s * 0.18;
        crownRef.current.rotation.x = windX;
        crownRef.current.position.x = windOffsetX + Math.sin(hit * 3.1) * s * 0.12;
      } else {
        const lerp = Math.min(1, dt * 2.5);
        crownRef.current.rotation.z += (windZ - crownRef.current.rotation.z) * lerp;
        crownRef.current.rotation.x += (windX - crownRef.current.rotation.x) * lerp;
        crownRef.current.position.x += (windOffsetX - crownRef.current.position.x) * lerp;
      }
    }

    // ── 倒下动画：绕底部边缘旋转倒向 +X 方向 ──
    if (wholeRef.current && fallingRef.current) {
      const p = fallProgressRef.current;
      const eased = p * p;
      wholeRef.current.rotation.z = -eased * Math.PI * 0.5;
      if (crownRef.current) {
        const fade = Math.max(0, 1 - Math.max(0, (p - 0.4) / 0.6));
        crownRef.current.scale.setScalar(fade);
      }
    }
  });

  // 树桩（保持程序化）
  if (displayState === 'stump') {
    return (
      <group position={[x, y, z]}>
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[TREE.radius * 0.9, TREE.radius, 0.5, 10]} />
          <meshStandardMaterial color="#7a5a35" flatShading roughness={1} />
        </mesh>
        <mesh position={[0, 0.51, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[TREE.radius * 0.85, 12]} />
          <meshStandardMaterial color="#caa06a" flatShading />
        </mesh>
      </group>
    );
  }

  const kenneyScale = 3.7 + (data.variant % 4) * 0.18;
  const isPalm = data.variant >= 9;
  const palmScale = isPalm ? kenneyScale * 0.85 : kenneyScale;

  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.2, 18]} />
        <meshBasicMaterial color="#28331f" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      {floorDetails.map((detail, index) => (
        <mesh
          key={index}
          position={[detail.x, 0.12 * detail.s, detail.z]}
          rotation={[0, detail.rot, 0]}
          scale={[detail.s, detail.s, detail.s]}
          castShadow
        >
          <coneGeometry args={[0.09, 0.32, 4]} />
          <meshStandardMaterial color={detail.color} flatShading roughness={1} />
        </mesh>
      ))}
      <group ref={wholeRef}>
        <group ref={crownRef}>
          <group scale={[palmScale, palmScale, palmScale]}>
            <KenneyTree variant={data.variant} opacity={crownOpacity} season={season} />
          </group>
          <mesh position={[0, 0.14, 0]} castShadow>
            <cylinderGeometry args={[0.34, 0.52, 0.28, 8]} />
            <meshStandardMaterial color="#604328" flatShading roughness={1} />
          </mesh>
          {isPalm && (() => {
            const positions: [number, number, number][] = [];
            let seed = data.variant * 9301 + Math.floor(x * 17) + Math.floor(z * 31);
            const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed >>> 0) / 4294967295; };
            for (let i = 0; i < 4; i++) {
              const a = rng() * Math.PI * 2;
              const r = 0.3 + rng() * 0.35;
              positions.push([Math.cos(a) * r, 0.6 + rng() * 0.25, Math.sin(a) * r]);
            }
            return positions.map((p, i) => (
              <mesh key={i} position={p} castShadow>
                <sphereGeometry args={[0.1, 6, 6]} />
                <meshStandardMaterial color={i % 2 === 0 ? '#7a5a2a' : '#5a8a3a'} flatShading roughness={0.9} />
              </mesh>
            ));
          })()}
          {data.fruit && data.fruitCount > 0 && !isPalm && (() => {
            const FRUIT_COLORS: Record<string, string> = {
              apple: '#e03030',
              orange: '#f0a030',
              peach: '#f0b0a0',
              cherry: '#c02040',
            };
            const color = FRUIT_COLORS[data.fruit] ?? '#e03030';
            const positions: [number, number, number][] = [];
            let seed = data.variant * 7919 + Math.floor(x * 13) + Math.floor(z * 29);
            const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed >>> 0) / 4294967295; };
            for (let i = 0; i < data.fruitCount; i++) {
              const a = rng() * Math.PI * 2;
              const r = 0.4 + rng() * 0.4;
              positions.push([Math.cos(a) * r, 0.8 + rng() * 0.3, Math.sin(a) * r]);
            }
            return positions.map((p, i) => (
              <mesh key={`fruit-${i}`} position={p} castShadow>
                <sphereGeometry args={[0.09, 6, 6]} />
                <meshStandardMaterial color={color} flatShading roughness={0.8} />
              </mesh>
            ));
          })()}
        </group>
      </group>
    </group>
  );
}
