import { TAU } from "../core/math";
import type { Random } from "../core/Random";
import type { Rgb } from "../scene/ParticleStore";
import type { TreeShape } from "../scene/TreeShape";
import type { Gift } from "./Gift";
import type { GiftPlacer, PlacedGift } from "./GiftLayout";
import { hexToRgb } from "./style";

export interface OrnamentOptions {
  /** Multiplier from stored gift size to ball diameter. */
  readonly sizeScale: number;
  /** Lowest and highest hanging height as fractions of the foliage span. */
  readonly minHeight: number;
  readonly maxHeight: number;
  /** How far the ball sits outside the foliage surface, in ball radii. */
  readonly standoff: number;
  readonly attempts: number;
  readonly riseDepth: number;
  readonly fallHeight: number;
}

const DEFAULT_OPTIONS: OrnamentOptions = {
  sizeScale: 1.55,
  minHeight: 0.08,
  maxHeight: 0.78,
  standoff: 1.1,
  attempts: 12,
  riseDepth: 0.35,
  fallHeight: 2.5,
};

const CAP_GOLD: Rgb = [1, 0.84, 0.36];

/** Hangs ornaments on the foliage surface, picking the seeded spot farthest from earlier ornaments. */
export class OrnamentPlacer implements GiftPlacer {
  private placed: PlacedGift[] = [];
  private readonly options: OrnamentOptions;

  constructor(
    private readonly shape: TreeShape,
    options: Partial<OrnamentOptions> = {},
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  place(gift: Gift, rng: Random): PlacedGift {
    const { sizeScale, minHeight, maxHeight, standoff, attempts, riseDepth, fallHeight } = this.options;
    const diameter = gift.size * sizeScale;
    const radius = diameter / 2;
    const span = this.shape.y1 - this.shape.y0;

    let best = { x: 0, y: 0, z: 0, clearance: -Infinity };
    for (let attempt = 0; attempt < attempts; attempt++) {
      const centerY = this.shape.y0 + span * rng.uniform(minHeight, maxHeight);
      const angle = rng.random() * TAU;
      const reach = this.shape.radiusAt(centerY) + radius * standoff;
      const x = reach * Math.cos(angle);
      const z = reach * Math.sin(angle);
      const clearance = this.clearance(x, centerY, z);
      if (clearance > best.clearance) best = { x, y: centerY - radius, z, clearance };
      if (clearance > diameter * 2) break;
    }

    const placed: PlacedGift = {
      gift,
      x: best.x,
      y: best.y,
      z: best.z,
      width: diameter,
      height: diameter,
      depth: diameter,
      yaw: 0,
      footprint: radius,
      body: hexToRgb(gift.color),
      accent: CAP_GOLD,
      riseDepth,
      fallHeight,
    };
    this.placed.push(placed);
    return placed;
  }

  clear(): void {
    this.placed = [];
  }

  private clearance(x: number, y: number, z: number): number {
    let nearest = Infinity;
    for (const other of this.placed) {
      const otherY = other.y + other.height / 2;
      nearest = Math.min(nearest, Math.hypot(other.x - x, otherY - y, other.z - z) - other.footprint);
    }
    return nearest;
  }
}
