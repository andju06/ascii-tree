"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PasswordField } from "@/auth/PasswordField";
import { validateCredentials } from "@/auth/validation";
import { adminError } from "./adminFetch";

interface UserRow {
  readonly id: string;
  readonly loginId: string;
  readonly createdAt: string;
  readonly passwordStatus: "temporary" | "confirmed";
}

const dateFormat = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" });

export function UserAdmin() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [self, setSelf] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<UserRow["passwordStatus"]>("temporary");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!creating) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setCreating(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [creating]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/users", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          setError(await adminError(response, "계정을 불러오지 못했습니다."));
          return;
        }
        const body = (await response.json()) as { users?: UserRow[]; loginId?: string };
        setUsers(Array.isArray(body.users) ? body.users : []);
        setSelf(typeof body.loginId === "string" ? body.loginId : "");
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("계정을 불러오지 못했습니다.");
      });
    return () => controller.abort();
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirm) {
      setFormError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    const result = validateCredentials({ loginId, password }, "signup");
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setPending(true);
    setFormError("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...result.value, passwordStatus }),
      });
      const body = (await response.json().catch(() => null)) as { user?: UserRow; error?: unknown } | null;
      if (!response.ok || !body?.user?.id) {
        setFormError(typeof body?.error === "string" ? body.error : "아이디를 만들지 못했습니다.");
        return;
      }
      setUsers((current) => [body.user as UserRow, ...current.filter((user) => user.id !== body.user?.id)]);
      setLoginId("");
      setPassword("");
      setConfirm("");
      setPasswordStatus("temporary");
      setCreating(false);
    } catch {
      setFormError("아이디를 만들지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function changeStatus(id: string, next: UserRow["passwordStatus"]) {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passwordStatus: next }),
      });
      if (!response.ok) {
        setError(await adminError(response, "비밀번호 상태를 바꾸지 못했습니다."));
        return;
      }
      setUsers((current) => current.map((user) => (user.id === id ? { ...user, passwordStatus: next } : user)));
    } catch {
      setError("비밀번호 상태를 바꾸지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("이 계정과 그 트리를 삭제할까요?")) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        setError(await adminError(response, "계정을 지우지 못했습니다."));
        return;
      }
      setUsers((current) => current.filter((user) => user.id !== id));
    } catch {
      setError("계정을 지우지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="admin-heading">
        <h2>유저</h2>
        <button type="button" disabled={pending} onClick={() => { setFormError(""); setCreating(true); }}>
          생성
        </button>
      </div>
      {creating ? (
        <div
          className="modal"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setCreating(false);
          }}
        >
          <form className="card" onSubmit={(event) => void create(event)}>
            <header className="console-bar">
              <h3 className="card-title">아이디 만들기</h3>
              <button type="button" className="hud-icon" aria-label="닫기" title="닫기" onClick={() => setCreating(false)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12" />
                  <path d="M18 6L6 18" />
                </svg>
              </button>
            </header>
            <div className="console-body admin-create">
              <label>
                아이디
                <input name="loginId" autoComplete="off" value={loginId} onChange={(event) => setLoginId(event.target.value)} required />
              </label>
              <PasswordField label="비밀번호" name="password" autoComplete="new-password" value={password} onChange={setPassword} />
              <PasswordField label="비밀번호 확인" name="confirm" autoComplete="new-password" value={confirm} onChange={setConfirm} />
              <fieldset className="admin-status">
                <legend>비밀번호 상태</legend>
                <label className="setup-choice">
                  <input type="radio" name="passwordStatus" checked={passwordStatus === "temporary"} onChange={() => setPasswordStatus("temporary")} />
                  <span>임시</span>
                </label>
                <label className="setup-choice">
                  <input type="radio" name="passwordStatus" checked={passwordStatus === "confirmed"} onChange={() => setPasswordStatus("confirmed")} />
                  <span>확정</span>
                </label>
              </fieldset>
              {formError ? <p className="auth-error">{formError}</p> : null}
              <button type="submit" disabled={pending}>
                아이디 만들기
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {error ? <p className="auth-error">{error}</p> : null}
      {users.length === 0 ? <p className="auth-note">계정이 없습니다.</p> : null}
      {users.map((user) => (
        <article key={user.id} className="admin-entry admin-user">
          <div className="admin-user-id">
            <p>
              <strong>{user.loginId}</strong>
              {user.createdAt ? <span>{dateFormat.format(new Date(user.createdAt))}</span> : null}
            </p>
            {user.loginId === self ? <p className="auth-note">현재 로그인한 관리자입니다.</p> : null}
          </div>
          <div className="admin-user-tools">
            <label className="admin-status-choice">
              비밀번호
              <select
                value={user.passwordStatus}
                disabled={pending}
                onChange={(event) => void changeStatus(user.id, event.target.value === "confirmed" ? "confirmed" : "temporary")}
              >
                <option value="temporary">임시</option>
                <option value="confirmed">확정</option>
              </select>
            </label>
            {user.loginId === self ? null : (
              <button type="button" disabled={pending} onClick={() => void remove(user.id)}>
                삭제
              </button>
            )}
          </div>
        </article>
      ))}
    </>
  );
}
