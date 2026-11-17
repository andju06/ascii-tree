export const AUTH_LIMITS = {
  emailMax: 254,
  passwordMin: 8,
  passwordMax: 72,
} as const;

export type AuthCredentials = {
  readonly email: string;
  readonly password: string;
};

export type ValidationResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCredentials(input: unknown): ValidationResult<AuthCredentials> {
  if (typeof input !== "object" || input === null) return { ok: false, error: "잘못된 요청입니다." };
  const raw = input as Record<string, unknown>;

  const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(email) || email.length > AUTH_LIMITS.emailMax) {
    return { ok: false, error: "이메일 형식을 확인해 주세요." };
  }

  const password = typeof raw.password === "string" ? raw.password : "";
  if (password.length < AUTH_LIMITS.passwordMin || password.length > AUTH_LIMITS.passwordMax) {
    return { ok: false, error: `비밀번호는 ${AUTH_LIMITS.passwordMin}자 이상 ${AUTH_LIMITS.passwordMax}자 이하로 입력해 주세요.` };
  }

  return { ok: true, value: { email, password } };
}
