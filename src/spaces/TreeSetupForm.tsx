"use client";

import { useState, type FormEvent } from "react";
import type { TreeFeatures } from "@/spaces/features";
import { FeatureChoices } from "@/spaces/FeatureChoices";
import { TREE_NAME_LIMIT } from "@/spaces/treeName";

export function TreeSetupForm({ defaultName }: { readonly defaultName: string }) {
  const [name, setName] = useState(defaultName);
  const [features, setFeatures] = useState<TreeFeatures>({ rudolph: true, santa: true, snowman: true });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/spaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...features, name }),
      });
      if (response.status === 409) {
        window.location.assign("/me");
        return;
      }
      const body = (await response.json().catch(() => null)) as { slug?: unknown; error?: unknown } | null;
      if (!response.ok || typeof body?.slug !== "string") {
        setError(typeof body?.error === "string" ? body.error : "트리를 만들지 못했습니다.");
        return;
      }
      window.location.assign(`/t/${body.slug}`);
    } catch {
      setError("트리를 만들지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card setup-card" onSubmit={(event) => void onSubmit(event)}>
        <h1>트리 꾸미기</h1>
        <p className="auth-note">고른 장식만 트리에 남습니다. 이름과 장식은 나중에 내정보에서 바꿀 수 있습니다.</p>
        <label>
          트리 이름
          <input
            name="tree-name"
            value={name}
            maxLength={TREE_NAME_LIMIT.max}
            required
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <p className="auth-note">
          {TREE_NAME_LIMIT.min}~{TREE_NAME_LIMIT.max}자
        </p>
        <FeatureChoices features={features} onChange={setFeatures} />
        {error ? <p className="auth-error">{error}</p> : null}
        <button type="submit" disabled={pending}>
          트리 만들기
        </button>
      </form>
    </main>
  );
}
