import type { Resettable, Updatable } from "../core/types";
import type { Point3 } from "../effects/emitters";
import type { SpriteSink } from "../render/SpriteLayer";
import { KIND_STYLES, Kind } from "../scene/kinds";

export interface GiftLocator {
  topOf(id: string): Point3 | null;
}

export interface UnreadMark {
  readonly id: string;
  readonly top: Point3;
  readonly glyph: string;
  readonly font?: string;
  /** When the gift itself becomes visible. The mark stays hidden until then. */
  readonly appear: number;
  /** Same entrance offset as the gift particles, so the mark rises and falls with it. */
  readonly drop: number;
}

const MARK_COLOR = "#ffe14a";

/** A glowing mark above every guestbook entry this browser has not opened yet. */
export class GiftHint implements Updatable, Resettable {
  private active = false;
  private readonly shown = new Set<string>();

  constructor(
    private readonly sprites: SpriteSink,
    private readonly marks: () => readonly UnreadMark[],
  ) {}

  schedule(_time: number): void {
    this.active = true;
  }

  dismiss(): void {
    this.active = false;
    this.clear();
  }

  update(_dt: number, time: number): void {
    if (!this.active) return;
    const bob = Math.abs(Math.sin(time * 4)) * 0.1;
    const fadeIn = KIND_STYLES[Kind.Gift].fadeIn;
    const next = new Set<string>();
    for (const mark of this.marks()) {
      const age = time - mark.appear;
      if (age < 0) continue;
      const settle = age >= fadeIn ? 0 : 1 - age / fadeIn;
      next.add(mark.id);
      this.sprites.set(this.spriteId(mark.id), {
        lines: [mark.glyph],
        colors: [mark.font ? "#ffffff" : MARK_COLOR],
        x: mark.top.x,
        y: mark.top.y + settle * settle * mark.drop + 0.42 + bob,
        z: mark.top.z,
        scale: mark.font ? 4 : 3.2,
        alpha: 1,
        glow: !mark.font,
        font: mark.font,
        background: "rgba(48, 22, 4, 0.92)",
      });
    }
    for (const id of this.shown) {
      if (!next.has(id)) this.sprites.remove(this.spriteId(id));
    }
    this.shown.clear();
    for (const id of next) this.shown.add(id);
  }

  reset(): void {
    this.dismiss();
  }

  private spriteId(id: string): string {
    return `unread:${id}`;
  }

  private clear(): void {
    for (const id of this.shown) this.sprites.remove(this.spriteId(id));
    this.shown.clear();
  }
}
