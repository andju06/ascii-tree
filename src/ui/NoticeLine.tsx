"use client";

import { useEffect, useState } from "react";

/** One public notice under the top controls. Renders nothing when there is no notice. */
export function NoticeLine() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/notices", { signal: controller.signal })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((body: unknown) => {
        const notice = (body as { notice?: { message?: unknown } } | null)?.notice;
        if (typeof notice?.message === "string" && notice.message.length > 0) setMessage(notice.message);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (!message) return null;
  return <p className="notice-line">{message}</p>;
}
