import { Random } from "../core/Random";
import type { Rgb } from "../scene/ParticleStore";
import type { Gift, GiftShape } from "./Gift";

export interface PlacedGift {
  readonly gift: Gift;
  readonly x: number;
  /** Bottom of the gift. */
  readonly y: number;
  readonly z: number;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly yaw: number;
  /** Radius of the footprint used for spacing. */
  readonly footprint: number;
  readonly body: Rgb;
  /** Ribbon, bow or ornament cap color. */
  readonly accent: Rgb;
  /** Distance travelled when rising into place from below. */
  readonly riseDepth: number;
  /** Height dropped from when arriving later. */
  readonly fallHeight: number;
}

/** Positions one shape of gift; implementations keep their own spacing state. */
export interface GiftPlacer {
  place(gift: Gift, rng: Random): PlacedGift;
  clear(): void;
}

/** Deterministic per gift id, so every client builds the same arrangement. */
export class GiftLayout {
  constructor(
    private readonly seed: number,
    private readonly placers: Readonly<Record<GiftShape, GiftPlacer>>,
  ) {}

  place(gift: Gift): PlacedGift {
    return this.placers[gift.shape].place(gift, Random.derive(this.seed, gift.id));
  }

  clear(): void {
    for (const placer of Object.values(this.placers)) placer.clear();
  }
}
