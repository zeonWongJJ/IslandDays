import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { occlusionOpacity } from '../../systems/occlusion.ts';
import { useGameRefs } from './gameRefsContext.ts';

export function useOcclusionOpacity(x: number, z: number, radius: number, minOpacity = 0.36): number {
  const { camera } = useThree();
  const { playerRef } = useGameRefs();
  const [opacity, setOpacity] = useState(1);
  const lastOpacity = useRef(1);

  useFrame(() => {
    const player = playerRef.current;
    if (!player) return;
    const next = occlusionOpacity({
      objectX: x,
      objectZ: z,
      playerX: player.position.x,
      playerZ: player.position.z,
      cameraX: camera.position.x,
      cameraZ: camera.position.z,
      radius,
      minOpacity,
    });
    if (Math.abs(next - lastOpacity.current) < 0.035) return;
    lastOpacity.current = next;
    setOpacity(next);
  });

  return opacity;
}
