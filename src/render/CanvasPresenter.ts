import { clamp } from "../core/math";
import type { FrameBuffer } from "./FrameBuffer";
import { COLOR_COUNT, COLOR_STRINGS, GLYPHS } from "./palette";
import type { Background, Overlay, Viewport } from "./Viewport";

export class CanvasPresenter {
  private readonly ctx: CanvasRenderingContext2D;
  private viewport: Viewport | null = null;
  private readonly bucketHead = new Int32Array(COLOR_COUNT);
  private bucketNext = new Int32Array(0);

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly background: Background,
    private readonly fontFamily: string,
    private readonly overlays: readonly Overlay[] = [],
  ) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D context is not available");
    this.ctx = ctx;
  }

  /** Syncs the canvas backing store with its CSS size and returns the character grid layout. */
  measure(): Viewport {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    const current = this.viewport;
    if (current && current.width === width && current.height === height && current.dpr === dpr) {
      return current;
    }

    this.canvas.width = Math.max(1, Math.round(width * dpr));
    this.canvas.height = Math.max(1, Math.round(height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const fontSize = clamp(Math.round(height / 100), 5, 9);
    const font = `${fontSize}px ${this.fontFamily}`;
    this.ctx.font = font;
    const cellW = this.ctx.measureText("M").width;
    const cellH = Math.round(fontSize * 1.12);

    const viewport: Viewport = {
      width,
      height,
      dpr,
      fontSize,
      fontFamily: this.fontFamily,
      font,
      cellW,
      cellH,
      cols: Math.max(1, Math.floor(width / cellW)),
      rows: Math.max(1, Math.floor(height / cellH)),
    };
    this.viewport = viewport;
    this.background.resize(this.ctx, viewport);
    return viewport;
  }

  draw(fb: FrameBuffer, time: number): void {
    const viewport = this.viewport ?? this.measure();
    this.background.render(this.ctx, viewport, time);
    this.ctx.font = viewport.font;
    this.ctx.textBaseline = "top";
    this.drawCells(fb, viewport);
    this.drawGlow(fb, viewport);
    for (const overlay of this.overlays) {
      this.ctx.save();
      overlay.render(this.ctx, viewport, fb, time);
      this.ctx.restore();
    }
  }

  /** Groups cells by color so fillStyle changes once per color instead of once per cell. */
  private drawCells(fb: FrameBuffer, viewport: Viewport): void {
    const { ctx, bucketHead } = this;
    if (this.bucketNext.length < fb.filled.length) this.bucketNext = new Int32Array(fb.filled.length);
    const next = this.bucketNext;
    bucketHead.fill(-1);

    for (let k = 0; k < fb.filledCount; k++) {
      const key = fb.color[fb.filled[k]];
      next[k] = bucketHead[key];
      bucketHead[key] = k;
    }

    for (let key = 0; key < COLOR_COUNT; key++) {
      let k = bucketHead[key];
      if (k < 0) continue;
      ctx.fillStyle = COLOR_STRINGS[key];
      while (k >= 0) {
        this.fillCell(fb, fb.filled[k], viewport);
        k = next[k];
      }
    }
  }

  private drawGlow(fb: FrameBuffer, viewport: Viewport): void {
    if (fb.glowCount === 0) return;
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowBlur = viewport.cellW * 2.6;
    for (let k = 0; k < fb.glowCount; k++) {
      const cell = fb.glowCells[k];
      const color = COLOR_STRINGS[fb.color[cell]];
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      this.fillCell(fb, cell, viewport);
    }
    ctx.restore();
  }

  private fillCell(fb: FrameBuffer, cell: number, viewport: Viewport): void {
    const col = cell % fb.cols;
    const row = (cell - col) / fb.cols;
    this.ctx.fillText(GLYPHS[fb.glyph[cell]], col * viewport.cellW, row * viewport.cellH);
  }
}
