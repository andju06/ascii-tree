import { TAU } from "../../core/math";
import type { Random } from "../../core/Random";
import type { Kind } from "../../scene/kinds";
import type { ParticleStore, Rgb } from "../../scene/ParticleStore";
import type { PlacedGift } from "../GiftLayout";

export interface GiftRenderOptions {
  readonly appear: number;
  readonly drop: number;
  readonly opened: boolean;
  /** Particles per square world unit of surface. */
  readonly density: number;
}

export type LocalPoint = readonly [number, number, number];

/** Writes particles in gift-local coordinates (origin at bottom center) transformed by the gift pose. */
export class GiftPainter {
  private readonly cos: number;
  private readonly sin: number;

  constructor(
    private readonly store: ParticleStore,
    readonly rng: Random,
    readonly gift: PlacedGift,
    readonly options: GiftRenderOptions,
  ) {
    this.cos = Math.cos(gift.yaw);
    this.sin = Math.sin(gift.yaw);
  }

  point([lx, ly, lz]: LocalPoint, kind: Kind, color: Rgb, bright: number): void {
    const { gift, options, rng } = this;
    this.store.add({
      kind,
      x: gift.x + lx * this.cos - lz * this.sin,
      y: gift.y + ly,
      z: gift.z + lx * this.sin + lz * this.cos,
      color,
      bright: bright * rng.uniform(0.88, 1),
      appear: options.appear,
      drop: options.drop,
      phase: rng.random() * TAU,
    });
  }

  /** Number of samples for a surface of the given area. */
  samples(area: number): number {
    return Math.ceil(area * this.options.density);
  }
}

/** Draws one gift shape through a painter. */
export type ShapePainter = (painter: GiftPainter) => void;
