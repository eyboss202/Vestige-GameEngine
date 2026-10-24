import { Assets } from '../core/AssetManager.js';

/**
 * Monospaced bitmap font renderer. The atlas holds ASCII 32..126 as white
 * glyphs on transparent; colours are produced by caching a tinted copy of the
 * whole atlas per colour, so drawing text costs one drawImage per character
 * and zero per-frame allocation.
 */
export class BitmapFont {
  constructor(imageKey, charW, charH, columns = 16, firstCode = 32) {
    this.imageKey = imageKey;
    this.charW = charW;
    this.charH = charH;
    this.columns = columns;
    this.firstCode = firstCode;
    this.tintCache = new Map();
    this.lineGap = 2;
  }

  get image() { return Assets.image(this.imageKey); }

  tinted(color) {
    if (this.tintCache.has(color)) return this.tintCache.get(color);
    const src = this.image;
    if (!src) return null;
    const canvas = document.createElement('canvas');
    canvas.width = src.width;
    canvas.height = src.height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.tintCache.set(color, canvas);
    return canvas;
  }

  charWidth() { return this.charW; }
  lineHeight() { return this.charH + this.lineGap; }
  measure(text) { return text.length * this.charW; }

  drawChar(ctx, ch, x, y, color = '#dde5e2') {
    let code = ch.charCodeAt(0);
    // The atlas is ASCII only. Fold the common accented Latin letters down to
    // their base letter rather than dropping them.
    if (code > 126) code = (FOLD[ch] || '?').charCodeAt(0);
    if (code < this.firstCode || code > 126) return;
    const atlas = this.tinted(color);
    if (!atlas) return;
    const index = code - this.firstCode;
    ctx.drawImage(
      atlas,
      (index % this.columns) * this.charW, Math.floor(index / this.columns) * this.charH,
      this.charW, this.charH,
      Math.round(x), Math.round(y), this.charW, this.charH
    );
  }

  /**
   * @param options.align 'left' | 'center' | 'right'
   * @param options.shadow draws a 1px black offset copy first
   */
  draw(ctx, text, x, y, { color = '#dde5e2', shadow = true, align = 'left', maxWidth = null } = {}) {
    const lines = maxWidth ? this.wrap(text, maxWidth) : String(text).split('\n');
    lines.forEach((line, i) => {
      const width = this.measure(line);
      let lx = x;
      if (align === 'center') lx = x - width / 2;
      else if (align === 'right') lx = x - width;
      const ly = y + i * this.lineHeight();
      for (let c = 0; c < line.length; c++) {
        const cx = lx + c * this.charW;
        if (shadow) this.drawChar(ctx, line[c], cx + 1, ly + 1, 'rgba(0,0,0,0.75)');
        this.drawChar(ctx, line[c], cx, ly, color);
      }
    });
    return lines.length * this.lineHeight();
  }

  /** Same as draw(), scaled up by an integer factor — used for titles. */
  drawScaled(ctx, text, x, y, scale, options = {}) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
    this.draw(ctx, text, 0, 0, options);
    ctx.restore();
  }

  /** Greedy word wrap, honouring explicit \n. */
  wrap(text, maxWidth) {
    const maxChars = Math.max(1, Math.floor(maxWidth / this.charW));
    const out = [];
    for (const paragraph of String(text).split('\n')) {
      let line = '';
      for (const word of paragraph.split(' ')) {
        const candidate = line ? `${line} ${word}` : word;
        if (candidate.length <= maxChars) { line = candidate; continue; }
        if (line) out.push(line);
        line = word.length > maxChars ? word.slice(0, maxChars) : word;
      }
      out.push(line);
    }
    return out;
  }
}

/** Accented characters -> nearest ASCII, so Portuguese text degrades legibly
 *  until an extended font atlas replaces the placeholder. */
const FOLD = {};
for (const [chars, base] of [
  ['\u00e0\u00e1\u00e2\u00e3\u00e4\u00e5', 'a'], ['\u00c0\u00c1\u00c2\u00c3\u00c4\u00c5', 'A'],
  ['\u00e8\u00e9\u00ea\u00eb', 'e'], ['\u00c8\u00c9\u00ca\u00cb', 'E'],
  ['\u00ec\u00ed\u00ee\u00ef', 'i'], ['\u00cc\u00cd\u00ce\u00cf', 'I'],
  ['\u00f2\u00f3\u00f4\u00f5\u00f6', 'o'], ['\u00d2\u00d3\u00d4\u00d5\u00d6', 'O'],
  ['\u00f9\u00fa\u00fb\u00fc', 'u'], ['\u00d9\u00da\u00db\u00dc', 'U'],
  ['\u00e7', 'c'], ['\u00c7', 'C'], ['\u00f1', 'n'], ['\u00d1', 'N'],
  ['\u2014\u2013', '-'], ['\u00b7\u2022', '.'], ['\u2018\u2019', "'"], ['\u201c\u201d', '"'],
]) {
  for (const ch of chars) FOLD[ch] = base;
}

export const Font = new BitmapFont('font_main', 7, 12, 16, 32);
