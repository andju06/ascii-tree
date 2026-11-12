import { TAU } from "../../core/math";
import { Kind } from "../../scene/kinds";
import type { Rgb } from "../../scene/ParticleStore";
import { mixWithWhite } from "../style";
import type { ShapePainter } from "./GiftPainter";

const SHINE: Rgb = [1, 1, 1];
/** Direction of the painted highlight (up and slightly to one side). */
const HIGHLIGHT = { x: -0.45, y: 0.75, z: 0.48 };
const OPENED_DIM = 0.45;

/** Glass ball with a gold cap and hanging loop; opened ornaments stay on the tree but dimmed. */
export const paintOrnament: ShapePainter = (painter) => {
  const { gift, rng, options } = painter;
  const radius = gift.width / 2;
  const dim = options.opened ? OPENED_DIM : 1;
  const rim = mixWithWhite(gift.body, 0.35);

  for (let i = 0, count = painter.samples(4 * Math.PI * radius * radius); i < count; i++) {
    const nx = rng.normal(0, 1);
    const ny = rng.normal(0, 1);
    const nz = rng.normal(0, 1);
    const len = Math.hypot(nx, ny, nz) || 1;
    const [ux, uy, uz] = [nx / len, ny / len, nz / len];
    const facing = ux * HIGHLIGHT.x + uy * HIGHLIGHT.y + uz * HIGHLIGHT.z;
    const point = [ux * radius, radius + uy * radius, uz * radius] as const;

    if (!options.opened && facing > 0.9) painter.point(point, Kind.Bow, SHINE, 1);
    else if (facing < -0.55) painter.point(point, Kind.Gift, rim, 0.75 * dim);
    else painter.point(point, Kind.Gift, gift.body, (0.7 + 0.3 * facing) * dim);
  }

  const capRadius = radius * 0.32;
  const capHeight = radius * 0.28;
  for (let k = 0; k < 40; k++) {
    const a = rng.random() * TAU;
    painter.point(
      [capRadius * Math.cos(a), radius * 1.92 + rng.random() * capHeight, capRadius * Math.sin(a)],
      Kind.Ribbon,
      gift.accent,
      0.95,
    );
  }

  const loopRadius = capRadius * 0.8;
  for (let k = 0; k < 18; k++) {
    const t = (k / 18) * Math.PI;
    painter.point(
      [loopRadius * Math.cos(t), radius * 1.92 + capHeight + loopRadius * Math.sin(t), 0],
      Kind.Bow,
      gift.accent,
      1,
    );
  }
};
