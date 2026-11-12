import { TAU } from "../core/math";
import type { Random } from "../core/Random";
import { Kind } from "../scene/kinds";
import type { Rgb } from "../scene/ParticleStore";
import type { EffectSink } from "./EffectsSystem";

export interface Point3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

const GOLD: Rgb = [1, 0.86, 0.45];
const WHITE: Rgb = [1, 0.97, 0.9];

/** Glittering dust that drifts upward around a point. */
export function emitSparkleRise(
  sink: EffectSink,
  rng: Random,
  origin: Point3,
  tint: Rgb,
  startTime: number,
  count = 36,
): void {
  const colors: readonly Rgb[] = [tint, GOLD, WHITE];
  for (let i = 0; i < count; i++) {
    const a = rng.random() * TAU;
    const r = rng.random() * 0.3;
    sink.emit({
      kind: Kind.Sparkle,
      x: origin.x + r * Math.cos(a),
      y: origin.y + rng.random() * 0.2,
      z: origin.z + r * Math.sin(a),
      vx: rng.normal(0, 0.08),
      vy: rng.uniform(0.5, 1.3),
      vz: rng.normal(0, 0.08),
      color: rng.pick(colors),
      bright: rng.uniform(0.7, 1),
      life: rng.uniform(1.1, 2.2),
      appear: startTime + rng.random() * 0.7,
      gravity: -0.15,
      phase: rng.random() * TAU,
    });
  }
}

/** Confetti and sparks thrown out when a gift box pops open. */
export function emitGiftBurst(
  sink: EffectSink,
  rng: Random,
  origin: Point3,
  colors: readonly Rgb[],
  time: number,
  confetti = 160,
  sparks = 70,
): void {
  for (let i = 0; i < confetti; i++) {
    const a = rng.random() * TAU;
    const up = rng.uniform(0.35, 1);
    const speed = rng.uniform(1.4, 3.2);
    const flat = Math.sqrt(1 - up * up);
    sink.emit({
      kind: Kind.Confetti,
      x: origin.x,
      y: origin.y,
      z: origin.z,
      vx: Math.cos(a) * flat * speed,
      vy: up * speed,
      vz: Math.sin(a) * flat * speed,
      color: rng.pick(colors),
      bright: rng.uniform(0.75, 1),
      life: rng.uniform(1.4, 2.6),
      appear: time,
      gravity: 3.2,
    });
  }
  for (let i = 0; i < sparks; i++) {
    const a = rng.random() * TAU;
    const speed = rng.uniform(0.6, 2);
    sink.emit({
      kind: Kind.Sparkle,
      x: origin.x,
      y: origin.y,
      z: origin.z,
      vx: Math.cos(a) * speed,
      vy: rng.uniform(0.4, 2.2),
      vz: Math.sin(a) * speed,
      color: rng.random() < 0.5 ? GOLD : WHITE,
      bright: 1,
      life: rng.uniform(0.8, 1.5),
      appear: time,
      gravity: 0.6,
      phase: rng.random() * TAU,
    });
  }
}
