import type { Resettable, Updatable } from "../core/types";
import type { EffectSink } from "../effects/EffectsSystem";
import type { Point3 } from "../effects/emitters";
import { Kind } from "../scene/kinds";
import type { Rgb } from "../scene/ParticleStore";
import type { SpriteSink } from "../render/SpriteLayer";

const WALK_FRAMES: readonly (readonly string[])[] = [
  ["  ___  ", " (o.o) ", " /[ ]\\ ", "  / >  "],
  ["  ___  ", " (o.o) ", " \\[ ]/ ", "  < \\  "],
];
const CAUGHT_FRAME = ["  ___  ", " (^.^) ", " /[ ]\\ ", "  | |  "];
const MUG_FRAMES: readonly (readonly string[])[] = [
  ["  ~ ~  ", " .---. ", " |~~~| ", " '---' "],
  [" ~   ~ ", " .---. ", " |~~~| ", " '---' "],
];
const SNOWMAN_COLORS = ["#d7e4f5", "#fff7ef", "#f7fbff", "#e7eef6"];
const MUG_COLORS = ["#f7f1e8", "#8a5a32", "#e7c7a1", "#6b3e22"];
const BUBBLE_COLORS = ["#ffd86b"];
const PUFF: Rgb = [0.9, 0.95, 1];
const BUBBLE_BACKGROUND = "rgba(10, 8, 4, 0.82)";

export const SNOWMAN_SPRITE = "snowman";
const MUG_SPRITE = "snowman-mug";
const BUBBLE_SPRITE = "snowman-bubble";
const OUTCOME_KEY = "ascii-tree:snowman";

interface Chase {
  readonly start: number;
  readonly origin: Point3;
  readonly angle: number;
  readonly radius: number;
  lastPuff: number;
}

interface Pose {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly angle: number;
}

export type SnowmanOutcome = "caught" | "missed";

export interface SnowmanChaseOptions {
  readonly jumpDuration: number;
  readonly orbitDuration: number;
  readonly orbitRadius: number;
  readonly exitDuration: number;
  readonly exitSpeed: number;
  readonly stepRate: number;
  readonly scale: number;
  readonly rewardHold: number;
  readonly rewardFade: number;
}

const DEFAULT_OPTIONS: SnowmanChaseOptions = {
  jumpDuration: 0.4,
  orbitDuration: 6,
  orbitRadius: 2.5,
  exitDuration: 1.4,
  exitSpeed: 1.6,
  stepRate: 6,
  scale: 3.1,
  rewardHold: 6,
  rewardFade: 0.8,
};

/**
 * A snowman pops out of his box and waddles around the tree.
 * Catching him during the chase serves a mug of hot chocolate.
 */
export class SnowmanChase implements Updatable, Resettable {
  private chase: Chase | null = null;
  private rewardStart: number | null = null;
  private pose: Pose | null = null;
  private outcome: SnowmanOutcome | null;
  private readonly options: SnowmanChaseOptions;

  constructor(
    private readonly sprites: SpriteSink,
    private readonly effects: EffectSink,
    options: Partial<SnowmanChaseOptions> = {},
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.outcome = readOutcome();
  }

  get catchable(): boolean {
    return this.chase !== null;
  }

  /** True while the snowman is out, including the moment the cocoa is on screen. */
  get busy(): boolean {
    return this.chase !== null || this.rewardStart !== null;
  }

  result(): SnowmanOutcome | null {
    return this.outcome;
  }

  start(origin: Point3, time: number): void {
    if (this.chase || this.rewardStart !== null) return;
    this.chase = {
      start: time,
      origin,
      angle: Math.atan2(origin.z, origin.x),
      radius: Math.hypot(origin.x, origin.z),
      lastPuff: time,
    };
  }

  /** Freezes the snowman and brings out the cocoa. No-op unless a chase is in progress. */
  catch(time: number): void {
    if (!this.chase || !this.pose) return;
    this.chase = null;
    this.rewardStart = time;
    this.remember("caught");
  }

  update(_dt: number, time: number): void {
    if (this.chase) this.updateChase(time);
    else if (this.rewardStart !== null) this.updateReward(time);
  }

  reset(): void {
    this.chase = null;
    this.rewardStart = null;
    this.pose = null;
    this.clearSprites();
  }

