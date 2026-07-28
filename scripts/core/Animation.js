import { DIR_ROW } from '../config/Constants.js';

/**
 * Frame player for grid sprite sheets. A clip is a row of the sheet plus the
 * column order to step through, so a four-direction walk cycle is four clips
 * over the same image.
 */
export class Animator {
  constructor(image, frameW, frameH) {
    this.image = image;
    this.frameW = frameW;
    this.frameH = frameH;
    this.clips = new Map();
    this.current = null;
    this.frameIndex = 0;
    this.timer = 0;
    this.finished = false;
    this.speedScale = 1;
  }

  /** @param columns e.g. [0,1,2,3] — the order of columns within `row`. */
  add(name, row, columns, fps = 8, loop = true) {
    this.clips.set(name, { row, columns, fps, loop });
    return this;
  }

  /** Registers idle_/walk_ clips for all four directions from a standard sheet. */
  addDirectional(prefix, columns, fps, loop = true) {
    for (const [dir, row] of Object.entries(DIR_ROW)) this.add(`${prefix}_${dir}`, row, columns, fps, loop);
    return this;
  }

  play(name, restart = false) {
    if (this.current === name && !restart) return;
    if (!this.clips.has(name)) { console.warn(`[Animator] unknown clip "${name}"`); return; }
    this.current = name;
    this.frameIndex = 0;
    this.timer = 0;
    this.finished = false;
  }

  update(dt) {
    const clip = this.clips.get(this.current);
    if (!clip || this.finished) return;
    this.timer += dt * this.speedScale;
    const frameTime = 1 / clip.fps;
    while (this.timer >= frameTime) {
      this.timer -= frameTime;
      this.frameIndex++;
      if (this.frameIndex >= clip.columns.length) {
        if (clip.loop) this.frameIndex = 0;
        else { this.frameIndex = clip.columns.length - 1; this.finished = true; }
      }
    }
  }

  /** Draws with (x, y) as the top-left of the frame. `dw`/`dh` optionally
   *  scale the destination size — used to render bigger/smaller variants of
   *  the same sheet (see Enemy.js `scale`) without new art. */
  draw(ctx, x, y, dw = this.frameW, dh = this.frameH) {
    const clip = this.clips.get(this.current);
    if (!clip || !this.image) return;
    ctx.drawImage(
      this.image,
      clip.columns[this.frameIndex] * this.frameW, clip.row * this.frameH, this.frameW, this.frameH,
      Math.round(x), Math.round(y), dw, dh
    );
  }
}
