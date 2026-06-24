import { useMemo } from 'react';
import { HOUSE, WORLD } from '../../config/constants.ts';
import { MAP_LAYOUT } from '../../config/mapLayout.ts';
import { NPCS, npcPositionAt } from '../../config/npcs.ts';
import { ANIMALS, animalPositionAt } from '../../config/animals.ts';
import { useGameStore } from '../../store/useGameStore.ts';
import { BRIDGES, buildableAt, groundKind, roadAmount } from '../../systems/terrain.ts';

const MAP_SIZE = 220;
const CELLS = 44;
const CELL = MAP_SIZE / CELLS;

const COLORS = {
  water: '#236a9b',
  sand: '#d8c793',
  grass: '#6f9e45',
  rock: '#88837a',
  dirt: '#806546',
  road: '#b58b58',
  foundation: '#9cb86a',
  paving: '#b8aa8e',
} as const;

function toMap(x: number, z: number): { left: number; top: number } {
  const half = WORLD.size / 2;
  return {
    left: ((x + half) / WORLD.size) * MAP_SIZE,
    top: ((z + half) / WORLD.size) * MAP_SIZE,
  };
}

export function MiniMap() {
  const player = useGameStore((s) => s.player);
  const minutes = useGameStore((s) => s.clock.minutes);

  const cells = useMemo(() => {
    const half = WORLD.size / 2;
    const items: { x: number; z: number; color: string }[] = [];
    for (let zi = 0; zi < CELLS; zi++) {
      for (let xi = 0; xi < CELLS; xi++) {
        const x = -half + (xi + 0.5) * (WORLD.size / CELLS);
        const z = -half + (zi + 0.5) * (WORLD.size / CELLS);
        const kind = groundKind(x, z);
        const color = buildableAt(x, z)
          ? COLORS.foundation
          : roadAmount(x, z) > 0.45
            ? COLORS.road
            : COLORS[kind];
        items.push({ x: xi * CELL, z: zi * CELL, color });
      }
    }
    return items;
  }, []);

  const playerPos = toMap(player.pos[0], player.pos[2]);
  const housePos = toMap(HOUSE.pos[0], HOUSE.pos[2]);
  const shopPos = toMap(MAP_LAYOUT.shop.pos[0], MAP_LAYOUT.shop.pos[2]);
  const museumPos = toMap(MAP_LAYOUT.museum.pos[0], MAP_LAYOUT.museum.pos[2]);

  return (
    <div className="minimap-panel">
      <div className="minimap-title">地图调试</div>
      <div className="minimap-canvas">
        {cells.map((cell, index) => (
          <span
            key={index}
            className="minimap-cell"
            style={{
              left: cell.x,
              top: cell.z,
              width: CELL + 0.2,
              height: CELL + 0.2,
              background: cell.color,
            }}
          />
        ))}
        {BRIDGES.map((bridge) => {
          const pos = toMap(bridge.pos[0], bridge.pos[2]);
          return (
            <span
              key={bridge.id}
              className="minimap-bridge"
              style={{
                left: pos.left,
                top: pos.top,
                width: (bridge.size[0] / WORLD.size) * MAP_SIZE,
                height: (bridge.size[2] / WORLD.size) * MAP_SIZE,
              }}
            />
          );
        })}
        <span className="minimap-home" style={{ left: housePos.left, top: housePos.top }} />
        <span className="minimap-shop" style={{ left: shopPos.left, top: shopPos.top }} />
        <span className="minimap-museum" style={{ left: museumPos.left, top: museumPos.top }} />
        {NPCS.map((npc) => {
          const p = npcPositionAt(npc, minutes);
          const pos = toMap(p[0], p[2]);
          return <span key={npc.id} className="minimap-npc" style={{ left: pos.left, top: pos.top, background: npc.color }} title={npc.name} />;
        })}
        {ANIMALS.map((animal) => {
          const p = animalPositionAt(animal, minutes);
          const pos = toMap(p[0], p[2]);
          return <span key={animal.id} className="minimap-animal" style={{ left: pos.left, top: pos.top, background: animal.color }} title={animal.name} />;
        })}
        <span className="minimap-player" style={{ left: playerPos.left, top: playerPos.top }} />
      </div>
      <div className="minimap-legend">
        <span><i style={{ background: COLORS.water }} />水</span>
        <span><i style={{ background: COLORS.road }} />路</span>
        <span><i style={{ background: COLORS.foundation }} />地基</span>
        <span><i style={{ background: '#6a4326' }} />桥</span>
        <span><i style={{ background: '#d9903d' }} />动物</span>
        <span><i className="legend-player" />玩家</span>
      </div>
    </div>
  );
}
