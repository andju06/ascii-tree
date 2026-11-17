const REQUEST_TIMEOUT_MS = 8000;

async function readError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
  return typeof body?.error === "string" ? body.error : fallback;
}

/** Edits one guestbook entry on a personal tree. The server checks the entry password. */
export class EntryLockClient {
  constructor(private readonly baseUrl: string) {}

  async update(id: string, author: string, message: string, passcode: string): Promise<void> {
    const response = await fetch(this.url("gifts", id), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ author, message, passcode }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(await readError(response, "수정하지 못했습니다."));
  }

  async remove(id: string, passcode: string): Promise<void> {
    const response = await fetch(this.url("gifts", id), {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ passcode }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(await readError(response, "삭제하지 못했습니다."));
  }

  async check(kind: "gift" | "reply", id: string, passcode: string): Promise<void> {
    const path = kind === "gift" ? `gifts/${encodeURIComponent(id)}/passcode` : `replies/${encodeURIComponent(id)}`;
    const response = await fetch(this.base(path), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ passcode }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(await readError(response, "비밀번호가 올바르지 않습니다."));
  }

  async updateReply(id: string, author: string, message: string, passcode: string): Promise<void> {
    const response = await fetch(this.url("replies", id), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ author, message, passcode }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(await readError(response, "수정하지 못했습니다."));
  }

  async removeReply(id: string, passcode: string): Promise<void> {
    const response = await fetch(this.url("replies", id), {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ passcode }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(await readError(response, "삭제하지 못했습니다."));
  }

  private url(kind: "gifts" | "replies", id: string): string {
    return this.base(`${kind}/${encodeURIComponent(id)}`);
  }

  private base(path: string): string {
    return `${this.baseUrl.replace(/\/+$/, "")}/${path}`;
  }
}
