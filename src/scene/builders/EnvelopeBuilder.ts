import { TAU } from "../../core/math";
import type { StageId } from "../../core/types";
import { Kind } from "../kinds";
import type { Rgb } from "../ParticleStore";
import type { BuildContext, StageBuilder } from "../StageBuilder";
import { jitter } from "./color";

const OUTLINE_COLOR: Rgb = [0.35, 0.75, 0.5];

/** Sparse cone silhouette, kept slightly inside the foliage so leaves cover it later. */
export class EnvelopeBuilder implements StageBuilder {
  readonly stage: StageId = "envelope";

  constructor(private readonly count = 1400) {}

  build({ store, rng, shape, growth, startTime }: BuildContext): void {
    for (let i = 0; i < this.count; i++) {
      const y = rng.uniform(shape.y0, shape.y1);
      const a = rng.random() * TAU;
      const r = shape.radiusAt(y) * 0.9;
      store.add({
        kind: Kind.Outline,
        x: r * Math.cos(a),
        y,
        z: r * Math.sin(a),
        color: jitter(rng, OUTLINE_COLOR, 0.04),
        bright: rng.uniform(0.5, 0.7),
        appear: startTime + growth.delay(y) + rng.random() * 0.15,
      });
    }
  }
}
