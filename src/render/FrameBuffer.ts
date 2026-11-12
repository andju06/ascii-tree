/** Character grid produced by the rasterizer and consumed by presenters and pickers. */
export class FrameBuffer {
  readonly depth: Float32Array;
  /** Particle index that won each cell, -1 when empty. */
  readonly owner: Int32Array;
  /** Index of the particle source the owner belongs to. */
  readonly ownerSource: Uint8Array;
  readonly glyph: Uint16Array;
  readonly color: Uint16Array;
  readonly filled: Int32Array;
  readonly glowCells: Int32Array;
  filledCount = 0;
  glowCount = 0;
  lightsLit = 0;
  lightsTotal = 0;

  constructor(
    readonly cols: number,
    readonly rows: number,
  ) {
    const size = cols * rows;
    this.depth = new Float32Array(size);
    this.owner = new Int32Array(size);
    this.ownerSource = new Uint8Array(size);
    this.glyph = new Uint16Array(size);
    this.color = new Uint16Array(size);
    this.filled = new Int32Array(size);
    this.glowCells = new Int32Array(size);
  }

  begin(): void {
    this.depth.fill(Infinity);
    this.owner.fill(-1);
    this.filledCount = 0;
    this.glowCount = 0;
    this.lightsLit = 0;
    this.lightsTotal = 0;
  }

  write(cell: number, glyph: number, color: number, glow: boolean): void {
    this.glyph[cell] = glyph;
    this.color[cell] = color;
    this.filled[this.filledCount++] = cell;
    if (glow) this.glowCells[this.glowCount++] = cell;
  }
}
