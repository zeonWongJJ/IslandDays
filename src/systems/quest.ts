// NPC 委托任务系统
// 每个 NPC 每天给一个任务，完成后获得奖励

import type { ItemId } from '../config/items.ts';
import type { NpcId } from '../config/npcs.ts';

export type QuestType = 'fish' | 'bug' | 'gather' | 'deliver';

export interface Quest {
  id: string;
  npcId: NpcId;
  type: QuestType;
  /** 需要收集/完成的目标 */
  target: ItemId;
  /** 需要数量 */
  required: number;
  /** 当前进度 */
  progress: number;
  /** 奖励铃钱 */
  rewardBells: number;
  /** 奖励物品 */
  rewardItem?: ItemId;
  /** 是否已完成 */
  completed: boolean;
  /** 是否已接受 */
  accepted: boolean;
  /** 是否已领取奖励 */
  claimed: boolean;
  /** 任务生成日期 */
  day: number;
}

export interface QuestDef {
  type: QuestType;
  target: ItemId;
  required: number;
  rewardBells: number;
  rewardItem?: ItemId;
  weight: number; // 出现权重
}

// 任务定义表
const QUEST_DEFS: QuestDef[] = [
  // 钓鱼任务
  { type: 'fish', target: 'fish_common', required: 3, rewardBells: 300, weight: 10 },
  { type: 'fish', target: 'fish_crucian', required: 2, rewardBells: 250, weight: 8 },
  { type: 'fish', target: 'fish_carp', required: 2, rewardBells: 350, weight: 6 },
  { type: 'fish', target: 'fish_salmon', required: 1, rewardBells: 600, weight: 3 },
  { type: 'fish', target: 'fish_rare', required: 1, rewardBells: 800, weight: 2 },
  // 捕虫任务
  { type: 'bug', target: 'bug_common', required: 3, rewardBells: 250, weight: 10 },
  { type: 'bug', target: 'bug_cicada', required: 2, rewardBells: 200, weight: 8 },
  { type: 'bug', target: 'bug_beetle', required: 2, rewardBells: 300, weight: 6 },
  { type: 'bug', target: 'bug_dragonfly', required: 1, rewardBells: 400, weight: 3 },
  // 采集任务
  { type: 'gather', target: 'apple', required: 5, rewardBells: 400, weight: 8 },
  { type: 'gather', target: 'orange', required: 5, rewardBells: 400, weight: 8 },
  { type: 'gather', target: 'peach', required: 4, rewardBells: 450, weight: 6 },
  { type: 'gather', target: 'cherry', required: 3, rewardBells: 500, weight: 4 },
  { type: 'gather', target: 'wood', required: 10, rewardBells: 350, weight: 7 },
  { type: 'gather', target: 'stone', required: 5, rewardBells: 300, weight: 6 },
  { type: 'gather', target: 'shell', required: 3, rewardBells: 250, weight: 5 },
];

// 为 NPC 生成每日任务
export function generateDailyQuest(npcId: NpcId, day: number): Quest {
  // 根据权重随机选择任务
  const totalWeight = QUEST_DEFS.reduce((sum, q) => sum + q.weight, 0);
  let roll = seededRandom(day + npcId.charCodeAt(0)) * totalWeight;
  let selected = QUEST_DEFS[0];
  for (const q of QUEST_DEFS) {
    roll -= q.weight;
    if (roll <= 0) {
      selected = q;
      break;
    }
  }

  return {
    id: `quest-${npcId}-${day}`,
    npcId,
    type: selected.type,
    target: selected.target,
    required: selected.required,
    progress: 0,
    rewardBells: selected.rewardBells,
    rewardItem: selected.rewardItem,
    accepted: false,
    completed: false,
    claimed: false,
    day,
  };
}

// 简单的种子随机数
function seededRandom(seed: number): number {
  let s = seed >>> 0 || 1;
  s ^= s << 13;
  s ^= s >>> 17;
  s ^= s << 5;
  return ((s >>> 0) % 1_000_000) / 1_000_000;
}

// 检查任务进度
export function updateQuestProgress(quest: Quest, itemId: ItemId, amount: number): Quest {
  if (quest.target !== itemId || quest.completed) return quest;
  const newProgress = Math.min(quest.progress + amount, quest.required);
  return {
    ...quest,
    progress: newProgress,
    completed: newProgress >= quest.required,
  };
}

// 获取任务描述
export function getQuestDescription(quest: Quest): string {
  const itemName = getQuestItemName(quest.target);
  const typeText = quest.type === 'fish' ? '钓' : quest.type === 'bug' ? '捕' : '收集';
  return `${typeText}${itemName} ×${quest.required}`;
}

// 获取任务目标物品名称
export function getQuestItemName(itemId: ItemId): string {
  const names: Record<string, string> = {
    fish_common: '鲈鱼',
    fish_crucian: '鲫鱼',
    fish_carp: '鲤鱼',
    fish_salmon: '鲑鱼',
    fish_rare: '金鱼',
    bug_common: '蝴蝶',
    bug_cicada: '蝉',
    bug_beetle: '独角仙',
    bug_dragonfly: '蜻蜓',
    apple: '苹果',
    orange: '橙子',
    peach: '桃子',
    cherry: '樱桃',
    wood: '木材',
    stone: '石头',
    shell: '贝壳',
  };
  return names[itemId] ?? itemId;
}

// 获取任务类型图标
export function getQuestTypeIcon(type: QuestType): string {
  switch (type) {
    case 'fish': return '🎣';
    case 'bug': return '🦋';
    case 'gather': return '📦';
    case 'deliver': return '📮';
  }
}
