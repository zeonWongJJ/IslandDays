// 整个 HTML 覆盖层 UI：HUD + 工具栏 + 提示 + 背包面板 + 商店 + 帮助 + 重置。
// 渲染在 Canvas 之外，通过 zustand 读取/修改状态。

import { useEffect, useState } from 'react';
import { HUD } from './HUD.tsx';
import { Toolbar } from './Toolbar.tsx';
import { DialogueModal, InteractHint, Toasts } from './Overlays.tsx';
import { ITEMS, type ItemId, type FurnitureItemId } from '../../config/items.ts';
import { useGameStore } from '../../store/useGameStore.ts';
import { ShopUI } from '../shop/ShopUI.tsx';
import { MiniMap } from './MiniMap.tsx';
import { CollectionPanel } from './CollectionPanel.tsx';
import { SettingsPanel } from './SettingsPanel.tsx';
import { MuseumUI } from '../museum/MuseumUI.tsx';
import { NookPhone } from './NookPhone.tsx';

const INV_ORDER = Object.keys(ITEMS) as ItemId[];
const ICON: Record<ItemId, string> = {
  branch: '🌿',
  wood: '🪵',
  stone: '🪨',
  fish_common: '🐟',
  fish_crucian: '🐟',
  fish_carp: '🐟',
  fish_bluegill: '🐟',
  fish_loach: '🐟',
  fish_salmon: '🐟',
  fish_mackerel: '🐟',
  fish_rare: '🐠',
  fish_mahi_mahi: '🐠',
  fish_legend: '🦈',
  bug_common: '🦋',
  bug_cicada: '🦗',
  bug_beetle: '🐞',
  bug_dragonfly: '🪰',
  bug_moth: '🦋',
  bug_rare: '✨',
  sapling: '🌱',
  flower_seed: '🌸',
  tomato_seed: '🟠',
  carrot_seed: '🟠',
  wheat_seed: '🟡',
  tomato: '🍅',
  carrot: '🥕',
  wheat: '🌾',
  coconut: '🥥',
  driftwood: '🪵',
  apple: '🍎',
  orange: '🍊',
  peach: '🍑',
  cherry: '🍒',
  apple_sapling: '🌱',
  orange_sapling: '🌱',
  peach_sapling: '🌱',
  cherry_sapling: '🌱',
  turnip: '🥬',
  path_stone: '⬜',
  path_brick: '🟥',
  path_wood: '🟫',
  path_dirt: '🟨',
  iron_ore: '🪨',
  gold_ore: '✨',
  furniture_stool: '🪑',
  furniture_table: '🪟',
  furniture_bed: '🛏️',
  furniture_lamp: '💡',
  furniture_rug: '🟫',
  furniture_chair: '🪑',
  furniture_sofa: '🛋️',
  furniture_bookcase: '📚',
  furniture_desk: '📝',
  furniture_coffeeTable: '🟤',
  furniture_bench: '🪑',
  furniture_sideTable: '🟤',
  furniture_cabinet: '🗄️',
  furniture_lampTable: '💡',
  furniture_rugSquare: '🟫',
  recipe_stool: '📜',
  recipe_table: '📜',
  recipe_bed: '📜',
  recipe_lamp: '📜',
  recipe_rug: '📜',
  recipe_chair: '📜',
  recipe_sofa: '📜',
  recipe_bookcase: '📜',
  recipe_desk: '📜',
  recipe_coffeeTable: '📜',
  recipe_bench: '📜',
  recipe_sideTable: '📜',
  recipe_cabinet: '📜',
  recipe_lampTable: '📜',
  recipe_rugSquare: '📜',
};

