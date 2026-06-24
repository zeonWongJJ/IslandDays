import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useKeyboardControls } from '@react-three/drei';
import { HOUSE, FURNITURE, ROOMS } from '../../config/constants.ts';
import { type FurnitureItemId } from '../../config/items.ts';
import { useGameStore } from '../../store/useGameStore.ts';
import { useGameRefs } from '../controllers/gameRefsContext.ts';
import type { PlacedFurniture } from '../../systems/save.ts';
import { KenneyFurniture } from '../world/KenneyModels.tsx';

const WALL_H = 4;
const WALL_T = 0.25;

export function HouseInterior() {
  const scene = useGameStore((s) => s.scene);
  if (scene !== 'house') return null;

  return (
    <group>
      <RoomShell />
      <PlacedFurnitureField />
      <FurniturePlacer />
    </group>
  );
}

function RoomShell() {
  const room = useGameStore((s) => s.currentRoom);

  if (room === 'living') {
    const H = ROOMS.living.half;
    return (
      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[H * 2, H * 2]} />
          <meshStandardMaterial color="#c89a5a" flatShading roughness={1} />
        </mesh>
        <RoomDressing half={H} floorLine="#a97842" trim="#9a6f42" wallTrim="#d6c19d" rug="#5a3a1a" />
        <mesh position={[0, 2, -H]} receiveShadow castShadow>
          <boxGeometry args={[H * 2, WALL_H, WALL_T]} />
          <meshStandardMaterial color="#e8d8b8" flatShading roughness={1} />
        </mesh>
        <mesh position={[0, 2, H]} receiveShadow castShadow>
          <boxGeometry args={[H * 2, WALL_H, WALL_T]} />
          <meshStandardMaterial color="#e8d8b8" flatShading roughness={1} />
        </mesh>
        <mesh position={[-H, 2, 0]} receiveShadow castShadow>
          <boxGeometry args={[WALL_T, WALL_H, H * 2]} />
          <meshStandardMaterial color="#e8d8b8" flatShading roughness={1} />
        </mesh>
        <mesh position={[H, 2, 0]} receiveShadow castShadow>
          <boxGeometry args={[WALL_T, WALL_H, H * 2]} />
          <meshStandardMaterial color="#e8d8b8" flatShading roughness={1} />
        </mesh>
        {/* 卧室门洞（后墙右侧） */}
        <mesh position={[4.5, 1.15, -H]}>
          <boxGeometry args={[1.4, 2.3, WALL_T]} />
          <meshBasicMaterial color="#c49a5a" />
        </mesh>
        <mesh position={[4.5, 1.6, -H + 0.16]}>
          <boxGeometry args={[0.8, 1.8, 0.06]} />
          <meshBasicMaterial color="#5a3a1a" />
        </mesh>
        {/* 厨房门洞（后墙左侧） */}
        <mesh position={[-4.5, 1.15, -H]}>
          <boxGeometry args={[1.4, 2.3, WALL_T]} />
          <meshBasicMaterial color="#c49a5a" />
        </mesh>
        <mesh position={[-4.5, 1.6, -H + 0.16]}>
          <boxGeometry args={[0.8, 1.8, 0.06]} />
          <meshBasicMaterial color="#5a3a1a" />
        </mesh>
        {/* 出口地毯 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, H - 0.6]}>
          <planeGeometry args={[1.6, 1.2]} />
          <meshStandardMaterial color="#5a3a1a" flatShading roughness={1} />
        </mesh>
        <pointLight position={[0, 3.5, 0]} intensity={1.0} distance={22} color="#ffd9a0" />
        <pointLight position={[5, 2.0, 4]} intensity={0.4} distance={12} color="#ffb080" />
        <ambientLight intensity={0.55} color="#ffe8c8" />
      </group>
    );
  }

  if (room === 'bedroom') {
    const H = ROOMS.bedroom.half;
    return (
      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[H * 2, H * 2]} />
          <meshStandardMaterial color="#c8b0a0" flatShading roughness={1} />
        </mesh>
        <RoomDressing half={H} floorLine="#a98a78" trim="#9b796a" wallTrim="#dfc3b5" rug="#7a4a5a" />
        <mesh position={[0, 2, -H]} receiveShadow castShadow>
          <boxGeometry args={[H * 2, WALL_H, WALL_T]} />
          <meshStandardMaterial color="#eed8c8" flatShading roughness={1} />
        </mesh>
        <mesh position={[0, 2, H]} receiveShadow castShadow>
          <boxGeometry args={[H * 2, WALL_H, WALL_T]} />
          <meshStandardMaterial color="#eed8c8" flatShading roughness={1} />
        </mesh>
        <mesh position={[-H, 2, 0]} receiveShadow castShadow>
          <boxGeometry args={[WALL_T, WALL_H, H * 2]} />
          <meshStandardMaterial color="#eed8c8" flatShading roughness={1} />
        </mesh>
        <mesh position={[H, 2, 0]} receiveShadow castShadow>
          <boxGeometry args={[WALL_T, WALL_H, H * 2]} />
          <meshStandardMaterial color="#eed8c8" flatShading roughness={1} />
        </mesh>
        {/* 门洞（前墙） */}
        <mesh position={[0, 1.15, H]}>
          <boxGeometry args={[1.2, 2.3, WALL_T]} />
          <meshBasicMaterial color="#c49a5a" />
        </mesh>
        <mesh position={[0, 1.6, H - 0.16]}>
          <boxGeometry args={[0.8, 1.8, 0.06]} />
          <meshBasicMaterial color="#5a3a1a" />
        </mesh>
        <pointLight position={[0, 3.5, 0]} intensity={0.7} distance={16} color="#ffc8a0" />
        <pointLight position={[-3, 1.8, 3]} intensity={0.3} distance={10} color="#ffa070" />
        <ambientLight intensity={0.45} color="#ffe0d0" />
      </group>
    );
  }

  if (room === 'kitchen') {
    const H = ROOMS.kitchen.half;
    return (
      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[H * 2, H * 2]} />
          <meshStandardMaterial color="#b8b8a8" flatShading roughness={1} />
        </mesh>
        <RoomDressing half={H} floorLine="#8f907f" trim="#7f7d68" wallTrim="#cfc6b5" rug="#5f6f58" />
        <mesh position={[0, 2, -H]} receiveShadow castShadow>
          <boxGeometry args={[H * 2, WALL_H, WALL_T]} />
          <meshStandardMaterial color="#e0d8c8" flatShading roughness={1} />
        </mesh>
        <mesh position={[0, 2, H]} receiveShadow castShadow>
          <boxGeometry args={[H * 2, WALL_H, WALL_T]} />
          <meshStandardMaterial color="#e0d8c8" flatShading roughness={1} />
        </mesh>
        <mesh position={[-H, 2, 0]} receiveShadow castShadow>
          <boxGeometry args={[WALL_T, WALL_H, H * 2]} />
          <meshStandardMaterial color="#e0d8c8" flatShading roughness={1} />
        </mesh>
        <mesh position={[H, 2, 0]} receiveShadow castShadow>
          <boxGeometry args={[WALL_T, WALL_H, H * 2]} />
          <meshStandardMaterial color="#e0d8c8" flatShading roughness={1} />
        </mesh>
        {/* 门洞（前墙） */}
        <mesh position={[0, 1.15, H]}>
          <boxGeometry args={[1.2, 2.3, WALL_T]} />
          <meshBasicMaterial color="#c49a5a" />
        </mesh>
        <mesh position={[0, 1.6, H - 0.16]}>
          <boxGeometry args={[0.8, 1.8, 0.06]} />
          <meshBasicMaterial color="#5a3a1a" />
        </mesh>
        {/* 厨房台面装饰 */}
        <mesh position={[4, 1, -4]}>
          <boxGeometry args={[2, 1.8, 0.6]} />
          <meshStandardMaterial color="#c8b898" flatShading roughness={1} />
        </mesh>
        <group position={[-3.5, 0, -3.7]} rotation={[0, Math.PI / 2, 0]}>
          <FurnitureShape itemId="furniture_cabinet" />
        </group>
        <group position={[2.3, 0, -3.8]}>
          <FurnitureShape itemId="furniture_sideTable" />
        </group>
        <pointLight position={[0, 3.5, 0]} intensity={0.9} distance={18} color="#fff0d8" />
        <pointLight position={[5, 2.2, -4]} intensity={0.35} distance={12} color="#ffe0a0" />
        <ambientLight intensity={0.5} color="#fff0e0" />
      </group>
    );
  }

  return null;
}

