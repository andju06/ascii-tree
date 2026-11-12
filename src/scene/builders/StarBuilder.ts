import { TAU } from "../../core/math";
import type { StageId } from "../../core/types";
import { Kind } from "../kinds";
import type { Rgb } from "../ParticleStore";
import type { BuildContext, StageBuilder } from "../StageBuilder";

type Point = readonly [number, number];

const GOLD: Rgb = [1, 0.84, 0.35];
const CORE: Rgb = [1, 0.97, 0.82];

function starPolygon(points: number, outer: number, inner: number): Point[] {
  const vertices: Point[] = [];
  for (let k = 0; k < points * 2; k++) {
    const radius = k % 2 === 0 ? outer : inner;
    const angle = Math.PI / 2 + (k * Math.PI) / points;
    vertices.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
  }
  return vertices;
}

function insidePolygon(x: number, y: number, polygon: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export class StarBuilder implements StageBuilder {
  readonly stage: StageId = "star";

  constructor(
    private readonly outer = 0.32,
    private readonly inner = 0.13,
    private readonly samples = 900,
    private readonly rays = 8,
  ) {}

  build({ store, rng, shape, startTime }: BuildContext): void {
    const cy = shape.y1 + 0.24;
    const polygon = starPolygon(5, this.outer, this.inner);

    for (let i = 0; i < this.samples; i++) {
      const x = rng.uniform(-this.outer, this.outer);
      const y = rng.uniform(-this.outer, this.outer);
      if (!insidePolygon(x, y, polygon)) continue;
      const f = Math.hypot(x, y) / this.outer;
      store.add({
        kind: Kind.Star,
        x,
        y: cy + y,
        z: rng.normal(0, 0.02),
        color: f < 0.35 ? CORE : GOLD,
        bright: 0.75 + 0.25 * (1 - f),
        appear: startTime + f * 0.8,
      });
    }

    for (let ray = 0; ray < this.rays; ray++) {
      const angle = (ray / this.rays) * TAU + Math.PI / this.rays;
      const length = ray % 2 === 0 ? 0.8 : 0.5;
      for (let k = 0; k < 18; k++) {
        const t = this.outer * 0.6 + (k / 18) * length;
        store.add({
          kind: Kind.Star,
          x: Math.cos(angle) * t,
          y: cy + Math.sin(angle) * t,
          z: 0,
          color: GOLD,
          bright: 0.55 * (1 - k / 18),
          appear: startTime + 0.8 + (k / 18) * 0.6,
        });
      }
    }
  }
}
