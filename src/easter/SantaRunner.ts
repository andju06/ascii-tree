import type { Resettable, Updatable } from "../core/types";
import type { EffectSink } from "../effects/EffectsSystem";
import type { Point3 } from "../effects/emitters";
import { Kind } from "../scene/kinds";
import type { Rgb } from "../scene/ParticleStore";
import type { SpriteSink } from "../render/SpriteLayer";

const SANTA_FRAMES: readonly (readonly string[])[] = [
  ["  _*_ ", " (o.o)", " /|#|\\", "  / > "],
  ["  _*_ ", " (o.o)", " \\|#|/", "  < \\ "],
];
const SANTA_COLORS = ["#ff5a5a", "#ffe2cc", "#ff4040", "#f2f2f2"];
const BUBBLE_COLORS = ["#ffd86b"];
const FOOTPRINT: Rgb = [0.85, 0.9, 1];

const SPRITE_ID = "santa";
const BUBBLE_ID = "santa-bubble";

interface Run {
  readonly start: number;
  readonly origin: Point3;
  readonly angle: number;
  readonly radius: number;
  lastPrint: number;
}

export interface SantaRunnerOptions {
  readonly jumpDuration: number;
  /** Time spent circling half-way around the tree. */
  readonly orbitDuration: number;
  readonly orbitRadius: number;
  /** Time spent sprinting outward after the orbit. */
  readonly exitDuration: number;
  readonly exitSpeed: number;
  readonly stepRate: number;
  readonly scale: number;
}

const DEFAULT_OPTIONS: SantaRunnerOptions = {
  jumpDuration: 0.45,
  orbitDuration: 2.6,
  orbitRadius: 2.6,
  exitDuration: 1.6,
  exitSpeed: 3,
  stepRate: 9,
  scale: 2.8,
};

const BUBBLE_BACKGROUND = "rgba(10, 8, 4, 0.82)";

/** Santa pops out of the easter-egg box, shouts, circles the tree and sprints away leaving footprints. */
export class SantaRunner implements Updatable, Resettable {
  private run: Run | null = null;
  private readonly options: SantaRunnerOptions;

  constructor(
    private readonly sprites: SpriteSink,
    private readonly effects: EffectSink,
    options: Partial<SantaRunnerOptions> = {},
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  start(origin: Point3, time: number): void {
    this.run = {
      start: time,
      origin,
      angle: Math.atan2(origin.z, origin.x),
      radius: Math.hypot(origin.x, origin.z),
      lastPrint: time,
    };
  }

  update(_dt: number, time: number): void {
    const run = this.run;
    if (!run) return;
    const { jumpDuration, orbitDuration, exitDuration, stepRate, scale } = this.options;
    const total = jumpDuration + orbitDuration + exitDuration;
    const elapsed = time - run.start;

    if (elapsed > total) {
      this.stop();
      return;
    }

    let x = run.origin.x;
    let y: number;
    let z = run.origin.z;
    let frame = 0;

    if (elapsed < jumpDuration) {
      const t = elapsed / jumpDuration;
      y = run.origin.y * (1 - t) + Math.sin(t * Math.PI) * 0.6;
    } else {
      const running = elapsed - jumpDuration;
      const [angle, radius] = this.pathAt(run, running);
      x = radius * Math.cos(angle);
      z = radius * Math.sin(angle);
      y = Math.abs(Math.sin(running * stepRate)) * 0.06;
      frame = Math.floor(running * stepRate) % SANTA_FRAMES.length;
      this.leaveFootprint(run, x, z, time);
    }

    const fadeOut = Math.min(1, (total - elapsed) / 0.6);
    this.sprites.set(SPRITE_ID, {
      lines: SANTA_FRAMES[frame],
      colors: SANTA_COLORS,
      x,
      y,
      z,
      scale,
      alpha: fadeOut,
    });

    if (elapsed > 0.2 && elapsed < jumpDuration + orbitDuration) {
      this.sprites.set(BUBBLE_ID, {
        lines: [elapsed < 1.6 ? "HO HO HO!" : "catch me~"],
        colors: BUBBLE_COLORS,
        x,
        y: y + 0.95,
        z,
        scale: 1.6,
        alpha: fadeOut,
        background: BUBBLE_BACKGROUND,
      });
    } else {
      this.sprites.remove(BUBBLE_ID);
    }
  }

  reset(): void {
    this.stop();
  }

  /** Returns [angle, radius] around the tree axis `running` seconds after landing. */
  private pathAt(run: Run, running: number): [number, number] {
    const { orbitDuration, orbitRadius, exitSpeed } = this.options;
    if (running < orbitDuration) {
      const k = running / orbitDuration;
      const approach = Math.min(1, k * 3);
      const radius = run.radius + (orbitRadius - run.radius) * approach + Math.sin(running * 7) * 0.08;
      return [run.angle + Math.PI * k, radius];
    }
    const exit = running - orbitDuration;
    return [run.angle + Math.PI, orbitRadius + exitSpeed * exit + 1.2 * exit * exit];
  }

  private leaveFootprint(run: Run, x: number, z: number, time: number): void {
    if (time - run.lastPrint < 1 / this.options.stepRate) return;
    run.lastPrint = time;
    this.effects.emit({
      kind: Kind.Confetti,
      x,
      y: 0.01,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      color: FOOTPRINT,
      bright: 0.55,
      life: 3.5,
      appear: time,
      gravity: 0,
    });
  }

  private stop(): void {
    this.run = null;
    this.sprites.remove(SPRITE_ID);
    this.sprites.remove(BUBBLE_ID);
  }
}
