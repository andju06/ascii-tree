import { TAU } from "../../core/math";
import { Kind } from "../../scene/kinds";
import type { Rgb } from "../../scene/ParticleStore";
import type { ShapePainter } from "./GiftPainter";

const WHITE: Rgb = [0.96, 0.98, 1];
const SHADE: Rgb = [0.72, 0.8, 0.9];
const HAT: Rgb = [0.14, 0.16, 0.22];
const SCARF: Rgb = [0.86, 0.18, 0.24];
const CARROT: Rgb = [1, 0.45, 0.16];
const COAL: Rgb = [0.07, 0.08, 0.1];
const STICK: Rgb = [0.38, 0.24, 0.12];
const OPENED_DIM = 0.62;

/** Proportions shared by the painter and the placer so the mark sits on the hat. */
export function snowmanMetrics(width: number): { height: number; depth: number } {
  const bottom = width / 2;
  const middle = bottom * 0.72;
  const head = bottom * 0.5;
  const midY = bottom * 2 + middle * 0.12;
  const headY = midY + middle + head * 0.1;
  return { height: headY + head + head * 0.9, depth: width * 0.92 };
}

function sphere(painter: Parameters<ShapePainter>[0], centerY: number, radius: number, dim: number): void {
  const { rng } = painter;
  const count = painter.samples(4 * Math.PI * radius * radius);
  for (let i = 0; i < count; i++) {
    const nx = rng.normal(0, 1);
    const ny = rng.normal(0, 1);
    const nz = rng.normal(0, 1);
    const len = Math.hypot(nx, ny, nz) || 1;
    const [ux, uy, uz] = [nx / len, ny / len, nz / len];
    const shade = uz > 0.35 ? WHITE : uz < -0.25 ? SHADE : WHITE;
    painter.point([ux * radius, centerY + uy * radius, uz * radius], Kind.Gift, shade, (0.82 + 0.18 * Math.max(0, uz)) * dim);
  }
}

/** Three stacked snowballs, with a hat, scarf, stick arms and a carrot nose. */
export const paintSnowman: ShapePainter = (painter) => {
  const { rng, options } = painter;
  const width = painter.gift.width;
  const bottom = width / 2;
  const middle = bottom * 0.72;
  const head = bottom * 0.5;
  const midY = bottom * 2 + middle * 0.12;
  const headY = midY + middle + head * 0.1;
  const dim = options.opened ? OPENED_DIM : 1;

  sphere(painter, bottom, bottom, dim);
  sphere(painter, midY, middle, dim);
  sphere(painter, headY, head, dim);

  const brimY = headY + head * 0.42;
  const brim = head * 1.45;
  for (let i = 0, count = painter.samples(Math.PI * brim * brim); i < count; i++) {
    const a = rng.random() * TAU;
    const r = brim * Math.sqrt(rng.random());
    painter.point([r * Math.cos(a), brimY + rng.uniform(-0.01, 0.02), r * Math.sin(a)], Kind.Ribbon, HAT, dim);
  }
  const crown = head * 0.72;
  const crownTop = headY + head + head * 0.85;
  for (let i = 0, count = painter.samples(TAU * crown * (crownTop - brimY)); i < count; i++) {
    const a = rng.random() * TAU;
    painter.point(
      [crown * Math.cos(a), rng.uniform(brimY, crownTop), crown * Math.sin(a)],
      Kind.Ribbon,
      HAT,
      dim,
    );
  }

  const neck = headY - head * 0.95;
  for (let i = 0; i < 70; i++) {
    const a = rng.random() * TAU;
    const r = middle * 0.78;
    painter.point([r * Math.cos(a), neck + rng.uniform(-0.03, 0.04), r * Math.sin(a)], Kind.Ribbon, SCARF, dim);
  }
  for (let i = 0; i < 36; i++) {
    const t = i / 36;
    painter.point([middle * 0.35, neck - t * middle * 0.7, middle * 0.55], Kind.Ribbon, SCARF, dim);
  }

  for (const side of [-1, 1]) {
    for (let i = 0; i < 18; i++) {
      const t = i / 17;
      painter.point([side * (middle * 0.7 + t * bottom * 0.95), midY + 0.04 - t * bottom * 0.28, middle * 0.15], Kind.Gift, STICK, dim);
    }
  }

  for (const dy of [-0.04, 0.04]) {
    for (let i = 0; i < 8; i++) {
      painter.point([rng.normal(head * 0.28, 0.015), headY + dy + head * 0.12, head * 0.92], Kind.Gift, COAL, dim);
      painter.point([rng.normal(-head * 0.28, 0.015), headY + dy + head * 0.12, head * 0.92], Kind.Gift, COAL, dim);
    }
  }
  for (let i = 0; i < 22; i++) {
    const t = i / 21;
    painter.point([0, headY - head * 0.05, head * 0.95 + t * head * 0.85], Kind.Bow, CARROT, dim);
    painter.point([rng.normal(0, head * 0.08 * (1 - t)), headY - head * 0.05, head * 0.95 + t * head * 0.7], Kind.Bow, CARROT, dim);
  }
  for (const buttonY of [midY + middle * 0.15, midY - middle * 0.28, bottom + bottom * 0.15]) {
    for (let i = 0; i < 10; i++) {
      painter.point([rng.normal(0, 0.02), buttonY, middle * 0.96], Kind.Gift, COAL, dim);
    }
  }
};
