const LEVELS = 16;
export const COLOR_COUNT = LEVELS * LEVELS * LEVELS;

/** CSS color string for each 12-bit quantized color key. */
export const COLOR_STRINGS: readonly string[] = Array.from({ length: COLOR_COUNT }, (_, key) => {
  const r = ((key >> 8) & 15) * 17;
  const g = ((key >> 4) & 15) * 17;
  const b = (key & 15) * 17;
  return `rgb(${r},${g},${b})`;
});

export const GLYPHS: readonly string[] = Array.from({ length: 128 }, (_, code) => String.fromCharCode(code));

function channel(value: number): number {
  return value <= 0 ? 0 : value >= 1 ? LEVELS - 1 : Math.round(value * (LEVELS - 1));
}

export function quantizeColor(r: number, g: number, b: number): number {
  return (channel(r) << 8) | (channel(g) << 4) | channel(b);
}
