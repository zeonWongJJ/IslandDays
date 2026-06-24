import { useState } from 'react';
import { useGameStore } from '../../store/useGameStore.ts';

interface Entry { id: string; name: string; icon: string }

const FISH_ENTRIES: Entry[] = [
  { id: 'fish_common', name: '鲈鱼', icon: '🐟' },
  { id: 'fish_rare', name: '金鱼', icon: '🐠' },
  { id: 'fish_legend', name: '鲨鱼', icon: '🦈' },
];
const BUG_ENTRIES: Entry[] = [
  { id: 'bug_common', name: '蝴蝶', icon: '🦋' },
  { id: 'bug_rare', name: '萤火虫', icon: '✨' },
];

export function CollectionPanel({ onClose }: { onClose: () => void }) {
  const collection = useGameStore((s) => s.collection);
  const [tab, setTab] = useState<'fish' | 'bug'>('fish');

  const entries = tab === 'fish' ? FISH_ENTRIES : BUG_ENTRIES;
  const caught = entries.filter((e) => collection[e.id]);
  const total = entries.length;

  return (
    <div className="collection-panel">
      <div className="collection-header">
        <h2>📖 图鉴</h2>
        <button className="ui-btn collection-close" onClick={onClose}>✕</button>
      </div>
      <div className="collection-tabs">
        <button className={tab === 'fish' ? 'active' : ''} onClick={() => setTab('fish')}>
          🐟 鱼类 <span className="collection-count">{caught.length}/{total}</span>
        </button>
        <button className={tab === 'bug' ? 'active' : ''} onClick={() => setTab('bug')}>
          🦋 虫类 <span className="collection-count">{(tab === 'bug' ? BUG_ENTRIES : []).length}/{total}</span>
        </button>
      </div>
      <div className="collection-grid">
        {entries.map((e) => {
          const have = !!collection[e.id];
          return (
            <div key={e.id} className={`collection-card ${have ? 'caught' : 'missing'}`}>
              <div className="collection-icon">{have ? e.icon : '❓'}</div>
              <div className="collection-name">{have ? e.name : '???'}</div>
              {have && <div className="collection-badge">已捕获</div>}
            </div>
          );
        })}
      </div>
      <div className="collection-reward">
        {caught.length === total
          ? '🎉 全图鉴完成！奖励 5000 铃钱！'
          : `收集 ${total - caught.length} 种解锁奖励`}
      </div>
    </div>
  );
}
