import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore.ts';
import { soundManager } from '../systems/audio.ts';

export function MusicSystem() {
  const scene = useGameStore((s) => s.scene);
  const minutes = useGameStore((s) => s.clock.minutes);
  const weather = useGameStore((s) => s.weather);
  const prevRef = useRef({ scene, minutes, weather });

  useEffect(() => {
    const prev = prevRef.current;
    if (scene !== prev.scene || Math.abs(minutes - prev.minutes) > 5 || weather !== prev.weather) {
      soundManager.setBGM(scene, minutes, weather);
      soundManager.setWeatherAmbient(weather);
      prevRef.current = { scene, minutes, weather };
    }
  });

  // 周期性刷新（每 30 秒检查一次，应对 BGM 循环切换时机）
  useEffect(() => {
    const iv = setInterval(() => {
      const s = useGameStore.getState();
      soundManager.setBGM(s.scene, s.clock.minutes, s.weather);
    }, 15000);
    return () => clearInterval(iv);
  }, []);

  return null;
}
