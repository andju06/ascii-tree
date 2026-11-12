import { TAU } from "../../core/math";
import { Kind } from "../../scene/kinds";
import type { Rgb } from "../../scene/ParticleStore";
import { mixWithWhite } from "../style";
import type { GiftPainter, LocalPoint, ShapePainter } from "./GiftPainter";

const INNER_GLOW: Rgb = [1, 0.88, 0.5];
/** Normalized face coordinate beyond which samples are drawn as a bright outline. */
const EDGE = 0.44;

/** Samples a rectangular face; `ribbon` decides whether ribbon bands cross it. */
function face(
  painter: GiftPainter,
  area: number,
  sample: (u: number, v: number) => LocalPoint,
  bright: number,
  ribbon: boolean,
): void {
  const { gift, rng } = painter;
  const edgeColor = mixWithWhite(gift.body, 0.45);
  for (let i = 0, count = painter.samples(area); i < count; i++) {
    const u = rng.random() - 0.5;
    const v = rng.random() - 0.5;
    const p = sample(u, v);
    const onRibbon = ribbon && (Math.abs(p[0]) < gift.width * 0.09 || Math.abs(p[2]) < gift.depth * 0.09);
    if (onRibbon) painter.point(p, Kind.Ribbon, gift.accent, Math.min(1, bright + 0.2));
    else if (Math.max(Math.abs(u), Math.abs(v)) > EDGE) painter.point(p, Kind.Gift, edgeColor, 1);
    else painter.point(p, Kind.Gift, gift.body, bright);
  }
}

function paintSides(painter: GiftPainter, wallHeight: number, ribbon: boolean): void {
  const { width: w, depth: d } = painter.gift;
  for (const side of [-1, 1]) {
    face(painter, wallHeight * d, (u, v) => [side * (w / 2), (v + 0.5) * wallHeight, u * d], 0.8, ribbon);
    face(painter, wallHeight * w, (u, v) => [u * w, (v + 0.5) * wallHeight, side * (d / 2)], 0.62, ribbon);
  }
}

function paintWrapped(painter: GiftPainter): void {
  const { gift, rng } = painter;
  const { width: w, height: h, depth: d } = gift;
  face(painter, w * d, (u, v) => [u * w, h, v * d], 1, true);
  paintSides(painter, h, true);

  const bow = Math.min(w, d) * 0.2;
  for (const side of [-1, 1]) {
    for (let k = 0; k < 28; k++) {
      const t = (k / 28) * TAU;
      painter.point(
        [side * bow * (0.55 + 0.5 * Math.cos(t)), h + bow * (0.45 + 0.45 * Math.sin(t)), rng.normal(0, bow * 0.08)],
        Kind.Bow,
        gift.accent,
        1,
      );
    }
  }
}

function paintOpened(painter: GiftPainter): void {
  const { gift, rng } = painter;
  const { width: w, height: h, depth: d } = gift;
  const wall = h * 0.8;
  paintSides(painter, wall, false);
  face(painter, w * d, (u, v) => [u * w * 0.92, wall * 0.15, v * d * 0.92], 0.3, false);

  for (let k = 0; k < 10; k++) {
    painter.point([rng.normal(0, w * 0.15), wall * rng.uniform(0.4, 0.9), rng.normal(0, d * 0.15)], Kind.Sparkle, INNER_GLOW, 1);
  }

  const lidW = w * 1.08;
  const lidD = d * 1.08;
  const lidOffset = w * 1.05;
  face(painter, lidW * lidD, (u, v) => [lidOffset + u * lidW, 0.03 + (u + 0.5) * lidW * 0.35, v * lidD], 0.9, true);

  for (let k = 0; k < 40; k++) {
    const t = k / 40;
    painter.point([-w * 0.6 - t * w * 0.9, 0.01, Math.sin(t * TAU * 1.5) * d * 0.25], Kind.Ribbon, gift.accent, 0.85);
  }
}

export const paintBox: ShapePainter = (painter) => {
  if (painter.options.opened) paintOpened(painter);
  else paintWrapped(painter);
};
