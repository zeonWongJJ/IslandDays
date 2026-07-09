import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore.ts';
import { WORLD } from '../config/constants.ts';

const STAR_COUNT = 2500;
const SKY_BODY_DISTANCE = WORLD.size * 0.9;
const SKY_BODY_MIN_HEIGHT = WORLD.size * 0.28;
const _bodyPos = new THREE.Vector3();

function starField() {
  const pos = new Float32Array(STAR_COUNT * 3);
  const sizes = new Float32Array(STAR_COUNT);
  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const r = 180 + Math.random() * 60;
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = Math.abs(r * Math.cos(phi));
    const z = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;
    sizes[i] = 0.6 + Math.random() * 1.2;
  }
  return { pos, sizes };
}

const starData = starField();

const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starData.pos, 3));
starGeo.setAttribute('size', new THREE.BufferAttribute(starData.sizes, 1));

export function SkyEffects() {
  const starRef = useRef<THREE.Points>(null);
  const sunGlowRef = useRef<THREE.Sprite>(null);
  const moonGlowRef = useRef<THREE.Sprite>(null);
  const starOpacity = useRef(0);

  const glowTex = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,200,0.6)');
    gradient.addColorStop(0.6, 'rgba(255,200,150,0.15)');
    gradient.addColorStop(1, 'rgba(255,200,150,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }, []);

  const moonGlowTex = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(220,230,255,0.6)');
    gradient.addColorStop(0.3, 'rgba(200,220,255,0.2)');
    gradient.addColorStop(1, 'rgba(200,220,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }, []);

  useFrame(() => {
    const st = useGameStore.getState();
    const hour = st.clock.minutes / 60;
    const isDay = hour >= 6 && hour <= 18;

    // 星星淡入淡出
    const targetStarOp = isDay ? 0 : Math.min(1, (Math.min(Math.abs(hour - 6), Math.abs(hour - 18)) - 0.5) * 2);
    starOpacity.current += (targetStarOp - starOpacity.current) * 0.05;
    if (starRef.current) {
      (starRef.current.material as THREE.PointsMaterial).opacity = starOpacity.current;
    }

    // 太阳/月亮位置（与 DayNight.tsx 同步）
    const dayProg = THREE.MathUtils.clamp((hour - 6) / 12, 0, 1);
    const sunAngle = dayProg * Math.PI;
    const sunX = -Math.cos(sunAngle) * 22;
    const sunY = Math.sin(sunAngle) * 22 + 2;

    _bodyPos.set(sunX, Math.max(sunY, 8), Math.sin(sunAngle * 0.5) * 6);
    _bodyPos.normalize().multiplyScalar(SKY_BODY_DISTANCE);
    _bodyPos.y = Math.max(_bodyPos.y, SKY_BODY_MIN_HEIGHT);

    // 太阳辉光
    if (sunGlowRef.current) {
      sunGlowRef.current.position.copy(_bodyPos);
      sunGlowRef.current.position.y += 4;
      const nearHorizon = 1 - Math.abs(dayProg - 0.5) * 2;
      const glowSize = 18 + nearHorizon * 20;
      sunGlowRef.current.scale.set(glowSize, glowSize, 1);
      sunGlowRef.current.material.opacity = isDay ? 0.35 + nearHorizon * 0.4 : 0;
      const hue = 0.08 - nearHorizon * 0.06;
      (sunGlowRef.current.material as THREE.SpriteMaterial).color.setHSL(hue, 0.8, 0.7);
    }

    // 月亮辉光
    if (moonGlowRef.current) {
      moonGlowRef.current.position.set(-_bodyPos.x, _bodyPos.y + 2, -_bodyPos.z);
      moonGlowRef.current.scale.set(12, 12, 1);
      moonGlowRef.current.material.opacity = isDay ? 0 : 0.25;
    }
  });

  return (
    <>
      <points ref={starRef} geometry={starGeo}>
        <pointsMaterial
          color="#ffffff"
          size={0.8}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <sprite ref={sunGlowRef} scale={[30, 30, 1]}>
        <spriteMaterial
          map={glowTex}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          color="#ffcc66"
        />
      </sprite>
      <sprite ref={moonGlowRef} scale={[12, 12, 1]}>
        <spriteMaterial
          map={moonGlowTex}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          color="#cce0ff"
        />
      </sprite>
    </>
  );
}
