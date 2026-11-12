import { TAU } from "./math";

/** Seeded PRNG (mulberry32) so every run grows the same tree. */
export class Random {
  private state: number;
  private spareNormal: number | null = null;

  constructor(seed: number) {
    this.state = seed >>> 0 || 1;
  }

  static derive(seed: number, label: string): Random {
    let hash = (2166136261 ^ seed) >>> 0;
    for (let i = 0; i < label.length; i++) {
      hash ^= label.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return new Random(hash);
  }

  random(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  uniform(min: number, max: number): number {
    return min + (max - min) * this.random();
  }

  normal(mean = 0, std = 1): number {
    if (this.spareNormal !== null) {
      const value = this.spareNormal;
      this.spareNormal = null;
      return mean + std * value;
    }
    let u = 0;
    while (u === 0) u = this.random();
    const v = this.random();
    const magnitude = Math.sqrt(-2 * Math.log(u));
    this.spareNormal = magnitude * Math.sin(TAU * v);
    return mean + std * magnitude * Math.cos(TAU * v);
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("Cannot pick from an empty list");
    return items[Math.floor(this.random() * items.length)];
  }
}
