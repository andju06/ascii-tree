import { clamp } from "../../core/math";
import type { Random } from "../../core/Random";
import type { Rgb } from "../ParticleStore";

export function jitter(rng: Random, base: Rgb, amount: number): Rgb {
  return [
    clamp(base[0] + rng.normal(0, amount), 0, 1),
    clamp(base[1] + rng.normal(0, amount), 0, 1),
    clamp(base[2] + rng.normal(0, amount), 0, 1),
  ];
}
