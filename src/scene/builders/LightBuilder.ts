import { TAU } from "../../core/math";
import type { StageId } from "../../core/types";
import { Kind } from "../kinds";
import type { Rgb } from "../ParticleStore";
import type { BuildContext, StageBuilder } from "../StageBuilder";

const WARM: Rgb = [1, 0.82, 0.42];
const WHITE: Rgb = [1, 0.95, 0.85];
const PALETTE: readonly Rgb[] = [WARM, WARM, WARM, WARM, WHITE, WHITE, [1, 0.32, 0.28], [0.45, 0.65, 1], [0.5, 1, 0.55]];

/** Spiral garland wound from the bottom to the tip. */
export class LightBuilder implements StageBuilder {
  readonly stage: StageId = "lights";

  constructor(
    private readonly bulbs = 260,
    private readonly turns = 7,
  ) {}

  build({ store, rng, shape, growth, startTime }: BuildContext): void {
    const span = shape.y1 - shape.y0 - 0.3;
    for (let i = 0; i < this.bulbs; i++) {
      const u = i / this.bulbs;
      const y = shape.y0 + 0.1 + u * span;
      const a = u * this.turns * TAU;
      const r = shape.radiusAt(y);
      store.add({
        kind: Kind.Light,
        x: r * Math.cos(a),
        y: y - 0.08,
        z: r * Math.sin(a),
        color: rng.pick(PALETTE),
        bright: rng.uniform(0.85, 1),
        appear: startTime + growth.delay(y),
        phase: rng.random() * TAU,
      });
    }
  }
}
