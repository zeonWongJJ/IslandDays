// HUD：左上角显示游戏日期/时间、钱包铃钱与岛屿评级。

import { useMemo } from 'react';
import { useGameStore, formatClock } from '../../store/useGameStore.ts';
import { calculateIslandRating, ratingStarsText, ratingGrade } from '../../systems/islandRating.ts';

export function HUD() {
  const minutes = useGameStore((s) => s.clock.minutes);
  const bells = useGameStore((s) => s.player.bells);
  const trees = useGameStore((s) => s.trees);
  const plants = useGameStore((s) => s.plants);
  const paths = useGameStore((s) => s.paths);
  const house = useGameStore((s) => s.house);
  const museumDonations = useGameStore((s) => s.museumDonations);
  const collection = useGameStore((s) => s.collection);
  const drops = useGameStore((s) => s.drops);
  const npcAffinity = useGameStore((s) => s.npcAffinity);
  const rating = useMemo(() => {
    return calculateIslandRating({
      version: 23,
      player: { name: '', pos: [0, 0, 0], yaw: 0, bells: 0 },
      inventory: {},
      tools: {},
      equipped: null,
      trees,
      drops,
      fishSpots: [],
      bugs: [],
      house,
      scene: 'island',
      clock: { day: 0, minutes: 0 },
      npcAffinity,
      social: { daily: {} },
      weather: 'clear',
      plants,
      paths,
      rocks: [],
      collection,
      toolLevel: {},
      museumDonations,
      museumRewardClaimed: false,
      regionProgress: { collectedShells: {}, volleyballDay: null, ruinRunes: 0, ruinChestOpened: false },
      turnipMarket: null,
      swimming: false,
      quests: [],
      clothing: { hat: null, shirt: null, pants: null, shoes: null },
      npcHouseId: null,
    });
  }, [trees, plants, paths, house, museumDonations, collection, drops, npcAffinity]);

  return (
    <div className="hud hud-top-left">
      <div className="hud-row">
        <span className="hud-icon">📅</span>
        <span>真实时间 · {formatClock(minutes)}</span>
      </div>
      <div className="hud-row">
        <span className="hud-icon">🪙</span>
        <span>{bells.toLocaleString()} 铃钱</span>
      </div>
      <div className="hud-row">
        <span className="hud-icon">⭐</span>
        <span>{ratingStarsText(rating.stars)} {ratingGrade(rating.stars)}级 ({rating.score}分)</span>
      </div>
    </div>
  );
}
