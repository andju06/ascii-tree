export const PASSCODE_LIMITS = {
  min: 4,
  max: 20,
} as const;

export type PasscodeResult = { readonly ok: true; readonly value: string } | { readonly ok: false; readonly error: string };

/** Short guestbook password. It is not an account password. */
export function validatePasscode(value: unknown): PasscodeResult {
  const passcode = typeof value === "string" ? value : "";
  if (passcode.length < PASSCODE_LIMITS.min || passcode.length > PASSCODE_LIMITS.max) {
    return {
      ok: false,
      error: `비밀번호는 ${PASSCODE_LIMITS.min}자 이상 ${PASSCODE_LIMITS.max}자 이하로 입력해 주세요.`,
    };
  }
  return { ok: true, value: passcode };
}
