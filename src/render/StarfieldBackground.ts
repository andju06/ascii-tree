import type { Random } from "../core/Random";
import { TAU } from "../core/math";
import type { Background, Viewport } from "./Viewport";

interface Star {
  readonly x: number;
  readonly y: number;
  readonly glyph: string;
  readonly alpha: number;
  readonly speed: number;
  readonly phase: number;
}

const STAR_GLYPHS = [".", ".", ".", ".", "+", "*"];

export class StarfieldBackground implements Background {
  private stars: Star[] = [];
  private gradient: CanvasGradient | null = null;

  constructor(
    private readonly rng: Random,
    private readonly density = 1 / 2200,
    private readonly skyRatio = 0.75,
  ) {}

  resize(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, viewport.height);
    gradient.addColorStop(0, "#070b18");
    gradient.addColorStop(0.7, "#04060d");
    gradient.addColorStop(1, "#020308");
    this.gradient = gradient;

    const skyHeight = viewport.height * this.skyRatio;
    const count = Math.min(180, Math.floor(viewport.width * skyHeight * this.density));
    this.stars = Array.from({ length: count }, () => ({
      x: this.rng.random() * viewport.width,
      y: this.rng.random() * skyHeight,
      glyph: this.rng.pick(STAR_GLYPHS),
      alpha: this.rng.uniform(0.25, 0.9),
      speed: this.rng.uniform(0.8, 3),
      phase: this.rng.random() * TAU,
    }));
  }

  render(ctx: CanvasRenderingContext2D, viewport: Viewport, time: number): void {
    ctx.fillStyle = this.gradient ?? "#04060d";
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    ctx.font = viewport.font;
    ctx.textBaseline = "top";
    ctx.fillStyle = "#cdd8ff";
    for (const star of this.stars) {
      ctx.globalAlpha = star.alpha * (0.55 + 0.45 * Math.sin(time * star.speed + star.phase));
      ctx.fillText(star.glyph, star.x, star.y);
    }
    ctx.globalAlpha = 1;
  }
}
