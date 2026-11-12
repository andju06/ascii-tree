import type { FrameBuffer } from "./FrameBuffer";

export interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
  readonly fontSize: number;
  readonly fontFamily: string;
  readonly font: string;
  readonly cellW: number;
  readonly cellH: number;
  readonly cols: number;
  readonly rows: number;
}

export interface Background {
  resize(ctx: CanvasRenderingContext2D, viewport: Viewport): void;
  render(ctx: CanvasRenderingContext2D, viewport: Viewport, time: number): void;
}

/** Drawn after the character grid, e.g. sprites and labels. */
export interface Overlay {
  render(ctx: CanvasRenderingContext2D, viewport: Viewport, frame: FrameBuffer, time: number): void;
}
