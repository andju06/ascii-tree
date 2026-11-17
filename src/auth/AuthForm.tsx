"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PasswordChangeModal } from "./PasswordChangeModal";
import { PasswordField } from "./PasswordField";
import { safeNext } from "./nextPath";
import { AUTH_LIMITS, validateCredentials } from "./validation";

type Mode = "login" | "signup";

export function AuthForm({
  mode,
  next = "/",
  onClose,
}: {
  readonly mode: Mode;
  readonly next?: string;
  /** When set, closing stays on the current page instead of leaving it. */
  readonly onClose?: () => void;
}) {
  const destination = safeNext(next);
  const [currentMode, setCurrentMode] = useState<Mode>(mode);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mustChange, setMustChange] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/auth/session", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { loginId?: unknown; email?: unknown };
        const name = typeof body.loginId === "string" ? body.loginId : body.email;
        if (typeof name === "string") setSessionId(name);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (currentMode === "signup" && password !== confirm) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    const result = validateCredentials({ loginId, password }, currentMode);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setPending(true);
    setError("");
    try {
      const response = await fetch(currentMode === "signup" ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          currentMode === "login" && destination === "/admin" ? { ...result.value, desk: true } : result.value,
        ),
      });
      const body = (await response.json().catch(() => null)) as { error?: unknown; admin?: unknown; passwordStatus?: unknown } | null;
      if (!response.ok) {
        setError(typeof body?.error === "string" ? body.error : "요청에 실패했습니다.");
        return;
      }
      if (currentMode === "login" && body?.passwordStatus === "temporary") {
        setMustChange(true);
        return;
      }
      finish();
    } catch {
      setError("요청에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  function finish() {
    window.location.assign(destination);
  }

  async function logout() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setError("로그아웃에 실패했습니다.");
        return;
      }
      setSessionId(null);
    } catch {
      setError("로그아웃에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  const title = currentMode === "signup" ? "회원가입" : "로그인";

  if (mustChange) {
    return <PasswordChangeModal currentPassword={password} onDone={() => finish()} />;
  }

  function dismiss() {
    if (onClose) onClose();
    else window.location.assign("/");
  }

  function switchMode() {
    setCurrentMode((current) => (current === "signup" ? "login" : "signup"));
    setConfirm("");
    setError("");
  }

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") dismiss();
      }}
    >
      <form className="auth-card" onSubmit={(event) => void onSubmit(event)}>
        <h1>
          {title}
          <button type="button" className="hud-icon" aria-label="닫기" title="닫기" onClick={dismiss}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </svg>
          </button>
        </h1>
        {sessionId ? (
          <p className="auth-session">
            {sessionId} 로 로그인되어 있습니다.
            <span>
              <a href="/account">내정보</a>
              <button type="button" onClick={() => void logout()} disabled={pending}>
                로그아웃
              </button>
            </span>
          </p>
        ) : null}
        <label>
          아이디
          <input
            name="loginId"
            autoComplete="username"
            minLength={AUTH_LIMITS.loginIdMin}
            maxLength={AUTH_LIMITS.loginIdMax}
            value={loginId}
            onChange={(event) => setLoginId(event.target.value)}
            required
          />
        </label>
        <PasswordField
          label="비밀번호"
          name="password"
          autoComplete={currentMode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={setPassword}
        />
        {currentMode === "signup" ? (
          <p className="auth-note">비밀번호는 {AUTH_LIMITS.passwordMin}자 이상 {AUTH_LIMITS.passwordMax}자 이하로 입력해 주세요.</p>
        ) : null}
        {currentMode === "signup" ? (
          <PasswordField
            label="비밀번호 확인"
            name="confirm"
            autoComplete="new-password"
            value={confirm}
            onChange={setConfirm}
          />
        ) : null}
        {error ? <p className="auth-error">{error}</p> : null}
        <button
          type="submit"
          className={pending ? "is-pending" : undefined}
          disabled={pending}
          aria-busy={pending}
          aria-label={pending ? (currentMode === "signup" ? "가입하는 중" : "로그인하는 중") : undefined}
        >
          <span aria-hidden={pending}>{title}</span>
          {pending ? <span className="auth-spinner" /> : null}
        </button>
        <p className="auth-links">
          <button type="button" onClick={switchMode} disabled={pending}>
            {currentMode === "signup" ? "로그인" : "회원가입"}
          </button>
          <button type="button" onClick={dismiss}>
            트리로 돌아가기
          </button>
        </p>
      </form>
    </div>
  );
}
