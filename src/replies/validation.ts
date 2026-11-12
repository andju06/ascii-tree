import { REPLY_LIMITS, type NewReply, type Reply } from "./Reply";

export type ValidationResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };

const CONTROL_CHARS = /[\u0000-\u0009\u000b-\u001f\u007f]/g;

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.replace(CONTROL_CHARS, "").trim() : "";
}

export function validateNewReply(input: unknown): ValidationResult<NewReply> {
  if (typeof input !== "object" || input === null) return { ok: false, error: "잘못된 요청입니다." };
  const raw = input as Record<string, unknown>;

  const parentId = cleanText(raw.parentId);
  if (parentId.length === 0 || parentId.length > 80) return { ok: false, error: "답글을 달 글을 찾지 못했습니다." };

  const author = cleanText(raw.author);
  if (author.length === 0) return { ok: false, error: "닉네임을 입력해 주세요." };
  if (author.length > REPLY_LIMITS.authorMax) {
    return { ok: false, error: `닉네임은 ${REPLY_LIMITS.authorMax}자 이하로 입력해 주세요.` };
  }

  const message = cleanText(raw.message);
  if (message.length === 0) return { ok: false, error: "메시지를 입력해 주세요." };
  if (message.length > REPLY_LIMITS.messageMax) {
    return { ok: false, error: `메시지는 ${REPLY_LIMITS.messageMax}자 이하로 입력해 주세요.` };
  }

  return { ok: true, value: { parentId, author, message } };
}

export function parseReply(value: unknown): Reply | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const valid =
    typeof raw.id === "string" &&
    typeof raw.parentId === "string" &&
    typeof raw.author === "string" &&
    typeof raw.message === "string" &&
    typeof raw.createdAt === "string";
  if (!valid) return null;
  return {
    id: raw.id as string,
    parentId: raw.parentId as string,
    author: raw.author as string,
    message: raw.message as string,
    createdAt: raw.createdAt as string,
  };
}

export function parseReplies(values: unknown): Reply[] {
  if (!Array.isArray(values)) return [];
  return values.map(parseReply).filter((reply): reply is Reply => reply !== null).sort(compareReplies);
}

/** Oldest first, so a thread reads from top to bottom. */
export function compareReplies(a: Reply, b: Reply): number {
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id.localeCompare(b.id);
}
