import { Scene } from '../core/Scene.js';
import { VIEW_W, VIEW_H, PALETTE } from '../config/Constants.js';
import { Font } from '../ui/BitmapFont.js';
import { panel } from '../ui/NineSlice.js';
import { MenuList } from '../ui/MenuList.js';
import { Settings } from '../config/Settings.js';
import { BINDABLE, keyLabel } from '../config/Keybindings.js';
import { Input } from '../core/Input.js';
import { LANGUAGES } from '../config/locales.js';
import { t } from '../core/I18n.js';
import { Audio } from '../systems/AudioSystem.js';

/**
 * Options screen. Two modes share one scene: the option list and the key
 * rebinding list. Every change writes straight through to Settings, which
 * persists itself — there is no apply step to forget.
 */
export class SettingsScene extends Scene {
  constructor(game) {
    super(game);
    this.transparent = true;
    this.mode = 'main';
    this.menu = null;
    this.capturing = null;
  }

  enter() { this.buildMain(); }

  // --- option list --------------------------------------------------------
  buildMain() {
    this.mode = 'main';
    const bar = (value) => {
      const filled = Math.round(value * 10);
      return '#'.repeat(filled) + '-'.repeat(10 - filled);
    };
    const nudge = (key, delta) => {
      const next = Math.min(1, Math.max(0, Math.round((Settings.get(key) + delta) * 100) / 100));
      Settings.set(key, next);
      this.buildMain();
      if (key === 'sfxVolume') Audio.playSfx('ui_move');
    };
    const cycleLanguage = (dir) => {
      const index = LANGUAGES.findIndex((l) => l.code === Settings.get('language'));
      const next = (index + dir + LANGUAGES.length) % LANGUAGES.length;
      Settings.set('language', LANGUAGES[next].code);
      this.buildMain();
    };

    const items = [
      {
        label: t('settings.music'), value: bar(Settings.get('musicVolume')),
        onLeft: () => nudge('musicVolume', -0.1), onRight: () => nudge('musicVolume', 0.1),
        onSelect: () => nudge('musicVolume', 0.1),
      },
      {
        label: t('settings.sfx'), value: bar(Settings.get('sfxVolume')),
        onLeft: () => nudge('sfxVolume', -0.1), onRight: () => nudge('sfxVolume', 0.1),
        onSelect: () => nudge('sfxVolume', 0.1),
      },
      {
        label: t('settings.fullscreen'), value: Settings.get('fullscreen') ? t('common.on') : t('common.off'),
        onSelect: () => { Settings.set('fullscreen', !Settings.get('fullscreen')); this.buildMain(); },
        onLeft: () => { Settings.set('fullscreen', false); this.buildMain(); },
        onRight: () => { Settings.set('fullscreen', true); this.buildMain(); },
      },
      {
        label: t('settings.scaleMode'),
        value: t(`settings.scaleMode.${Settings.get('scaleMode')}`),
        onSelect: () => this.toggleScale(),
        onLeft: () => this.toggleScale(),
        onRight: () => this.toggleScale(),
      },
      {
        label: t('settings.textSpeed'), value: `${Settings.get('textSpeed').toFixed(1)}x`,
        onLeft: () => { Settings.set('textSpeed', Math.max(0.4, +(Settings.get('textSpeed') - 0.2).toFixed(1))); this.buildMain(); },
        onRight: () => { Settings.set('textSpeed', Math.min(3, +(Settings.get('textSpeed') + 0.2).toFixed(1))); this.buildMain(); },
      },
      {
        label: t('settings.shake'), value: Settings.get('screenShake') ? t('common.on') : t('common.off'),
        onSelect: () => { Settings.set('screenShake', !Settings.get('screenShake')); this.buildMain(); },
      },
      {
        label: t('settings.showFps'), value: Settings.get('showFps') ? t('common.on') : t('common.off'),
        onSelect: () => { Settings.set('showFps', !Settings.get('showFps')); this.buildMain(); },
      },
      {
        label: t('settings.language'), value: LANGUAGES.find((l) => l.code === Settings.get('language'))?.label,
        onSelect: () => cycleLanguage(1), onLeft: () => cycleLanguage(-1), onRight: () => cycleLanguage(1),
      },
      { label: t('settings.keybinds'), value: '>', onSelect: () => this.buildKeys() },
      { label: t('menu.back'), onSelect: () => this.game.scenes.pop() },
    ];

    const index = this.menu?.index ?? 0;
    this.menu = new MenuList(items, { spacing: 15, onCancel: () => this.game.scenes.pop() });
    this.menu.index = Math.min(index, items.length - 1);
  }

  toggleScale() {
    Settings.set('scaleMode', Settings.get('scaleMode') === 'integer' ? 'fit' : 'integer');
    this.buildMain();
  }

  // --- rebinding ----------------------------------------------------------
  buildKeys() {
    this.mode = 'keys';
    const bindings = Settings.get('keybindings');
    const items = BINDABLE.map((action) => ({
      label: action.toUpperCase(),
      value: (bindings[action] || []).map(keyLabel).slice(0, 2).join(' / ') || '--',
      onSelect: () => this.rebind(action),
    }));
    items.push({ label: t('settings.reset'), onSelect: () => { Settings.resetKeybindings(); this.buildKeys(); } });
    items.push({ label: t('menu.back'), onSelect: () => this.buildMain() });
    const index = this.menu?.index ?? 0;
    // Tighter than the main list's 13px — BINDABLE has grown past what 13px
    // rows fit in a 216px-tall view; see render()'s matching headerPad.
    this.menu = new MenuList(items, { spacing: 11, onCancel: () => this.buildMain() });
    this.menu.index = Math.min(index, items.length - 1);
  }

  rebind(action) {
    this.capturing = action;
    this.menu.enabled = false;
    Input.captureNextKey((code) => {
      const bindings = structuredClone(Settings.get('keybindings'));
      // Primary binding is replaced; a secondary one, if any, is kept.
      bindings[action] = [code, ...(bindings[action] || []).slice(1)].slice(0, 2);
      Settings.set('keybindings', bindings);
      Input.rebuild();
      this.capturing = null;
      this.buildKeys();
      this.menu.enabled = true;
    });
  }

  update(dt) { this.menu.update(dt); }

  render(renderer) {
    const ctx = renderer.ctx;
    ctx.fillStyle = 'rgba(7,9,11,0.82)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    const w = 250;
    // The keys list (BINDABLE) has more rows than the main option list, so it
    // gets thinner chrome instead of overflowing the 216px-tall view.
    const headerPad = this.mode === 'keys' ? 30 : 46;
    const h = this.menu.height + headerPad;
    const x = (VIEW_W - w) / 2;
    const y = Math.max(4, (VIEW_H - h) / 2);
    panel(ctx, x, y, w, h);
    Font.draw(ctx, this.mode === 'keys' ? t('settings.keybinds') : t('settings.title'), x + 12, y + 10, { color: PALETTE.glow });
    this.menu.render(renderer, x + 22, y + 28, { width: w - 44 });
    if (y + h + 14 <= VIEW_H) Font.draw(ctx, t('settings.hint'), VIEW_W / 2, y + h + 4, { color: PALETTE.dim, align: 'center' });

    if (this.capturing) {
      const bw = 150;
      const bx = (VIEW_W - bw) / 2;
      const by = VIEW_H / 2 - 14;
      panel(ctx, bx, by, bw, 28);
      Font.draw(ctx, t('settings.pressKey'), VIEW_W / 2, by + 9, { color: PALETTE.amber, align: 'center' });
    }
  }
}
