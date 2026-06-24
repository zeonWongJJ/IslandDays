import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { FISH, CLOCK } from '../../config/constants.ts';
import { useGameStore } from '../../store/useGameStore.ts';
import { fishWaterPos } from '../../systems/worldgen.ts';
import { soundManager } from '../../systems/audio.ts';
import { walkingHeight } from '../../systems/terrain.ts';
import { KenneyFishModel } from '../world/KenneyModels.tsx';

const WATER_SURFACE_Y = -1.4;

function FishModel({ pos, flopping }: { pos: THREE.Vector3; flopping?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.lerp(pos, 0.12);
    if (flopping) {
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 20) * 0.4;
      ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 15) * 0.3;
    }
  });
  return (
    <group ref={ref}>
      <KenneyFishModel size={0.85} />
    </group>
  );
}

function Bobber({ pos, hooked }: { pos: THREE.Vector3; hooked: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const target = pos.clone();
    if (hooked) {
      target.y -= 0.4;
      target.x += Math.sin(state.clock.elapsedTime * 25) * 0.05;
    }
    ref.current.position.lerp(target, 0.1);
  });
  return (
    <mesh ref={ref} position={pos}>
      <sphereGeometry args={[0.12, 12, 12]} />
      <meshStandardMaterial color="#e8453a" flatShading depthTest={false} />
    </mesh>
  );
}

function Ripple() {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.z = state.clock.elapsedTime * 0.5;
      const s = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.15;
      ref.current.scale.set(s, s, s);
    }
  });
  return (
    <group ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[0.35, 0.5, 24]} />
        <meshBasicMaterial color="#bfe0f5" transparent opacity={0.6} side={THREE.DoubleSide} depthTest={false} />
      </mesh>
      <mesh>
        <ringGeometry args={[0.6, 0.72, 24]} />
        <meshBasicMaterial color="#bfe0f5" transparent opacity={0.3} side={THREE.DoubleSide} depthTest={false} />
      </mesh>
    </group>
  );
}

