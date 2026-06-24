import { useEffect, useState } from 'react';

const SETTINGS_KEY = 'ac-settings-v1';

interface Settings {
  volume: number;
  fov: number;
  sensitivity: number;
}

const defaults: Settings = { volume: 80, fov: 75, sensitivity: 1.0 };

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch { return defaults; }
}

function saveSettings(s: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  const cam = ((document.querySelector('canvas')?.parentElement as unknown as Record<string, unknown>).__r3f as Record<string, unknown>)?.camera as { fov: number } | undefined;
  if (cam) cam.fov = s.fov;
  (window as unknown as Record<string, unknown>).__settings = s;
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => { saveSettings(settings); }, [settings]);

  const set = (key: keyof Settings, value: number) =>
    setSettings((s) => ({ ...s, [key]: value }));

  return (
    <div className="panel settings-panel">
      <div className="panel-title">
        设置
        <button className="close" onClick={onClose}>✕</button>
      </div>
      <div className="settings-row">
        <label>音量</label>
        <input type="range" min="0" max="100" value={settings.volume}
          onChange={(e) => set('volume', +e.target.value)} />
        <span>{settings.volume}%</span>
      </div>
      <div className="settings-row">
        <label>视野</label>
        <input type="range" min="60" max="120" value={settings.fov}
          onChange={(e) => set('fov', +e.target.value)} />
        <span>{settings.fov}°</span>
      </div>
      <div className="settings-row">
        <label>灵敏度</label>
        <input type="range" min="0.5" max="2.0" step="0.1" value={settings.sensitivity}
          onChange={(e) => set('sensitivity', +e.target.value)} />
        <span>{settings.sensitivity.toFixed(1)}</span>
      </div>
    </div>
  );
}
