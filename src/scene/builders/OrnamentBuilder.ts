import { TAU } from "../../core/math";
import type { Random } from "../../core/Random";
import type { StageId } from "../../core/types";
import { Kind } from "../kinds";
import type { ParticleStore, Rgb } from "../ParticleStore";
import type { BuildContext, StageBuilder } from "../StageBuilder";
import { jitter } from "./color";

const PALETTE: readonly Rgb[] = [
  [0.92, 0.14, 0.15],
  [0.92, 0.14, 0.15],
  [1, 0.76, 0.3],
  [0.85, 0.87, 0.92],
  [0.25, 0.48, 0.85],
];

export class OrnamentBuilder implements StageBuilder {
  readonly stage: StageId = "ornaments";

  constructor(private readonly count = 46) {}

  build({ store, rng, shape, growth, startTime }: BuildContext): void {
    const span = shape.y1 - shape.y0 - 0.4;
    for (let i = 0; i < this.count; i++) {
      const f = 1 - Math.sqrt(rng.random());
      const y = shape.y0 + span * f;
      const a = rng.random() * TAU;
      const r = shape.radiusAt(y);
      this.addBall(store, rng, {
        cx: r * Math.cos(a),
        cy: y - 0.05,
        cz: r * Math.sin(a),
        radius: rng.uniform(0.08, 0.12),
        color: rng.pick(PALETTE),
        appear: startTime + growth.delay(y) + rng.random() * 0.2,
      });
    }
  }

  private addBall(
    store: ParticleStore,
    rng: Random,
    ball: { cx: number; cy: number; cz: number; radius: number; color: Rgb; appear: number },
  ): void {
    const points = Math.floor(280 * ball.radius);
    for (let k = 0; k < points; k++) {
      const nx = rng.normal(0, 1);
      const ny = rng.normal(0, 1);
      const nz = rng.normal(0, 1);
      const len = Math.hypot(nx, ny, nz) || 1;
      store.add({
        kind: Kind.Ornament,
        x: ball.cx + (nx / len) * ball.radius,
        y: ball.cy + (ny / len) * ball.radius,
        z: ball.cz + (nz / len) * ball.radius,
        color: jitter(rng, ball.color, 0.03),
        bright: rng.uniform(0.75, 1),
        appear: ball.appear,
      });
    }
  }
}
