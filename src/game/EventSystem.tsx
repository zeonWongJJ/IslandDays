import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore.ts';
import { currentEvent } from '../config/events.ts';

export function EventSystem() {
  const day = useGameStore((s) => s.clock.day);
  const notifiedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const ev = currentEvent(day);
    if (ev && !notifiedRef.current.has(day)) {
      notifiedRef.current.add(day);
      useGameStore.getState().pushToast(`🎉 ${ev.name}开始了！`);
    }
  }, [day]);

  return null;
}
