"use client";

import { useEffect, useState } from "react";
import type { PasswordStatus } from "@/server/UserStore";
import type { TreeFeatures } from "@/spaces/features";
import { AccountForm } from "./AccountForm";

interface AccountView {
  readonly loginId: string;
  readonly passwordStatus: PasswordStatus;
  readonly slug: string | null;
  readonly name: string | null;
  readonly features: TreeFeatures | null;
}

/** Opens 내정보 when the tree dispatches `account-open`. */
export function AccountGate() {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState<AccountView | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const show = () => {
      setOpen(true);
      setError("");
      setAccount(null);
    };
    window.addEventListener("account-open", show);
    return () => window.removeEventListener("account-open", show);
  }, []);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    void fetch("/api/spaces", { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as (AccountView & { error?: unknown }) | null;
        if (!response.ok || !body || typeof body.loginId !== "string") {
          setError(typeof body?.error === "string" ? body.error : "내정보를 불러오지 못했습니다.");
          return;
        }
        setAccount({
          loginId: body.loginId,
          passwordStatus: body.passwordStatus === "temporary" ? "temporary" : "confirmed",
          slug: typeof body.slug === "string" ? body.slug : null,
          name: typeof body.name === "string" ? body.name : null,
          features: body.features,
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("내정보를 불러오지 못했습니다.");
      });
    return () => controller.abort();
  }, [open]);

  if (!open) return null;
  if (!account) {
    return (
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="내정보"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <section className="auth-card">
          <h1>
            내정보
            <button type="button" className="hud-icon" aria-label="닫기" title="닫기" onClick={() => setOpen(false)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12" />
                <path d="M18 6L6 18" />
              </svg>
            </button>
          </h1>
          <p>{error || "확인 중입니다."}</p>
        </section>
      </div>
    );
  }
  return <AccountForm {...account} onClose={() => setOpen(false)} />;
}
