import { Random } from "../core/Random";
import { isResettable, isUpdatable, type Resettable, type StageId, type Updatable } from "../core/types";
import type { GrowthTiming } from "./GrowthWave";
import type { ParticleStore } from "./ParticleStore";
import type { StageBuilder } from "./StageBuilder";
import type { TreeShape } from "./TreeShape";

export class Scene implements Updatable, Resettable {
  private readonly builders = new Map<StageId, StageBuilder>();
  private readonly active = new Set<StageId>();

  constructor(
    private readonly store: ParticleStore,
    private readonly shape: TreeShape,
    private readonly growth: GrowthTiming,
    builders: readonly StageBuilder[],
    private readonly seed: number,
  ) {
    for (const builder of builders) this.builders.set(builder.stage, builder);
  }

  activate(stage: StageId, time: number): void {
    if (this.active.has(stage)) return;
    const builder = this.builders.get(stage);
    if (!builder) return;
    this.active.add(stage);
    builder.build({
      store: this.store,
      shape: this.shape,
      growth: this.growth,
      rng: Random.derive(this.seed, stage),
      startTime: time,
    });
  }

  update(dt: number, time: number): void {
    for (const stage of this.active) {
      const builder = this.builders.get(stage);
      if (builder && isUpdatable(builder)) builder.update(dt, time);
    }
  }

  reset(): void {
    this.store.clear();
    this.active.clear();
    for (const builder of this.builders.values()) {
      if (isResettable(builder)) builder.reset();
    }
  }
}
