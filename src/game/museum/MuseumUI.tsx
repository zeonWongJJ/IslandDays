import { useGameStore } from '../../store/useGameStore.ts';
import { MUSEUM } from '../../config/constants.ts';
import { ITEMS } from '../../config/items.ts';

const ITEM_ICON: Record<string, string> = {
  fish_common: '🐟', fish_crucian: '🐟', fish_carp: '🐟',
  fish_bluegill: '🐟', fish_loach: '🐟', fish_salmon: '🐟',
  fish_mackerel: '🐟', fish_rare: '🐠', fish_mahi_mahi: '🐠', fish_legend: '🦈',
  bug_common: '🦋', bug_cicada: '🦗', bug_beetle: '🐞',
  bug_dragonfly: '🪰', bug_moth: '🦋', bug_rare: '✨',
};

const FISH_IDS = MUSEUM.donateableItems.filter((id) => id.startsWith('fish'));
const BUG_IDS = MUSEUM.donateableItems.filter((id) => id.startsWith('bug'));

function MuseumGrid({ ids }: { ids: readonly string[] }) {
  const inventory = useGameStore((s) => s.inventory);
  const donations = useGameStore((s) => s.museumDonations);
  const donateToMuseum = useGameStore((s) => s.donateToMuseum);
  return (
    <div className="museum-grid">
      {ids.map((id) => {
        const donated = !!donations[id];
        const have = (inventory[id as keyof typeof inventory] ?? 0) > 0;
        const def = ITEMS[id as keyof typeof ITEMS];
        return (
          <div key={id} className={`museum-card ${donated ? 'donated' : ''}`}>
            <div className="museum-card-icon">{donated ? ITEM_ICON[id] : '❓'}</div>
            <div className="museum-card-name">{donated ? def?.name ?? id : '???'}</div>
            <div className="museum-card-status">
              {donated ? '✅ 已捐赠' : have ? `背包有 ${inventory[id as keyof typeof inventory]} 个` : '未捕获'}
            </div>
            {!donated && have && (
              <button className="museum-donate-btn" onClick={() => donateToMuseum(id)}>
                捐赠
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MuseumUI({ onClose }: { onClose: () => void }) {
  const donations = useGameStore((s) => s.museumDonations);
  const claimed = useGameStore((s) => s.museumRewardClaimed);
  const claimMuseumReward = useGameStore((s) => s.claimMuseumReward);

  const total = MUSEUM.donateableItems.length;
  const donatedCount = MUSEUM.donateableItems.filter((id) => donations[id]).length;
  const allDonated = donatedCount === total;

  return (
    <>
      <div className="museum-header">
        <h2>🏛️ 博物馆捐赠</h2>
        <div className="museum-progress">
          已捐赠 {donatedCount}/{total}
        </div>
        <button className="ui-btn museum-close" onClick={onClose}>✕</button>
      </div>

      <div className="museum-intro">
        将捕获的鱼类和昆虫捐赠给博物馆，全收集可获得奖励！
      </div>

      {/* 鱼类区 */}
      <div className="museum-section-title">🐟 鱼类展区（{FISH_IDS.length} 种）</div>
      <MuseumGrid ids={FISH_IDS} />
      {/* 昆虫区 */}
      <div className="museum-section-title">🦋 昆虫展区（{BUG_IDS.length} 种）</div>
      <MuseumGrid ids={BUG_IDS} />

      {/* 奖励区 */}
      <div className="museum-reward-section">
        <div className="museum-section-title">🏆 全收集奖励</div>
        {allDonated ? (
          claimed ? (
            <div className="museum-reward-claimed">✅ 奖励已领取</div>
          ) : (
            <button className="museum-reward-btn" onClick={claimMuseumReward}>
              领取 {MUSEUM.completionReward} 铃钱奖励！
            </button>
          )
        ) : (
          <div className="museum-reward-locked">
            收集全部 {total} 种鱼虫即可领取奖励
            （差 {total - donatedCount} 种）
          </div>
        )}
      </div>

      <div className="museum-footer">按 E 或 Esc 关闭</div>
    </>
  );
}
