export const Kind = {
  Ground: 0,
  Outline: 1,
  Trunk: 2,
  Leaf: 3,
  Ornament: 4,
  Light: 5,
  Star: 6,
  Snow: 7,
  Gift: 8,
  Ribbon: 9,
  Sparkle: 10,
  Confetti: 11,
  Bow: 12,
} as const;

export type Kind = (typeof Kind)[keyof typeof Kind];

export interface KindStyle {
  /** Glyphs from dark to bright; index 0 must be a space. */
  readonly ramp: string;
  readonly shaded: boolean;
  readonly glow: boolean;
  /** Twinkle angular speed in rad/s, 0 disables flicker. */
  readonly flicker: number;
  /** Ignores tree rotation so the shape always faces the camera. */
  readonly billboard: boolean;
  /** Default height offset a particle settles from while fading in (negative rises from below). */
  readonly drop: number;
  readonly fadeIn: number;
  /** Seconds a fresh particle glows white before settling to its color; 0 disables. */
  readonly flash: number;
}

const DEFAULT_STYLE: KindStyle = {
  ramp: " .:",
  shaded: false,
  glow: false,
  flicker: 0,
  billboard: false,
  drop: 0,
  fadeIn: 0.7,
  flash: 0,
};

const STYLES: Record<Kind, KindStyle> = {
  [Kind.Ground]: { ...DEFAULT_STYLE, ramp: " ..::-", flash: 0.5 },
  [Kind.Outline]: { ...DEFAULT_STYLE, ramp: " ..:", shaded: true, drop: 0.2 },
  [Kind.Trunk]: { ...DEFAULT_STYLE, ramp: " .:;!|I#", shaded: true, drop: 0.3, flash: 0.5 },
  [Kind.Leaf]: { ...DEFAULT_STYLE, ramp: " .,:;+*xX#%@", shaded: true, drop: 0.1, fadeIn: 0.3, flash: 0.45 },
  [Kind.Ornament]: { ...DEFAULT_STYLE, ramp: " .oO0@", shaded: true, drop: 0.6 },
  [Kind.Light]: { ...DEFAULT_STYLE, ramp: " .oO@", glow: true, flicker: 2.6, drop: 0.25 },
  [Kind.Star]: { ...DEFAULT_STYLE, ramp: " .+*#@", glow: true, billboard: true, drop: 0.5 },
  [Kind.Snow]: { ...DEFAULT_STYLE, ramp: " .,:*#" },
  [Kind.Gift]: { ...DEFAULT_STYLE, ramp: " -=+#%@", fadeIn: 1 },
  [Kind.Ribbon]: { ...DEFAULT_STYLE, ramp: " :+*#@", fadeIn: 1 },
  [Kind.Bow]: { ...DEFAULT_STYLE, ramp: " +*#@", glow: true, fadeIn: 1 },
  [Kind.Sparkle]: { ...DEFAULT_STYLE, ramp: " .+*", glow: true, flicker: 7, fadeIn: 0.05 },
  [Kind.Confetti]: { ...DEFAULT_STYLE, ramp: " .,~*#", fadeIn: 0.05 },
};

export const KIND_STYLES: readonly KindStyle[] = Array.from(
  { length: Object.keys(STYLES).length },
  (_, index) => STYLES[index as Kind],
);
