import { TAU } from "../core/math";
import type { Random } from "../core/Random";
import type { Rgb } from "../scene/ParticleStore";
import type { Gift } from "./Gift";
import type { GiftPlacer, PlacedGift } from "./GiftLayout";
import { hexToRgb, luminance } from "./style";

export interface BoxPileOptions {
  /** Multiplier from stored gift size to world units. */
  readonly sizeScale: number;
  readonly innerRadius: number;
  readonly outerRadius: number;
  readonly maxStackHeight: number;
  readonly attempts: number;
  readonly riseDepth: number;
  readonly fallHeight: number;
}

const DEFAULT_OPTIONS: BoxPileOptions = {
  sizeScale: 2,
  innerRadius: 1.75,
  outerRadius: 2.8,
  maxStackHeight: 1.4,
  attempts: 10,
  riseDepth: 1.2,
  fallHeight: 3.5,
};

const RIBBON_RED: Rgb = [0.95, 0.2, 0.28];
const RIBBON_GOLD: Rgb = [1, 0.85, 0.3];
const RIBBON_WHITE: Rgb = [1, 0.98, 0.93];

/** Piles boxes around the tree skirt: each box tries a few seeded spots and lands on whatever it overlaps. */
export class BoxPilePlacer implements GiftPlacer {
  private placed: PlacedGift[] = [];
  private readonly options: BoxPileOptions;

  constructor(options: Partial<BoxPileOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  place(gift: Gift, rng: Random): PlacedGift {
    const { sizeScale, innerRadius, outerRadius, maxStackHeight, attempts, riseDepth, fallHeight } = this.options;
    const size = gift.size * sizeScale;
    const width = size;
    const depth = size * rng.uniform(0.85, 1.15);
    const height = size * rng.uniform(0.7, 1.05);
    const footprint = Math.hypot(width, depth) / 2;
    const yaw = rng.random() * TAU;

    let best = { x: 0, y: Infinity, z: 0 };
    for (let attempt = 0; attempt < attempts; attempt++) {
      const angle = rng.random() * TAU;
      const radius = innerRadius + (outerRadius - innerRadius) * rng.random() ** 1.4;
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      const y = this.supportHeight(x, z, footprint);
      if (y < best.y) best = { x, y, z };
      if (y <= maxStackHeight) break;
    }

    const body = hexToRgb(gift.color);
    const placed: PlacedGift = {
      gift,
      ...best,
      width,
      height,
      depth,
      yaw,
      footprint,
      body,
      accent: luminance(body) > 0.6 ? RIBBON_RED : rng.random() < 0.5 ? RIBBON_GOLD : RIBBON_WHITE,
      riseDepth,
      fallHeight,
    };
    this.placed.push(placed);
    return placed;
  }

  clear(): void {
    this.placed = [];
  }

  private supportHeight(x: number, z: number, footprint: number): number {
    let top = 0;
    for (const other of this.placed) {
      const reach = (footprint + other.footprint) * 0.7;
      if (Math.hypot(other.x - x, other.z - z) < reach) top = Math.max(top, other.y + other.height);
    }
    return top;
  }
}
