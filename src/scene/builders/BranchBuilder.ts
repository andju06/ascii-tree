import { TAU } from "../../core/math";
import type { StageId } from "../../core/types";
import { Kind } from "../kinds";
import type { Rgb } from "../ParticleStore";
import type { BuildContext, StageBuilder } from "../StageBuilder";
import { jitter } from "./color";

const FROST_COLOR: Rgb = [0.86, 0.92, 1];

/** Layered drooping branches; layers fade in bottom-up following the growth wave. */
export class BranchBuilder implements StageBuilder {
  readonly stage: StageId = "branches";

  constructor(private readonly levels = 48) {}

  build({ store, rng, shape, growth, startTime }: BuildContext): void {
    for (let level = 0; level < this.levels; level++) {
      const f = level / (this.levels - 1);
      const y = shape.y0 + f * (shape.y1 - shape.y0 - 0.1);
      const branchCount = Math.floor(7 + 21 * (1 - f));

      for (let b = 0; b < branchCount; b++) {
        const angle = (TAU * b) / branchCount + level * 0.618 * TAU + rng.normal(0, 0.08);
        const length = shape.radiusAt(y) * rng.uniform(0.82, 1.06);
        const needles = Math.floor(8 + 70 * length);
        const dirX = Math.cos(angle);
        const dirZ = Math.sin(angle);

        for (let k = 0; k < needles; k++) {
          const s = rng.random() ** 0.85;
          const reach = s * length;
          const spread = (0.035 + 0.11 * s) * rng.normal(0, 1);
          const yy = y + 0.07 * reach - 0.22 * reach ** 2 + 0.03 * rng.normal(0, 1);
          const frosted = yy > y && rng.random() < 0.05 * s;

          store.add({
            kind: Kind.Leaf,
            x: dirX * reach - dirZ * spread,
            y: yy,
            z: dirZ * reach + dirX * spread,
            color: frosted
              ? FROST_COLOR
              : jitter(rng, [0.1 + 0.12 * s, 0.42 + 0.38 * s, 0.2 + 0.1 * s], 0.04),
            bright: 0.45 + 0.55 * s,
            appear: startTime + growth.delay(y) + s * 0.3 + rng.random() * 0.15,
          });
        }
      }
    }
  }
}
