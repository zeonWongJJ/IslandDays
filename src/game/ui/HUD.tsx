// HUD：左上角显示游戏日期/时间与钱包铃钱。

import { useGameStore, formatClock } from '../../store/useGameStore.ts';

export function HUD() {
  const minutes = useGameStore((s) => s.clock.minutes);
  const bells = useGameStore((s) => s.player.bells);

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
    </div>
  );
}
