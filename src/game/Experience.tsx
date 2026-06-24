// 3D 场景根组件（放在 <Canvas> 内）。
// 负责键盘控制包装、昼夜灯光、世界与玩家装配。

import { KeyboardControls } from '@react-three/drei';
import { useEffect } from 'react';
import { keyMap } from './controllers/keyMap.ts';
import { GameRefsProvider } from './controllers/GameRefs.tsx';
import { EnvironmentVFX } from './EnvironmentVFX.tsx';
import { DayNight } from './DayNight.tsx';
import { Terrain } from './world/Terrain.tsx';
import { GroundDetails } from './world/GroundDetails.tsx';
import { ShorelineDetails } from './world/ShorelineDetails.tsx';
import { TreeField } from './world/TreeField.tsx';
import { Drops } from './world/Drops.tsx';
import { PlantedField } from './world/PlantedField.tsx';
import { Decorations } from './world/Decorations.tsx';
import { InteractionMarkers } from './world/InteractionMarkers.tsx';
import { Player } from './Player.tsx';
import { CameraRig } from './CameraRig.tsx';
import { ClockSystem } from './ClockSystem.tsx';
import { FishingController } from './activities/FishingController.tsx';
import { BugSystem, BugField } from './activities/BugSystem.tsx';
import { House } from './housing/House.tsx';
import { HouseInterior } from './housing/HouseInterior.tsx';
import { NPCField } from './npc/NPCField.tsx';
import { ShopBuilding } from './shop/ShopBuilding.tsx';
import { MuseumBuilding } from './museum/MuseumBuilding.tsx';
import { MuseumInterior } from './museum/MuseumInterior.tsx';
import { AnimalField } from './animals/AnimalField.tsx';
import { WeatherSystem } from './WeatherSystem.tsx';
import { AmbientFX } from './AmbientFX.tsx';
import { MusicSystem } from './MusicSystem.tsx';
import { EventSystem } from './EventSystem.tsx';
import { IslandLights } from './world/IslandLights.tsx';
import { RockField } from './world/RockField.tsx';
import { IslandDecorations } from './world/IslandDecorations.tsx';
import { BackgroundScenery } from './world/BackgroundScenery.tsx';
import { Waterfall } from './world/Waterfall.tsx';
import { Water } from './world/Water.tsx';
import { SkyEffects } from './SkyEffects.tsx';
import { FishInWater } from './world/FishInWater.tsx';
import { Paths } from './world/Paths.tsx';
import { ShoreDetail } from './world/ShoreDetail.tsx';
import { MapLandmarks } from './world/MapLandmarks.tsx';
import { RegionalContent } from './world/RegionalContent.tsx';
import { useGameStore } from '../store/useGameStore.ts';
import { collectPlacementWarnings } from '../systems/placement.ts';
import { collectStaticObstacleWarnings } from '../systems/staticObstacles.ts';
import { MAP_LAYOUT } from '../config/mapLayout.ts';

export function Experience() {
  const scene = useGameStore((s) => s.scene);
  const isIndoors = scene === 'house' || scene === 'museum';

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const warnings = [...collectPlacementWarnings(), ...collectStaticObstacleWarnings()];
    warnings.forEach((warning) => console.warn(`[placement] ${warning}`));
  }, []);

  return (
    <KeyboardControls map={keyMap}>
      <GameRefsProvider>
        {/* 系统循环（始终运行） */}
        <ClockSystem />
        <WeatherSystem />
        <MusicSystem />
        <EventSystem />
        <BugSystem />

        {/* 昼夜灯光系统（室内改用专用光照，不渲染天空盒） */}
        {!isIndoors && (
          <>
            <DayNight />
            <SkyEffects />
            <AmbientFX />
            <EnvironmentVFX />
          </>
        )}

        {/* 室外世界 */}
        {!isIndoors && (
          <>
            <BackgroundScenery />
            <Water />
            <FishInWater />
            <Paths />
            <Terrain />
            <GroundDetails />
            <ShorelineDetails />
            <ShoreDetail />
            <Decorations />
            <MapLandmarks />
            <RegionalContent />
            <IslandLights />
            <IslandDecorations />
            <Waterfall pos={MAP_LAYOUT.waterfall.dropPos} height={5.2} width={1.55} />
            <TreeField />
            <RockField />
            <PlantedField />
            <Drops />
            <BugField />
            <FishingController />
            <House />
            <ShopBuilding />
            <MuseumBuilding />
            <NPCField />
            <AnimalField />
            <InteractionMarkers />
          </>
        )}

        {/* 室内场景 */}
        <HouseInterior />
        <MuseumInterior />

        {/* 玩家与相机 */}
        <Player />
        <CameraRig />
      </GameRefsProvider>
    </KeyboardControls>
  );
}
