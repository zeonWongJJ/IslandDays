import type { Vec3 } from '../systems/save.ts';

export interface BridgeLayout {
  id: string;
  pos: Vec3;
  size: Vec3;
  rotation: number;
}

export interface LandPadLayout {
  id: string;
  pos: Vec3;
  radius: number;
  height: number;
  buildable: boolean;
}

export interface RoadSegmentLayout {
  from: [number, number];
  to: [number, number];
  width: number;
}

export interface NpcLayout {
  id: 'mira' | 'tao' | 'lina';
  homePos: Vec3;
  morningPos: Vec3;
  hangoutPos: Vec3;
  eveningPos: Vec3;
}

export const MAP_LAYOUT = {
  zones: {
    village: { center: [10, 0, 14] as Vec3, radius: 26 },
    westForest: { center: [-36, 0, 18] as Vec3, radius: 22 },
    northRiver: { center: [-16, 0, 34] as Vec3, radius: 18 },
    southWorkshop: { center: [34, 0, -20] as Vec3, radius: 18 },
    mountain: { center: [-34, 0, 36] as Vec3, radius: 16 },
  },
  playerSpawn: [0, 0, 16] as Vec3,
  home: {
    pos: [0, 0, 10] as Vec3,
    padRadius: 13,
    padHeight: 2.0,
  },
  plaza: {
    pos: [10, 0, 18] as Vec3,
    padRadius: 9,
    padHeight: 2.0,
  },
  shop: {
    pos: [22, 0, 14] as Vec3,
    padRadius: 9,
    padHeight: 2.0,
    interactRadius: 5.2,
  },
  museum: {
    pos: [30, 0, 0] as Vec3,
    padRadius: 10,
    padHeight: 2.0,
    interactRadius: 7,
  },
  waterfall: {
    top: [-34, 0, 36] as Vec3,
    dropPos: [-31, 0, 35] as Vec3,
    pool: [-25, 0, 32] as Vec3,
  },
  bridges: [
    { id: 'bridge-village', pos: [-13, 0, -4], size: [14, 0.35, 3.0], rotation: 0 },
    { id: 'bridge-forest', pos: [-15, 0, 30], size: [14, 0.35, 3.0], rotation: 0 },
  ] satisfies BridgeLayout[],
  bridgePads: [
    { id: 'bridge-village-west', pos: [-20, 0, -4], radius: 5.2, height: 1.12, buildable: false },
    { id: 'bridge-village-east', pos: [-6, 0, -4], radius: 5.2, height: 1.12, buildable: false },
    { id: 'bridge-forest-west', pos: [-22, 0, 30], radius: 5.2, height: 1.12, buildable: false },
    { id: 'bridge-forest-east', pos: [-8, 0, 30], radius: 5.2, height: 1.12, buildable: false },
  ] satisfies LandPadLayout[],
  roads: [
    { from: [0, 16], to: [10, 18], width: 2.3 },
    { from: [10, 18], to: [22, 14], width: 2.2 },
    { from: [10, 18], to: [30, 0], width: 2.2 },
    { from: [10, 18], to: [-6, -4], width: 2.2 },
    { from: [-20, -4], to: [-30, 16], width: 2.2 },
    { from: [10, 18], to: [-8, 30], width: 2.2 },
    { from: [-22, 30], to: [-31, 35], width: 1.8 },
    { from: [10, 18], to: [36, -22], width: 2.1 },
    { from: [30, 0], to: [54, -8], width: 1.8 },
    { from: [28, 34], to: [18, 57], width: 1.7 },
    { from: [36, -22], to: [40, -56], width: 1.7 },
    { from: [-30, 16], to: [-51, 31], width: 1.55 },
  ] satisfies RoadSegmentLayout[],
  npcs: [
    {
      id: 'mira',
      homePos: [-32, 0, 16],
      morningPos: [-34, 0, 19],
      hangoutPos: [-29, 0, 27],
      eveningPos: [-31, 0, 18],
    },
    {
      id: 'tao',
      homePos: [34, 0, 28],
      morningPos: [34, 0, 32],
      hangoutPos: [28, 0, 34],
      eveningPos: [32, 0, 30],
    },
    {
      id: 'lina',
      homePos: [36, 0, -22],
      morningPos: [38, 0, -16],
      hangoutPos: [36, 0, -10],
      eveningPos: [34, 0, -18],
    },
  ] satisfies NpcLayout[],
} as const;

export const LAND_PADS: LandPadLayout[] = [
  {
    id: 'home',
    pos: MAP_LAYOUT.home.pos,
    radius: MAP_LAYOUT.home.padRadius,
    height: MAP_LAYOUT.home.padHeight,
    buildable: true,
  },
  ...MAP_LAYOUT.npcs.map((npc) => ({
    id: `${npc.id}-home`,
    pos: npc.homePos,
    radius: 10,
    height: 2.0,
    buildable: true,
  })),
  ...MAP_LAYOUT.bridgePads,
  {
    id: 'plaza',
    pos: MAP_LAYOUT.plaza.pos,
    radius: MAP_LAYOUT.plaza.padRadius,
    height: MAP_LAYOUT.plaza.padHeight,
    buildable: true,
  },
  {
    id: 'shop',
    pos: MAP_LAYOUT.shop.pos,
    radius: MAP_LAYOUT.shop.padRadius,
    height: MAP_LAYOUT.shop.padHeight,
    buildable: true,
  },
  {
    id: 'museum',
    pos: MAP_LAYOUT.museum.pos,
    radius: MAP_LAYOUT.museum.padRadius,
    height: MAP_LAYOUT.museum.padHeight,
    buildable: true,
  },
];

export function npcLayout(id: NpcLayout['id']): NpcLayout {
  return MAP_LAYOUT.npcs.find((npc) => npc.id === id) ?? MAP_LAYOUT.npcs[0];
}
