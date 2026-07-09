import { useMemo } from 'react';
import { useGameStore } from '../../store/useGameStore.ts';
import { getRegionObjectives } from '../../systems/regionObjectives.ts';

export function RegionTracker() {
  const clock = useGameStore((s) => s.clock);
  const social = useGameStore((s) => s.social);
  const regionProgress = useGameStore((s) => s.regionProgress);
  const volleyball = useGameStore((s) => s.volleyball);
  const objectives = useMemo(
    () => getRegionObjectives({ clock, social, regionProgress, volleyball }),
    [clock, social, regionProgress, volleyball],
  );
  const tracked = ['ruins', 'beach', 'village'].map((region) =>
    objectives.find((objective) => objective.region === region && !objective.completed)
      ?? objectives.find((objective) => objective.region === region),
  ).filter((objective) => objective !== undefined);

  return (
    <aside className="region-tracker">
      <strong>今日探索</strong>
      {tracked.map((objective) => (
        <div className={`region-track-row ${objective.completed ? 'complete' : ''}`} key={objective.id}>
          <span className="region-track-icon">{objective.completed ? '✓' : objective.icon}</span>
          <span className="region-track-main">
            <span>{objective.regionName}</span>
            <small>{objective.title}</small>
          </span>
          <b>{objective.progress}/{objective.total}</b>
        </div>
      ))}
    </aside>
  );
}
