// 玩家：第三人称控制 + 碰撞 + 交互（砍树/捡树枝）。
// 角色模型先用低多边形几何体占位，后续用 useGLTF 替换。
//
// 移动方向相对相机：W = 远离相机方向，A/D = 左右。
// 相机 yaw 由 GameRefs.cameraYawRef 提供（鼠标拖拽改变）。

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { WORLD, TREE, BUG, HOUSE, ROOMS, MUSEUM, type RoomId } from '../config/constants.ts';
import { TOOLS, type ItemId, type ToolId } from '../config/items.ts';
import { NPCS, npcPositionAt } from '../config/npcs.ts';
import { ANIMALS, animalPositionAt } from '../config/animals.ts';
import { MAP_LAYOUT } from '../config/mapLayout.ts';
import {
  useGameStore,
  clampToWorld,
} from '../store/useGameStore.ts';
import { useGameRefs } from './controllers/gameRefsContext.ts';
import { useGameTimeRef } from './useGameTimeRef.ts';
import { findInteractionTarget, interactionHint } from './interactions.ts';
import { blocksWalking, groundKind, isOnBridge, nearestWalkable, SWIM_HEIGHT, walkingHeight } from '../systems/terrain.ts';
import { getStaticObstacles } from '../systems/staticObstacles.ts';
import { acceptsTreePlacement } from '../systems/placement.ts';
import { soundManager, initAudio } from '../systems/audio.ts';
import { KenneyPlayer, type PlayerLimbRefs } from './world/KenneyCharacters.tsx';

const tmpDir = new THREE.Vector3();
const tmpNext = new THREE.Vector3();
const tmpPush = new THREE.Vector3();