function FishingLine({ from, to }: { from: THREE.Vector3; to: THREE.Vector3 }) {
  const fromRef = useRef(from.clone());
  const toRef = useRef(to.clone());
  const [line] = useState(() => {
    const attr = new THREE.BufferAttribute(new Float32Array(48), 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', attr);
    const mat = new THREE.LineBasicMaterial({ color: '#a08060', transparent: true, opacity: 0.5, depthTest: false });
    const ln = new THREE.Line(geo, mat);
    const p = attr.array as Float32Array;
    for (let i = 0; i < 16; i++) p[i * 3 + 1] = -999;
    attr.needsUpdate = true;
    return ln;
  });

  /* eslint-disable react-hooks/immutability */
  useFrame(() => {
    const f = fromRef.current;
    const t = toRef.current;
    f.copy(from);
    t.copy(to);
    const attr = line.geometry.attributes.position;
    const p = attr.array as Float32Array;
    const dx = t.x - f.x;
    const dz = t.z - f.z;
    const dist = Math.hypot(dx, dz);
    const sag = Math.min(0.15, dist * 0.03);
    for (let i = 0; i < 16; i++) {
      const u = i / 15;
      p[i * 3] = f.x + dx * u;
      p[i * 3 + 1] = f.y + (t.y - f.y) * u - Math.sin(u * Math.PI) * sag;
      p[i * 3 + 2] = f.z + dz * u;
    }
    attr.needsUpdate = true;
  });
  /* eslint-enable */

  return <primitive object={line} />;
}

function FishShadow({ center }: { center: THREE.Vector3 }) {
  const ref = useRef<THREE.Group>(null);
  const angle = useRef(0);
  useFrame((state) => {
    if (!ref.current) return;
    angle.current += state.clock.getDelta() * 0.8;
    const r = 0.5;
    ref.current.position.x = center.x + Math.cos(angle.current) * r;
    ref.current.position.z = center.z + Math.sin(angle.current * 0.7) * r * 0.5;
    ref.current.rotation.z = angle.current * 0.5;
  });
  return (
    <group ref={ref} position={[center.x, WATER_SURFACE_Y + 0.02, center.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.35, 16]} />
        <meshBasicMaterial color="#1a2a3a" transparent opacity={0.5} depthTest={false} />
      </mesh>
    </group>
  );
}

export function FishingController() {
  const fishSpots = useGameStore((s) => s.fishSpots);
  const fishing = useGameStore((s) => s.fishing);
  const playerPos = useGameStore((s) => s.player.pos);
  const setFishingPhase = useGameStore((s) => s.setFishingPhase);
  const missFish = useGameStore((s) => s.missFish);
  const catchFish = useGameStore((s) => s.catchFish);

  const phaseStart = useRef(0);
  const waitDuration = useRef(0);
  const lastSpot = useRef<string | null>(null);
  const caughtDone = useRef(false);

  useFrame((state) => {
    const now = state.clock.elapsedTime;

    const st = useGameStore.getState();
    const gameMin = st.clock.day * CLOCK.minutesPerDay + st.clock.minutes;
    const anyDue = st.fishSpots.some((f) => f.state === 'cooling' && f.readyAt !== null && f.readyAt <= gameMin);
    if (anyDue) {
      useGameStore.setState({
        fishSpots: st.fishSpots.map((f) =>
          f.state === 'cooling' && f.readyAt !== null && f.readyAt <= gameMin
            ? { ...f, state: 'idle', readyAt: null }
            : f,
        ),
      });
    }

    const cur = useGameStore.getState().fishing;
    if (cur.phase === 'idle') {
      lastSpot.current = null;
      caughtDone.current = false;
      return;
    }
    if (lastSpot.current !== cur.spotId) {
      lastSpot.current = cur.spotId;
      phaseStart.current = now;
    }

    if (cur.phase === 'casting') {
      if (now - phaseStart.current >= 0.8) {
        waitDuration.current = FISH.waitMin + Math.random() * (FISH.waitMax - FISH.waitMin);
        setFishingPhase('waiting', '等待鱼上钩…');
        phaseStart.current = now;
      }
    } else if (cur.phase === 'waiting') {
      if (now - phaseStart.current >= waitDuration.current) {
        setFishingPhase('hooked', '上钩了！快按 E 拉杆！');
        soundManager.play('bite');
        phaseStart.current = now;
      }
    } else if (cur.phase === 'hooked') {
      if (now - phaseStart.current >= FISH.hookWindow) {
        missFish();
        soundManager.play('miss');
      }
    } else if (cur.phase === 'reeling') {
      if (cur.reelingProgress >= 1) {
        setFishingPhase('caught', null);
        soundManager.play('catch');
        phaseStart.current = now;
      }
    } else if (cur.phase === 'caught') {
      if (!caughtDone.current && now - phaseStart.current >= 1.8) {
        caughtDone.current = true;
        if (cur.spotId) catchFish(cur.spotId);
      }
    }
  });

  const waterPos = useMemo<THREE.Vector3 | null>(() => {
    if (!fishing.spotId) return null;
    const spot = fishSpots.find((f) => f.id === fishing.spotId);
    if (!spot) return null;
    const wp = fishWaterPos(spot);
    return new THREE.Vector3(wp[0], WATER_SURFACE_Y, wp[2]);
  }, [fishing.spotId, fishSpots]);

  const bobberPos = useMemo(() => {
    if (!waterPos) return null;
    if (fishing.phase === 'idle') return null;
    if (fishing.phase === 'reeling') {
      const sp = useGameStore.getState().player;
      const playerPos = new THREE.Vector3(sp.pos[0], 0.5, sp.pos[2]);
      const p = fishing.reelingProgress;
      return new THREE.Vector3().lerpVectors(waterPos, playerPos, p * p);
    }
    return waterPos;
  }, [fishing.phase, waterPos, fishing.reelingProgress]);

  const fishPos = useMemo(() => {
    if (!waterPos || fishing.phase === 'idle') return null;
    if (fishing.phase === 'waiting') {
      return new THREE.Vector3(waterPos.x, WATER_SURFACE_Y + 0.2, waterPos.z);
    }
    if (fishing.phase === 'hooked') {
      return new THREE.Vector3(waterPos.x, WATER_SURFACE_Y + 0.4, waterPos.z);
    }
    if (fishing.phase === 'reeling') {
      const sp = useGameStore.getState().player;
      const playerPos = new THREE.Vector3(sp.pos[0], 0.5, sp.pos[2]);
      const p = fishing.reelingProgress;
      return new THREE.Vector3().lerpVectors(
        new THREE.Vector3(waterPos.x, WATER_SURFACE_Y + 0.4, waterPos.z),
        playerPos,
        p * p,
      );
    }
    if (fishing.phase === 'caught') {
      const sp = useGameStore.getState().player;
      return new THREE.Vector3(sp.pos[0], 2.2, sp.pos[2]);
    }
    return null;
  }, [fishing.phase, waterPos, fishing.reelingProgress]);

  const showFish = fishing.phase === 'waiting' || fishing.phase === 'hooked' ||
    fishing.phase === 'reeling' || fishing.phase === 'caught';
  const fishFlopping = fishing.phase === 'hooked' || fishing.phase === 'reeling';

  const rodTip = useMemo(() => {
    const py = walkingHeight(playerPos[0], playerPos[2]);
    return new THREE.Vector3(playerPos[0] + 0.35, py + 1.7, playerPos[2] + 0.2);
  }, [playerPos]);

  const showLine = bobberPos && fishing.phase !== 'idle' && fishing.phase !== 'caught';

  return (
    <group>
      {fishSpots.map((f) => {
        if (f.state !== 'idle') return null;
        const wp = fishWaterPos(f);
        return (
          <group key={f.id} position={[wp[0], WATER_SURFACE_Y, wp[2]]}>
            <Ripple />
          </group>
        );
      })}

      {bobberPos && <Bobber pos={bobberPos} hooked={fishing.phase === 'hooked'} />}
      {showFish && fishPos && <FishModel pos={fishPos} flopping={fishFlopping} />}
      {showLine && <FishingLine from={rodTip} to={bobberPos!} />}
      {fishing.phase === 'waiting' && waterPos && <FishShadow center={waterPos} />}
    </group>
  );
}
