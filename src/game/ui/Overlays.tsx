import { useState } from 'react';
import { useGameStore } from '../../store/useGameStore.ts';
import type { ItemId } from '../../config/items.ts';

function toastEmoji(text: string): string {
  if (/坏了|不够|满了|没有|失败/.test(text)) return '⚠️ ';
  if (/钓到了|捕到了|卖出|购买了|合成|摆放/.test(text)) return '✅ ';
  if (/装备|收起/.test(text)) return '🔧 ';
  return '';
}

export function InteractHint() {
  const hint = useGameStore((s) => s.interactHint);
  if (!hint) return null;
  return <div className="interact-hint">{hint}</div>;
}

export function Toasts() {
  const toasts = useGameStore((s) => s.toasts);
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span>{toastEmoji(t.text)}{t.text}</span>
        </div>
      ))}
    </div>
  );
}

const GIFT_SLOTS: ItemId[] = ['flower_seed', 'fish_common', 'bug_common', 'sapling', 'wood', 'branch'];

export function DialogueModal() {
  const dialogue = useGameStore((s) => s.dialogue);
  const closeDialogue = useGameStore((s) => s.closeDialogue);
  const giftNpc = useGameStore((s) => s.giftNpc);
  const inventory = useGameStore((s) => s.inventory);
  const npcAffinity = useGameStore((s) => s.npcAffinity);
  const [showGifts, setShowGifts] = useState(false);

  if (!dialogue) return null;

  const aff = npcAffinity[dialogue.npcId] ?? 0;
  const hearts = Math.floor(aff / 20);
  const MAX_HEARTS = 5;

  const giftable = GIFT_SLOTS.filter((id) => (inventory[id] ?? 0) > 0);

  return (
    <div className="dialogue-wrap">
      <div className="dialogue-card">
        <div className="dialogue-avatar" style={{ background: dialogue.color }}>
          {dialogue.name.slice(0, 1)}
        </div>
        <div className="dialogue-body">
          <div className="dialogue-name">
            {dialogue.name}
            <span>{dialogue.role}</span>
          </div>
          <div className="dialogue-affinity">
            {'❤️'.repeat(hearts)}{'🤍'.repeat(MAX_HEARTS - hearts)}
            <span className="dialogue-aff-num">{aff}/100</span>
          </div>
          <div className="dialogue-text">{dialogue.text}</div>
          <div className="dialogue-actions">
            {!showGifts ? (
              <>
                <button className="dialogue-btn" onClick={() => setShowGifts(true)} disabled={giftable.length === 0}>
                  🎁 送礼
                </button>
                <button className="dialogue-btn dialogue-btn-secondary" onClick={closeDialogue}>离开</button>
              </>
            ) : (
              <div className="dialogue-gift-grid">
                {giftable.length === 0 ? (
                  <span className="dialogue-gift-empty">没有可送的物品</span>
                ) : (
                  giftable.map((id) => (
                    <button
                      key={id}
                      className="dialogue-gift-item"
                      onClick={() => { giftNpc(dialogue.npcId, id); setShowGifts(false); }}
                    >
                      {id === 'flower_seed' ? '🌸' : id === 'fish_common' ? '🐟' : id === 'bug_common' ? '🦋' : id === 'sapling' ? '🌱' : id === 'wood' ? '🪵' : '🪨'}
                      <span className="dialogue-gift-qty">{inventory[id]}</span>
                    </button>
                  ))
                )}
                <button className="dialogue-btn dialogue-btn-secondary" onClick={() => setShowGifts(false)}>取消</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
