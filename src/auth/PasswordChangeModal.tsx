"use client";

import { useState } from "react";
import { AUTH_LIMITS } from "./validation";
import { PasswordField } from "./PasswordField";

/** Shown as soon as a temporary password is used to sign in. */
export function PasswordChangeModal({
  currentPassword = "",
  onDone,
}: {
  readonly currentPassword?: string;
  readonly onDone: () => void;
}) {
  const [current, setCurrent] = useState(currentPassword);
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function change() {
    if (next !== confirm) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    if (next.length < AUTH_LIMITS.passwordMin || next.length > AUTH_LIMITS.passwordMax) {
      setError(`비밀번호는 ${AUTH_LIMITS.passwordMin}자 이상 ${AUTH_LIMITS.passwordMax}자 이하로 입력해 주세요.`);
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: current, nextPassword: next }),
      });
      const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
      if (!response.ok) {
        setError(typeof body?.error === "string" ? body.error : "비밀번호를 바꾸지 못했습니다.");
        return;
      }
      onDone();
    } catch {
      setError("비밀번호를 바꾸지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  }

  return (
    <div className="modal password-modal" role="dialog" aria-modal="true" aria-label="비밀번호 변경">
      <form
        className="auth-card"
        onSubmit={(event) => {
          event.preventDefault();
          void change();
        }}
      >
        <h1>비밀번호 변경</h1>
        <p className="auth-note">임시 비밀번호입니다. 새 비밀번호를 정하면 확정됩니다.</p>
        {currentPassword ? null : (
          <PasswordField label="현재 비밀번호" name="current-password" autoComplete="current-password" value={current} onChange={setCurrent} />
        )}
        <PasswordField label="새 비밀번호" name="next-password" autoComplete="new-password" value={next} onChange={setNext} />
        <p className="auth-note">
          비밀번호는 {AUTH_LIMITS.passwordMin}자 이상 {AUTH_LIMITS.passwordMax}자 이하로 입력해 주세요.
        </p>
        <PasswordField label="새 비밀번호 확인" name="confirm-password" autoComplete="new-password" value={confirm} onChange={setConfirm} />
        {error ? <p className="auth-error">{error}</p> : null}
        <button type="submit" disabled={pending}>
          비밀번호 확정
        </button>
        <p className="auth-links">
          <button type="button" onClick={() => void logout()}>
            로그아웃
          </button>
        </p>
      </form>
    </div>
  );
}
