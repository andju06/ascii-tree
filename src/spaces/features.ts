export interface TreeFeatures {
  readonly rudolph: boolean;
  readonly santa: boolean;
  readonly snowman: boolean;
}

export const ALL_TREE_FEATURES: TreeFeatures = { rudolph: true, santa: true, snowman: true };

type FeatureResult = { readonly ok: true; readonly value: TreeFeatures } | { readonly ok: false; readonly error: string };

/** Missing or older records keep every decoration. */
export function readTreeFeatures(value: unknown): TreeFeatures {
  if (!isFeatureRecord(value)) return ALL_TREE_FEATURES;
  return {
    rudolph: value.rudolph,
    santa: value.santa,
    snowman: value.snowman,
  };
}

export function parseTreeFeatures(value: unknown): FeatureResult {
  if (!isFeatureRecord(value)) return { ok: false, error: "넣을 장식을 선택해 주세요." };
  return { ok: true, value: { rudolph: value.rudolph, santa: value.santa, snowman: value.snowman } };
}

function isFeatureRecord(value: unknown): value is TreeFeatures {
  if (typeof value !== "object" || value === null) return false;
  const raw = value as Record<string, unknown>;
  return typeof raw.rudolph === "boolean" && typeof raw.santa === "boolean" && typeof raw.snowman === "boolean";
}
