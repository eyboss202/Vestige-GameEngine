import { Assets } from '../core/AssetManager.js';
import { Settings } from '../config/Settings.js';

/**
 * Web Audio wrapper with three gain stages: master -> (music | sfx).
 * Volume sliders write straight into the gain nodes, and the whole graph is
 * built lazily because browsers refuse to start audio before a user gesture.
 */
class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.currentMusic = null;
    this.currentMusicKey = null;
    this.pendingMusic = null;
    this.unlocked = false;
    Settings.onChange((key) => {
      if (key === 'musicVolume' || key === 'sfxVolume' || key === 'masterVolume') this.applyVolumes();
    });
  }

  /** Safe to call as often as you like; only the first call does anything. */
  unlock() {
    if (this.unlocked) { this.ctx?.resume?.(); return; }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.musicBus = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.unlocked = true;
    this.applyVolumes();
    Assets.decodeAll(this.ctx).then(() => {
      if (this.pendingMusic) { const p = this.pendingMusic; this.pendingMusic = null; this.playMusic(p.key, p.opts); }
    });
  }

  applyVolumes() {
    if (!this.unlocked) return;
    const master = Settings.get('masterVolume');
    this.master.gain.value = master;
    this.musicBus.gain.value = Settings.get('musicVolume');
    this.sfxBus.gain.value = Settings.get('sfxVolume');
  }

  playSfx(key, { volume = 1, rate = 1, variation = 0 } = {}) {
    if (!this.unlocked) return null;
    const buffer = Assets.sound(key);
    if (!buffer) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate + (Math.random() * 2 - 1) * variation;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(this.sfxBus);
    src.start();
    return src;
  }

  /** Cross-fades to a looping track. Passing the same key twice is a no-op. */
  playMusic(key, { fade = 1.2, loop = true, volume = 1 } = {}) {
    if (!this.unlocked) { this.pendingMusic = { key, opts: { fade, loop, volume } }; this.currentMusicKey = key; return; }
    if (this.currentMusicKey === key && this.currentMusic) return;
    const buffer = Assets.sound(key);
    this.stopMusic(fade);
    this.currentMusicKey = key;
    if (!buffer) return;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = loop;
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), now + fade);
    src.connect(gain).connect(this.musicBus);
    src.start();
    this.currentMusic = { src, gain };
  }

  stopMusic(fade = 0.8) {
    if (!this.currentMusic) return;
    const { src, gain } = this.currentMusic;
    this.currentMusic = null;
    this.currentMusicKey = null;
    if (!this.unlocked) return;
    const now = this.ctx.currentTime;
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + fade);
      src.stop(now + fade + 0.05);
    } catch { /* already stopped */ }
  }
}

export const Audio = new AudioSystem();
