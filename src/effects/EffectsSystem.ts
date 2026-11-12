import type { Resettable, Updatable } from "../core/types";
import type { Kind } from "../scene/kinds";
import type { ParticleSource } from "../scene/ParticleSource";
import type { Rgb } from "../scene/ParticleStore";

export interface EffectParticle {
  readonly kind: Kind;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly vx: number;
  readonly vy: number;
  readonly vz: number;
  readonly color: Rgb;
  readonly bright: number;
  /** Lifetime in seconds counted from `appear`. */
  readonly life: number;
  readonly appear: number;
  /** Downward acceleration; negative values float upward. */
  readonly gravity: number;
  readonly phase?: number;
}

export interface EffectSink {
  emit(particle: EffectParticle): boolean;
}

const DRAG = 0.9;

/** Short-lived simulated particles; dead particles are swap-removed to keep the buffer dense. */
export class EffectsSystem implements ParticleSource, EffectSink, Updatable, Resettable {
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly z: Float32Array;
  readonly r: Float32Array;
  readonly g: Float32Array;
  readonly b: Float32Array;
  readonly bright: Float32Array;
  readonly appear: Float32Array;
  readonly phase: Float32Array;
  readonly drop: Float32Array;
  readonly kind: Uint8Array;
  private readonly vx: Float32Array;
  private readonly vy: Float32Array;
  private readonly vz: Float32Array;
  private readonly life: Float32Array;
  private readonly gravity: Float32Array;
  private readonly baseBright: Float32Array;
  private readonly columns: (Float32Array | Uint8Array)[];
  private size = 0;

  constructor(readonly capacity = 8000) {
    this.x = new Float32Array(capacity);
    this.y = new Float32Array(capacity);
    this.z = new Float32Array(capacity);
    this.r = new Float32Array(capacity);
    this.g = new Float32Array(capacity);
    this.b = new Float32Array(capacity);
    this.bright = new Float32Array(capacity);
    this.appear = new Float32Array(capacity);
    this.phase = new Float32Array(capacity);
    this.drop = new Float32Array(capacity);
    this.kind = new Uint8Array(capacity);
    this.vx = new Float32Array(capacity);
    this.vy = new Float32Array(capacity);
    this.vz = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.gravity = new Float32Array(capacity);
    this.baseBright = new Float32Array(capacity);
    this.columns = [
      this.x, this.y, this.z, this.r, this.g, this.b, this.bright, this.appear, this.phase,
      this.drop, this.kind, this.vx, this.vy, this.vz, this.life, this.gravity, this.baseBright,
    ];
  }

  get count(): number {
    return this.size;
  }

  emit(p: EffectParticle): boolean {
    if (this.size >= this.capacity) return false;
    const i = this.size++;
    this.x[i] = p.x;
    this.y[i] = p.y;
    this.z[i] = p.z;
    this.vx[i] = p.vx;
    this.vy[i] = p.vy;
    this.vz[i] = p.vz;
    this.r[i] = p.color[0];
    this.g[i] = p.color[1];
    this.b[i] = p.color[2];
    this.bright[i] = p.bright;
    this.baseBright[i] = p.bright;
    this.appear[i] = p.appear;
    this.life[i] = p.life;
    this.gravity[i] = p.gravity;
    this.phase[i] = p.phase ?? 0;
    this.drop[i] = 0;
    this.kind[i] = p.kind;
    return true;
  }

  update(dt: number, time: number): void {
    const damping = Math.max(0, 1 - DRAG * dt);
    let i = 0;
    while (i < this.size) {
      const age = time - this.appear[i];
      if (age < 0) {
        i++;
        continue;
      }
      if (age >= this.life[i]) {
        this.removeAt(i);
        continue;
      }
      this.vy[i] -= this.gravity[i] * dt;
      this.vx[i] *= damping;
      this.vz[i] *= damping;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      this.z[i] += this.vz[i] * dt;
      if (this.y[i] < 0) {
        this.y[i] = 0;
        this.vy[i] *= -0.25;
      }
      this.bright[i] = this.baseBright[i] * (1 - age / this.life[i]) ** 0.6;
      i++;
    }
  }

  reset(): void {
    this.size = 0;
  }

  private removeAt(index: number): void {
    const last = --this.size;
    if (index === last) return;
    for (const column of this.columns) column[index] = column[last];
  }
}
