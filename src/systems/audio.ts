// 音效系统 — 纯 Web Audio API 合成，零外部文件依赖。
// 首次玩家交互时初始化（浏览器 autoplay policy）。

class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private _ready = false;

  get ready() { return this._ready; }

  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.4;
    this.master.connect(this.ctx.destination);
    this._ready = true;
    try {
      const raw = localStorage.getItem('ac-settings-v1');
      if (raw) {
        const s = JSON.parse(raw);
        const vol = (s.volume ?? 80) / 100;
        this.master.gain.value = 0.4 * vol;
      }
    } catch { /* ignore */ }
  }

  private ensure() {
    if (!this.ctx) this.init();
    return this.ctx!;
  }

  private gain(v: number, duration: number) {
    const ctx = this.ensure();
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(v, ctx.currentTime + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    g.connect(this.master!);
    return g;
  }

  private noise(duration: number, amp = 1) {
    const ctx = this.ensure();
    const sr = ctx.sampleRate;
    const len = sr * duration;
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * amp;
    return buf;
  }

  private tone(freq: number, duration: number, amp = 1) {
    const ctx = this.ensure();
    const sr = ctx.sampleRate;
    const len = sr * duration;
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.max(0, 1 - t / duration);
      d[i] = Math.sin(2 * Math.PI * freq * t) * env * amp;
    }
    return buf;
  }

  play(name: string) {
    if (!this.ready) return;
    switch (name) {
      case 'footstep': this.playFootstep(); break;
      case 'chop': this.playChop(); break;
      case 'mine': this.playMine(); break;
      case 'pickup': this.playPickup(); break;
      case 'cast': this.playCast(); break;
      case 'bite': this.playBite(); break;
      case 'reel': this.playReel(); break;
      case 'catch': this.playCatch(); break;
      case 'miss': this.playMiss(); break;
      case 'netSwing': this.playNetSwing(); break;
      case 'equip': this.playEquip(); break;
      case 'door': this.playDoor(); break;
      case 'shopBell': this.playShopBell(); break;
      case 'rainStart': this.startRain(); break;
      case 'rainStop': this.stopRain(); break;
      case 'forestAmbient': this.playForestAmbient(); break;
      case 'waveAmbient': this.playWaveAmbient(); break;
      case 'splash': this.playSplash(0.42); break;
      case 'swimStroke': this.playSplash(0.12); break;
    }
  }

  // ── 脚步声 ──
  private playFootstep() {
    const ctx = this.ensure();
    const buf = this.noise(0.05, 0.6);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = this.gain(0.15, 0.05);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 800;
    src.connect(f).connect(g);
    src.start();
  }

  private playSplash(volume: number) {
    const ctx = this.ensure();
    const src = ctx.createBufferSource();
    src.buffer = this.noise(0.24, 0.8);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1100;
    filter.Q.value = 0.7;
    const g = this.gain(volume, 0.24);
    src.connect(filter).connect(g);
    src.start();
  }

  // ── 砍树 ──
  private playChop() {
    const ctx = this.ensure();
    // 低频 thud
    const buf = this.tone(80, 0.12, 0.8);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = this.gain(0.35, 0.12);
    src.connect(g);
    src.start();
    // 叠加噪声
    setTimeout(() => {
      const n = this.noise(0.06, 0.4);
      const s = ctx.createBufferSource();
      s.buffer = n;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 2000;
      f.Q.value = 0.5;
      const gn = this.gain(0.12, 0.06);
      s.connect(f).connect(gn);
      s.start();
    }, 30);
  }

  private playMine() {
    const ctx = this.ensure();
    const buf = this.tone(150, 0.11, 0.72);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = this.gain(0.3, 0.11);
    src.connect(g);
    src.start();
    const n = this.noise(0.08, 0.45);
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = n;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800;
    const noiseGain = this.gain(0.14, 0.08);
    noiseSrc.connect(filter).connect(noiseGain);
    noiseSrc.start();
  }

  // ── 拾取 ──
  private playPickup() {
    const ctx = this.ensure();
    const sr = ctx.sampleRate;
    const dur = 0.12;
    const len = sr * dur;
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const f = 800 + t * 4000;
      const env = Math.max(0, 1 - t / dur);
      d[i] = Math.sin(2 * Math.PI * f * t) * env * 0.3;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = this.gain(0.2, dur);
    src.connect(g);
    src.start();
  }

  // ── 抛竿 —— ──
  private playCast() {
    const ctx = this.ensure();
    const buf = this.noise(0.2, 0.7);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1200;
    f.Q.value = 1.5;
    const g = this.gain(0.2, 0.2);
    src.connect(f).connect(g);
    src.start();
  }

  // ── 咬钩 ──
  private playBite() {
    const ctx = this.ensure();
    const sr = ctx.sampleRate;
    const dur = 0.1;
    const len = sr * dur;
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.max(0, 1 - t / dur);
      d[i] = (Math.sin(2 * Math.PI * 300 * t) + Math.sin(2 * Math.PI * 180 * t)) * env * 0.25;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = this.gain(0.25, dur);
    src.connect(g);
    src.start();
  }

  // ── 收线 —— 一个短促的滑轮声
  private playReel() {
    const ctx = this.ensure();
    const sr = ctx.sampleRate;
    const dur = 0.08;
    const len = sr * dur;
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const f = 600 + t * 800;
      const env = Math.max(0, 1 - t / dur);
      d[i] = Math.sin(2 * Math.PI * f * t) * env * 0.15;
      d[i] += (Math.random() * 2 - 1) * env * 0.05;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = this.gain(0.18, dur);
    src.connect(g);
    src.start();
  }

  // ── 钓到鱼 ──
  private playCatch() {
    const ctx = this.ensure();
    const sr = ctx.sampleRate;
    const dur = 0.35;
    const len = sr * dur;
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const notes = [523, 659, 784];
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const noteIdx = Math.min(Math.floor(t / (dur / notes.length)), notes.length - 1);
      const noteT = t - noteIdx * (dur / notes.length);
      const env = Math.max(0, 1 - noteT / (dur / notes.length));
      d[i] = Math.sin(2 * Math.PI * notes[noteIdx] * t) * env * 0.2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = this.gain(0.25, dur);
    src.connect(g);
    src.start();
  }

  // ── 鱼跑掉 ──
  private playMiss() {
    const ctx = this.ensure();
    const sr = ctx.sampleRate;
    const dur = 0.25;
    const len = sr * dur;
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const f = 400 - t * 600;
      const env = Math.max(0, 1 - t / dur);
      d[i] = Math.sin(2 * Math.PI * f * t) * env * 0.2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = this.gain(0.2, dur);
    src.connect(g);
    src.start();
  }

  // ── 挥网 ──
  private playNetSwing() {
    const ctx = this.ensure();
    const buf = this.noise(0.12, 0.5);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2500;
    f.Q.value = 2;
    const g = this.gain(0.15, 0.12);
    src.connect(f).connect(g);
    src.start();
  }

  // ── 装备 ──
  private playEquip() {
    const ctx = this.ensure();
    const sr = ctx.sampleRate;
    const dur = 0.06;
    const len = sr * dur;
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      d[i] = Math.sin(2 * Math.PI * 1200 * t) * Math.max(0, 1 - t / dur) * 0.15;
      d[i] += (Math.random() * 2 - 1) * Math.max(0, 1 - t / dur) * 0.08;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = this.gain(0.15, dur);
    src.connect(g);
    src.start();
  }

  // ── 开门 ──
  private playDoor() {
    const ctx = this.ensure();
    const buf = this.noise(0.25, 0.6);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 400;
    const g = this.gain(0.18, 0.25);
    src.connect(f).connect(g);
    src.start();
  }

  // ── 商店铃铛 ──
  private playShopBell() {
    const ctx = this.ensure();
    const sr = ctx.sampleRate;
    const dur = 0.3;
    const len = sr * dur;
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.max(0, Math.pow(1 - t / dur, 3));
      d[i] = Math.sin(2 * Math.PI * 880 * t) * env * 0.15 +
             Math.sin(2 * Math.PI * 1320 * t) * env * 0.1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = this.gain(0.2, dur);
    src.connect(g);
    src.start();
  }

  private playForestAmbient() {
    const ctx = this.ensure();
    [880, 1175, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.035, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
      osc.connect(gain).connect(this.master!);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  private playWaveAmbient() {
    const ctx = this.ensure();
    const src = ctx.createBufferSource();
    src.buffer = this.noise(1.5, 0.45);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 950;
    const gain = this.gain(0.055, 1.5);
    src.connect(filter).connect(gain);
    src.start();
  }

  // ── 下雨（持续环境声） ──
  private rainSource: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;

  private startRain() {
    if (this.rainSource) return;
    const ctx = this.ensure();
    const buf = this.noise(4, 1);
    this.rainSource = ctx.createBufferSource();
    this.rainSource.buffer = buf;
    this.rainSource.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 800;
    const f2 = ctx.createBiquadFilter();
    f2.type = 'lowpass';
    f2.frequency.value = 6000;
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0.08;
    this.rainSource.connect(f).connect(f2).connect(this.rainGain).connect(this.master!);
    this.rainSource.start();
  }

  private stopRain() {
    if (this.rainSource) {
      this.rainSource.stop();
      this.rainSource.disconnect();
      this.rainSource = null;
      this.rainGain = null;
    }
  }

  // ── BGM 系统 ──
  private bgmGain: GainNode | null = null;
  private bgmPlaying = false;
  private currentBGM: string | null = null;
  private bgmTimer: ReturnType<typeof setTimeout> | null = null;

  // 各场景的五声音阶（悦耳且不易不协和）
  private readonly SCALES: Record<string, number[]> = {
    day: [262, 294, 330, 392, 440, 523],    // C D E G A C5
    night: [220, 262, 294, 330, 392, 440],   // A3 C4 D4 E4 G4 A4
    rain: [247, 294, 370, 440, 523, 587],    // B D F# G C D5
    house: [262, 330, 392, 523, 659],        // C E G C5 E5
    museum: [294, 370, 440, 523, 587, 659],  // D F# G C D5 E5
  };

  private readonly BGM_VOL: Record<string, number> = {
    day: 0.05, night: 0.04, rain: 0.035, house: 0.04, museum: 0.045,
  };

  setBGM(scene: string, minutes: number, weather: string) {
    const h = (minutes / 60) % 24;
    const isNight = h < 5 || h >= 19;
    let profile: string;
    if (scene === 'house') profile = 'house';
    else if (scene === 'museum') profile = 'museum';
    else if (weather === 'rainy' || weather === 'stormy' || weather === 'snowy') profile = 'rain';
    else profile = isNight ? 'night' : 'day';
    if (profile !== this.currentBGM) {
      this.startBGM(profile);
    }
  }

  private startBGM(profile: string) {
    this.stopBGM();
    const ctx = this.ensure();
    this.currentBGM = profile;
    this.bgmGain = ctx.createGain();
    this.bgmGain.gain.value = this.BGM_VOL[profile] ?? 0.04;
    this.bgmGain.connect(this.master!);
    this.bgmPlaying = true;
    this.scheduleBGM(profile, 0);
  }

  private scheduleBGM(profile: string, offset: number) {
    if (!this.bgmPlaying || !this.bgmGain) return;
    const ctx = this.ensure();
    const scale = this.SCALES[profile] ?? this.SCALES.day;
    const tempo = profile === 'house' || profile === 'museum' ? 1.2 : profile === 'night' ? 1.0 : 0.8;
    const notesPerLoop = 6;
    const loopDur = notesPerLoop * tempo;

    // 为循环中的每个音调度播放
    for (let i = 0; i < notesPerLoop; i++) {
      const startAt = ctx.currentTime + offset + i * tempo;
      // 选取音阶中的音（非纯随机，产生有结构的旋律）
      const noteIdx = profile === 'night'
        ? [0, 2, 4, 3, 2, 1][i]
        : profile === 'rain'
          ? [1, 3, 5, 4, 3, 2][i]
          : profile === 'house'
            ? [0, 2, 4, 3, 2, 1][i]
            : profile === 'museum'
              ? [1, 3, 5, 4, 3, 3][i]
              : [0, 2, 4, 3, 2, 0][i]; // day
      const freq = scale[noteIdx % scale.length];
      const dur = tempo * 0.9;

      // 主旋律（正弦波）
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, startAt);
      env.gain.linearRampToValueAtTime(0.3, startAt + 0.05);
      env.gain.setValueAtTime(0.3, startAt + dur * 0.6);
      env.gain.exponentialRampToValueAtTime(0.001, startAt + dur);
      osc.connect(env);
      env.connect(this.bgmGain);
      osc.start(startAt);
      osc.stop(startAt + dur + 0.05);

      // 副旋律（方波，高八度，更轻）
      if (i % 2 === 0) {
        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.value = freq * 2;
        const env2 = ctx.createGain();
        env2.gain.setValueAtTime(0, startAt);
        env2.gain.linearRampToValueAtTime(0.12, startAt + 0.03);
        env2.gain.setValueAtTime(0.12, startAt + dur * 0.3);
        env2.gain.exponentialRampToValueAtTime(0.001, startAt + dur * 0.6);
        osc2.connect(env2);
        env2.connect(this.bgmGain);
        osc2.start(startAt);
        osc2.stop(startAt + dur * 0.65);
      }
    }

    // 低音 drone（根音持续）
    const root = scale[0];
    const droneOsc = ctx.createOscillator();
    droneOsc.type = 'sawtooth';
    droneOsc.frequency.value = root * 0.5;
    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.04, ctx.currentTime + offset);
    droneGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + offset + loopDur);
    droneOsc.connect(droneGain);
    droneGain.connect(this.bgmGain);
    droneOsc.start(ctx.currentTime + offset);
    droneOsc.stop(ctx.currentTime + offset + loopDur);

    // 递归调度下一循环
    this.bgmTimer = setTimeout(() => {
      this.scheduleBGM(profile, 0);
    }, (loopDur - 0.1) * 1000);
  }

  private stopBGM() {
    this.bgmPlaying = false;
    this.currentBGM = null;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
    // AudioContext 振荡器会在 stop 后自行清理
    if (this.bgmGain) {
      // 淡化退出
      try {
        this.bgmGain.gain.linearRampToValueAtTime(0, this.ensure().currentTime + 0.2);
      } catch { /* ignore */ }
      setTimeout(() => {
        this.bgmGain?.disconnect();
        this.bgmGain = null;
      }, 250);
    }
  }

  // ── 环境风/雪 ──
  private windSource: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;

  setWeatherAmbient(weather: string) {
    const ctx = this.ensure();
    // 停止之前的
    if (this.windSource) {
      try {
        this.windSource.stop();
        this.windSource.disconnect();
      } catch { /* ignore */ }
      this.windSource = null;
      this.windGain = null;
    }
    if (weather === 'clear' || weather === 'cloudy') {
      // 微风
      const buf = this.noise(6, 0.3);
      this.windSource = ctx.createBufferSource();
      this.windSource.buffer = buf;
      this.windSource.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 400;
      f.Q.value = 0.8;
      this.windGain = ctx.createGain();
      this.windGain.gain.value = 0.015;
      this.windSource.connect(f).connect(this.windGain).connect(this.master!);
      this.windSource.start();
    } else if (weather === 'rainy' || weather === 'stormy') {
      // 强风（暴雨天风更大）
      const buf = this.noise(5, 0.5);
      this.windSource = ctx.createBufferSource();
      this.windSource.buffer = buf;
      this.windSource.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = weather === 'stormy' ? 800 : 500;
      this.windGain = ctx.createGain();
      this.windGain.gain.value = weather === 'stormy' ? 0.04 : 0.025;
      this.windSource.connect(f).connect(this.windGain).connect(this.master!);
      this.windSource.start();
    } else if (weather === 'snowy') {
      // 雪：轻柔的高频噪声
      const buf = this.noise(4, 0.15);
      this.windSource = ctx.createBufferSource();
      this.windSource.buffer = buf;
      this.windSource.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 3000;
      this.windGain = ctx.createGain();
      this.windGain.gain.value = 0.01;
      this.windSource.connect(f).connect(this.windGain).connect(this.master!);
      this.windSource.start();
    }
  }
}

export const soundManager = new SoundManager();
export function initAudio() { soundManager.init(); }
