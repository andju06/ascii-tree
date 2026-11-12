import { GIFT_LIMITS, GIFT_PALETTE, GIFT_SHAPES, type Gift, type GiftShape, type NewGift } from "./Gift";

export type ValidationResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };

const COLOR_PATTERN = /^#[0-9a-f]{6}$/;
// Strips control characters except newline so messages cannot carry invisible payloads.
const CONTROL_CHARS = /[\u0000-\u0009\u000b-\u001f\u007f]/g;

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.replace(CONTROL_CHARS, "").trim() : "";
}

export function isGiftShape(value: unknown): value is GiftShape {
  return typeof value === "string" && (GIFT_SHAPES as readonly string[]).includes(value);
}

export function validateNewGift(input: unknown): ValidationResult<NewGift> {
  if (typeof input !== "object" || input === null) return { ok: false, error: "잘못된 요청입니다." };
  const raw = input as Record<string, unknown>;

  const author = cleanText(raw.author);
  if (author.length === 0) return { ok: false, error: "닉네임을 입력해 주세요." };
  if (author.length > GIFT_LIMITS.authorMax) return { ok: false, error: `닉네임은 ${GIFT_LIMITS.authorMax}자 이하로 입력해 주세요.` };

  const message = cleanText(raw.message);
  if (message.length === 0) return { ok: false, error: "메시지를 입력해 주세요." };
  if (message.length > GIFT_LIMITS.messageMax) return { ok: false, error: `메시지는 ${GIFT_LIMITS.messageMax}자 이하로 입력해 주세요.` };

  if (!isGiftShape(raw.shape)) return { ok: false, error: "모양을 선택해 주세요." };
  const shape = raw.shape;

  const color = typeof raw.color === "string" ? raw.color.toLowerCase() : "";
  if (!GIFT_PALETTE.includes(color)) return { ok: false, error: "팔레트에서 색상을 선택해 주세요." };

  const size = Number(raw.size);
  if (!Number.isFinite(size) || size < GIFT_LIMITS.sizeMin || size > GIFT_LIMITS.sizeMax) {
    return { ok: false, error: "크기 값이 올바르지 않습니다." };
  }

  return { ok: true, value: { author, message, shape, color, size } };
}

/** Accepts stored or remote records; gifts saved before shapes existed default to boxes. */
export function parseGift(value: unknown): Gift | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const valid =
    typeof raw.id === "string" &&
    typeof raw.author === "string" &&
    typeof raw.message === "string" &&
    typeof raw.color === "string" &&
    COLOR_PATTERN.test(raw.color) &&
    typeof raw.size === "number" &&
    Number.isFinite(raw.size) &&
    typeof raw.createdAt === "string";
  if (!valid) return null;
  return {
    id: raw.id as string,
    author: raw.author as string,
    message: raw.message as string,
    shape: isGiftShape(raw.shape) ? raw.shape : "box",
    color: raw.color as string,
    size: raw.size as number,
    createdAt: raw.createdAt as string,
  };
}

export function parseGifts(values: unknown): Gift[] {
  if (!Array.isArray(values)) return [];
  return values.map(parseGift).filter((gift): gift is Gift => gift !== null).sort(compareGifts);
}

export function compareGifts(a: Gift, b: Gift): number {
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id.localeCompare(b.id);
}
