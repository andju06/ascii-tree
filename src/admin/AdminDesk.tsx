"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Gift } from "@/gifts/Gift";
import { GIFT_LIMITS } from "@/gifts/Gift";
import { parseGifts } from "@/gifts/validation";
import type { Reply } from "@/replies/Reply";
import { REPLY_LIMITS } from "@/replies/Reply";
import { parseReplies } from "@/replies/validation";
import { TreeAdmin } from "./TreeAdmin";
import { TreeCommentAdmin } from "./TreeCommentAdmin";
import { UserAdmin } from "./UserAdmin";
import { AdminSkeleton } from "./AdminSkeleton";

type EditTarget = { readonly kind: "gift" | "reply"; readonly id: string };
type Tab = "main" | "users" | "trees" | "comments";

export function AdminDesk() {
  const [gate, setGate] = useState<"loading" | "guest" | "forbidden" | "ready">("loading");
  const [loginId, setLoginId] = useState("");
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [author, setAuthor] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [tab, setTab] = useState<Tab>("main");
  const [mainLoading, setMainLoading] = useState(true);

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

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      const session = await fetch("/api/auth/session", { signal: controller.signal });
      if (session.status === 401) {
        setGate("guest");
        return;
      }
      const body = (await session.json()) as { admin?: unknown; loginId?: unknown };
      if (!session.ok || body.admin !== true) {
        if (typeof body.loginId === "string") setLoginId(body.loginId);
        setGate(session.status === 401 ? "guest" : "forbidden");
        return;
      }
      setGate("ready");
      const bookResponse = await fetch("/api/gifts", { signal: controller.signal });
      const bookBody = (await bookResponse.json()) as { gifts?: unknown; replies?: unknown };
      if (!bookResponse.ok) {
        setError("댓글을 불러오지 못했습니다.");
        return;
      }
      setGifts([...parseGifts(bookBody.gifts)].reverse());
      setReplies(parseReplies(bookBody.replies));
    })().catch(() => {
      if (!controller.signal.aborted) setGate("forbidden");
    }).finally(() => {
      if (!controller.signal.aborted) setMainLoading(false);
    });
    return () => controller.abort();
  }, []);

  function beginEdit(target: EditTarget, nextAuthor: string, nextMessage: string) {
    setEditing(target);
    setAuthor(nextAuthor);
    setMessage(nextMessage);
    setError("");
  }

  async function saveEdit() {
    if (!editing) return;
    const path = editing.kind === "gift" ? `/api/admin/gifts/${editing.id}` : `/api/admin/replies/${editing.id}`;
    const payload = { author, message };
    setPending(true);
    setError("");
    try {
      const response = await fetch(path, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
      if (!response.ok) {
        setError(typeof body?.error === "string" ? body.error : "저장하지 못했습니다.");
        return;
      }
      applyEdit(editing, author, message);
      setEditing(null);
    } catch {
      setError("저장하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function remove(target: EditTarget) {
    if (!window.confirm("삭제할까요?")) return;
    const path = target.kind === "gift" ? `/api/admin/gifts/${target.id}` : `/api/admin/replies/${target.id}`;
    setPending(true);
    setError("");
    try {
      const response = await fetch(path, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
        setError(typeof body?.error === "string" ? body.error : "삭제하지 못했습니다.");
        return;
      }
      if (target.kind === "gift") {
        setGifts((current) => current.filter((item) => item.id !== target.id));
        setReplies((current) => current.filter((item) => item.parentId !== target.id));
      }
      if (target.kind === "reply") setReplies((current) => current.filter((item) => item.id !== target.id));
      if (editing?.id === target.id) setEditing(null);
    } catch {
      setError("삭제하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  function applyEdit(target: EditTarget, nextAuthor: string, nextMessage: string) {
    if (target.kind === "gift") {
      setGifts((current) => current.map((item) => (item.id === target.id ? { ...item, author: nextAuthor, message: nextMessage } : item)));
      return;
    }
    setReplies((current) => current.map((item) => (item.id === target.id ? { ...item, author: nextAuthor, message: nextMessage } : item)));
  }

  if (gate === "loading") {
    return (
      <main className="auth-page admin-page">
        <section className="auth-card admin-card" aria-busy="true">
          <h1>관리</h1>
          <AdminSkeleton />
        </section>
      </main>
    );
  }
  if (gate === "guest") {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>관리</h1>
          <p>로그인이 필요합니다.</p>
          <p className="auth-links">
            <a href="/login?next=/admin">로그인</a>
            <Link href="/">트리로 돌아가기</Link>
          </p>
        </section>
      </main>
    );
  }
  if (gate === "forbidden") {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>관리</h1>
          {loginId ? <p className="auth-session">{loginId} 로 로그인되어 있습니다.</p> : null}
          <p className="auth-links">
            <Link href="/">트리로 돌아가기</Link>
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page admin-page">
      <section className="auth-card admin-card">
        <h1>관리</h1>
        <p className="auth-links">
          <a href="/account">내정보</a>
          <Link href="/">트리로 돌아가기</Link>
          <button type="button" disabled={pending} onClick={() => void logout()}>
            로그아웃
          </button>
        </p>
        <nav className="admin-tabs">
          <button type="button" aria-selected={tab === "main"} onClick={() => setTab("main")}>
            메인 댓글
          </button>
          <button type="button" aria-selected={tab === "users"} onClick={() => setTab("users")}>
            유저
          </button>
          <button type="button" aria-selected={tab === "trees"} onClick={() => setTab("trees")}>
            유저 트리
          </button>
          <button type="button" aria-selected={tab === "comments"} onClick={() => setTab("comments")}>
            트리 댓글
          </button>
        </nav>
        {error && tab === "main" ? <p className="auth-error">{error}</p> : null}
        {tab === "users" ? <UserAdmin /> : null}
        {tab === "trees" ? <TreeAdmin /> : null}
        {tab === "comments" ? <TreeCommentAdmin /> : null}
        {tab === "main" ? (
          <>
        <h2>메인 댓글</h2>
        {mainLoading ? <AdminSkeleton /> : null}
        {!mainLoading && !error && gifts.length === 0 ? <p className="auth-note">댓글이 없습니다.</p> : null}
        {mainLoading ? null : gifts.map((gift) => (
          <article key={gift.id} className="admin-entry">
            {editing?.kind === "gift" && editing.id === gift.id ? (
              <Editor
                author={author}
                message={message}
                authorMax={GIFT_LIMITS.authorMax}
                messageMax={GIFT_LIMITS.messageMax}
                showAuthor
                pending={pending}
                onAuthor={setAuthor}
                onMessage={setMessage}
                onSave={() => void saveEdit()}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <>
                <p>
                  <strong>{gift.author}</strong> {gift.message}
                </p>
                <div className="admin-actions">
                  <button type="button" disabled={pending} onClick={() => beginEdit({ kind: "gift", id: gift.id }, gift.author, gift.message)}>
                    수정
                  </button>
                  <button type="button" disabled={pending} onClick={() => void remove({ kind: "gift", id: gift.id })}>
                    삭제
                  </button>
                </div>
              </>
            )}
            {replies
              .filter((reply) => reply.parentId === gift.id)
              .map((reply) => (
                <div key={reply.id} className="admin-reply">
                  {editing?.kind === "reply" && editing.id === reply.id ? (
                    <Editor
                      author={author}
                      message={message}
                      authorMax={REPLY_LIMITS.authorMax}
                      messageMax={REPLY_LIMITS.messageMax}
                      showAuthor
                      pending={pending}
                      onAuthor={setAuthor}
                      onMessage={setMessage}
                      onSave={() => void saveEdit()}
                      onCancel={() => setEditing(null)}
                    />
                  ) : (
                    <>
                      <p>
                        <strong>{reply.author}</strong> {reply.message}
                      </p>
                      <div className="admin-actions">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => beginEdit({ kind: "reply", id: reply.id }, reply.author, reply.message)}
                        >
                          수정
                        </button>
                        <button type="button" disabled={pending} onClick={() => void remove({ kind: "reply", id: reply.id })}>
                          삭제
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
          </article>
        ))}
          </>
        ) : null}
      </section>
    </main>
  );
}

function Editor({
  author,
  message,
  authorMax,
  messageMax,
  showAuthor,
  pending,
  onAuthor,
  onMessage,
  onSave,
  onCancel,
}: {
  readonly author: string;
  readonly message: string;
  readonly authorMax: number;
  readonly messageMax: number;
  readonly showAuthor: boolean;
  readonly pending: boolean;
  readonly onAuthor: (value: string) => void;
  readonly onMessage: (value: string) => void;
  readonly onSave: () => void;
  readonly onCancel: () => void;
}) {
  return (
    <>
      {showAuthor ? <input maxLength={authorMax} value={author} onChange={(event) => onAuthor(event.target.value)} /> : null}
      <textarea maxLength={messageMax} value={message} onChange={(event) => onMessage(event.target.value)} />
      <div className="admin-actions">
        <button type="button" disabled={pending} onClick={onSave}>
          저장
        </button>
        <button type="button" disabled={pending} onClick={onCancel}>
          취소
        </button>
      </div>
    </>
  );
}

