import { Assets } from '../core/AssetManager.js';

/**
 * Draws a resizable panel from a 9-slice image: corners stay crisp, edges and
 * centre stretch. Every framed box in the UI goes through this.
 */
export function nineSlice(ctx, imageKey, x, y, w, h, corner = 8) {
  const img = Assets.image(imageKey);
  if (!img) return;
  const c = corner;
  const sw = img.width;
  const sh = img.height;
  const mw = sw - c * 2;
  const mh = sh - c * 2;
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const innerW = Math.max(0, w - c * 2);
  const innerH = Math.max(0, h - c * 2);

  // corners
  ctx.drawImage(img, 0, 0, c, c, x, y, c, c);
  ctx.drawImage(img, sw - c, 0, c, c, x + w - c, y, c, c);
  ctx.drawImage(img, 0, sh - c, c, c, x, y + h - c, c, c);
  ctx.drawImage(img, sw - c, sh - c, c, c, x + w - c, y + h - c, c, c);
  // edges
  if (innerW > 0) {
    ctx.drawImage(img, c, 0, mw, c, x + c, y, innerW, c);
    ctx.drawImage(img, c, sh - c, mw, c, x + c, y + h - c, innerW, c);
  }
  if (innerH > 0) {
    ctx.drawImage(img, 0, c, c, mh, x, y + c, c, innerH);
    ctx.drawImage(img, sw - c, c, c, mh, x + w - c, y + c, c, innerH);
  }
  // centre
  if (innerW > 0 && innerH > 0) ctx.drawImage(img, c, c, mw, mh, x + c, y + c, innerW, innerH);
}

export function panel(ctx, x, y, w, h) { nineSlice(ctx, 'ui_panel', x, y, w, h, 8); }
