import type { SpriteSink } from "../render/SpriteLayer";
import type { Gift } from "./Gift";
import type { GiftLocator } from "./GiftHint";

const SPRITE_ID = "gift-hover";

/** "From. author" tag floating above the hovered gift. */
export class GiftHoverLabel {
  private currentId: string | null = null;

  constructor(
    private readonly sprites: SpriteSink,
    private readonly locator: Pick<GiftLocator, "topOf">,
    private readonly labelFor: (gift: Gift) => string,
  ) {}

  show(gift: Gift | null): void {
    if (gift?.id === this.currentId) return;
    this.currentId = gift?.id ?? null;
    const top = gift ? this.locator.topOf(gift.id) : null;
    if (!gift || !top) {
      this.sprites.remove(SPRITE_ID);
      return;
    }
    this.sprites.set(SPRITE_ID, {
      lines: [this.labelFor(gift)],
      colors: ["#ffe9a8"],
      x: top.x,
      y: top.y + 0.3,
      z: top.z,
      scale: 1.5,
      alpha: 1,
      background: "rgba(10, 8, 4, 0.82)",
    });
  }
}
