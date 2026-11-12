export interface Updatable {
  update(dt: number, time: number): void;
}

export interface Resettable {
  reset(): void;
}

export function isUpdatable(value: object): value is Updatable {
  return typeof (value as Partial<Updatable>).update === "function";
}

export function isResettable(value: object): value is Resettable {
  return typeof (value as Partial<Resettable>).reset === "function";
}

export const STAGES = [
  "ground",
  "envelope",
  "trunk",
  "branches",
  "ornaments",
  "lights",
  "star",
  "snow",
] as const;

export type StageId = (typeof STAGES)[number];

export type AppEvents = {
  stage: StageId;
  complete: undefined;
  reset: undefined;
};
