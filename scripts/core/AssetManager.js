import { Events } from './EventBus.js';

/**
 * Loads and caches images, audio buffers and JSON. Nothing else in the codebase
 * touches fetch() or `new Image()`.
 */
class AssetManager {
  constructor() {
    this.images = new Map();
    this.sounds = new Map();     // decoded AudioBuffers
    this.rawAudio = new Map();   // ArrayBuffers, decoded lazily once the context exists
    this.json = new Map();
    this.basePath = '';
  }

  image(key) {
    const img = this.images.get(key);
    if (!img) console.warn(`[Assets] missing image "${key}"`);
    return img;
  }

  sound(key) { return this.sounds.get(key); }
  data(key) { return this.json.get(key); }
  has(key) { return this.images.has(key) || this.sounds.has(key) || this.json.has(key); }

  loadImage(key, url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { this.images.set(key, img); resolve(img); };
      img.onerror = () => reject(new Error(`image "${key}" failed to load from ${url}`));
      img.src = this.basePath + url;
    });
  }

  async loadJSON(key, url) {
    const res = await fetch(this.basePath + url);
    if (!res.ok) throw new Error(`json "${key}" failed to load (${res.status})`);
    const data = await res.json();
    this.json.set(key, data);
    return data;
  }

  async loadAudio(key, url) {
    const res = await fetch(this.basePath + url);
    if (!res.ok) throw new Error(`audio "${key}" failed to load (${res.status})`);
    this.rawAudio.set(key, await res.arrayBuffer());
  }

  /** Decodes everything fetched by loadAudio. Called once the AudioContext is
   *  alive — browsers refuse to create one before the first user gesture. */
  async decodeAll(audioContext) {
    const jobs = [];
    for (const [key, buffer] of this.rawAudio) {
      if (this.sounds.has(key)) continue;
      jobs.push(
        audioContext.decodeAudioData(buffer.slice(0))
          .then((decoded) => this.sounds.set(key, decoded))
          .catch((err) => console.warn(`[Assets] could not decode "${key}"`, err))
      );
    }
    await Promise.all(jobs);
  }

  /**
   * Loads a manifest ({ images, sounds, music, maps }) and reports progress.
   * Failures are logged but never fatal: a missing placeholder should not stop
   * the rest of the game from booting.
   */
  async loadManifest(manifest, onProgress) {
    const jobs = [];
    const push = (promise, label) => jobs.push(
      promise.catch((err) => console.warn(`[Assets] ${label}`, err))
    );

    for (const [key, url] of Object.entries(manifest.images || {})) push(this.loadImage(key, url), key);
    for (const [key, url] of Object.entries(manifest.sounds || {})) push(this.loadAudio(key, url), key);
    for (const [key, url] of Object.entries(manifest.music || {})) push(this.loadAudio(key, url), key);
    for (const [key, url] of Object.entries(manifest.maps || {})) push(this.loadJSON('map:' + key, url), key);

    let done = 0;
    const total = jobs.length;
    await Promise.all(jobs.map((p) => p.then(() => {
      done++;
      onProgress?.(done / total);
      Events.emit('assets:progress', { done, total });
    })));
    Events.emit('assets:ready');
  }
}

export const Assets = new AssetManager();