export function Player() {
  const groupRef = useRef<THREE.Group>(null);
  const [initialPlayer] = useState(() => useGameStore.getState().player);
  const { playerRef, cameraYawRef } = useGameRefs();
  // drei 键盘：get 返回当前按键状态对象
  const [, getKeys] = useKeyboardControls();

  const trees = useGameStore((s) => s.trees);
  const drops = useGameStore((s) => s.drops);
  const fishSpots = useGameStore((s) => s.fishSpots);
  const bugs = useGameStore((s) => s.bugs);
  const plants = useGameStore((s) => s.plants);
  const paths = useGameStore((s) => s.paths);
  const rocks = useGameStore((s) => s.rocks);
  const equipped = useGameStore((s) => s.equipped);
  const fishingActive = useGameStore((s) => s.fishing.phase !== 'idle');
  const fishingPhase = useGameStore((s) => s.fishing.phase);
  const scene = useGameStore((s) => s.scene);
  const placingActive = useGameStore((s) => s.placing.active);
  const dialogueActive = useGameStore((s) => s.dialogue !== null);
  const tRef = useGameTimeRef();
  const staticObstacles = useMemo(() => getStaticObstacles(), []);
  const interactiveTrees = useMemo(
    () => trees.filter((tree) => acceptsTreePlacement(tree.pos[0], tree.pos[2])),
    [trees],
  );

  const setPlayer = useGameStore((s) => s.setPlayer);
  const chopTree = useGameStore((s) => s.chopTree);
  const harvestFruit = useGameStore((s) => s.harvestFruit);
  const pickupDrop = useGameStore((s) => s.pickupDrop);
  const equipTool = useGameStore((s) => s.equipTool);
  const setInteractHint = useGameStore((s) => s.setInteractHint);
  const pushToast = useGameStore((s) => s.pushToast);
  const startFishing = useGameStore((s) => s.startFishing);
  const endFishing = useGameStore((s) => s.endFishing);
  const progressReel = useGameStore((s) => s.progressReel);
  const setFishingPhase = useGameStore((s) => s.setFishingPhase);
  const catchBug = useGameStore((s) => s.catchBug);
  const missBug = useGameStore((s) => s.missBug);
  const currentRoom = useGameStore((s) => s.currentRoom);
  const setCurrentRoom = useGameStore((s) => s.setCurrentRoom);
  const enterHouse = useGameStore((s) => s.enterHouse);
  const leaveHouse = useGameStore((s) => s.leaveHouse);
  const enterNpcHouse = useGameStore((s) => s.enterNpcHouse);
  const leaveNpcHouse = useGameStore((s) => s.leaveNpcHouse);
  const enterMuseum = useGameStore((s) => s.enterMuseum);
  const leaveMuseum = useGameStore((s) => s.leaveMuseum);
  const startPicking = useGameStore((s) => s.startPicking);
  const talkToNpc = useGameStore((s) => s.talkToNpc);
  const interactWithAnimal = useGameStore((s) => s.interactWithAnimal);
  const interactWorldFeature = useGameStore((s) => s.interactWorldFeature);
  const closeDialogue = useGameStore((s) => s.closeDialogue);
  const setShopOpen = useGameStore((s) => s.setShopOpen);
  const digHole = useGameStore((s) => s.digHole);
  const plantAtSpot = useGameStore((s) => s.plantAtSpot);
  const waterPlant = useGameStore((s) => s.waterPlant);
  const harvestPlant = useGameStore((s) => s.harvestPlant);
  const mineRock = useGameStore((s) => s.mineRock);
  const placePath = useGameStore((s) => s.placePath);
  const removePath = useGameStore((s) => s.removePath);
  const swimming = useGameStore((s) => s.swimming);
  const startSwimming = useGameStore((s) => s.startSwimming);
  const stopSwimming = useGameStore((s) => s.stopSwimming);

  // 同步 playerRef 供相机/其它组件读取
  useEffect(() => {
    playerRef.current = groupRef.current;
  }, [playerRef]);

  // 边沿检测：记录上一帧按键
  const prevKeys = useRef<Record<string, boolean>>({});
  // 节流写回存档
  const lastSync = useRef(0);
  // 当前朝向（弧度），用于平滑插值
  const facing = useRef(initialPlayer.yaw);
  // 砍击冷却时间戳
  const lastChop = useRef(0);
  // 行走动画相位
  const walkPhase = useRef(0);
  const footstepDist = useRef(0);
  const audioInited = useRef(false);
  const limbRefs = useRef<PlayerLimbRefs | null>(null);
  const axeRef = useRef<THREE.Group>(null);
  const rodRef = useRef<THREE.Group>(null);
  const netRef = useRef<THREE.Group>(null);
  const shovelRef = useRef<THREE.Group>(null);
  const castStart = useRef(0);
  const lastFishingPhase = useRef('idle');
  const diveRef = useRef({
    active: false,
    elapsed: 0,
    duration: 0.68,
    from: new THREE.Vector3(),
    to: new THREE.Vector3(),
  });
  const swimMovingRef = useRef(false);
  const swimBurstRef = useRef(0);
  const toolActionRef = useRef({
    kind: 'none' as 'none' | 'axe' | 'shovel' | 'net',
    elapsed: 0,
    duration: 0.46,
    burst: 0,
  });

  // 用 three 的 clock 取时间
  const { clock } = useThree();

  const syncPlayerObjectFromStore = () => {
    const g = groupRef.current;
    if (!g) return;
    const p = useGameStore.getState().player;
    const safe = useGameStore.getState().scene === 'island' ? nearestWalkable(p.pos[0], p.pos[2]) : p.pos;
    g.position.set(safe[0], safe[1], safe[2]);
    facing.current = p.yaw;
    g.rotation.y = p.yaw;
  };

  useEffect(() => {
    syncPlayerObjectFromStore();
  }, [scene]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05); // 防止切后台后大跳
    const g = groupRef.current;
    if (!g) return;

    // 首次按键时初始化音频
    const keys = getKeys();
    if (!audioInited.current && Object.values(keys).some(Boolean)) {
      initAudio();
      audioInited.current = true;
    }
    const yaw = cameraYawRef.current;

    // 钓鱼中：禁止移动（玩家站在岸边抛竿），但仍处理 E 拉杆
    const fishingNow = fishingActive;
    const session = useGameStore.getState().fishing;
    // 家具放置/收回模式：禁止移动，专注摆放
    const placingNow = placingActive;
    const curScene = scene;

    // ── 移动方向（相机空间） ──
    // forward = 远离相机的水平方向；right = forward × up（右手坐标系）
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    let mx = 0;
    let mz = 0;
    const diving = diveRef.current.active;
    if (!fishingNow && !placingNow && !dialogueActive && !diving) {
      if (keys.forward) { mx += fx; mz += fz; }
      if (keys.back) { mx -= fx; mz -= fz; }
      if (keys.right) { mx += rx; mz += rz; }
      if (keys.left) { mx -= rx; mz -= rz; }
    }

    tmpDir.set(mx, 0, mz);
    const moving = tmpDir.lengthSq() > 1e-4;
    if (moving) tmpDir.normalize();
    swimMovingRef.current = swimming && moving && !diving;

    const speed = swimming ? WORLD.walkSpeed * 0.62 : keys.run ? WORLD.runSpeed : WORLD.walkSpeed;
    tmpNext.copy(g.position).addScaledVector(tmpDir, speed * dt);

    if (curScene === 'island') {
      // ── 岛上：树木碰撞 + 房屋碰撞 + 世界边界 + 地形高度 ──
      for (const t of interactiveTrees) {
        if (t.state !== 'intact') continue;
        tmpPush.set(tmpNext.x - t.pos[0], 0, tmpNext.z - t.pos[2]);
        const d = tmpPush.length();
        const minD = WORLD.playerRadius + TREE.radius;
        if (d < minD && d > 1e-5) {
          tmpPush.multiplyScalar(1 / d);
          tmpNext.set(t.pos[0] + tmpPush.x * minD, 0, t.pos[2] + tmpPush.z * minD);
        }
      }
      // 房屋碰撞
      const [hx, , hz] = HOUSE.pos;
      tmpPush.set(tmpNext.x - hx, 0, tmpNext.z - hz);
      const hd = tmpPush.length();
      const hmin = WORLD.playerRadius + HOUSE.radius;
      if (hd < hmin && hd > 1e-5) {
        tmpPush.multiplyScalar(1 / hd);
        tmpNext.set(hx + tmpPush.x * hmin, 0, hz + tmpPush.z * hmin);
      }
      for (const npc of NPCS) {
        tmpPush.set(tmpNext.x - npc.homePos[0], 0, tmpNext.z - npc.homePos[2]);
        const nd = tmpPush.length();
        const minD = WORLD.playerRadius + 3;
        if (nd < minD && nd > 1e-5) {
          tmpPush.multiplyScalar(1 / nd);
          tmpNext.set(npc.homePos[0] + tmpPush.x * minD, 0, npc.homePos[2] + tmpPush.z * minD);
        }
      }
      for (const rock of rocks) {
        if (rock.state !== 'intact') continue;
        tmpPush.set(tmpNext.x - rock.pos[0], 0, tmpNext.z - rock.pos[2]);
        const rd = tmpPush.length();
        const minD = WORLD.playerRadius + 0.75;
        if (rd < minD && rd > 1e-5) {
          tmpPush.multiplyScalar(1 / rd);
          tmpNext.set(rock.pos[0] + tmpPush.x * minD, 0, rock.pos[2] + tmpPush.z * minD);
        }
      }
      for (const npc of NPCS) {
        const p = npcPositionAt(npc, tRef.current);
        tmpPush.set(tmpNext.x - p[0], 0, tmpNext.z - p[2]);
        const nd = tmpPush.length();
        const minD = WORLD.playerRadius + 0.65;
        if (nd < minD && nd > 1e-5) {
          tmpPush.multiplyScalar(1 / nd);
          tmpNext.set(p[0] + tmpPush.x * minD, 0, p[2] + tmpPush.z * minD);
        }
      }
      for (const animal of ANIMALS) {
        const p = animalPositionAt(animal, tRef.current);
        tmpPush.set(tmpNext.x - p[0], 0, tmpNext.z - p[2]);
        const ad = tmpPush.length();
        const minD = WORLD.playerRadius + 0.5;
        if (ad < minD && ad > 1e-5) {
          tmpPush.multiplyScalar(1 / ad);
          tmpNext.set(p[0] + tmpPush.x * minD, 0, p[2] + tmpPush.z * minD);
        }
      }
      tmpPush.set(tmpNext.x - MAP_LAYOUT.shop.pos[0], 0, tmpNext.z - MAP_LAYOUT.shop.pos[2]);
      const sd = tmpPush.length();
      const smin = WORLD.playerRadius + 3.2;
      if (sd < smin && sd > 1e-5) {
        tmpPush.multiplyScalar(1 / sd);
        tmpNext.set(MAP_LAYOUT.shop.pos[0] + tmpPush.x * smin, 0, MAP_LAYOUT.shop.pos[2] + tmpPush.z * smin);
      }
      tmpPush.set(tmpNext.x - MAP_LAYOUT.museum.pos[0], 0, tmpNext.z - MAP_LAYOUT.museum.pos[2]);
      const md = tmpPush.length();
      const mmin = WORLD.playerRadius + 4;
      if (md < mmin && md > 1e-5) {
        tmpPush.multiplyScalar(1 / md);
        tmpNext.set(MAP_LAYOUT.museum.pos[0] + tmpPush.x * mmin, 0, MAP_LAYOUT.museum.pos[2] + tmpPush.z * mmin);
      }
      for (const obstacle of staticObstacles) {
        if (isOnBridge(g.position.x, g.position.z) || isOnBridge(tmpNext.x, tmpNext.z)) break;
        tmpPush.set(tmpNext.x - obstacle.pos[0], 0, tmpNext.z - obstacle.pos[2]);
        const od = tmpPush.length();
        const minD = WORLD.playerRadius + obstacle.radius;
        if (od < minD && od > 1e-5) {
          tmpPush.multiplyScalar(1 / od);
          tmpNext.set(obstacle.pos[0] + tmpPush.x * minD, 0, obstacle.pos[2] + tmpPush.z * minD);
        }
      }
      const clamped = clampToWorld([tmpNext.x, 0, tmpNext.z]);
      if (swimming) {
        if (diveRef.current.active) {
          const dive = diveRef.current;
          dive.elapsed = Math.min(dive.duration, dive.elapsed + dt);
          const progress = dive.elapsed / dive.duration;
          const eased = 1 - Math.pow(1 - progress, 3);
          g.position.lerpVectors(dive.from, dive.to, eased);
          g.position.y += Math.sin(progress * Math.PI) * 0.62;
          if (progress >= 1) {
            dive.active = false;
            g.position.copy(dive.to);
          }
        } else if (groundKind(clamped[0], clamped[2]) === 'water') {
          tmpNext.set(clamped[0], SWIM_HEIGHT, clamped[2]);
          g.position.set(tmpNext.x, SWIM_HEIGHT, tmpNext.z);
        } else {
          tmpNext.copy(g.position);
          g.position.set(tmpNext.x, SWIM_HEIGHT, tmpNext.z);
        }
      } else {
        if (blocksWalking(clamped[0], clamped[2])) {
          const safe = blocksWalking(g.position.x, g.position.z)
            ? nearestWalkable(g.position.x, g.position.z)
            : [g.position.x, walkingHeight(g.position.x, g.position.z), g.position.z];
          tmpNext.set(safe[0], 0, safe[2]);
        } else {
          tmpNext.set(clamped[0], 0, clamped[2]);
        }
        const gy = walkingHeight(tmpNext.x, tmpNext.z);
        g.position.set(tmpNext.x, gy, tmpNext.z);
      }
    } else if (curScene === 'house') {
      // ── 室内：按当前房间边界 + y=0 ──
      const roomCfg = ROOMS[currentRoom];
      const half = roomCfg ? roomCfg.half - WORLD.playerRadius - 0.2 : HOUSE.interiorSize / 2 - WORLD.playerRadius - 0.2;
      tmpNext.x = THREE.MathUtils.clamp(tmpNext.x, -half, half);
      tmpNext.z = THREE.MathUtils.clamp(tmpNext.z, -half, half);
      g.position.set(tmpNext.x, 0, tmpNext.z);
    } else if (curScene === 'museum') {
      const half = MUSEUM.interiorSize / 2 - WORLD.playerRadius - 0.2;
      tmpNext.x = THREE.MathUtils.clamp(tmpNext.x, -half, half);
      tmpNext.z = THREE.MathUtils.clamp(tmpNext.z, -half, half);
      g.position.set(tmpNext.x, 0, tmpNext.z);
    } else if (curScene === 'npchouse') {
      const half = 4.5;
      tmpNext.x = THREE.MathUtils.clamp(tmpNext.x, -half, half);
      tmpNext.z = THREE.MathUtils.clamp(tmpNext.z, -half, half);
      g.position.set(tmpNext.x, 0, tmpNext.z);
    }

    // ── 朝向平滑 ──
    if (moving) {
      const targetYaw = Math.atan2(tmpDir.x, tmpDir.z);
      // 取最短旋转路径
      let diff = targetYaw - facing.current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      facing.current += diff * Math.min(1, dt * 12);
      g.rotation.y = facing.current;
    }

    // ── 行走 / 游泳动画 ──
    const limbs = limbRefs.current;
    const toolAction = toolActionRef.current;
    if (toolAction.kind !== 'none') {
      toolAction.elapsed = Math.min(toolAction.duration, toolAction.elapsed + dt);
      if (toolAction.elapsed >= toolAction.duration) toolAction.kind = 'none';
    }
    if (diveRef.current.active && limbs) {
      const dive = diveRef.current;
      const progress = dive.elapsed / dive.duration;
      const arc = Math.sin(progress * Math.PI);
      limbs.bodyGroup.position.y = arc * 0.18 - progress * 0.28;
      limbs.bodyGroup.rotation.x = -0.28 - arc * 0.72 - progress * 0.48;
      limbs.bodyGroup.rotation.z *= 0.75;
      limbs.legLeft.rotation.x = 0.2 + arc * 0.42;
      limbs.legRight.rotation.x = 0.2 + arc * 0.42;
      limbs.armLeft.rotation.x = -1.35 + progress * 0.22;
      limbs.armRight.rotation.x = -1.35 + progress * 0.22;
      limbs.armLeft.rotation.z = -0.18;
      limbs.armRight.rotation.z = 0.18;
    } else if (swimming && limbs) {
      walkPhase.current += dt * (moving ? 5.8 : 3.2);
      const phase = walkPhase.current;
      const stroke = (Math.sin(phase) + 1) * 0.5;
      const pitch = moving ? -1.12 : -0.72;
      const depth = moving ? -0.34 : -0.2;
      limbs.bodyGroup.position.y += (depth + Math.sin(phase * 0.5) * 0.035 - limbs.bodyGroup.position.y) * Math.min(1, dt * 7);
      limbs.bodyGroup.rotation.x += (pitch - limbs.bodyGroup.rotation.x) * Math.min(1, dt * 7);
      limbs.bodyGroup.rotation.z = Math.sin(phase * 0.5) * (moving ? 0.025 : 0.045);
      if (moving) {
        const kick = Math.sin(phase * 2) * 0.22;
        limbs.legLeft.rotation.x = 0.18 + kick;
        limbs.legRight.rotation.x = 0.18 - kick;
        limbs.armLeft.rotation.x = -1.3 + stroke * 0.9;
        limbs.armRight.rotation.x = -1.3 + stroke * 0.9;
        limbs.armLeft.rotation.z = -0.22 - stroke * 0.72;
        limbs.armRight.rotation.z = 0.22 + stroke * 0.72;
      } else {
        limbs.legLeft.rotation.x = 0.28 + Math.sin(phase) * 0.16;
        limbs.legRight.rotation.x = 0.28 + Math.sin(phase + Math.PI) * 0.16;
        limbs.armLeft.rotation.x = -0.45 + Math.sin(phase) * 0.18;
        limbs.armRight.rotation.x = -0.45 + Math.sin(phase + Math.PI) * 0.18;
        limbs.armLeft.rotation.z = -0.62;
        limbs.armRight.rotation.z = 0.62;
      }
    } else if (toolAction.kind !== 'none' && limbs) {
      const progress = toolAction.elapsed / toolAction.duration;
      const strike = Math.sin(progress * Math.PI);
      limbs.bodyGroup.rotation.x = strike * 0.12;
      limbs.bodyGroup.rotation.z = -strike * 0.09;
      limbs.armRight.rotation.x = -1.0 + progress * 2.05;
      limbs.armRight.rotation.z = 0.42 - progress * 0.52;
      limbs.armLeft.rotation.x = -0.45 + strike * 0.35;
      limbs.armLeft.rotation.z = -0.18;
      limbs.legLeft.rotation.x *= 0.7;
      limbs.legRight.rotation.x *= 0.7;
    } else if (moving) {
      walkPhase.current += dt * (keys.run ? 14 : 9);
      const stepInterval = keys.run ? 0.6 : 0.7;
      footstepDist.current += speed * dt;
      if (footstepDist.current >= stepInterval) {
      footstepDist.current -= stepInterval;
        soundManager.play('footstep');
      }
      const swing = 0.5;
      if (limbs) {
        const bob = Math.abs(Math.sin(walkPhase.current)) * 0.08;
        limbs.bodyGroup.position.y = bob;
        limbs.bodyGroup.rotation.x *= 0.75;
        limbs.bodyGroup.rotation.z = Math.sin(walkPhase.current) * 0.04;
        limbs.legLeft.rotation.x = Math.sin(walkPhase.current) * swing;
        limbs.legRight.rotation.x = Math.sin(walkPhase.current + Math.PI) * swing;
        limbs.armLeft.rotation.x = Math.sin(walkPhase.current + Math.PI) * swing * 0.8;
        limbs.armRight.rotation.x = Math.sin(walkPhase.current) * swing * 0.8;
        limbs.armLeft.rotation.z *= 0.75;
        limbs.armRight.rotation.z *= 0.75;
      }
    } else {
      if (limbs) {
        limbs.bodyGroup.position.y *= 0.85;
        limbs.bodyGroup.rotation.x *= 0.8;
        limbs.bodyGroup.rotation.z *= 0.85;
        limbs.legLeft.rotation.x *= 0.8;
        limbs.legRight.rotation.x *= 0.8;
        limbs.armLeft.rotation.x *= 0.8;
        limbs.armRight.rotation.x *= 0.8;
        limbs.armLeft.rotation.z *= 0.8;
        limbs.armRight.rotation.z *= 0.8;
      }
    }

    // ── 鱼竿甩杆动画 ──
    const rodG = rodRef.current;
    if (rodG && equipped === 'fishingRod') {
      const fp = fishingPhase;
      if (fp === 'casting' && lastFishingPhase.current !== 'casting') {
        castStart.current = clock.elapsedTime;
      }
      lastFishingPhase.current = fp;
      if (fp === 'casting') {
        const t = Math.min(1, (clock.elapsedTime - castStart.current) / 0.8);
        rodG.rotation.x = -0.8 + t * 1.0;
      } else if (fp === 'waiting') {
        rodG.rotation.x = 0.2 + Math.sin(clock.elapsedTime * 2) * 0.04;
      } else if (fp === 'hooked') {
        rodG.rotation.x = 0.5 + Math.sin(clock.elapsedTime * 8) * 0.08;
      } else if (fp === 'reeling') {
        rodG.rotation.x = 0.3 + Math.sin(clock.elapsedTime * 6) * 0.12;
      } else if (fp === 'caught') {
        rodG.rotation.x = -0.6;
      } else {
        rodG.rotation.x += (0.2 - rodG.rotation.x) * 0.05;
      }
    }
    const actionProgress = toolAction.elapsed / toolAction.duration;
    const actionSwing = toolAction.kind === 'none' ? 0 : Math.sin(actionProgress * Math.PI);
    if (axeRef.current) {
      axeRef.current.rotation.x = 0.4 - actionSwing * 1.85;
      axeRef.current.rotation.z = 0.3 + actionSwing * 0.48;
    }
    if (shovelRef.current) {
      shovelRef.current.rotation.x = 0.4 - actionSwing * 1.45;
      shovelRef.current.rotation.z = 0.3 + actionSwing * 0.35;
    }
    if (netRef.current) {
      netRef.current.rotation.x = 0.2 - actionSwing * 1.55;
      netRef.current.rotation.z = 0.2 + actionSwing * 0.6;
    }

    // ── 自动拾取掉落物 ──
    for (const d of drops) {
      const dx = g.position.x - d.pos[0];
      const dz = g.position.z - d.pos[2];
      if (dx * dx + dz * dz < WORLD.pickupRadius * WORLD.pickupRadius) {
        pickupDrop(d.id);
        soundManager.play('pickup');
      }
    }

    // ── 交互处理 ──
    // 家具放置/收回模式优先：由 FurniturePlacer 接管 E/Q，Player 这里只放行
    if (placingNow) {
      if (useGameStore.getState().interactHint !== null) setInteractHint(null);
    } else if (dialogueActive) {
      const eDown = !!keys.interact;
      const ePrev = !!prevKeys.current.interact;
      if (eDown && !ePrev) closeDialogue();
      if (useGameStore.getState().interactHint !== null) setInteractHint(null);
    } else if (fishingNow) {
      // 钓鱼会话进行中：E 用于拉杆/收线/取消
      const eDown = !!keys.interact;
      const ePrev = !!prevKeys.current.interact;
      if (eDown && !ePrev) {
        if (session.phase === 'hooked' && session.spotId) {
          setFishingPhase('reeling', '收线中…再按 E 收线');
          soundManager.play('bite');
        } else if (session.phase === 'reeling') {
          progressReel();
          soundManager.play('reel');
        } else if (session.phase === 'casting' || session.phase === 'waiting') {
          endFishing();
          pushToast('收竿了');
        }
      }
      if (useGameStore.getState().interactHint !== null) setInteractHint(null);
    } else if (curScene === 'house') {
      // 室内：走到门口（前墙）按 E 出门 + 房间门切换
      const roomCfg = ROOMS[currentRoom];
      const exitH = (roomCfg ? roomCfg.half : HOUSE.interiorSize / 2);
      const distToDoor = Math.hypot(g.position.x - 0, g.position.z - (exitH - 0.6));
      const inExitZone = g.position.z >= exitH - 3.4 && Math.abs(g.position.x) <= 3.2;

      // 检查房间门
      let doorTarget: string | null = null;
      if (roomCfg) {
        for (const d of roomCfg.doors) {
          const dDist = Math.hypot(g.position.x - d.x, g.position.z - d.z);
          if (dDist <= 2.2) { doorTarget = d.to; break; }
        }
      }

      if (inExitZone || distToDoor <= 3.2) {
        const hint = '按 E 出门';
        if (useGameStore.getState().interactHint !== hint) setInteractHint(hint);
        const eDown = !!keys.interact;
        const ePrev = !!prevKeys.current.interact;
        if (eDown && !ePrev) {
          leaveHouse();
          syncPlayerObjectFromStore();
          soundManager.play('door');
        }
      } else if (doorTarget) {
        const hint = `按 E 进入${doorTarget === 'bedroom' ? '卧室' : doorTarget === 'kitchen' ? '厨房' : '客厅'}`;
        if (useGameStore.getState().interactHint !== hint) setInteractHint(hint);
        const eDown = !!keys.interact;
        const ePrev = !!prevKeys.current.interact;
        if (eDown && !ePrev) {
          setCurrentRoom(doorTarget as RoomId);
          soundManager.play('door');
        }
      } else if (useGameStore.getState().interactHint !== null) {
        setInteractHint(null);
      }
    } else if (curScene === 'npchouse') {
      const exitDist = Math.hypot(g.position.x - 0, g.position.z - 4.0);
      const inExitZone = g.position.z >= 3.8 && Math.abs(g.position.x) <= 2.5;
      if (inExitZone || exitDist <= 3.2) {
        const hint = '按 E 离开';
        if (useGameStore.getState().interactHint !== hint) setInteractHint(hint);
        const eDown = !!keys.interact;
        const ePrev = !!prevKeys.current.interact;
        if (eDown && !ePrev) {
          leaveNpcHouse();
          syncPlayerObjectFromStore();
          soundManager.play('door');
        }
      } else if (useGameStore.getState().interactHint !== null) {
        setInteractHint(null);
      }
    } else if (curScene === 'museum') {
      // 博物馆：走到门口（前墙）按 E 出门，近柜台按 E 打开捐赠面板
      const exitZ = MUSEUM.interiorSize / 2 - 0.6;
      const distToExit = Math.hypot(g.position.x - 0, g.position.z - exitZ);
      const inExitZone = g.position.z >= MUSEUM.interiorSize / 2 - 2.0 && Math.abs(g.position.x) <= 3.2;
      // 靠近柜台（在门内约 5 单位）
      const nearDesk = Math.hypot(g.position.x - 0, g.position.z - (MUSEUM.interiorSize / 2 - 5)) <= 2.5;
      if (inExitZone || distToExit <= 3.2) {
        const hint = '按 E 离开';
        if (useGameStore.getState().interactHint !== hint) setInteractHint(hint);
        const eDown = !!keys.interact;
        const ePrev = !!prevKeys.current.interact;
        if (eDown && !ePrev) {
          leaveMuseum();
          syncPlayerObjectFromStore();
          soundManager.play('door');
        }
      } else if (nearDesk) {
        const showingMuseum = useGameStore.getState().museumPanel;
        const hint = showingMuseum ? '' : '按 E 打开捐赠面板';
        if (showingMuseum) {
          if (useGameStore.getState().interactHint !== null) setInteractHint(null);
        } else {
          if (useGameStore.getState().interactHint !== hint) setInteractHint(hint);
          const eDown = !!keys.interact;
          const ePrev = !!prevKeys.current.interact;
          if (eDown && !ePrev) {
            useGameStore.getState().setMuseumPanel(true);
          }
        }
      } else if (useGameStore.getState().interactHint !== null) {
        setInteractHint(null);
      }
    } else {
      const target = findInteractionTarget({
        playerX: g.position.x,
        playerZ: g.position.z,
        trees: interactiveTrees,
        fishSpots,
        bugs,
        plants,
        paths,
        rocks,
        minutes: tRef.current,
        swimming,
      });

      if (target) {
        const hint = interactionHint(target, equipped, swimming);
        if (useGameStore.getState().interactHint !== hint) setInteractHint(hint);

        const eDown = !!keys.interact;
        const ePrev = !!prevKeys.current.interact;
        if (eDown && !ePrev) {
          const t = clock.elapsedTime;
          if (t - lastChop.current >= 0.3) {
            lastChop.current = t;
            if (target.kind === 'tree') {
              const tree = trees.find((tr) => tr.id === target.id);
              if (tree && tree.fruit && tree.fruitCount > 0) {
                harvestFruit(target.id);
                soundManager.play('pickup');
              } else {
                toolActionRef.current = { kind: 'axe', elapsed: 0, duration: 0.46, burst: 1 };
                chopTree(target.id);
                soundManager.play('chop');
              }
            }
            else if (target.kind === 'feature') interactWorldFeature(target.id);
            else if (target.kind === 'fish') { startFishing(target.id); soundManager.play('cast'); }
            else if (target.kind === 'npc') talkToNpc(target.id);
            else if (target.kind === 'animal') interactWithAnimal(target.id);
            else if (target.kind === 'npcHouse') { enterNpcHouse(target.id); soundManager.play('door'); }
            else if (target.kind === 'shop') { setShopOpen(true); soundManager.play('shopBell'); }
            else if (target.kind === 'museum') {
              enterMuseum();
              syncPlayerObjectFromStore();
              soundManager.play('door');
            }
            else if (target.kind === 'house') {
              enterHouse();
              syncPlayerObjectFromStore();
              soundManager.play('door');
            }
            else if (target.kind === 'plant') {
              const spot = plants.find((p) => p.id === target.id);
              if (!spot) return;
              if (spot.stage === -1) {
                plantAtSpot(target.id);
              } else if (spot.stage >= 2) {
                harvestPlant(target.id);
                soundManager.play('pickup');
              } else {
                waterPlant(target.id);
                soundManager.play('equip');
              }
            }
            else if (target.kind === 'rock') {
              toolActionRef.current = { kind: 'shovel', elapsed: 0, duration: 0.5, burst: 1 };
              mineRock(target.id);
              soundManager.play('mine');
            }
            else if (target.kind === 'path') {
              removePath(target.id);
            }
            else if (target.kind === 'water') {
              if (swimming) {
                stopSwimming();
                diveRef.current.active = false;
                swimBurstRef.current = 1;
                g.position.set(target.pos[0], walkingHeight(target.pos[0], target.pos[1]), target.pos[1]);
              } else {
                const targetYaw = Math.atan2(target.pos[0] - g.position.x, target.pos[1] - g.position.z);
                facing.current = targetYaw;
                g.rotation.y = targetYaw;
                diveRef.current.active = true;
                diveRef.current.elapsed = 0;
                diveRef.current.from.copy(g.position);
                diveRef.current.to.set(target.pos[0], SWIM_HEIGHT, target.pos[1]);
                swimBurstRef.current = 1;
                startSwimming();
              }
            }
            else {
              if (target.dist > BUG.catchRadius) {
                pushToast('再靠近一点才能挥网捕虫');
                prevKeys.current = { ...keys };
                return;
              }
              const b = bugs.find((x) => x.id === target.id);
              const distR = b ? Math.hypot(g.position.x - b.pos[0], g.position.z - b.pos[2]) / BUG.catchRadius : 1;
              const missChance = distR > 0.6 ? 0.35 : 0.05;
              toolActionRef.current = { kind: 'net', elapsed: 0, duration: 0.42, burst: 1 };
              soundManager.play('netSwing');
              if (Math.random() < missChance) missBug(target.id);
              else catchBug(target.id);
            }
          }
        }
      } else if (equipped === 'shovel') {
        const hint2 = '按 E 挖坑';
        if (useGameStore.getState().interactHint !== hint2) setInteractHint(hint2);
        const eDown = !!keys.interact;
        const ePrev = !!prevKeys.current.interact;
        if (eDown && !ePrev) {
          digHole([g.position.x, 0, g.position.z]);
        }
      } else if (equipped === null) {
        const hasPath = ['path_stone', 'path_brick', 'path_wood', 'path_dirt'].some((pt) => (useGameStore.getState().inventory[pt as ItemId] ?? 0) > 0);
        if (hasPath) {
          const hint3 = '按 E 铺设道路';
          if (useGameStore.getState().interactHint !== hint3) setInteractHint(hint3);
          const eDown = !!keys.interact;
          const ePrev = !!prevKeys.current.interact;
          if (eDown && !ePrev) {
            placePath([g.position.x, 0, g.position.z]);
          }
        }
      } else if (useGameStore.getState().interactHint !== null) {
        setInteractHint(null);
      }
    }

    // ── 工具切换（边沿触发） ──
    const toolSlots: { key: keyof typeof keys; tool: ToolId }[] = [
      { key: 'tool1', tool: 'axe' },
      { key: 'tool2', tool: 'fishingRod' },
      { key: 'tool3', tool: 'net' },
      { key: 'tool4', tool: 'shovel' },
      { key: 'tool5', tool: 'watering_can' },
    ];
    for (const slot of toolSlots) {
      if (keys[slot.key] && !prevKeys.current[slot.key]) {
        const owned = useGameStore.getState().tools[slot.tool];
        if (owned && owned > 0) {
          equipTool(slot.tool);
          soundManager.play('equip');
          pushToast(`装备：${TOOLS[slot.tool].name}`);
        } else {
          pushToast(`还没有${TOOLS[slot.tool].name}，去商店购买`);
        }
      }
    }
    if (keys.holster && !prevKeys.current.holster) {
      if (curScene === 'house' && !placingNow) {
        // 室内 X 键 = 进入收回家具模式
        startPicking();
      } else if (!placingNow) {
        // 岛上 X 键 = 收起工具
        equipTool(null);
        pushToast('收起工具');
      }
    }

    // 记录本帧按键
    prevKeys.current = { ...keys };

    // ── 节流写回存档（位置） ──
    const now = clock.elapsedTime;
    if (now - lastSync.current > 0.25) {
      lastSync.current = now;
      setPlayer([g.position.x, 0, g.position.z], facing.current);
    }
  });

  return (
    <group ref={groupRef} position={initialPlayer.pos} rotation={[0, initialPlayer.yaw, 0]}>
      {/* 阴影圆盘：贴地（不受身体颠簸影响） */}
      <mesh visible={!swimming} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.5, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.25} />
      </mesh>

      <KenneyPlayer characterIndex={0} limbRefs={limbRefs} />
      <SwimmingWaterFX
        playerRef={groupRef}
        activeRef={{ current: swimming }}
        movingRef={swimMovingRef}
        burstRef={swimBurstRef}
      />
      <ToolImpactFX actionRef={toolActionRef} />

      {/* 装备的工具：根据 equipped 显示（跟随身体颠簸） */}
      {!swimming && equipped === 'axe' && (
        <group ref={axeRef} position={[0.4, 1.0, 0.25]} rotation={[0.4, 0, 0.3]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.9, 8]} />
            <meshStandardMaterial color="#8a5a2b" flatShading />
          </mesh>
          <mesh position={[0, 0.55, 0]} castShadow>
            <boxGeometry args={[0.18, 0.22, 0.05]} />
            <meshStandardMaterial color="#b8b8c0" flatShading metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      )}
      {!swimming && equipped === 'fishingRod' && (
        <group ref={rodRef} position={[0.35, 1.0, 0.2]} rotation={[0.2, 0, 0.2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.025, 0.025, 1.4, 8]} />
            <meshStandardMaterial color="#5a3a1a" flatShading />
          </mesh>
        </group>
      )}
      {!swimming && equipped === 'net' && (
        <group ref={netRef} position={[0.4, 1.0, 0.2]} rotation={[0.2, 0, 0.2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.03, 0.03, 1.0, 8]} />
            <meshStandardMaterial color="#7a5a2a" flatShading />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <torusGeometry args={[0.3, 0.03, 8, 16]} />
            <meshStandardMaterial color="#cccccc" flatShading wireframe />
          </mesh>
        </group>
      )}
      {!swimming && equipped === 'shovel' && (
        <group ref={shovelRef} position={[0.4, 1.0, 0.2]} rotation={[0.4, 0, 0.3]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.035, 0.035, 1.0, 8]} />
            <meshStandardMaterial color="#7a5a2a" flatShading />
          </mesh>
          <mesh position={[0, -0.5, 0]} castShadow>
            <boxGeometry args={[0.22, 0.18, 0.05]} />
            <meshStandardMaterial color="#b8b8c0" flatShading metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function ToolImpactFX({
  actionRef,
}: {
  actionRef: RefObject<{ kind: 'none' | 'axe' | 'shovel' | 'net'; elapsed: number; duration: number; burst: number }>;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const particleRefs = useRef<Array<THREE.Mesh | null>>([]);
  const flashRef = useRef<THREE.Mesh>(null);
  const particles = useMemo(
    () => Array.from({ length: 9 }, (_, index) => ({
      angle: (index / 9) * Math.PI * 2,
      speed: 0.55 + (index % 4) * 0.16,
      lift: 0.35 + (index % 3) * 0.14,
    })),
    [],
  );

  useFrame((_, dt) => {
    const root = rootRef.current;
    if (!root) return;
    const action = actionRef.current;
    action.burst = Math.max(0, action.burst - dt * 2.6);
    const progress = 1 - action.burst;
    root.visible = action.burst > 0;
    if (!root.visible) return;
    root.position.set(0, action.kind === 'net' ? 1.25 : 0.48, 0.82);
    particleRefs.current.forEach((particle, index) => {
      if (!particle) return;
      const config = particles[index];
      particle.position.set(
        Math.cos(config.angle) * config.speed * progress,
        Math.sin(progress * Math.PI) * config.lift,
        Math.sin(config.angle) * config.speed * progress,
      );
      particle.rotation.set(progress * 8, config.angle, progress * 5);
      const size = Math.max(0, action.burst) * (action.kind === 'net' ? 0.7 : 1);
      particle.scale.setScalar(size);
      const material = particle.material as THREE.MeshBasicMaterial;
      material.color.set(action.kind === 'axe' ? '#d9a45f' : action.kind === 'shovel' ? '#ffe29a' : '#dffbff');
    });
    if (flashRef.current) {
      flashRef.current.visible = action.kind === 'net';
      flashRef.current.scale.setScalar(0.45 + progress * 1.15);
      (flashRef.current.material as THREE.MeshBasicMaterial).opacity = action.burst * 0.42;
    }
  });

  return (
    <group ref={rootRef} visible={false}>
      {particles.map((_, index) => (
        <mesh key={index} ref={(mesh) => { particleRefs.current[index] = mesh; }}>
          <tetrahedronGeometry args={[0.075, 0]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.88} depthWrite={false} />
        </mesh>
      ))}
      <mesh ref={flashRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.3, 20]} />
        <meshBasicMaterial color="#dffbff" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function SwimmingWaterFX({
  playerRef,
  activeRef,
  movingRef,
  burstRef,
}: {
  playerRef: RefObject<THREE.Group | null>;
  activeRef: RefObject<boolean>;
  movingRef: RefObject<boolean>;
  burstRef: RefObject<number>;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const ringRefs = useRef<Array<THREE.Mesh | null>>([]);
  const dropRefs = useRef<Array<THREE.Mesh | null>>([]);
  const phaseRef = useRef(0);
  const drops = useMemo(
    () => Array.from({ length: 10 }, (_, index) => ({
      angle: (index / 10) * Math.PI * 2 + (index % 3) * 0.24,
      radius: 0.38 + (index % 4) * 0.09,
      height: 0.28 + (index % 3) * 0.12,
      delay: (index % 5) * 0.055,
    })),
    [],
  );

  useFrame((_, dt) => {
    const root = rootRef.current;
    const player = playerRef.current;
    if (!root || !player) return;
    root.position.y = SWIM_HEIGHT - player.position.y + 0.035;
    phaseRef.current += dt * (movingRef.current ? 1.9 : 0.72);
    burstRef.current = Math.max(0, burstRef.current - dt * 1.35);
    const burst = burstRef.current;
    const visible = activeRef.current || burst > 0;
    root.visible = visible;
    if (!visible) return;

    ringRefs.current.forEach((ring, index) => {
      if (!ring) return;
      const cycle = (phaseRef.current + index * 0.34) % 1;
      const burstScale = burst > 0 ? (1 - burst) * 0.75 : 0;
      const scale = 0.45 + cycle * (movingRef.current ? 1.05 : 0.68) + burstScale;
      ring.scale.setScalar(scale);
      const material = ring.material as THREE.MeshBasicMaterial;
      material.opacity = Math.max(0, (1 - cycle) * (movingRef.current ? 0.42 : 0.22) + burst * 0.36);
    });

    const progress = 1 - burst;
    dropRefs.current.forEach((drop, index) => {
      if (!drop) return;
      const config = drops[index];
      const local = THREE.MathUtils.clamp((progress - config.delay) / (1 - config.delay), 0, 1);
      const radius = config.radius * (0.45 + local);
      drop.position.set(
        Math.cos(config.angle) * radius,
        Math.sin(local * Math.PI) * config.height,
        Math.sin(config.angle) * radius,
      );
      const scale = burst > 0 && local < 1 ? 0.55 + Math.sin(local * Math.PI) * 0.65 : 0;
      drop.scale.setScalar(scale);
    });
  });

  return (
    <group ref={rootRef}>
      {[0, 1, 2].map((index) => (
        <mesh
          key={`swim-ring-${index}`}
          ref={(mesh) => { ringRefs.current[index] = mesh; }}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[0.48, 0.035, 6, 28]} />
          <meshBasicMaterial color="#d9f5ff" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      {drops.map((_, index) => (
        <mesh key={`swim-drop-${index}`} ref={(mesh) => { dropRefs.current[index] = mesh; }}>
          <sphereGeometry args={[0.055, 6, 5]} />
          <meshBasicMaterial color="#dff8ff" transparent opacity={0.78} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
