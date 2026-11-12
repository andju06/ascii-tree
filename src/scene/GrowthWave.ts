import { clamp } from "../core/math";

/** Maps a height to a reveal delay so every stage fills the tree bottom-up at one pace. */
export interface GrowthTiming {
  delay(y: number): number;
}

export class GrowthWave implements GrowthTiming {
  constructor(
    private readonly topHeight = 4.6,
    private readonly duration = 2.4,
  ) {}

  delay(y: number): number {
    return clamp(y / this.topHeight, 0, 1) * this.duration;
  }
}
