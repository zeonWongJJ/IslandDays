import type { Vec3 } from '../systems/save.ts';

export type AnimalId = 'mikan' | 'dodo';

export interface AnimalDef {
  id: AnimalId;
  name: string;
  kind: 'cat' | 'dog';
  color: string;
  accent: string;
  route: Vec3[];
  routeMinutes: number;
  offsetMinutes: number;
  greetings: string[];
}

export const ANIMALS: AnimalDef[] = [
  {
    id: 'mikan',
    name: '小橘',
    kind: 'cat',
    color: '#d9903d',
    accent: '#fff0d6',
    route: [
      [2, 0, 12],
      [8, 0, 20],
      [-3, 0, 22],
      [-5, 0, 13],
    ],
    routeMinutes: 48,
    offsetMinutes: 0,
    greetings: ['小橘蹭了蹭你的裤脚。', '小橘眯起眼睛，看起来很喜欢这里的阳光。'],
  },
  {
    id: 'dodo',
    name: '豆豆',
    kind: 'dog',
    color: '#c9a071',
    accent: '#f5e0bf',
    route: [
      [13, 0, 18],
      [20, 0, 13],
      [17, 0, 7],
      [9, 0, 16],
    ],
    routeMinutes: 42,
    offsetMinutes: 7,
    greetings: ['豆豆摇着尾巴围着你转了一圈。', '豆豆汪了一声，好像想带你去广场。'],
  },
];

export function animalById(id: AnimalId): AnimalDef {
  return ANIMALS.find((animal) => animal.id === id) ?? ANIMALS[0];
}

export function animalPositionAt(animal: AnimalDef, minutes: number): Vec3 {
  return routePoint(animal.route, minutes + animal.offsetMinutes, animal.routeMinutes);
}

function routePoint(points: Vec3[], minutes: number, segmentMinutes: number): Vec3 {
  const progress = minutes / segmentMinutes;
  const fromIndex = Math.floor(progress) % points.length;
  const toIndex = (fromIndex + 1) % points.length;
  const t = smoothstep(progress - Math.floor(progress));
  const a = points[fromIndex];
  const b = points[toIndex];
  return [
    a[0] + (b[0] - a[0]) * t,
    0,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}
