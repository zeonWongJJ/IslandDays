import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { CLOCK } from '../config/constants.ts';
import { useGameStore } from '../store/useGameStore.ts';

export function useGameTimeRef() {
  const tRef = useRef(useGameStore.getState().clock.minutes);

  useFrame((_, dt) => {
    tRef.current += dt * CLOCK.minutesPerRealSecond;
    const store = useGameStore.getState().clock.minutes;
    if (Math.abs(tRef.current - store) > 12) tRef.current = store;
  });

  return tRef;
}