  private updateChase(time: number): void {
    const chase = this.chase;
    if (!chase) return;
    const { jumpDuration, orbitDuration, exitDuration, stepRate, scale } = this.options;
    const total = jumpDuration + orbitDuration + exitDuration;
    const elapsed = time - chase.start;
    if (elapsed > total) {
      this.chase = null;
      this.pose = null;
      this.remember("missed");
      this.clearSprites();
      return;
    }

    let x = chase.origin.x;
    let z = chase.origin.z;
    let y: number;
    let frame = 0;
    let angle = chase.angle;

    if (elapsed < jumpDuration) {
      const t = elapsed / jumpDuration;
      y = chase.origin.y * (1 - t) + Math.sin(t * Math.PI) * 0.55;
    } else {
      const running = elapsed - jumpDuration;
      const path = this.pathAt(chase, running);
      angle = path[0];
      x = path[1] * Math.cos(angle);
      z = path[1] * Math.sin(angle);
      y = Math.abs(Math.sin(running * stepRate)) * 0.05;
      frame = Math.floor(running * stepRate) % WALK_FRAMES.length;
      this.leavePuff(chase, x, z, time);
    }

    this.pose = { x, y, z, angle };
    const fadeOut = Math.min(1, (total - elapsed) / 0.5);
    this.sprites.set(SNOWMAN_SPRITE, {
      lines: WALK_FRAMES[frame],
      colors: SNOWMAN_COLORS,
      x,
      y,
      z,
      scale,
      alpha: fadeOut,
    });
    if (elapsed > 0.15 && elapsed < jumpDuration + orbitDuration) {
      this.bubble("잡아 봐!", x, y + 0.95, z, fadeOut);
    } else {
      this.sprites.remove(BUBBLE_SPRITE);
    }
  }

  private updateReward(time: number): void {
    const pose = this.pose;
    const rewardStart = this.rewardStart;
    if (!pose || rewardStart === null) return;
    const { rewardHold, rewardFade, scale } = this.options;
    const elapsed = time - rewardStart;
    if (elapsed > rewardHold + rewardFade) {
      this.rewardStart = null;
      this.pose = null;
      this.clearSprites();
      return;
    }
    const alpha = elapsed < rewardHold ? 1 : 1 - (elapsed - rewardHold) / rewardFade;
    this.sprites.set(SNOWMAN_SPRITE, {
      lines: CAUGHT_FRAME,
      colors: SNOWMAN_COLORS,
      x: pose.x,
      y: pose.y,
      z: pose.z,
      scale,
      alpha,
    });
    const mugDistance = 0.85;
    this.sprites.set(MUG_SPRITE, {
      lines: MUG_FRAMES[Math.floor(elapsed * 4) % MUG_FRAMES.length],
      colors: MUG_COLORS,
      x: pose.x + Math.cos(pose.angle + 0.7) * mugDistance,
      y: pose.y,
      z: pose.z + Math.sin(pose.angle + 0.7) * mugDistance,
      scale: scale * 1.15,
      alpha,
    });
    this.bubble("핫초코!", pose.x, pose.y + 0.95, pose.z, alpha);
  }

  private pathAt(chase: Chase, running: number): [number, number] {
    const { orbitDuration, orbitRadius, exitSpeed } = this.options;
    if (running < orbitDuration) {
      const k = running / orbitDuration;
      const approach = Math.min(1, k * 3);
      const radius = chase.radius + (orbitRadius - chase.radius) * approach + Math.sin(running * 6) * 0.06;
      return [chase.angle + Math.PI * 1.15 * k, radius];
    }
    const exit = running - orbitDuration;
    return [chase.angle + Math.PI * 1.15, orbitRadius + exitSpeed * exit];
  }

  private leavePuff(chase: Chase, x: number, z: number, time: number): void {
    if (time - chase.lastPuff < 1 / this.options.stepRate) return;
    chase.lastPuff = time;
    this.effects.emit({
      kind: Kind.Confetti,
      x,
      y: 0.02,
      z,
      vx: 0,
      vy: 0.15,
      vz: 0,
      color: PUFF,
      bright: 0.45,
      life: 1.4,
      appear: time,
      gravity: 0.2,
    });
  }

  private bubble(text: string, x: number, y: number, z: number, alpha: number): void {
    this.sprites.set(BUBBLE_SPRITE, {
      lines: [text],
      colors: BUBBLE_COLORS,
      x,
      y,
      z,
      scale: 1.6,
      alpha,
      background: BUBBLE_BACKGROUND,
    });
  }

  private remember(outcome: SnowmanOutcome): void {
    this.outcome = outcome;
    try {
      localStorage.setItem(OUTCOME_KEY, outcome);
    } catch (error) {
      console.warn("[SnowmanChase] failed to remember", error);
    }
  }

  private clearSprites(): void {
    this.sprites.remove(SNOWMAN_SPRITE);
    this.sprites.remove(MUG_SPRITE);
    this.sprites.remove(BUBBLE_SPRITE);
  }
}

function readOutcome(): SnowmanOutcome | null {
  try {
    const stored = localStorage.getItem(OUTCOME_KEY);
    return stored === "caught" || stored === "missed" ? stored : null;
  } catch {
    return null;
  }
}
