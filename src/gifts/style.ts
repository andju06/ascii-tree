import { GIFT_LIMITS, GIFT_PALETTE } from "./Gift";
import type { Rgb } from "../scene/ParticleStore";

export interface GiftStyle {
  readonly color: string;
  readonly size: number;
}

export function randomGiftColor(random: () => number = Math.random): string {
  return GIFT_PALETTE[Math.floor(random() * GIFT_PALETTE.length)];
}

export function randomGiftSize(random: () => number = Math.random): number {
  const size = GIFT_LIMITS.sizeMin + (GIFT_LIMITS.sizeMax - GIFT_LIMITS.sizeMin) * random();
  return Math.round(size * 1000) / 1000;
}

export function randomGiftStyle(random: () => number = Math.random): GiftStyle {
  return { color: randomGiftColor(random), size: randomGiftSize(random) };
}

export function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

export function luminance([r, g, b]: Rgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function mixWithWhite([r, g, b]: Rgb, amount: number): Rgb {
  return [r + (1 - r) * amount, g + (1 - g) * amount, b + (1 - b) * amount];
}
