import type { FrameBuffer } from "../render/FrameBuffer";
import type { Viewport } from "../render/Viewport";

export interface PickHit {
  readonly source: number;
  readonly index: number;
}

/** Maps a screen point to the particle drawn there, searching nearby cells for small targets. */
export class Picker {
  constructor(private readonly radius = 2) {}

  pick(
    fb: FrameBuffer,
    viewport: Viewport,
    x: number,
    y: number,
    accept: (hit: PickHit) => boolean,
  ): PickHit | null {
    const col = Math.floor(x / viewport.cellW);
    const row = Math.floor(y / viewport.cellH);
    let best: PickHit | null = null;
    let bestDistance = Infinity;

    for (let dr = -this.radius; dr <= this.radius; dr++) {
      for (let dc = -this.radius; dc <= this.radius; dc++) {
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || r >= fb.rows || c < 0 || c >= fb.cols) continue;
        const cell = r * fb.cols + c;
        const index = fb.owner[cell];
        if (index < 0) continue;
        const hit: PickHit = { source: fb.ownerSource[cell], index };
        const distance = dr * dr + dc * dc;
        if (distance < bestDistance && accept(hit)) {
          best = hit;
          bestDistance = distance;
        }
      }
    }
    return best;
  }
}
