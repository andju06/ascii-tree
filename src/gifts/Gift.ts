export const GIFT_SHAPES = ["box", "ornament"] as const;
export type GiftShape = (typeof GIFT_SHAPES)[number];

export const GIFT_SHAPE_LABELS: Record<GiftShape, string> = {
  box: "선물상자",
  ornament: "오너먼트",
};

export interface Gift {
  readonly id: string;
  readonly author: string;
  readonly message: string;
  readonly shape: GiftShape;
  /** Lowercase `#rrggbb` from `GIFT_PALETTE`. */
  readonly color: string;
  /** Box edge length (or ornament diameter) before layout scaling. */
  readonly size: number;
  /** ISO-8601 UTC timestamp. */
  readonly createdAt: string;
}

export interface NewGift {
  readonly author: string;
  readonly message: string;
  readonly shape: GiftShape;
  readonly color: string;
  readonly size: number;
}

export const GIFT_LIMITS = {
  authorMax: 20,
  messageMax: 200,
  sizeMin: 0.16,
  sizeMax: 0.32,
} as const;

export const GIFT_PALETTE: readonly string[] = [
  "#e8394a",
  "#c2185b",
  "#ff8a3d",
  "#ffd34d",
  "#4caf6e",
  "#2e9e9e",
  "#3f7be0",
  "#7e57c2",
  "#f5f1e6",
  "#b0bec5",
];
