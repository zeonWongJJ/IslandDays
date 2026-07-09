import { MAP_LAYOUT } from './mapLayout.ts';

export interface PierLayout {
  id: string;
  x: number;
  z: number;
  rot: number;
}

export interface LandmarkPoint {
  id: string;
  x: number;
  z: number;
  rot?: number;
}

const campBase = MAP_LAYOUT.zones.southWorkshop.center;
const campX = campBase[0] + 8;
const campZ = campBase[2] - 10;
const villageCenter = MAP_LAYOUT.zones.village.center;

const orchardOffsets = [
  [-10, 13], [-7, 17], [-4, 12], [-1, 16],
  [2, 11], [5, 15], [8, 10], [11, 14],
] as const;

export const LANDMARKS = {
  piers: [
    { id: 'pier-south', x: -18, z: -18, rot: Math.PI / 2 },
    { id: 'pier-waterfall', x: -27, z: MAP_LAYOUT.waterfall.pool[2] + 4.5, rot: 0.35 },
  ] satisfies PierLayout[],
  camp: {
    tents: [
      { id: 'camp-tent-a', x: campX - 1.8, z: campZ + 1.2, rot: -0.45 },
      { id: 'camp-tent-b', x: campX + 2.4, z: campZ + 2.3, rot: 0.55 },
    ] satisfies LandmarkPoint[],
    fire: { id: 'camp-fire', x: campX + 0.5, z: campZ - 1.4 },
    logStack: { id: 'camp-log-stack', x: campX + 5.2, z: campZ + 0.6, rot: 0.9 },
    fences: [
      { id: 'camp-fence-a', x: campX + 5, z: campZ - 3, rot: Math.PI / 2 },
      { id: 'camp-fence-b', x: campX - 2, z: campZ - 3, rot: Math.PI / 2 },
      { id: 'camp-fence-c', x: campX + 3.5, z: campZ - 1, rot: 0.1 },
      { id: 'camp-fence-d', x: campX + 3.8, z: campZ + 1.2, rot: 0.1 },
    ] satisfies LandmarkPoint[],
  },
  orchard: {
    trees: orchardOffsets.map(([dx, dz], index) => ({
      id: `orchard-tree-${index}`,
      x: villageCenter[0] + dx,
      z: villageCenter[2] + dz,
    })) satisfies LandmarkPoint[],
    bushes: orchardOffsets.slice(0, 5).map(([dx, dz], index) => ({
      id: `orchard-bush-${index}`,
      x: villageCenter[0] + dx + 1.5,
      z: villageCenter[2] + dz - 1.2,
      rot: index * 0.7,
    })) satisfies LandmarkPoint[],
  },
  forestEntrance: {
    logs: [
      { id: 'forest-log-a', x: -23, z: 11, rot: 0.7 },
      { id: 'forest-log-b', x: -26, z: 13, rot: 0.9 },
      { id: 'forest-log-c', x: -27, z: 19, rot: 0.6 },
      { id: 'forest-log-d', x: -36, z: 18.5, rot: 0.3 },
    ] satisfies LandmarkPoint[],
    bushes: [-37, -41, -45].map((x, index) => ({
      id: `forest-bush-${index}`,
      x,
      z: 18 + index * 3.2,
      rot: index * 0.8,
    })) satisfies LandmarkPoint[],
  },
  garden: {
    center: { id: 'garden-center', x: 52, z: -28 },
    beds: [
      { id: 'garden-bed-a', x: 49.5, z: -30.5, rot: -0.2 },
      { id: 'garden-bed-b', x: 53.2, z: -29.7, rot: -0.2 },
      { id: 'garden-bed-c', x: 52.2, z: -24.8, rot: -0.2 },
      { id: 'garden-bed-d', x: 54, z: -27.4, rot: -0.2 },
    ] satisfies LandmarkPoint[],
    picnic: { id: 'garden-picnic', x: 57, z: -29, rot: 0.45 },
    scarecrow: { id: 'garden-scarecrow', x: 46.2, z: -30.2, rot: -0.3 },
    fences: [
      { id: 'garden-fence-a', x: 47, z: -31.5, rot: Math.PI / 2 - 0.2 },
      { id: 'garden-fence-b', x: 50, z: -32, rot: Math.PI / 2 - 0.2 },
      { id: 'garden-fence-c', x: 53, z: -32.4, rot: Math.PI / 2 - 0.2 },
      { id: 'garden-fence-d', x: 56, z: -32.8, rot: Math.PI / 2 - 0.2 },
      { id: 'garden-fence-e', x: 58.5, z: -26, rot: -0.2 },
      { id: 'garden-fence-f', x: 59, z: -23, rot: -0.2 },
    ] satisfies LandmarkPoint[],
  },
  lookout: {
    center: { id: 'lookout-center', x: 18, z: 58 },
    benches: [
      { id: 'lookout-bench-a', x: 14.8, z: 58.8, rot: -0.25 },
      { id: 'lookout-bench-b', x: 21.5, z: 57.4, rot: 0.2 },
    ] satisfies LandmarkPoint[],
    shrubs: [
      { id: 'lookout-shrub-a', x: 11.5, z: 55.5, rot: 0.2 },
      { id: 'lookout-shrub-b', x: 24.5, z: 55.2, rot: 1.1 },
      { id: 'lookout-shrub-c', x: 25.8, z: 61.2, rot: 2.1 },
      { id: 'lookout-shrub-d', x: 10.8, z: 62.2, rot: 2.8 },
    ] satisfies LandmarkPoint[],
  },
  beachClub: {
    center: { id: 'beach-club-center', x: 40, z: -61 },
    umbrellas: [
      { id: 'beach-umbrella-a', x: 34.5, z: -62.5, rot: 0.2 },
      { id: 'beach-umbrella-b', x: 45.5, z: -64, rot: -0.4 },
    ] satisfies LandmarkPoint[],
    loungers: [
      { id: 'beach-lounger-a', x: 32.7, z: -60.8, rot: 0.25 },
      { id: 'beach-lounger-b', x: 36.4, z: -60.4, rot: 0.15 },
      { id: 'beach-lounger-c', x: 43.8, z: -62, rot: -0.35 },
      { id: 'beach-lounger-d', x: 47.2, z: -61.7, rot: -0.45 },
    ] satisfies LandmarkPoint[],
    volleyballPosts: [
      { id: 'beach-volleyball-a', x: 38, z: -54.8 },
      { id: 'beach-volleyball-b', x: 45, z: -55.2 },
    ] satisfies LandmarkPoint[],
    boat: { id: 'beach-boat', x: 48.5, z: -69, rot: -0.55 },
  },
  forestRuins: {
    center: { id: 'forest-ruins-center', x: -51, z: 31 },
    pillars: [
      { id: 'ruin-pillar-a', x: -55, z: 28.5, rot: -0.15 },
      { id: 'ruin-pillar-b', x: -48.5, z: 25.2, rot: 0.12 },
      { id: 'ruin-pillar-c', x: -56, z: 34.2, rot: 0.08 },
      { id: 'ruin-pillar-d', x: -46.5, z: 34.5, rot: -0.1 },
    ] satisfies LandmarkPoint[],
    stones: [
      { id: 'ruin-stone-a', x: -51, z: 25.8, rot: 0.1 },
      { id: 'ruin-stone-b', x: -57.8, z: 31.2, rot: 0.6 },
      { id: 'ruin-stone-c', x: -44.2, z: 31.5, rot: -0.5 },
      { id: 'ruin-stone-d', x: -51.5, z: 37.5, rot: 0.3 },
    ] satisfies LandmarkPoint[],
    shrubs: [
      { id: 'ruin-shrub-a', x: -58.5, z: 27.2, rot: 0.3 },
      { id: 'ruin-shrub-b', x: -43, z: 24.8, rot: 1.5 },
      { id: 'ruin-shrub-c', x: -58.2, z: 36.5, rot: 2.3 },
      { id: 'ruin-shrub-d', x: -44.8, z: 34.6, rot: 0.9 },
    ] satisfies LandmarkPoint[],
    trees: [
      { id: 'ruin-tree-a', x: -59.5, z: 25.5, rot: 0.2 },
      { id: 'ruin-tree-b', x: -54.5, z: 22.2, rot: 1.0 },
      { id: 'ruin-tree-c', x: -48, z: 22.8, rot: 2.2 },
      { id: 'ruin-tree-d', x: -61.2, z: 31.5, rot: 0.7 },
      { id: 'ruin-tree-e', x: -60, z: 38.5, rot: 1.8 },
      { id: 'ruin-tree-f', x: -54, z: 41, rot: 2.7 },
      { id: 'ruin-tree-g', x: -47, z: 40.2, rot: 0.5 },
      { id: 'ruin-tree-h', x: -41.2, z: 33.8, rot: 1.4 },
    ] satisfies LandmarkPoint[],
  },
} as const;

const LANDMARK_CLEARINGS = [
  { x: LANDMARKS.garden.center.x, z: LANDMARKS.garden.center.z, radius: 10 },
  { x: LANDMARKS.lookout.center.x, z: LANDMARKS.lookout.center.z, radius: 8 },
  { x: LANDMARKS.beachClub.center.x, z: LANDMARKS.beachClub.center.z, radius: 12 },
  { x: LANDMARKS.forestRuins.center.x, z: LANDMARKS.forestRuins.center.z, radius: 5.2 },
] as const;

export function isLandmarkClearing(x: number, z: number): boolean {
  return LANDMARK_CLEARINGS.some((area) => Math.hypot(x - area.x, z - area.z) < area.radius);
}
