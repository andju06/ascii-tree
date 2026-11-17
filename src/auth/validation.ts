export const AUTH_LIMITS = {
  loginIdMin: 3,
  loginIdMax: 20,
  passwordMin: 8,
  passwordMax: 72,
} as const;

export type AuthCredentials = {
  readonly loginId: string;
  readonly password: string;
};

export type ValidationResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };

const LOGIN_ID = /^[a-z0-9가-힣][a-z0-9가-힣_-]{2,19}$/;
const LEGACY_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCredentials(input: unknown, mode: "login" | "signup"): ValidationResult<AuthCredentials> {
  if (typeof input !== "object" || input === null) return { ok: false, error: "잘못된 요청입니다." };
  const raw = input as Record<string, unknown>;
  const source = typeof raw.loginId === "string" ? raw.loginId : typeof raw.email === "string" ? raw.email : "";
  const loginId = source.trim().toLowerCase();

  const validId = LOGIN_ID.test(loginId);
  const legacyEmail = mode === "login" && LEGACY_EMAIL.test(loginId) && loginId.length <= 254;
  if (!validId && !legacyEmail) {
    return { ok: false, error: `아이디는 ${AUTH_LIMITS.loginIdMin}자 이상 ${AUTH_LIMITS.loginIdMax}자 이하이며 영문, 숫자, 한글, _, - 만 사용할 수 있습니다.` };
  }

  const password = typeof raw.password === "string" ? raw.password : "";
  if (password.length < AUTH_LIMITS.passwordMin || password.length > AUTH_LIMITS.passwordMax) {
    return { ok: false, error: `비밀번호는 ${AUTH_LIMITS.passwordMin}자 이상 ${AUTH_LIMITS.passwordMax}자 이하로 입력해 주세요.` };
  }

  return { ok: true, value: { loginId, password } };
}
