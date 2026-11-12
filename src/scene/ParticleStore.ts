import { KIND_STYLES, type Kind } from "./kinds";
import type { ParticleSource } from "./ParticleSource";

export type Rgb = readonly [number, number, number];

export interface ParticleSpec {
  readonly kind: Kind;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly color: Rgb;
  readonly bright: number;
  /** Absolute scene time (s) at which the particle starts fading in. */
  readonly appear: number;
  readonly phase?: number;
  /** Overrides the kind's default settle offset. */
  readonly drop?: number;
}

/** Append-only structure-of-arrays buffer to keep the render loop allocation-free. */
export class ParticleStore implements ParticleSource {
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
  private size = 0;

  constructor(readonly capacity: number) {
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
  }

  get count(): number {
    return this.size;
  }

  /** Returns the particle index, or -1 when the store is full. */
  add(spec: ParticleSpec): number {
    if (this.size >= this.capacity) return -1;
    const i = this.size++;
    this.x[i] = spec.x;
    this.y[i] = spec.y;
    this.z[i] = spec.z;
    this.r[i] = spec.color[0];
    this.g[i] = spec.color[1];
    this.b[i] = spec.color[2];
    this.bright[i] = spec.bright;
    this.appear[i] = spec.appear;
    this.phase[i] = spec.phase ?? 0;
    this.drop[i] = spec.drop ?? KIND_STYLES[spec.kind].drop;
    this.kind[i] = spec.kind;
    return i;
  }

  clear(): void {
    this.size = 0;
  }
}
