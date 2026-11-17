"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PasswordField } from "@/auth/PasswordField";
import type { PasswordStatus } from "@/server/UserStore";
import type { TreeFeatures } from "@/spaces/features";
import { FeatureChoices } from "@/spaces/FeatureChoices";
import { defaultTreeName, TREE_NAME_LIMIT } from "@/spaces/treeName";

export function AccountForm({
  loginId,
  features,
  name: initialName,
  slug,
  passwordStatus,
  onClose,
}: {
  readonly loginId: string;
  readonly features: TreeFeatures | null;
  readonly name: string | null;
  readonly slug: string | null;
  readonly passwordStatus: PasswordStatus;
  /** When set, closing stays on the current page. */
  readonly onClose?: () => void;
}) {
  const [draft, setDraft] = useState<TreeFeatures | null>(features);
  const [name, setName] = useState(initialName ?? defaultTreeName(loginId));
  const [status, setStatus] = useState(passwordStatus);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setPending(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/spaces", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...draft, name }),
      });
      const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
      if (!response.ok) {
        setError(typeof body?.error === "string" ? body.error : "저장하지 못했습니다.");
        return;
      }
      setSaved(true);
    } catch {
      setError("저장하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function changePassword() {
    if (nextPassword !== confirmPassword) {
      setPasswordError("비밀번호 확인이 일치하지 않습니다.");
      setPasswordSaved(false);
      return;
    }
    setPending(true);
    setPasswordError("");
    setPasswordSaved(false);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: currentPassword, nextPassword }),
      });
      const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
      if (!response.ok) {
        setPasswordError(typeof body?.error === "string" ? body.error : "비밀번호를 바꾸지 못했습니다.");
        return;
      }
      setStatus("confirmed");
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
      setPasswordSaved(true);
    } catch {
      setPasswordError("비밀번호를 바꾸지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  function dismiss() {
    if (onClose) onClose();
    else window.location.assign("/");
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function logout() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setError("로그아웃에 실패했습니다.");
        return;
      }
      window.location.assign("/");
    } catch {
      setError("로그아웃에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-label="내정보"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div className="auth-card setup-card">
        <h1>
          내정보
          <button type="button" className="hud-icon" aria-label="닫기" title="닫기" onClick={dismiss}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </svg>
          </button>
        </h1>
        <p className="auth-session">
          <span>{loginId}</span>
          <button type="button" onClick={() => void logout()} disabled={pending}>
            로그아웃
          </button>
        </p>
        <p className="auth-links">
          {slug ? <a href={`/t/${slug}`}>내 트리 가기</a> : <a href="/me">내 트리 만들기</a>}
        </p>
        {draft ? (
          <form onSubmit={(event) => void onSubmit(event)}>
            <details className="account-settings">
              <summary>트리 설정</summary>
              <p className="auth-note">트리에 남길 이름과 장식을 고칩니다.</p>
              <label>
                트리 이름
                <input
                  name="tree-name"
                  value={name}
                  maxLength={TREE_NAME_LIMIT.max}
                  required
                  onChange={(event) => {
                    setName(event.target.value);
                    setSaved(false);
                  }}
                />
              </label>
              <FeatureChoices
                features={draft}
                onChange={(next) => {
                  setDraft(next);
                  setSaved(false);
                }}
              />
              {error ? <p className="auth-error">{error}</p> : null}
              {saved ? <p className="auth-note">저장했습니다.</p> : null}
              <button type="submit" disabled={pending}>
                저장
              </button>
            </details>
          </form>
        ) : (
          <p className="auth-note">아직 트리가 없습니다.</p>
        )}
        <details className="account-settings">
          <summary>비밀번호 변경</summary>
          {status === "temporary" ? <p className="auth-note">임시 비밀번호입니다. 바꾸면 확정됩니다.</p> : null}
          <PasswordField label="현재 비밀번호" name="current-password" autoComplete="current-password" value={currentPassword} onChange={setCurrentPassword} required={false} />
          <PasswordField label="새 비밀번호" name="next-password" autoComplete="new-password" value={nextPassword} onChange={setNextPassword} required={false} />
          <PasswordField label="새 비밀번호 확인" name="confirm-password" autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} required={false} />
          {passwordError ? <p className="auth-error">{passwordError}</p> : null}
          {passwordSaved ? <p className="auth-note">비밀번호를 바꿨습니다.</p> : null}
          <button type="button" disabled={pending} onClick={() => void changePassword()}>
            비밀번호 바꾸기
          </button>
        </details>
      </div>
    </div>
  );
}
