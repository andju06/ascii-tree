"use client";

import { useEffect, useState } from "react";
import type { TreeFeatures } from "@/spaces/features";
import { displayTreeName } from "@/spaces/treeName";
import { adminError } from "./adminFetch";
import { AdminSkeleton } from "./AdminSkeleton";

interface TreeRow {
  readonly slug: string;
  readonly loginId: string;
  readonly name: string;
  readonly createdAt: string;
  readonly features: TreeFeatures;
}

const dateFormat = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" });

export function TreeAdmin() {
  const [trees, setTrees] = useState<TreeRow[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/spaces", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          setError(await adminError(response, "트리를 불러오지 못했습니다."));
          return;
        }
        const body = (await response.json()) as { trees?: TreeRow[] };
        setTrees(Array.isArray(body.trees) ? body.trees : []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("트리를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  function setFeature(slug: string, key: keyof TreeFeatures, checked: boolean) {
    setTrees((current) =>
      current.map((tree) => (tree.slug === slug ? { ...tree, features: { ...tree.features, [key]: checked } } : tree)),
    );
  }

  async function save(tree: TreeRow) {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/spaces/${tree.slug}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(tree.features),
      });
      if (!response.ok) setError(await adminError(response, "트리를 저장하지 못했습니다."));
    } catch {
      setError("트리를 저장하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function remove(slug: string) {
    if (!window.confirm("이 트리와 그 방명록을 삭제할까요? 계정은 남습니다.")) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/spaces/${slug}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        setError(await adminError(response, "트리를 지우지 못했습니다."));
        return;
      }
      setTrees((current) => current.filter((tree) => tree.slug !== slug));
    } catch {
      setError("트리를 지우지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h2>유저 트리</h2>
      {error ? <p className="auth-error">{error}</p> : null}
      {loading ? <AdminSkeleton /> : null}
      {!loading && !error && trees.length === 0 ? <p className="auth-note">트리가 없습니다.</p> : null}
      {trees.map((tree) => (
        <article key={tree.slug} className="admin-entry">
          <header className="admin-tree-head">
            <h3>{displayTreeName(tree.name, tree.loginId)}</h3>
            <p className="admin-tree-meta">
              <span>{tree.loginId || "알 수 없는 계정"}</span>
              {tree.createdAt ? <time>{dateFormat.format(new Date(tree.createdAt))}</time> : null}
              <a href={`/t/${tree.slug}`}>트리 열기</a>
            </p>
          </header>
          <div className="admin-features">
            <label className="setup-choice">
              <input type="checkbox" checked={tree.features.rudolph} onChange={(event) => setFeature(tree.slug, "rudolph", event.target.checked)} />
              <span>루돌프</span>
            </label>
            <label className="setup-choice">
              <input type="checkbox" checked={tree.features.santa} onChange={(event) => setFeature(tree.slug, "santa", event.target.checked)} />
              <span>산타</span>
            </label>
            <label className="setup-choice">
              <input type="checkbox" checked={tree.features.snowman} onChange={(event) => setFeature(tree.slug, "snowman", event.target.checked)} />
              <span>눈사람</span>
            </label>
          </div>
          <div className="admin-actions">
            <button type="button" disabled={pending} onClick={() => void save(tree)}>
              장식 저장
            </button>
            <button type="button" disabled={pending} onClick={() => void remove(tree.slug)}>
              트리 삭제
            </button>
          </div>
        </article>
      ))}
    </>
  );
}
