"use client";

import { useEffect, useState } from "react";
import type { Gift } from "@/gifts/Gift";
import { GIFT_LIMITS } from "@/gifts/Gift";
import { parseGifts } from "@/gifts/validation";
import { NOTICE_LIMITS, type Notice } from "@/notices/Notice";
import { parseNotice } from "@/notices/validation";
import type { Reply } from "@/replies/Reply";
import { REPLY_LIMITS } from "@/replies/Reply";
import { parseReplies } from "@/replies/validation";

type EditTarget = { readonly kind: "notice" | "gift" | "reply"; readonly id: string };

export function AdminDesk() {
  const [gate, setGate] = useState<"loading" | "guest" | "forbidden" | "ready">("loading");
  const [notices, setNotices] = useState<Notice[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [author, setAuthor] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      const session = await fetch("/api/auth/session", { signal: controller.signal });
      if (session.status === 401) {
        setGate("guest");
        return;
      }
      const body = (await session.json()) as { admin?: unknown };
      if (!session.ok || body.admin !== true) {
        setGate("forbidden");
        return;
      }
      const [noticeResponse, bookResponse] = await Promise.all([
        fetch("/api/admin/notices", { signal: controller.signal }),
        fetch("/api/gifts", { signal: controller.signal }),
      ]);
      const noticeBody = (await noticeResponse.json()) as { notices?: unknown };
      const bookBody = (await bookResponse.json()) as { gifts?: unknown; replies?: unknown };
      setNotices(parseNoticeList(noticeBody.notices));
      setGifts([...parseGifts(bookBody.gifts)].reverse());
      setReplies(parseReplies(bookBody.replies));
      setGate("ready");
    })().catch(() => {
      if (!controller.signal.aborted) setGate("forbidden");
    });
    return () => controller.abort();
  }, []);

  async function createNotice() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/notices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: draft }),
      });
      const body = (await response.json().catch(() => null)) as { notice?: unknown; error?: unknown } | null;
      const notice = parseNotice(body?.notice);
      if (!response.ok || !notice) {
        setError(typeof body?.error === "string" ? body.error : "공지를 올리지 못했습니다.");
        return;
      }
      setNotices((current) => [notice, ...current.filter((item) => item.id !== notice.id)]);
      setDraft("");
    } catch {
      setError("공지를 올리지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  function beginEdit(target: EditTarget, nextAuthor: string, nextMessage: string) {
    setEditing(target);
    setAuthor(nextAuthor);
    setMessage(nextMessage);
    setError("");
  }

  async function saveEdit() {
    if (!editing) return;
    const path =
      editing.kind === "notice"
        ? `/api/admin/notices/${editing.id}`
        : editing.kind === "gift"
          ? `/api/admin/gifts/${editing.id}`
          : `/api/admin/replies/${editing.id}`;
    const payload = editing.kind === "notice" ? { message } : { author, message };
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
    const path =
      target.kind === "notice"
        ? `/api/admin/notices/${target.id}`
        : target.kind === "gift"
          ? `/api/admin/gifts/${target.id}`
          : `/api/admin/replies/${target.id}`;
    setPending(true);
    setError("");
    try {
      const response = await fetch(path, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
        setError(typeof body?.error === "string" ? body.error : "삭제하지 못했습니다.");
        return;
      }
      if (target.kind === "notice") setNotices((current) => current.filter((item) => item.id !== target.id));
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
    if (target.kind === "notice") {
      setNotices((current) =>
        current.map((item) => (item.id === target.id ? { ...item, message: nextMessage, updatedAt: new Date().toISOString() } : item)),
      );
      return;
    }
    if (target.kind === "gift") {
      setGifts((current) => current.map((item) => (item.id === target.id ? { ...item, author: nextAuthor, message: nextMessage } : item)));
      return;
    }
    setReplies((current) => current.map((item) => (item.id === target.id ? { ...item, author: nextAuthor, message: nextMessage } : item)));
  }

  if (gate === "loading") {
    return (
      <main className="auth-page">
        <p>확인 중입니다.</p>
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
            <a href="/login">로그인</a>
            <a href="/">트리로 돌아가기</a>
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
          <p>관리자만 들어갈 수 있습니다.</p>
          <p className="auth-links">
            <a href="/">트리로 돌아가기</a>
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
          <a href="/">트리로 돌아가기</a>
        </p>
        {error ? <p className="auth-error">{error}</p> : null}

        <h2>공지</h2>
        <label>
          새 공지
          <input maxLength={NOTICE_LIMITS.messageMax} value={draft} onChange={(event) => setDraft(event.target.value)} />
        </label>
        <button type="button" disabled={pending || draft.trim().length === 0} onClick={() => void createNotice()}>
          공지 올리기
        </button>
        {notices.map((notice) => (
          <article key={notice.id} className="admin-entry">
            {editing?.kind === "notice" && editing.id === notice.id ? (
              <Editor
                author=""
                message={message}
                authorMax={GIFT_LIMITS.authorMax}
                messageMax={NOTICE_LIMITS.messageMax}
                showAuthor={false}
                pending={pending}
                onAuthor={setAuthor}
                onMessage={setMessage}
                onSave={() => void saveEdit()}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <>
                <p>{notice.message}</p>
                <div className="admin-actions">
                  <button type="button" disabled={pending} onClick={() => beginEdit({ kind: "notice", id: notice.id }, "", notice.message)}>
                    수정
                  </button>
                  <button type="button" disabled={pending} onClick={() => void remove({ kind: "notice", id: notice.id })}>
                    삭제
                  </button>
                </div>
              </>
            )}
          </article>
        ))}

        <h2>방명록</h2>
        {gifts.map((gift) => (
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

function parseNoticeList(value: unknown): Notice[] {
  if (!Array.isArray(value)) return [];
  return value.map(parseNotice).filter((notice): notice is Notice => notice !== null);
}
