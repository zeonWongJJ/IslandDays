// 第三人称跟随相机 + 鼠标拖拽环绕 + 滚轮缩放。
// 不使用 OrbitControls（它会与跟随逻辑冲突），这里手写轻量版。
//
// 相机始终在玩家身后 cameraYawRef 方向、cameraDistanceRef 距离处，
// 平滑跟随玩家位置。鼠标拖动改变 yaw，滚轮改变 distance。

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameRefs } from './controllers/gameRefsContext.ts';
import { groundHeight } from '../systems/terrain.ts';
import { useGameStore } from '../store/useGameStore.ts';

const desired = new THREE.Vector3();
const target = new THREE.Vector3();

export function CameraRig() {
  const { camera, gl } = useThree();
  const { playerRef, cameraYawRef, cameraDistanceRef } = useGameRefs();
  const dragging = useRef(false);
  const lastX = useRef(0);

  useEffect(() => {
    const dom = gl.domElement;

    const onDown = (e: PointerEvent) => {
      // 左键拖拽旋转视角；忽略点击 UI 时的冒泡（UI 在 Canvas 外，不会进来）
      if (e.button !== 0) return;
      dragging.current = true;
      lastX.current = e.clientX;
      dom.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - lastX.current;
      lastX.current = e.clientX;
      const settings = (window as unknown as Record<string, unknown>).__settings as { sensitivity?: number } | undefined;
      const sens = settings?.sensitivity ?? 1.0;
      cameraYawRef.current -= dx * 0.005 * sens;
    };
    const onUp = (e: PointerEvent) => {
      dragging.current = false;
      try {
        dom.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraDistanceRef.current = THREE.MathUtils.clamp(
        cameraDistanceRef.current + e.deltaY * 0.01,
        6,
        28,
      );
    };

    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointermove', onMove);
    dom.addEventListener('pointerup', onUp);
    dom.addEventListener('pointercancel', onUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointermove', onMove);
      dom.removeEventListener('pointerup', onUp);
      dom.removeEventListener('pointercancel', onUp);
      dom.removeEventListener('wheel', onWheel);
    };
  }, [gl, cameraYawRef, cameraDistanceRef]);

  // eslint-disable-next-line react-hooks/immutability
  useFrame((_, dt) => {
    const player = playerRef.current;
    if (!player) return;
    const settings = (window as unknown as Record<string, unknown>).__settings as { fov?: number; sensitivity?: number } | undefined;
    if (settings?.fov) {
      const pcam = camera as THREE.PerspectiveCamera;
      if (pcam.fov && Math.abs(pcam.fov - settings.fov) > 0.5) {
        pcam.fov += (settings.fov - pcam.fov) * 0.1; // eslint-disable-line react-hooks/immutability
        pcam.updateProjectionMatrix();
      }
    }
    const yaw = cameraYawRef.current;
    const dist = cameraDistanceRef.current;
    const scene = useGameStore.getState().scene;

    if (scene === 'house' || scene === 'museum') {
      // 室内：俯视稍高的半顶视角，便于看布局
      const h = scene === 'museum' ? 10 : 9;
      const d = Math.min(dist, 10);
      desired.set(
        player.position.x + Math.sin(yaw) * d * 0.6,
        h,
        player.position.z + Math.cos(yaw) * d + 4,
      );
      camera.position.lerp(desired, Math.min(1, dt * 6));
      target.set(player.position.x, 1.0, player.position.z);
      camera.lookAt(target);
    } else {
      const height = 6.5;
      desired.set(
        player.position.x + Math.sin(yaw) * dist,
        Math.max(groundHeight(player.position.x, player.position.z) + height, 2.5),
        player.position.z + Math.cos(yaw) * dist,
      );
      camera.position.lerp(desired, Math.min(1, dt * 6));
      target.set(player.position.x, groundHeight(player.position.x, player.position.z) + 1.2, player.position.z);
      camera.lookAt(target);
    }
  });

  return null;
}
