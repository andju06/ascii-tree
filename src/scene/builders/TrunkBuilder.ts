import { TAU } from "../../core/math";
import type { StageId } from "../../core/types";
import { Kind } from "../kinds";
import type { Rgb } from "../ParticleStore";
import type { BuildContext, StageBuilder } from "../StageBuilder";
import { jitter } from "./color";

const BARK_COLOR: Rgb = [0.48, 0.3, 0.16];

export class TrunkBuilder implements StageBuilder {
  readonly stage: StageId = "trunk";

  constructor(private readonly count = 1100) {}

  build({ store, rng, shape, growth, startTime }: BuildContext): void {
    for (let i = 0; i < this.count; i++) {
      const y = rng.random() * shape.trunkHeight;
      const a = rng.random() * TAU;
      const r = shape.trunkRadius * Math.sqrt(rng.random());
      store.add({
        kind: Kind.Trunk,
        x: r * Math.cos(a),
        y,
        z: r * Math.sin(a),
        color: jitter(rng, BARK_COLOR, 0.05),
        bright: rng.uniform(0.55, 0.85),
        appear: startTime + growth.delay(y) + rng.random() * 0.1,
      });
    }
  }
}
