import type { Random } from "../core/Random";
import type { ParticleStore } from "../scene/ParticleStore";
import type { GiftShape } from "./Gift";
import type { PlacedGift } from "./GiftLayout";
import { paintBox } from "./geometry/boxGeometry";
import { GiftPainter, type GiftRenderOptions, type ShapePainter } from "./geometry/GiftPainter";
import { paintOrnament } from "./geometry/ornamentGeometry";
import { paintSnowman } from "./geometry/snowmanGeometry";

export type { GiftRenderOptions };

const SNOWMAN_GIFT_ID = "easter:snowman";

const SHAPE_PAINTERS: Readonly<Record<GiftShape, ShapePainter>> = {
  box: paintBox,
  ornament: paintOrnament,
};

export function addGiftParticles(store: ParticleStore, rng: Random, gift: PlacedGift, options: GiftRenderOptions): void {
  const paint = gift.gift.id === SNOWMAN_GIFT_ID ? paintSnowman : SHAPE_PAINTERS[gift.gift.shape];
  paint(new GiftPainter(store, rng, gift, options));
}
