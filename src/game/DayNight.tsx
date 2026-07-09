// 昼夜系统：根据游戏时钟动态调整太阳位置、光照颜色/强度、天空与雾色。
// 取代 Experience 里原先的固定灯光。
//
// 时间映射：
// - 6:00-18:00 白天，太阳从东升西落；正午最高、最强。
// - 5:00-7:00 日出、17:00-19:00 日落：暖橙色调，强度中等。
// - 19:00-5:00 夜晚：月光（冷蓝），保留夜色但保证可见度。
//
// 用 refs 持有灯光/雾对象，在 useFrame 里平滑插值，避免每帧 setState。

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore.ts';
import { WORLD } from '../config/constants.ts';
import { weatherLightMultiplier } from '../config/weather.ts';

// 关键时刻的色调与强度
interface Key {
  hour: number;
  sunColor: THREE.Color;
  sunIntensity: number;
  ambient: number;
  sky: THREE.Color;
  fog: THREE.Color;
}

const KEYS: Key[] = [
  { hour: 0, sunColor: new THREE.Color('#526895'), sunIntensity: 0.32, ambient: 0.34, sky: new THREE.Color('#243554'), fog: new THREE.Color('#2d3f5f') }, // 深夜
  { hour: 5, sunColor: new THREE.Color('#667ca8'), sunIntensity: 0.38, ambient: 0.36, sky: new THREE.Color('#354d70'), fog: new THREE.Color('#3b5678') }, // 黎明前
  { hour: 6.5, sunColor: new THREE.Color('#ffb066'), sunIntensity: 0.9, ambient: 0.3, sky: new THREE.Color('#f0c290'), fog: new THREE.Color('#e8b888') }, // 日出
  { hour: 9, sunColor: new THREE.Color('#fff4e0'), sunIntensity: 1.35, ambient: 0.4, sky: new THREE.Color('#bfe0f5'), fog: new THREE.Color('#bfe0f5') }, // 上午
  { hour: 12, sunColor: new THREE.Color('#fffaf0'), sunIntensity: 1.5, ambient: 0.45, sky: new THREE.Color('#aee0f5'), fog: new THREE.Color('#aee0f5') }, // 正午
  { hour: 15, sunColor: new THREE.Color('#fff4e0'), sunIntensity: 1.3, ambient: 0.4, sky: new THREE.Color('#bfe0f5'), fog: new THREE.Color('#bfe0f5') }, // 下午
  { hour: 18, sunColor: new THREE.Color('#ff9050'), sunIntensity: 0.85, ambient: 0.3, sky: new THREE.Color('#f0a878'), fog: new THREE.Color('#e8a070') }, // 日落
  { hour: 19.5, sunColor: new THREE.Color('#6f68a0'), sunIntensity: 0.45, ambient: 0.34, sky: new THREE.Color('#39466f'), fog: new THREE.Color('#40527a') }, // 暮色
  { hour: 22, sunColor: new THREE.Color('#526895'), sunIntensity: 0.36, ambient: 0.34, sky: new THREE.Color('#293a5a'), fog: new THREE.Color('#34496a') }, // 夜
  { hour: 24, sunColor: new THREE.Color('#526895'), sunIntensity: 0.32, ambient: 0.34, sky: new THREE.Color('#243554'), fog: new THREE.Color('#2d3f5f') }, // 回到深夜
];
const SKY_BODY_DISTANCE = WORLD.size * 0.9;
const SKY_BODY_MIN_HEIGHT = WORLD.size * 0.28;

// 在两个关键时刻间插值（复用缓存对象，避免每帧 GC）
const _sampleResult: Key = {
  hour: 0,
  sunColor: new THREE.Color(),
  sunIntensity: 0,
  ambient: 0,
  sky: new THREE.Color(),
  fog: new THREE.Color(),
};
function sample(hour: number): Key {
  let prev = KEYS[0];
  let next = KEYS[KEYS.length - 1];
  for (let i = 0; i < KEYS.length - 1; i++) {
    if (hour >= KEYS[i].hour && hour <= KEYS[i + 1].hour) {
      prev = KEYS[i];
      next = KEYS[i + 1];
      break;
    }
  }
  const t = next.hour === prev.hour ? 0 : (hour - prev.hour) / (next.hour - prev.hour);
  const ts = t * t * (3 - 2 * t); // smoothstep
  _sampleResult.hour = hour;
  _sampleResult.sunColor.copy(prev.sunColor).lerp(next.sunColor, ts);
  _sampleResult.sunIntensity = THREE.MathUtils.lerp(prev.sunIntensity, next.sunIntensity, ts);
  _sampleResult.ambient = THREE.MathUtils.lerp(prev.ambient, next.ambient, ts);
  _sampleResult.sky.copy(prev.sky).lerp(next.sky, ts);
  _sampleResult.fog.copy(prev.fog).lerp(next.fog, ts);
  return _sampleResult;
}

