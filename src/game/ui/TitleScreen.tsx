import { useEffect, useMemo, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { SAVE } from '../../config/constants.ts';
import { useGameStore } from '../../store/useGameStore.ts';

type Phase = 'menu' | 'naming' | 'loading';

export function TitleScreen() {
  const [phase, setPhase] = useState<Phase>('menu');
  const [name, setName] = useState('岛主');
  const [confirming, setConfirming] = useState(false);
  const setBooted = useGameStore((s) => s.setBooted);
  const resetGame = useGameStore((s) => s.resetGame);
  const { active, progress } = useProgress();

  const hasSave = useMemo(() => !!localStorage.getItem(SAVE.key), []);

  const handleContinue = () => {
    if (active) {
      setPhase('loading');
    } else {
      setBooted(true);
    }
  };

  const handleNewGame = () => {
    if (hasSave) {
      setConfirming(true);
    } else {
      setPhase('naming');
    }
  };

  const handleConfirmName = () => {
    const trimmed = name.trim() || '岛主';
    resetGame(trimmed);
    if (active) {
      setPhase('loading');
    } else {
      setBooted(true);
    }
  };

  // 加载完成后自动进入游戏
  useEffect(() => {
    if (phase === 'loading' && !active) {
      const t = setTimeout(() => setBooted(true), 300);
      return () => clearTimeout(t);
    }
  }, [phase, active, setBooted]);

  // Enter 键确认命名
  useEffect(() => {
    if (phase !== 'naming') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Enter') return;
      const trimmed = name.trim() || '岛主';
      resetGame(trimmed);
      if (active) {
        setPhase('loading');
      } else {
        setBooted(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, name, active, resetGame, setBooted]);

  return (
    <div className="title-screen">
      <div className="title-bg-gradient" />
      <div className="title-content">
        {phase === 'menu' && (
          <>
            <h1 className="title-logo">岛屿生活</h1>
            <p className="title-subtitle">Island Life</p>
            <div className="title-buttons">
              {hasSave && (
                <button className="title-btn title-btn-primary" onClick={handleContinue}>
                  继续游戏
                </button>
              )}
              <button
                className="title-btn"
                onClick={handleNewGame}
              >
                {hasSave ? '新游戏' : '开始游戏'}
              </button>
            </div>
            {confirming && (
              <div className="title-confirm-overlay">
                <div className="title-confirm-box">
                  <p>开始新游戏将覆盖当前存档，确定吗？</p>
                  <div className="title-confirm-buttons">
                    <button
                      className="title-btn title-btn-danger"
                      onClick={() => {
                        setConfirming(false);
                        setPhase('naming');
                      }}
                    >
                      确定
                    </button>
                    <button className="title-btn" onClick={() => setConfirming(false)}>
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )}
            {active && (
              <div className="title-loading-mini">
                <span>加载中… {Math.round(progress)}%</span>
                <div className="title-loading-bar">
                  <div className="title-loading-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </>
        )}

        {phase === 'naming' && (
          <div className="title-naming">
            <h2>给你的角色起个名字</h2>
            <input
              className="title-name-input"
              type="text"
              value={name}
              maxLength={8}
              autoFocus
              placeholder="岛主"
              onChange={(e) => setName(e.target.value)}
            />
            <div className="title-buttons">
              <button className="title-btn title-btn-primary" onClick={handleConfirmName}>
                确认
              </button>
              <button className="title-btn" onClick={() => setPhase('menu')}>
                返回
              </button>
            </div>
          </div>
        )}

        {phase === 'loading' && (
          <div className="title-loading-full">
            <h2>正在登岛…</h2>
            <div className="title-loading-bar title-loading-bar-lg">
              <div className="title-loading-fill" style={{ width: `${progress}%` }} />
            </div>
            <span>{Math.round(progress)}%</span>
          </div>
        )}

        <div className="title-footer">
          <span>WASD 移动 · E 交互 · 鼠标拖拽视角</span>
        </div>
      </div>
    </div>
  );
}