function RoomDressing({
  half,
  floorLine,
  trim,
  wallTrim,
  rug,
}: {
  half: number;
  floorLine: string;
  trim: string;
  wallTrim: string;
  rug: string;
}) {
  const plankLines = [-0.66, -0.33, 0, 0.33, 0.66].map((t) => t * half);
  return (
    <group>
      {plankLines.map((x) => (
        <mesh key={`x-${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.014, 0]}>
          <planeGeometry args={[0.035, half * 2 - 0.6]} />
          <meshBasicMaterial color={floorLine} transparent opacity={0.32} />
        </mesh>
      ))}
      {plankLines.map((z) => (
        <mesh key={`z-${z}`} rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.015, z]}>
          <planeGeometry args={[0.03, half * 2 - 0.6]} />
          <meshBasicMaterial color={floorLine} transparent opacity={0.18} />
        </mesh>
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, half - 1.15]}>
        <planeGeometry args={[2.3, 1.45]} />
        <meshStandardMaterial color={rug} flatShading roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, half - 1.15]}>
        <ringGeometry args={[0.55, 0.68, 20]} />
        <meshBasicMaterial color="#e7d1a2" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, 0.35, -half + 0.14]} receiveShadow>
        <boxGeometry args={[half * 2 - 0.45, 0.28, 0.12]} />
        <meshStandardMaterial color={trim} flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 0.35, half - 0.14]} receiveShadow>
        <boxGeometry args={[half * 2 - 0.45, 0.28, 0.12]} />
        <meshStandardMaterial color={trim} flatShading roughness={1} />
      </mesh>
      <mesh position={[-half + 0.14, 0.35, 0]} receiveShadow>
        <boxGeometry args={[0.12, 0.28, half * 2 - 0.45]} />
        <meshStandardMaterial color={trim} flatShading roughness={1} />
      </mesh>
      <mesh position={[half - 0.14, 0.35, 0]} receiveShadow>
        <boxGeometry args={[0.12, 0.28, half * 2 - 0.45]} />
        <meshStandardMaterial color={trim} flatShading roughness={1} />
      </mesh>

      {[-0.5, 0.5].map((t) => (
        <mesh key={`back-panel-${t}`} position={[t * half, 2.35, -half + 0.17]}>
          <boxGeometry args={[1.7, 1.0, 0.06]} />
          <meshStandardMaterial color={wallTrim} flatShading roughness={1} />
        </mesh>
      ))}
      {[-0.55, 0.55].map((t) => (
        <mesh key={`side-panel-${t}`} position={[-half + 0.17, 2.2, t * half]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[1.4, 0.85, 0.06]} />
          <meshStandardMaterial color={wallTrim} flatShading roughness={1} />
        </mesh>
      ))}

      {[-0.45, 0.45].map((t) => (
        <mesh key={`beam-${t}`} position={[t * half, 3.94, 0]} castShadow>
          <boxGeometry args={[0.22, 0.18, half * 2 - 0.6]} />
          <meshStandardMaterial color={trim} flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function PlacedFurnitureField() {
  const room = useGameStore((s) => s.currentRoom);
  const placed = useGameStore((s) => s.house.rooms[room]?.placed ?? []);
  return (
    <group>
      {placed.map((f) => (
        <PlacedFurnitureMesh key={f.id} data={f} />
      ))}
    </group>
  );
}

function PlacedFurnitureMesh({ data }: { data: PlacedFurniture }) {
  const [x, , z] = data.pos;
  return (
    <group position={[x, 0, z]} rotation={[0, (data.rotStep * Math.PI) / 2, 0]}>
      <FurnitureShape itemId={data.itemId} />
    </group>
  );
}

function FurnitureShape({ itemId }: { itemId: FurnitureItemId }) {
  return <KenneyFurniture itemId={itemId} />;
}

function FurniturePlacer() {
  const { playerRef, cameraYawRef } = useGameRefs();
  const placing = useGameStore((s) => s.placing);
  const room = useGameStore((s) => s.currentRoom);
  const placeFurniture = useGameStore((s) => s.placeFurniture);
  const pickupFurniture = useGameStore((s) => s.pickupFurniture);
  const cancelPlacing = useGameStore((s) => s.cancelPlacing);
  const setInteractHint = useGameStore((s) => s.setInteractHint);
  const [, getKeys] = useKeyboardControls();

  const previewRef = useRef<THREE.Group>(null);
  const rotStep = useRef(0);
  const prevKeys = useRef<Record<string, boolean>>({});
  const cfg = ROOMS[room];

  useFrame(() => {
    const g = playerRef.current;
    if (!g || !cfg) return;

    if (placing.active && placing.itemId === null) {
      const placed = useGameStore.getState().house.rooms[room]?.placed ?? [];
      let nearest: { id: string; dist: number } | null = null;
      for (const f of placed) {
        const dist = Math.hypot(g.position.x - f.pos[0], g.position.z - f.pos[2]);
        if (dist <= 1.8 && (!nearest || dist < nearest.dist)) nearest = { id: f.id, dist };
      }
      if (nearest) {
        const hint = '按 E 收回这件家具 / Q 退出';
        if (useGameStore.getState().interactHint !== hint) setInteractHint(hint);
        const keys = getKeys();
        if (keys.interact && !prevKeys.current.interact) {
          pickupFurniture(nearest.id);
        }
      } else {
        const hint = '走到家具旁按 E 收回 / Q 退出';
        if (useGameStore.getState().interactHint !== hint) setInteractHint(hint);
      }
      const keys = getKeys();
      if (keys.holster && !prevKeys.current.holster) {
        cancelPlacing();
        setInteractHint(null);
      }
      prevKeys.current = { ...keys };
      return;
    }

    if (!placing.active || !placing.itemId) return;
    const yaw = cameraYawRef.current;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const px = g.position.x + fx * 1.5;
    const pz = g.position.z + fz * 1.5;
    const cell = HOUSE.gridCell;
    const gx = Math.round(px / cell) * cell;
    const gz = Math.round(pz / cell) * cell;
    const H = cfg.half;
    const cx = THREE.MathUtils.clamp(gx, -H + 0.5, H - 0.5);
    const cz = THREE.MathUtils.clamp(gz, -H + 0.5, H - 0.5);
    if (previewRef.current) {
      previewRef.current.position.set(cx, 0, cz);
      previewRef.current.rotation.y = (rotStep.current * Math.PI) / 2;
    }

    const keys = getKeys();
    if (keys.holster && !prevKeys.current.holster) {
      cancelPlacing();
      setInteractHint(null);
    }
    if (keys.interact && !prevKeys.current.interact) {
      placeFurniture(placing.itemId, [cx, 0, cz], rotStep.current);
      cancelPlacing();
      setInteractHint(null);
    }
    prevKeys.current = { interact: !!keys.interact, holster: !!keys.holster };
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyR' && useGameStore.getState().placing.active && useGameStore.getState().placing.itemId) {
        rotStep.current = (rotStep.current + 1) % 4;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!placing.active || !placing.itemId) return null;
  return (
    <group ref={previewRef}>
      <FurnitureShape itemId={placing.itemId} />
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[FURNITURE.radius * 2, 0.8, FURNITURE.radius * 2]} />
        <meshBasicMaterial color="#e8a33d" transparent opacity={0.18} wireframe />
      </mesh>
    </group>
  );
}
