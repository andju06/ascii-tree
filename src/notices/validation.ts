import { NOTICE_LIMITS, type Notice } from "./Notice";

export type ValidationResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

export function validateNoticeMessage(input: unknown): ValidationResult<{ message: string }> {
  if (typeof input !== "object" || input === null) return { ok: false, error: "잘못된 요청입니다." };
  const raw = input as Record<string, unknown>;
  const message = typeof raw.message === "string" ? raw.message.replace(CONTROL_CHARS, "").trim() : "";
  if (message.length === 0) return { ok: false, error: "공지를 입력해 주세요." };
  if (message.length > NOTICE_LIMITS.messageMax) {
    return { ok: false, error: `공지는 ${NOTICE_LIMITS.messageMax}자 이하로 입력해 주세요.` };
  }
  return { ok: true, value: { message } };
}

export function parseNotice(value: unknown): Notice | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || typeof raw.message !== "string") return null;
  if (typeof raw.createdAt !== "string" || typeof raw.updatedAt !== "string") return null;
  return { id: raw.id, message: raw.message, createdAt: raw.createdAt, updatedAt: raw.updatedAt };
}
