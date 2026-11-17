"use client";

import { useEffect, useState } from "react";
import type { Gift } from "@/gifts/Gift";
import { GIFT_LIMITS } from "@/gifts/Gift";
import type { Reply } from "@/replies/Reply";
import { REPLY_LIMITS } from "@/replies/Reply";
import { displayTreeName } from "@/spaces/treeName";
import { adminError } from "./adminFetch";
import { AdminSkeleton } from "./AdminSkeleton";

interface EntryRow {
  readonly slug: string;
  readonly loginId: string;
  readonly name: string;
  readonly gift: Gift;
  readonly replies: readonly Reply[];
}

type Target = { readonly slug: string; readonly kind: "gift" | "reply"; readonly id: string };

export function TreeCommentAdmin() {
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [editing, setEditing] = useState<Target | null>(null);
  const [author, setAuthor] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/spaces/entries", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          setError(await adminError(response, "트리 글을 불러오지 못했습니다."));
          return;
        }
        const body = (await response.json()) as { entries?: EntryRow[] };
        setEntries(Array.isArray(body.entries) ? body.entries : []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("트리 글을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  function begin(target: Target, nextAuthor: string, nextMessage: string) {
    setEditing(target);
    setAuthor(nextAuthor);
    setMessage(nextMessage);
    setError("");
  }

  async function save() {
    if (!editing) return;
    const path =
      editing.kind === "gift"
        ? `/api/admin/spaces/${editing.slug}/gifts/${editing.id}`
        : `/api/admin/spaces/${editing.slug}/replies/${editing.id}`;
    setPending(true);
    setError("");
    try {
      const response = await fetch(path, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ author, message }),
      });
      if (!response.ok) {
        setError(await adminError(response, "저장하지 못했습니다."));
        return;
      }
      setEntries((current) =>
        current.map((entry) => {
          if (entry.slug !== editing.slug) return entry;
          if (editing.kind === "gift" && entry.gift.id === editing.id) {
            return { ...entry, gift: { ...entry.gift, author, message } };
          }
          return {
            ...entry,
            replies: entry.replies.map((reply) => (reply.id === editing.id ? { ...reply, author, message } : reply)),
          };
        }),
      );
      setEditing(null);
    } catch {
      setError("저장하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function remove(target: Target) {
    if (!window.confirm("삭제할까요?")) return;
    const path =
      target.kind === "gift"
        ? `/api/admin/spaces/${target.slug}/gifts/${target.id}`
        : `/api/admin/spaces/${target.slug}/replies/${target.id}`;
    setPending(true);
    setError("");
    try {
      const response = await fetch(path, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        setError(await adminError(response, "삭제하지 못했습니다."));
        return;
      }
      setEntries((current) =>
        target.kind === "gift"
          ? current.filter((entry) => !(entry.slug === target.slug && entry.gift.id === target.id))
          : current.map((entry) =>
              entry.slug === target.slug ? { ...entry, replies: entry.replies.filter((reply) => reply.id !== target.id) } : entry,
            ),
      );
      if (editing?.id === target.id) setEditing(null);
    } catch {
      setError("삭제하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h2>트리 댓글</h2>
      {error ? <p className="auth-error">{error}</p> : null}
      {loading ? <AdminSkeleton /> : null}
      {!loading && !error && entries.length === 0 ? <p className="auth-note">글이 없습니다.</p> : null}
      {entries.map((entry) => (
        <article key={`${entry.slug}-${entry.gift.id}`} className="admin-entry">
          <header className="admin-tree-head">
            <h3>{displayTreeName(entry.name, entry.loginId)}</h3>
            <p className="admin-tree-meta">
              <span>{entry.loginId || "알 수 없는 계정"}</span>
              <a href={`/t/${entry.slug}`}>/t/{entry.slug}</a>
            </p>
          </header>
          {editing?.kind === "gift" && editing.id === entry.gift.id ? (
            <TextEditor
              author={author}
              message={message}
              authorMax={GIFT_LIMITS.authorMax}
              messageMax={GIFT_LIMITS.messageMax}
              pending={pending}
              onAuthor={setAuthor}
              onMessage={setMessage}
              onSave={() => void save()}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <CommentText
              author={entry.gift.author}
              message={entry.gift.message}
              pending={pending}
              onEdit={() => begin({ slug: entry.slug, kind: "gift", id: entry.gift.id }, entry.gift.author, entry.gift.message)}
              onRemove={() => void remove({ slug: entry.slug, kind: "gift", id: entry.gift.id })}
            />
          )}
          {entry.replies.map((reply) => (
            <div key={reply.id} className="admin-reply">
              {editing?.kind === "reply" && editing.id === reply.id ? (
                <TextEditor
                  author={author}
                  message={message}
                  authorMax={REPLY_LIMITS.authorMax}
                  messageMax={REPLY_LIMITS.messageMax}
                  pending={pending}
                  onAuthor={setAuthor}
                  onMessage={setMessage}
                  onSave={() => void save()}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <CommentText
                  author={reply.author}
                  message={reply.message}
                  pending={pending}
                  onEdit={() => begin({ slug: entry.slug, kind: "reply", id: reply.id }, reply.author, reply.message)}
                  onRemove={() => void remove({ slug: entry.slug, kind: "reply", id: reply.id })}
                />
              )}
            </div>
          ))}
        </article>
      ))}
    </>
  );
}

function CommentText({
  author,
  message,
  pending,
  onEdit,
  onRemove,
}: {
  readonly author: string;
  readonly message: string;
  readonly pending: boolean;
  readonly onEdit: () => void;
  readonly onRemove: () => void;
}) {
  return (
    <div className="admin-comment">
      <strong>{author}</strong>
      <p>{message}</p>
      <div className="admin-actions">
        <button type="button" disabled={pending} onClick={onEdit}>
          수정
        </button>
        <button type="button" disabled={pending} onClick={onRemove}>
          삭제
        </button>
      </div>
    </div>
  );
}

function TextEditor({
  author,
  message,
  authorMax,
  messageMax,
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
  readonly pending: boolean;
  readonly onAuthor: (value: string) => void;
  readonly onMessage: (value: string) => void;
  readonly onSave: () => void;
  readonly onCancel: () => void;
}) {
  return (
    <>
      <input maxLength={authorMax} value={author} onChange={(event) => onAuthor(event.target.value)} />
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
