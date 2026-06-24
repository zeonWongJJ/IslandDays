import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { WEATHER } from '../config/constants.ts';
import { seasonOf, pickWeather } from '../config/weather.ts';
import { useGameStore } from '../store/useGameStore.ts';
import { soundManager } from '../systems/audio.ts';

const RAIN_COUNT = 1800;
const SNOW_COUNT = 900;
const AREA = 90;

function seededRng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

export function WeatherSystem() {
  const weather = useGameStore((s) => s.weather);
  const setWeather = useGameStore((s) => s.setWeather);
  const nextCheck = useRef(0);

  useEffect(() => {
    const rainy = weather === 'rainy' || weather === 'stormy';
    if (rainy) soundManager.play('rainStart');
    else soundManager.play('rainStop');
  }, [weather]);

  useFrame((_, dt) => {
    nextCheck.current += dt;
    if (nextCheck.current >= 10) {
      nextCheck.current = 0;
      const st = useGameStore.getState();
      const season = seasonOf(st.clock.day);
      const seed = st.clock.day * 10000 + Math.floor(st.clock.minutes / WEATHER.changeInterval);
      const newWeather = pickWeather(season, seededRng(seed));
      if (newWeather !== st.weather) setWeather(newWeather);
    }
  });

  const isRaining = weather === 'rainy' || weather === 'stormy';
  const isSnowing = weather === 'snowy';

  return (
    <>
      {isRaining && <RainParticles />}
      {isSnowing && <SnowParticles />}
      {weather === 'stormy' && <LightningFlashes />}
    </>
  );
}

function RainParticles() {
  const { pos, speeds, drifts } = useMemo(() => {
    const rng = seededRng(42);
    const positions = new Float32Array(RAIN_COUNT * 3);
    const sp = new Float32Array(RAIN_COUNT);
    const dr = new Float32Array(RAIN_COUNT * 2);
    for (let i = 0; i < RAIN_COUNT; i++) {
      positions[i * 3] = (rng() * 2 - 1) * AREA;
      positions[i * 3 + 1] = rng() * AREA;
      positions[i * 3 + 2] = (rng() * 2 - 1) * AREA;
      sp[i] = 24 + rng() * 14;
      dr[i * 2] = (rng() - 0.5) * 4;
      dr[i * 2 + 1] = (rng() - 0.5) * 4;
    }
    return { pos: positions, speeds: sp, drifts: dr };
  }, []);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [pos]);

  const pointsRef = useRef<THREE.Points>(null);
  useFrame((_, dt) => {
    if (!pointsRef.current) return;
    const p = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const t = Date.now() * 0.0005;
    for (let i = 0; i < RAIN_COUNT; i++) {
      p[i * 3] += (2 + drifts[i * 2] + Math.sin(t + i * 0.17) * 0.5) * dt;
      p[i * 3 + 1] -= speeds[i] * dt;
      p[i * 3 + 2] += (drifts[i * 2 + 1] + Math.cos(t + i * 0.13) * 0.5) * dt;
      if (p[i * 3 + 1] < -2) {
        p[i * 3 + 1] = AREA;
        p[i * 3] = (Math.random() * 2 - 1) * AREA;
        p[i * 3 + 2] = (Math.random() * 2 - 1) * AREA;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geo} frustumCulled={false}>
      <pointsMaterial
        color="#c8d8f0"
        size={0.12}
        transparent
        opacity={0.6}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

function SnowParticles() {
  const { pos, speeds, phases } = useMemo(() => {
    const rng = seededRng(77);
    const positions = new Float32Array(SNOW_COUNT * 3);
    const sp = new Float32Array(SNOW_COUNT);
    const ph = new Float32Array(SNOW_COUNT);
    for (let i = 0; i < SNOW_COUNT; i++) {
      positions[i * 3] = (rng() * 2 - 1) * AREA;
      positions[i * 3 + 1] = rng() * AREA;
      positions[i * 3 + 2] = (rng() * 2 - 1) * AREA;
      sp[i] = 3 + rng() * 5;
      ph[i] = rng() * Math.PI * 2;
    }
    return { pos: positions, speeds: sp, phases: ph };
  }, []);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [pos]);

  const pointsRef = useRef<THREE.Points>(null);
  useFrame((_, dt) => {
    if (!pointsRef.current) return;
    const p = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const t = Date.now() * 0.0008;
    for (let i = 0; i < SNOW_COUNT; i++) {
      const drift = Math.sin(t * 0.7 + phases[i]) * 1.2 + Math.sin(t * 1.3 + i * 0.3) * 0.6;
      p[i * 3] += drift * dt;
      p[i * 3 + 1] -= speeds[i] * dt;
      p[i * 3 + 2] += Math.cos(t * 0.6 + phases[i] * 0.8) * 1.0 * dt;
      if (p[i * 3 + 1] < -2) {
        p[i * 3 + 1] = AREA;
        p[i * 3] = (Math.random() * 2 - 1) * AREA;
        p[i * 3 + 2] = (Math.random() * 2 - 1) * AREA;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geo} frustumCulled={false}>
      <pointsMaterial
        color="#ffffff"
        size={0.25}
        transparent
        opacity={0.7}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

function LightningFlashes() {
  const flashRef = useRef<THREE.Mesh>(null);
  const timer = useRef(0);

  useFrame((_, dt) => {
    timer.current += dt;
    if (flashRef.current) {
      if (timer.current > 3 + Math.random() * 5) {
        timer.current = 0;
        flashRef.current.visible = true;
        setTimeout(() => { if (flashRef.current) flashRef.current.visible = false; }, 100);
      }
    }
  });

  return (
    <mesh ref={flashRef} visible={false}>
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.15} />
    </mesh>
  );
}