export function GameUI() {
  const [showInv, setShowInv] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [showCollection, setShowCollection] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const inventory = useGameStore((s) => s.inventory);
  const resetGame = useGameStore((s) => s.resetGame);
  const setShopOpen = useGameStore((s) => s.setShopOpen);
  const shopOpen = useGameStore((s) => s.shopOpen);
  const fishing = useGameStore((s) => s.fishing);
  const scene = useGameStore((s) => s.scene);
  const placingActive = useGameStore((s) => s.placing.active);
  const startPlacing = useGameStore((s) => s.startPlacing);
  const cancelPlacing = useGameStore((s) => s.cancelPlacing);
  const closeDialogue = useGameStore((s) => s.closeDialogue);

  const FURNITURE_ITEMS: FurnitureItemId[] = [
    'furniture_stool', 'furniture_table', 'furniture_chair', 'furniture_bench',
    'furniture_sideTable', 'furniture_coffeeTable', 'furniture_lamp', 'furniture_lampTable',
    'furniture_desk', 'furniture_bookcase', 'furniture_cabinet', 'furniture_sofa',
    'furniture_rug', 'furniture_rugSquare', 'furniture_bed',
  ];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        setShowInv((v) => !v);
      }
      if (e.code === 'KeyH') setShowHelp((v) => !v);
      if (e.code === 'KeyM') setShowMap((v) => !v);
      if (e.code === 'KeyC') setShowCollection((v) => !v);
      if (e.code === 'KeyB') setShopOpen(!useGameStore.getState().shopOpen);
      if (e.code === 'KeyN') setShowPhone((v) => !v);
      if (e.code === 'Escape') {
        setShopOpen(false);
        closeDialogue();
        useGameStore.getState().setMuseumPanel(false);
      }
      if (e.code === 'Space' || e.code === 'Enter') closeDialogue();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setShopOpen, closeDialogue]);

  return (
    <div className="game-ui">
      <HUD />
      <Toolbar />
      <InteractHint />
      <Toasts />
      <DialogueModal />
      {showMap && <MiniMap />}
      {showCollection && <CollectionPanel onClose={() => setShowCollection(false)} />}

      {/* 钓鱼阶段提示（独立于通用 interactHint，更醒目） */}
      {fishing.prompt && (
        <div className={`fishing-prompt ${fishing.phase === 'hooked' ? 'urgent' : ''}`}>
          {fishing.prompt}
        </div>
      )}
      {fishing.phase === 'reeling' && (
        <div className="reeling-bar-wrap">
          <div className="reeling-bar-fill" style={{ width: `${fishing.reelingProgress * 100}%` }} />
        </div>
      )}

      {/* 右上角控制按钮 */}
      <div className="top-right-buttons">
        <button className="ui-btn" onClick={() => setShowHelp((v) => !v)}>帮助 (H)</button>
        <button className="ui-btn" onClick={() => setShowInv((v) => !v)}>背包 (Tab)</button>
        <button className="ui-btn" onClick={() => setShowMap((v) => !v)}>地图 (M)</button>
        <button className="ui-btn" onClick={() => setShowCollection((v) => !v)}>图鉴 (C)</button>
        <button className="ui-btn" onClick={() => setShowSettings((v) => !v)}>设置</button>
        <button className="ui-btn" onClick={() => setShopOpen(true)}>商店 (B)</button>
        <button
          className="ui-btn danger"
          onClick={() => {
            if (confirm('确定要重置存档吗？所有进度将丢失。')) resetGame();
          }}
        >
          重置
        </button>
      </div>

      {/* 背包面板 */}
      {showInv && !shopOpen && (
        <div className="panel inventory-panel">
          <div className="panel-title">背包</div>
          <div className="inv-grid">
            {INV_ORDER.map((id) => {
              const def = ITEMS[id];
              const count = inventory[id] ?? 0;
              return (
                <div key={id} className={`inv-cell ${count > 0 ? 'has' : 'empty'}`}>
                  <span className="inv-icon">{ICON[id]}</span>
                  <span className="inv-name">{def.name}</span>
                  <span className="inv-count">×{count}</span>
                </div>
              );
            })}
          </div>
          {/* 室内：家具摆放快捷区 */}
          {scene === 'house' && (
            <div className="place-furniture-area">
              <div className="place-title">摆放家具</div>
              <div className="place-list">
                {FURNITURE_ITEMS.map((id) => {
                  const count = inventory[id] ?? 0;
                  return (
                    <button
                      key={id}
                      className="place-btn"
                      disabled={count <= 0 || placingActive}
                      onClick={() => startPlacing(id)}
                    >
                      {ICON[id]} {ITEMS[id].name} ×{count}
                    </button>
                  );
                })}
              </div>
              <p className="place-tip">摆放中：R 旋转 · E 放置 · Q 取消。收回：按 X 走到家具旁按 E。</p>
            </div>
          )}
        </div>
      )}

      {/* 帮助面板 */}
      {showHelp && !shopOpen && (
        <div className="panel help-panel">
          <div className="panel-title">操作说明 <button className="close" onClick={() => setShowHelp(false)}>×</button></div>
          <ul>
            <li><b>WASD / 方向键</b> 移动 · <b>Shift</b> 冲刺</li>
            <li><b>鼠标拖拽</b> 旋转视角 · <b>滚轮</b> 缩放</li>
            <li><b>E</b> 交互（砍树/钓鱼/捕虫/进出门/摆放）</li>
            <li><b>1-4</b> 切换工具 · <b>X/Q</b> 收起工具 / 取消摆放</li>
            <li><b>Tab</b> 背包 · <b>M</b> 地图 · <b>B</b> 商店 · <b>H</b> 帮助</li>
          </ul>
          <p className="tip">砍树：装备斧头按 E（3次砍倒）。钓鱼：装备钓竿在水边按 E 抛竿，鱼漂猛沉时再按 E 拉杆！捕虫：装备捕虫网靠近虫按 E 挥网。建房：进屋后开背包（Tab）选家具点“摆放”，R 旋转 E 放置。卖货/买家具图纸去商店（B）。</p>
        </div>
      )}

      {/* 放置/收回模式退出按钮（常驻提示） */}
      {placingActive && (
        <button className="ui-btn placing-cancel" onClick={() => cancelPlacing()}>退出摆放/收回 (Q)</button>
      )}

      {/* 设置面板 */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {/* 商店 */}
      <ShopUI />

      {/* 博物馆捐赠面板 */}
      <MuseumPanelWrapper />

      {/* NookPhone */}
      {showPhone && <NookPhone onClose={() => setShowPhone(false)} />}
    </div>
  );
}

function MuseumPanelWrapper() {
  const museumPanel = useGameStore((s) => s.museumPanel);
  const setMuseumPanel = useGameStore((s) => s.setMuseumPanel);
  if (!museumPanel) return null;
  return (
    <div className="museum-overlay" onClick={() => setMuseumPanel(false)}>
      <div className="museum-panel" onClick={(e) => e.stopPropagation()}>
        <MuseumUI onClose={() => setMuseumPanel(false)} />
      </div>
    </div>
  );
}
