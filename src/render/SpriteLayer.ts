import type { CameraView } from "./Camera";
import type { FrameBuffer } from "./FrameBuffer";
import { projectPoint } from "./projection";
import type { Overlay, Viewport } from "./Viewport";

export interface Sprite {
  /** ASCII art rows, top to bottom. */
  readonly lines: readonly string[];
  /** CSS color per row; the last entry is reused for remaining rows. */
  readonly colors: readonly string[];
  /** World position of the sprite's bottom-center. */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Font size relative to the scene font. */
  readonly scale: number;
  readonly alpha: number;
  readonly glow?: boolean;
  /** Fill drawn behind the text block, for readable labels. */
  readonly background?: string;
  /** Overrides the scene monospace font. Used for emoji marks. */
  readonly font?: string;
}

export interface SpriteSink {
  set(id: string, sprite: Sprite): void;
  remove(id: string): void;
}

const MIN_FONT_PX = 9;
const OCCLUDED_ALPHA = 0.25;

interface SpriteBounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Draws fixed ASCII art at projected world positions, dimmed when the grid has something in front. */
export class SpriteLayer implements Overlay, SpriteSink {
  private readonly sprites = new Map<string, Sprite>();
  private readonly bounds = new Map<string, SpriteBounds>();

  constructor(private readonly camera: CameraView) {}

  set(id: string, sprite: Sprite): void {
    this.sprites.set(id, sprite);
  }

  remove(id: string): void {
    this.sprites.delete(id);
  }

  clear(): void {
    this.sprites.clear();
    this.bounds.clear();
  }

  /** True when the last frame drew `id` under this CSS-pixel point, with a little extra padding. */
  contains(id: string, x: number, y: number, pad = 12): boolean {
    const box = this.bounds.get(id);
    if (!box) return false;
    return x >= box.left - pad && x <= box.right + pad && y >= box.top - pad && y <= box.bottom + pad;
  }

  render(ctx: CanvasRenderingContext2D, viewport: Viewport, frame: FrameBuffer): void {
    this.bounds.clear();
    if (this.sprites.size === 0) return;
    ctx.textBaseline = "top";

    for (const [id, sprite] of this.sprites) {
      const anchor = projectPoint(this.camera, viewport, sprite.x, sprite.y, sprite.z);
      if (!anchor) continue;

      const fontSize = Math.max(MIN_FONT_PX, viewport.fontSize * sprite.scale);
      const weight = sprite.font ? "" : "bold ";
      ctx.font = `${weight}${fontSize}px ${sprite.font ?? viewport.fontFamily}`;
      const lineH = fontSize * 1.05;
      const lineWidths = sprite.lines.map((line) => ctx.measureText(line).width);
      const blockW = Math.max(...lineWidths);
      const left = anchor.x - blockW / 2;
      const top = anchor.y - sprite.lines.length * lineH;
      this.bounds.set(id, { left, top, right: left + blockW, bottom: top + sprite.lines.length * lineH });

      const occluded = !sprite.background && this.isOccluded(frame, viewport, anchor.x, anchor.y - lineH, anchor.depth);
      ctx.globalAlpha = sprite.alpha * (occluded ? OCCLUDED_ALPHA : 1);

      if (sprite.background) {
        const pad = fontSize * 0.4;
        ctx.shadowBlur = 0;
        ctx.fillStyle = sprite.background;
        ctx.fillRect(left - pad, top - pad, blockW + pad * 2, sprite.lines.length * lineH + pad * 2);
      }
      ctx.shadowBlur = sprite.glow ? fontSize * 0.8 : 0;

      sprite.lines.forEach((line, row) => {
        const color = sprite.colors[Math.min(row, sprite.colors.length - 1)];
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.fillText(line, left, top + row * lineH);
      });
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  private isOccluded(frame: FrameBuffer, viewport: Viewport, x: number, y: number, depth: number): boolean {
    const col = Math.floor(x / viewport.cellW);
    const row = Math.floor(y / viewport.cellH);
    if (col < 0 || col >= frame.cols || row < 0 || row >= frame.rows) return false;
    return frame.depth[row * frame.cols + col] < depth - 0.4;
  }
}
