// 工具栏：底部 4 个工具槽 + 收起按钮。
// 显示是否拥有、当前耐久、是否已装备。

import { TOOLS, type ToolId } from '../../config/items.ts';
import { useGameStore } from '../../store/useGameStore.ts';

const SLOT_ORDER: ToolId[] = ['axe', 'fishingRod', 'net', 'shovel', 'watering_can'];
const ICON: Record<ToolId, string> = {
  axe: '🪓',
  fishingRod: '🎣',
  net: '🦟',
  shovel: '🪏',
  watering_can: '🚿',
};

export function Toolbar() {
  const tools = useGameStore((s) => s.tools);
  const equipped = useGameStore((s) => s.equipped);

  return (
    <div className="toolbar">
      {SLOT_ORDER.map((id, i) => {
        const def = TOOLS[id];
        const owned = tools[id];
        const isEquipped = equipped === id;
        return (
          <div
            key={id}
            className={`tool-slot ${isEquipped ? 'equipped' : ''} ${owned ? 'owned' : 'locked'}`}
            title={def.name}
          >
            <span className="tool-key">{i + 1}</span>
            <span className="tool-icon">{ICON[id]}</span>
            <span className="tool-name">{def.name}</span>
            {owned !== undefined && owned > 0 && (
              <span className="tool-dur">耐久 {owned}</span>
            )}
            {owned === undefined && <span className="tool-dur">未拥有</span>}
          </div>
        );
      })}
      <div className={`tool-slot holster ${equipped === null ? 'equipped' : ''}`} title="收起工具 (X)">
        <span className="tool-key">X</span>
        <span className="tool-icon">✋</span>
        <span className="tool-name">赤手</span>
      </div>
    </div>
  );
}
