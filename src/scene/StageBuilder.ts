import type { Random } from "../core/Random";
import type { StageId } from "../core/types";
import type { GrowthTiming } from "./GrowthWave";
import type { ParticleStore } from "./ParticleStore";
import type { TreeShape } from "./TreeShape";

export interface BuildContext {
  readonly store: ParticleStore;
  readonly rng: Random;
  readonly shape: TreeShape;
  readonly growth: GrowthTiming;
  readonly startTime: number;
}

export interface StageBuilder {
  readonly stage: StageId;
  build(context: BuildContext): void;
}
