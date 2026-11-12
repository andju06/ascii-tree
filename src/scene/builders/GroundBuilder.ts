import { TAU, clamp } from "../../core/math";
import type { StageId } from "../../core/types";
import { Kind } from "../kinds";
import type { Rgb } from "../ParticleStore";
import type { BuildContext, StageBuilder } from "../StageBuilder";
import { jitter } from "./color";

const GROUND_COLOR: Rgb = [0.55, 0.62, 0.78];

export class GroundBuilder implements StageBuilder {
  readonly stage: StageId = "ground";

  constructor(
    private readonly radius = 3.8,
    private readonly count = 9000,
  ) {}

  build({ store, rng, startTime }: BuildContext): void {
    for (let i = 0; i < this.count; i++) {
      const f = Math.sqrt(rng.random());
      const r = this.radius * f;
      const a = rng.random() * TAU;
      store.add({
        kind: Kind.Ground,
        x: r * Math.cos(a),
        y: 0,
        z: r * Math.sin(a),
        color: jitter(rng, GROUND_COLOR, 0.03),
        bright: clamp(0.62 - 0.32 * f + rng.normal(0, 0.06), 0.1, 1),
        appear: startTime + f * 0.8 + rng.random() * 0.15,
      });
    }
  }
}
