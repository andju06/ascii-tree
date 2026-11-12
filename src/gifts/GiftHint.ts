import type { Resettable, Updatable } from "../core/types";
import type { Point3 } from "../effects/emitters";
import type { SpriteSink } from "../render/SpriteLayer";
import type { Gift } from "./Gift";

export interface GiftLocator {
  hintTarget(): Gift | null;
  topOf(id: string): Point3 | null;
}

const SPRITE_ID = "gift-hint";

/** Bobbing "click me!" bubble over one wrapped gift, shown once after the pile appears. */
export class GiftHint implements Updatable, Resettable {
  private showAt: number | null = null;
  private targetId: string | null = null;

  constructor(
    private readonly sprites: SpriteSink,
    private readonly locator: GiftLocator,
    private readonly duration = 5,
  ) {}

  schedule(time: number): void {
    this.showAt = time;
    this.targetId = null;
  }

  dismiss(): void {
    this.showAt = null;
    this.targetId = null;
    this.sprites.remove(SPRITE_ID);
  }

  update(_dt: number, time: number): void {
    if (this.showAt === null || time < this.showAt) return;
    const elapsed = time - this.showAt;
    if (elapsed > this.duration) {
      this.dismiss();
      return;
    }

    this.targetId ??= this.locator.hintTarget()?.id ?? null;
    const top = this.targetId ? this.locator.topOf(this.targetId) : null;
    if (!top) {
      this.dismiss();
      return;
    }

    const fade = Math.min(1, elapsed / 0.3, (this.duration - elapsed) / 0.5);
    this.sprites.set(SPRITE_ID, {
      lines: ["click me!", "    v    "],
      colors: ["#ffe9a8"],
      x: top.x,
      y: top.y + 0.25 + Math.abs(Math.sin(elapsed * 4)) * 0.08,
      z: top.z,
      scale: 1.6,
      alpha: fade,
      background: "rgba(10, 8, 4, 0.82)",
    });
  }

  reset(): void {
    this.dismiss();
  }
}
