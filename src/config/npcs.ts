import type { Vec3 } from '../systems/save.ts';
import { npcLayout } from './mapLayout.ts';
import type { ItemId } from './items.ts';

export type NpcId = 'mira' | 'tao' | 'lina';

export interface NpcDef {
  id: NpcId;
  name: string;
  role: string;
  color: string;
  homeColor: string;
  pos: Vec3;
  homePos: Vec3;
  hangoutPos: Vec3;
  eveningPos: Vec3;
  greetings: string[];
  likes: ItemId[];
  giftResponses: string[];
  recipeUnlock: { threshold: number; recipe: ItemId } | null;
}

const LIKES_MIRA: ItemId[] = ['flower_seed', 'bug_common'];
const LIKES_TAO: ItemId[] = ['fish_common', 'fish_rare'];
const LIKES_LINA: ItemId[] = ['wood', 'sapling'];

const giftResp = (item: string) => [
  `${item}！米拉开心地收下了，闻了闻说「好香啊」。`,
  `米拉接过${item}，眼睛亮了起来。「太谢谢了！」`,
];
const giftRespTao = (item: string) => [
  `${item}！阿陶仔细端详了一番，「这东西不错，我很喜欢。」`,
  `阿陶收下${item}，高兴地说「改天一起钓鱼啊！」`,
];
const giftRespLina = (item: string) => [
  `${item}！莉娜点点头，「正好我需要这个，谢啦。」`,
  `莉娜接过${item}，露出了满意的微笑。`,
];

export const NPCS: NpcDef[] = [
  {
    id: 'mira',
    name: '米拉',
    role: '花艺师',
    color: '#d66b8a',
    homeColor: '#f0c4d4',
    pos: npcLayout('mira').morningPos,
    homePos: npcLayout('mira').homePos,
    hangoutPos: npcLayout('mira').hangoutPos,
    eveningPos: npcLayout('mira').eveningPos,
    greetings: ['今天河边的花开得很好，记得慢慢逛。', '如果你捡到多余木材，可以试着做些家具。'],
    likes: LIKES_MIRA,
    giftResponses: giftResp('花'),
    recipeUnlock: { threshold: 30, recipe: 'recipe_stool' },
  },
  {
    id: 'tao',
    name: '阿陶',
    role: '钓鱼爱好者',
    color: '#5b8cc0',
    homeColor: '#b9d4ec',
    pos: npcLayout('tao').morningPos,
    homePos: npcLayout('tao').homePos,
    hangoutPos: npcLayout('tao').hangoutPos,
    eveningPos: npcLayout('tao').eveningPos,
    greetings: ['河流也会有好鱼，只是现在还得先把鱼种系统补起来。', '钓鱼要等鱼漂猛沉，太早拉杆就空了。'],
    likes: LIKES_TAO,
    giftResponses: giftRespTao('鱼'),
    recipeUnlock: { threshold: 30, recipe: 'recipe_table' },
  },
  {
    id: 'lina',
    name: '莉娜',
    role: '木工',
    color: '#d9a24a',
    homeColor: '#ead0a0',
    pos: npcLayout('lina').morningPos,
    homePos: npcLayout('lina').homePos,
    hangoutPos: npcLayout('lina').hangoutPos,
    eveningPos: npcLayout('lina').eveningPos,
    greetings: ['你的屋子还可以再布置得暖一点。', '以后可以给每个居民加任务和好感礼物。'],
    likes: LIKES_LINA,
    giftResponses: giftRespLina('木材'),
    recipeUnlock: { threshold: 30, recipe: 'recipe_bed' },
  },
];

export function npcById(id: NpcId): NpcDef {
  return NPCS.find((npc) => npc.id === id) ?? NPCS[0];
}

export function npcPositionAt(npc: NpcDef, minutes: number): Vec3 {
  const hour = minutes / 60;
  const homeDoor: Vec3 = [npc.homePos[0], 0, npc.homePos[2] + 3.2];
  if (hour < 7 || hour >= 21) return homeDoor;
  if (hour < 10) return routePoint([homeDoor, npc.pos, npc.hangoutPos], minutes, 7 * 60, 0.18);
  if (hour < 16) return routePoint([npc.pos, npc.hangoutPos, npc.eveningPos, npc.hangoutPos], minutes, 10 * 60, 0.24);
  if (hour < 17) return routePoint([npc.hangoutPos, npc.eveningPos], minutes, 16 * 60, 0.2);
  return routePoint([npc.eveningPos, npc.hangoutPos, homeDoor], minutes, 17 * 60, 0.22);
}

function routePoint(points: Vec3[], minutes: number, startMinutes: number, segmentMinutes: number): Vec3 {
  if (points.length === 1) return points[0];
  const progress = Math.max(0, minutes - startMinutes) / segmentMinutes;
  const fromIndex = Math.floor(progress) % points.length;
  const toIndex = (fromIndex + 1) % points.length;
  const local = progress - Math.floor(progress);
  const t = smoothstep(Math.max(0, Math.min(1, (local - 0.16) / 0.68)));
  return lerpVec(points[fromIndex], points[toIndex], t);
}

function lerpVec(a: Vec3, b: Vec3, tRaw: number): Vec3 {
  const t = Math.max(0, Math.min(1, tRaw));
  return [
    a[0] + (b[0] - a[0]) * t,
    0,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}
