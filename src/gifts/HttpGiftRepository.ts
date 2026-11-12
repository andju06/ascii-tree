import type { Gift, NewGift } from "./Gift";
import type { GiftRepository } from "./GiftRepository";
import { parseGift, parseGifts } from "./validation";
import type { NewReply, Reply } from "../replies/Reply";
import type { ReplyRepository } from "../replies/ReplyRepository";
import { compareReplies, parseReply, parseReplies } from "../replies/validation";

const REQUEST_TIMEOUT_MS = 8000;

interface Snapshot {
  readonly gifts: Gift[];
  readonly replies: Reply[];
}

/** Talks to the guestbook API. Gifts and replies share one poll. */
export class HttpGiftRepository implements GiftRepository {
  private latest = "";
  private replyCache: Reply[] = [];
  private readonly replyListeners = new Set<(replies: readonly Reply[]) => void>();
  private readonly replyRepository: ReplyRepository;

  constructor(
    private readonly baseUrl: string,
    private readonly pollMs = 10_000,
  ) {
    this.replyRepository = {
      current: () => this.replyCache,
      create: (input) => this.createReply(input),
      subscribe: (listener) => {
        this.replyListeners.add(listener);
        return () => this.replyListeners.delete(listener);
      },
    };
  }

  replies(): ReplyRepository {
    return this.replyRepository;
  }

  async list(): Promise<Gift[]> {
    const snapshot = await this.fetchSnapshot();
    this.track(snapshot.gifts, snapshot.replies);
    this.replaceReplies(snapshot.replies);
    return snapshot.gifts;
  }

  async create(input: NewGift): Promise<Gift> {
    const response = await fetch(this.url("/gifts"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new Error(errorMessage(body, `선물을 저장하지 못했습니다. (HTTP ${response.status})`));
    const gift = parseGift((body as { gift?: unknown } | null)?.gift);
    if (!gift) throw new Error("서버 응답 형식이 올바르지 않습니다.");
    this.track([gift], []);
    return gift;
  }

  subscribe(listener: (gifts: Gift[]) => void): () => void {
    let stopped = false;
    const poll = async (): Promise<void> => {
      try {
        const snapshot = await this.fetchSnapshot(this.latest);
        if (stopped) return;
        this.track(snapshot.gifts, snapshot.replies);
        if (snapshot.gifts.length > 0) listener(snapshot.gifts);
        if (snapshot.replies.length > 0) this.mergeReplies(snapshot.replies);
      } catch (error) {
        console.warn("[HttpGiftRepository] poll failed", error);
      }
    };
    const timer = window.setInterval(() => void poll(), this.pollMs);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }

  private async createReply(input: NewReply): Promise<Reply> {
    const response = await fetch(this.url("/replies"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new Error(errorMessage(body, `답글을 저장하지 못했습니다. (HTTP ${response.status})`));
    const reply = parseReply((body as { reply?: unknown } | null)?.reply);
    if (!reply) throw new Error("서버 응답 형식이 올바르지 않습니다.");
    this.mergeReplies([reply]);
    this.track([], [reply]);
    return reply;
  }

  private async fetchSnapshot(since?: string): Promise<Snapshot> {
    const query = since ? `?since=${encodeURIComponent(since)}` : "";
    const response = await fetch(this.url(`/gifts${query}`), { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body: unknown = await response.json();
    const record = body as { gifts?: unknown; replies?: unknown } | null;
    return { gifts: parseGifts(record?.gifts), replies: parseReplies(record?.replies) };
  }

  private replaceReplies(replies: readonly Reply[]): void {
    this.replyCache = [...replies].sort(compareReplies);
    this.notifyReplies();
  }

  private mergeReplies(replies: readonly Reply[]): void {
    const byId = new Map(this.replyCache.map((reply) => [reply.id, reply]));
    for (const reply of replies) byId.set(reply.id, reply);
    this.replyCache = [...byId.values()].sort(compareReplies);
    this.notifyReplies();
  }

  private notifyReplies(): void {
    for (const listener of this.replyListeners) listener(this.replyCache);
  }

  private track(gifts: readonly Gift[], replies: readonly Reply[]): void {
    for (const gift of gifts) if (gift.createdAt > this.latest) this.latest = gift.createdAt;
    for (const reply of replies) if (reply.createdAt > this.latest) this.latest = reply.createdAt;
  }

  private url(path: string): string {
    return `${this.baseUrl.replace(/\/+$/, "")}${path}`;
  }
}

function errorMessage(body: unknown, fallback: string): string {
  const message = (body as { error?: unknown } | null)?.error;
  return typeof message === "string" ? message : fallback;
}
