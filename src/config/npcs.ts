import type { Vec3 } from '../systems/save.ts';
import { MAP_LAYOUT, npcLayout } from './mapLayout.ts';
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

export type NpcScheduleActivity = 'idle' | 'walk' | 'wave' | 'work' | 'rest';

export interface NpcScheduleState {
  pos: Vec3;
  activity: NpcScheduleActivity;
  lookAt: Vec3 | null;
}

const LIKES_MIRA: ItemId[] = ['flower_seed', 'bug_common', 'bug_dragonfly', 'sapling'];
const LIKES_TAO: ItemId[] = ['fish_common', 'fish_rare', 'fish_salmon', 'fish_mahi_mahi'];
const LIKES_LINA: ItemId[] = ['wood', 'sapling', 'fish_crucian', 'bug_beetle'];

const giftRespMira = [
  `{item}！米拉开心地收下了，闻了闻说「好香啊」。`,
  `米拉接过{item}，眼睛亮了起来。「太谢谢了！」`,
  `「哇，是{item}！」米拉高兴地转了个圈。`,
  `米拉小心翼翼地把{item}收好，「我会好好珍惜的！」`,
];
const giftRespTao = [
  `{item}！阿陶仔细端详了一番，「这东西不错，我很喜欢。」`,
  `阿陶收下{item}，高兴地说「改天一起钓鱼啊！」`,
  `「哦！{item}！」阿陶推了推帽子，满意地点头。`,
  `阿陶接过{item}，笑着说「你真有眼光！」`,
];
const giftRespLina = [
  `{item}！莉娜点点头，「正好我需要这个，谢啦。」`,
  `莉娜接过{item}，露出了满意的微笑。`,
  `{item}啊，做工不错。莉娜仔细看了看收进口袋。`,
  `莉娜收下{item}，轻声说「有心了，谢谢。」`,
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
    greetings: [
      '今天河边的花开得很好，记得慢慢逛。',
      '如果你捡到多余木材，可以试着做些家具。',
      '早啊！今天的阳光真舒服，适合在岛上散步。',
      '我刚在那边看到一只漂亮的蝴蝶，你有捕虫网吗？',
      '你知道吗，不同的花种在一起会特别好看。',
      '天色不早了，记得把今天捡到的东西整理一下。',
    ],
    likes: LIKES_MIRA,
    giftResponses: giftRespMira,
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
    greetings: [
      '河流也会有好鱼，只是现在还得先把鱼种系统补起来。',
      '钓鱼要等鱼漂猛沉，太早拉杆就空了。',
      '哟，今天来钓鱼吗？我推荐去桥那边试试。',
      '你听说过鬼头刀吗？那可是传说中的鱼！',
      '清晨和黄昏是最佳钓鱼时间，别睡过头了。',
      '钓上来的鱼记得拿去卖，攒够了钱可以升级工具。',
    ],
    likes: LIKES_TAO,
    giftResponses: giftRespTao,
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
    greetings: [
      '你的屋子还可以再布置得暖一点。',
      '以后可以给每个居民加任务和好感礼物。',
      '需要木材的话可以去砍树，但别砍太多哦。',
      '我刚修好了一张长凳，摆在广场那边了。',
      '家具摆放的时候注意留点走路的空间。',
      '你看这个岛的布局，我觉得还有改造的余地。',
    ],
    likes: LIKES_LINA,
    giftResponses: giftRespLina,
    recipeUnlock: { threshold: 30, recipe: 'recipe_bed' },
  },
];

export function npcById(id: NpcId): NpcDef {
  return NPCS.find((npc) => npc.id === id) ?? NPCS[0];
}

export function npcPositionAt(npc: NpcDef, minutes: number): Vec3 {
  return npcScheduleAt(npc, minutes).pos;
}

export function npcScheduleAt(npc: NpcDef, minutes: number): NpcScheduleState {
  const hour = minutes / 60;
  const homeDoor: Vec3 = [npc.homePos[0], 0, npc.homePos[2] + 3.2];
  const market = npcMarketPos(npc.id);
  const homeLookAt: Vec3 = [npc.homePos[0], 0, npc.homePos[2]];

  if (hour < 7 || hour >= 21) return { pos: homeDoor, activity: 'rest', lookAt: homeLookAt };
  if (hour < 8) return { pos: routePoint([homeDoor, npc.pos], minutes, 7 * 60, 60), activity: 'walk', lookAt: null };
  if (hour < 10) return { pos: npc.pos, activity: 'work', lookAt: npc.hangoutPos };
  if (hour < 11) return { pos: routePoint([npc.pos, npc.hangoutPos], minutes, 10 * 60, 60), activity: 'walk', lookAt: null };
  if (hour < 13) return { pos: npc.hangoutPos, activity: npc.id === 'tao' ? 'idle' : 'wave', lookAt: MAP_LAYOUT.plaza.pos };
  if (hour < 14.5) return { pos: routePoint([npc.hangoutPos, market], minutes, 13 * 60, 90), activity: 'walk', lookAt: null };
  if (hour < 16) return { pos: market, activity: 'work', lookAt: MAP_LAYOUT.plaza.pos };
  if (hour < 18) return { pos: routePoint([market, npc.eveningPos], minutes, 16 * 60, 120), activity: 'walk', lookAt: null };
  if (hour < 19) return { pos: npc.eveningPos, activity: 'wave', lookAt: MAP_LAYOUT.plaza.pos };
  return { pos: routePoint([npc.eveningPos, homeDoor], minutes, 19 * 60, 120), activity: 'walk', lookAt: homeLookAt };
}

function routePoint(points: Vec3[], minutes: number, startMinutes: number, segmentMinutes: number): Vec3 {
  if (points.length === 1) return points[0];
  const progress = Math.max(0, minutes - startMinutes) / Math.max(1, segmentMinutes);
  const fromIndex = Math.min(points.length - 2, Math.floor(progress));
  const toIndex = Math.min(points.length - 1, fromIndex + 1);
  const local = progress - Math.floor(progress);
  const t = smoothstep(Math.max(0, Math.min(1, (local - 0.16) / 0.68)));
  return lerpVec(points[fromIndex], points[toIndex], t);
}

function npcMarketPos(id: NpcId): Vec3 {
  if (id === 'mira') return [MAP_LAYOUT.plaza.pos[0] - 2.2, 0, MAP_LAYOUT.plaza.pos[2] + 8.4];
  if (id === 'tao') return [MAP_LAYOUT.plaza.pos[0] + 7.4, 0, MAP_LAYOUT.plaza.pos[2] + 6.6];
  return [MAP_LAYOUT.plaza.pos[0] + 9.4, 0, MAP_LAYOUT.plaza.pos[2] - 5.8];
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
