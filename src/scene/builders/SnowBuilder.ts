import { TAU } from "../../core/math";
import type { Resettable, StageId, Updatable } from "../../core/types";
import { Kind } from "../kinds";
import type { ParticleStore, Rgb } from "../ParticleStore";
import type { BuildContext, StageBuilder } from "../StageBuilder";
import { jitter } from "./color";

const SNOW_COLOR: Rgb = [0.9, 0.94, 1];

interface Pile {
  readonly x: number;
  readonly z: number;
  readonly radius: number;
  readonly height: number;
  readonly count: number;
}

const PILES: readonly Pile[] = [
  { x: 0, z: 0, radius: 1.5, height: 0.3, count: 1600 },
  { x: 1.2, z: -1.1, radius: 0.65, height: 0.28, count: 700 },
  { x: -1.6, z: 0.6, radius: 0.5, height: 0.18, count: 400 },
];

/** Snow piles around the base plus falling flakes animated every frame. */
export class SnowBuilder implements StageBuilder, Updatable, Resettable {
  readonly stage: StageId = "snow";
  private flakes: number[] = [];
  private speeds: number[] = [];
  private store: ParticleStore | null = null;

  constructor(
    private readonly flakeCount = 650,
    private readonly ceiling = 6.8,
    private readonly fieldRadius = 5,
  ) {}

  build(context: BuildContext): void {
    this.store = context.store;
    for (const pile of PILES) this.addPile(context, pile);
    this.addFlakes(context);
  }

  update(dt: number, time: number): void {
    const store = this.store;
    if (!store) return;
    for (let k = 0; k < this.flakes.length; k++) {
      const i = this.flakes[k];
      store.y[i] -= this.speeds[k] * dt;
      store.x[i] += Math.sin(time * 0.7 + store.phase[i]) * 0.08 * dt;
      if (store.y[i] < 0) store.y[i] += this.ceiling;
    }
  }

  reset(): void {
    this.flakes = [];
    this.speeds = [];
    this.store = null;
  }

  private addPile({ store, rng, startTime }: BuildContext, pile: Pile): void {
    for (let i = 0; i < pile.count; i++) {
      const f = Math.sqrt(rng.random());
      const a = rng.random() * TAU;
      const top = pile.height * (1 - f * f);
      store.add({
        kind: Kind.Snow,
        x: pile.x + pile.radius * f * Math.cos(a),
        y: top * rng.uniform(0.7, 1),
        z: pile.z + pile.radius * f * Math.sin(a),
        color: jitter(rng, SNOW_COLOR, 0.02),
        bright: 0.6 + 0.4 * (top / pile.height),
        appear: startTime + f * 1.5 + rng.random() * 0.2,
      });
    }
  }

  private addFlakes({ store, rng, startTime }: BuildContext): void {
    for (let i = 0; i < this.flakeCount; i++) {
      const r = this.fieldRadius * Math.sqrt(rng.random());
      const a = rng.random() * TAU;
      const index = store.add({
        kind: Kind.Snow,
        x: r * Math.cos(a),
        y: rng.uniform(0, this.ceiling),
        z: r * Math.sin(a),
        color: SNOW_COLOR,
        bright: rng.uniform(0.35, 0.8),
        appear: startTime + rng.random() * 2.5,
        phase: rng.random() * TAU,
      });
      if (index < 0) return;
      this.flakes.push(index);
      this.speeds.push(rng.uniform(0.25, 0.55));
    }
  }
}
