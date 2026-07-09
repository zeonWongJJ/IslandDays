import { useState } from 'react';
import { useGameStore } from '../../store/useGameStore.ts';
import { formatClock } from '../../store/useGameStore.ts';
import { CollectionPanel } from './CollectionPanel.tsx';
import { SettingsPanel } from './SettingsPanel.tsx';
import { currentEvent } from '../../config/events.ts';
import { npcById } from '../../config/npcs.ts';
import { getQuestDescription, getQuestTypeIcon } from '../../systems/quest.ts';
import { getRegionObjectives } from '../../systems/regionObjectives.ts';

type AppId = 'home' | 'map' | 'collection' | 'quests' | 'settings' | 'help';

interface AppDef {
  id: AppId;
  icon: string;
  label: string;
}

const APPS: AppDef[] = [
  { id: 'map', icon: '🗺️', label: '地图' },
  { id: 'collection', icon: '📖', label: '图鉴' },
  { id: 'quests', icon: '📋', label: '委托' },
  { id: 'settings', icon: '⚙️', label: '设置' },
  { id: 'help', icon: '❓', label: '帮助' },
];

export function NookPhone({ onClose }: { onClose: () => void }) {
  const [app, setApp] = useState<AppId>('home');
  const clock = useGameStore((s) => s.clock);
  const bells = useGameStore((s) => s.player.bells);
  const scene = useGameStore((s) => s.scene);
  const quests = useGameStore((s) => s.quests);
  const social = useGameStore((s) => s.social);
  const regionProgress = useGameStore((s) => s.regionProgress);
  const volleyball = useGameStore((s) => s.volleyball);
  const acceptQuest = useGameStore((s) => s.acceptQuest);
  const claimQuestReward = useGameStore((s) => s.claimQuestReward);
  const ev = currentEvent(clock.day);
  const regionObjectives = getRegionObjectives({ clock, social, regionProgress, volleyball });

  const timeStr = formatClock(clock.minutes);
  const dayStr = `第 ${clock.day} 天`;

  return (
    <div className="nookphone-overlay" onClick={onClose}>
      <div className="nookphone-frame" onClick={(e) => e.stopPropagation()}>
        {/* 状态栏 */}
        <div className="nookphone-status">
          <span className="nookphone-time">{timeStr}</span>
          <span className="nookphone-day">{dayStr}</span>
          <span className="nookphone-bells">🪙 {bells}</span>
        </div>

        {/* 内容区 */}
        <div className="nookphone-content">
          {app === 'home' && (
            <div className="nookphone-home">
              <div className="nookphone-greeting">
                {ev ? `🎉 ${ev.name}` : scene === 'house' ? '🏠 在家' : scene === 'museum' ? '🏛️ 博物馆' : '🏝️ 岛上'}
              </div>
              <div className="nookphone-app-grid">
                {APPS.map((a) => (
                  <button key={a.id} className="nookphone-app-btn" onClick={() => setApp(a.id)}>
                    <span className="nookphone-app-icon">{a.icon}</span>
                    <span className="nookphone-app-label">{a.label}</span>
                  </button>
                ))}
              </div>
              <div className="nookphone-tip">按 N 或 Esc 关闭</div>
            </div>
          )}
          {app === 'collection' && (
            <div className="nookphone-app-page">
              <div className="nookphone-app-header">
                <button className="nookphone-back" onClick={() => setApp('home')}>← 返回</button>
                <span>📖 图鉴</span>
              </div>
              <CollectionPanel onClose={() => setApp('home')} />
            </div>
          )}
          {app === 'settings' && (
            <div className="nookphone-app-page">
              <div className="nookphone-app-header">
                <button className="nookphone-back" onClick={() => setApp('home')}>← 返回</button>
                <span>⚙️ 设置</span>
              </div>
              <SettingsPanel onClose={() => setApp('home')} />
            </div>
          )}
          {app === 'quests' && (
            <div className="nookphone-app-page">
              <div className="nookphone-app-header">
                <button className="nookphone-back" onClick={() => setApp('home')}>← 返回</button>
                <span>📋 今日委托</span>
              </div>
              <div className="quest-list">
                <div className="region-objective-heading">区域探索</div>
                {regionObjectives.map((objective) => (
                  <div className={`region-objective-row ${objective.completed ? 'complete' : ''}`} key={objective.id}>
                    <span className="region-objective-icon">{objective.completed ? '✓' : objective.icon}</span>
                    <span className="quest-main">
                      <strong>{objective.regionName} · {objective.title}</strong>
                      <span>{objective.detail}</span>
                      <small>{objective.progress}/{objective.total}</small>
                    </span>
                  </div>
                ))}
                <div className="region-objective-heading">居民委托</div>
                {quests.map((quest) => {
                  const npc = npcById(quest.npcId);
                  const actionLabel = quest.claimed
                    ? '已领取'
                    : quest.completed
                      ? '领取奖励'
                      : quest.accepted
                        ? `${quest.progress}/${quest.required}`
                        : '接受';
                  return (
                    <div className="quest-row" key={quest.id}>
                      <div className="quest-main">
                        <strong>{getQuestTypeIcon(quest.type)} {npc.name}的委托</strong>
                        <span>{getQuestDescription(quest)}</span>
                        <small>奖励：{quest.rewardBells} 铃钱</small>
                      </div>
                      <button
                        disabled={quest.claimed || (quest.accepted && !quest.completed)}
                        onClick={() => quest.completed ? claimQuestReward(quest.id) : acceptQuest(quest.id)}
                      >
                        {actionLabel}
                      </button>
                    </div>
                  );
                })}
                {quests.length === 0 && <div className="nookphone-map-hint">正在获取今日委托…</div>}
              </div>
            </div>
          )}
          {app === 'help' && (
            <div className="nookphone-app-page">
              <div className="nookphone-app-header">
                <button className="nookphone-back" onClick={() => setApp('home')}>← 返回</button>
                <span>❓ 帮助</span>
              </div>
              <div className="nookphone-help">
                <ul>
                  <li><b>WASD</b> 移动 · <b>Shift</b> 冲刺</li>
                  <li><b>E</b> 交互 · <b>1-4</b> 切工具</li>
                  <li><b>Tab</b> 背包 · <b>N</b> 手机 · <b>B</b> 商店</li>
                  <li><b>X</b> 收起工具 / 收家具</li>
                  <li><b>C</b> 图鉴 · <b>M</b> 地图</li>
                </ul>
              </div>
            </div>
          )}
          {app === 'map' && (
            <div className="nookphone-app-page">
              <div className="nookphone-app-header">
                <button className="nookphone-back" onClick={() => setApp('home')}>← 返回</button>
                <span>🗺️ 地图</span>
              </div>
              <div className="nookphone-map-hint">按 M 打开大地图</div>
            </div>
          )}
        </div>

        {/* 底部 Home 指示条 */}
        {app !== 'home' && (
          <div className="nookphone-home-indicator" onClick={() => setApp('home')} />
        )}
      </div>
    </div>
  );
}
