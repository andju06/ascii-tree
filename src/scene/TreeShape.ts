import { clamp } from "../core/math";

export interface TreeShape {
  /** Height where the foliage starts. */
  readonly y0: number;
  /** Height of the foliage tip. */
  readonly y1: number;
  readonly maxRadius: number;
  readonly trunkRadius: number;
  readonly trunkHeight: number;
  radiusAt(y: number): number;
}

export class ConeShape implements TreeShape {
  constructor(
    readonly y0 = 0.55,
    readonly y1 = 4.2,
    readonly maxRadius = 1.72,
    readonly trunkRadius = 0.14,
    readonly trunkHeight = 0.95,
    private readonly exponent = 1.08,
  ) {}

  radiusAt(y: number): number {
    const f = clamp((y - this.y0) / (this.y1 - this.y0), 0, 1);
    return 0.03 + this.maxRadius * (1 - f) ** this.exponent;
  }
}