export function DayNight() {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const moonRef = useRef<THREE.DirectionalLight>(null);
  const sunMeshRef = useRef<THREE.Mesh>(null);
  const moonMeshRef = useRef<THREE.Mesh>(null);
  const ambRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const fogRef = useRef<THREE.Fog | null>(null);
  const skyColor = useRef(new THREE.Color('#bfe0f5'));

  // 太阳方向缓存
  const sunPos = useRef(new THREE.Vector3(12, 18, 8));

  useFrame(({ scene }, dt) => {
    const st = useGameStore.getState();
    const hour = st.clock.minutes / 60;
    const k = sample(hour);

    // 太阳角度：6:00 在东(-X)地平线，12:00 正顶，18:00 在西(+X)地平线
    // 用 dayProgress in [0,1] over [6,18]
    const dayProg = THREE.MathUtils.clamp((hour - 6) / 12, 0, 1); // 0=日出 1=日落
    const sunAngle = dayProg * Math.PI; // 0..π
    const sunX = -Math.cos(sunAngle) * 22;
    const sunY = Math.sin(sunAngle) * 22 + 2;
    const sunZ = Math.sin(sunAngle * 0.5) * 6;
    sunPos.current.set(sunX, Math.max(sunY, -2), sunZ);

    const isDay = hour >= 6 && hour <= 18;

    const weatherMul = weatherLightMultiplier(st.weather);

    if (sunRef.current) {
      sunRef.current.position.copy(sunPos.current);
      sunRef.current.color.copy(k.sunColor);
      sunRef.current.intensity = isDay ? k.sunIntensity * weatherMul : 0;
    }
    if (sunMeshRef.current) {
      sunMeshRef.current.position
        .set(sunX, Math.max(sunY, 8), sunZ)
        .normalize()
        .multiplyScalar(SKY_BODY_DISTANCE);
      sunMeshRef.current.position.y = Math.max(sunMeshRef.current.position.y, SKY_BODY_MIN_HEIGHT);
      sunMeshRef.current.visible = hour >= 5.5 && hour <= 18.8;
    }
    if (moonRef.current) {
      // 夜晚月光从反方向
      moonRef.current.position.set(-sunX, Math.max(-sunY, 4) + 6, -sunZ);
      moonRef.current.intensity = isDay ? 0 : 0.65;
    }
    if (moonMeshRef.current) {
      moonMeshRef.current.position
        .set(-sunX, Math.max(-sunY, 8), -sunZ)
        .normalize()
        .multiplyScalar(SKY_BODY_DISTANCE);
      moonMeshRef.current.position.y = Math.max(moonMeshRef.current.position.y, SKY_BODY_MIN_HEIGHT);
      moonMeshRef.current.visible = !isDay;
    }
    if (ambRef.current) ambRef.current.intensity = k.ambient * weatherMul;
    if (hemiRef.current) {
      hemiRef.current.color.copy(k.sky);
      hemiRef.current.intensity = isDay ? 0.6 : 0.45;
    }

    // 天空背景色与雾色平滑过渡
    skyColor.current.lerp(k.sky, Math.min(1, dt * 2));
    if (scene.background instanceof THREE.Color) {
      scene.background.copy(skyColor.current);
    } else {
      scene.background = skyColor.current.clone();
    }
    if (!fogRef.current) {
      fogRef.current = new THREE.Fog(k.fog.clone(), WORLD.size * 0.5, WORLD.size * 1.42);
      scene.fog = fogRef.current;
    }
    fogRef.current.color.lerp(k.fog, Math.min(1, dt * 2));
    const weatherFog = st.weather === 'clear' ? 1 : st.weather === 'cloudy' ? 0.92 : 0.78;
    const fogNear = (isDay ? WORLD.size * 0.5 : WORLD.size * 0.42) * weatherFog;
    const fogFar = (isDay ? WORLD.size * 1.42 : WORLD.size * 1.2) * weatherFog;
    fogRef.current.near = THREE.MathUtils.lerp(fogRef.current.near, fogNear, dt * 1.5);
    fogRef.current.far = THREE.MathUtils.lerp(fogRef.current.far, fogFar, dt * 1.5);
  });

  return (
    <>
      {/* 主光（太阳/日光） */}
      <directionalLight
        ref={sunRef}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-WORLD.size * 0.62}
        shadow-camera-right={WORLD.size * 0.62}
        shadow-camera-top={WORLD.size * 0.62}
        shadow-camera-bottom={-WORLD.size * 0.62}
        shadow-camera-near={1}
        shadow-camera-far={260}
        shadow-bias={-0.00015}
        shadow-normalBias={0.025}
      />
      {/* 月光 */}
      <directionalLight ref={moonRef} color="#9ab4e8" />
      <ambientLight ref={ambRef} />
      <hemisphereLight ref={hemiRef} args={['#bfe3ff', '#6b5a3a', 0.6]} />
      <mesh ref={sunMeshRef}>
        <sphereGeometry args={[3.2, 24, 16]} />
        <meshBasicMaterial color="#ffe28a" />
      </mesh>
      <mesh ref={moonMeshRef}>
        <sphereGeometry args={[2.0, 20, 12]} />
        <meshBasicMaterial color="#dbe7ff" />
      </mesh>
    </>
  );
}
