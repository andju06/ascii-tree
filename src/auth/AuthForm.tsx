"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AUTH_LIMITS, validateCredentials } from "./validation";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { readonly mode: Mode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/auth/session", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { email?: unknown };
        if (typeof body.email === "string") setSessionEmail(body.email);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "signup" && password !== confirm) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    const result = validateCredentials({ email, password });
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setPending(true);
    setError("");
    try {
      const response = await fetch(mode === "signup" ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(result.value),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
        setError(typeof body?.error === "string" ? body.error : "요청에 실패했습니다.");
        return;
      }
      window.location.assign("/");
    } catch {
      setError("요청에 실패했습니다.");
    } finally {
      setPending(false);
    }
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
      setSessionEmail(null);
    } catch {
      setError("로그아웃에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  const title = mode === "signup" ? "회원가입" : "로그인";

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={(event) => void onSubmit(event)}>
        <h1>{title}</h1>
        {sessionEmail ? (
          <p className="auth-session">
            {sessionEmail} 로 로그인되어 있습니다.
            <button type="button" onClick={() => void logout()} disabled={pending}>
              로그아웃
            </button>
          </p>
        ) : null}
        <label>
          이메일
          <input
            type="email"
            name="email"
            autoComplete="email"
            maxLength={AUTH_LIMITS.emailMax}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          비밀번호
          <input
            type="password"
            name="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={AUTH_LIMITS.passwordMin}
            maxLength={AUTH_LIMITS.passwordMax}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {mode === "signup" ? (
          <label>
            비밀번호 확인
            <input
              type="password"
              name="confirm"
              autoComplete="new-password"
              minLength={AUTH_LIMITS.passwordMin}
              maxLength={AUTH_LIMITS.passwordMax}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
            />
          </label>
        ) : null}
        {error ? <p className="auth-error">{error}</p> : null}
        <button type="submit" disabled={pending}>
          {title}
        </button>
        <p className="auth-links">
          {mode === "signup" ? <a href="/login">로그인</a> : <a href="/signup">회원가입</a>}
          <a href="/admin">관리</a>
          <a href="/">트리로 돌아가기</a>
        </p>
      </form>
    </main>
  );
}
