import type { Gift, NewGift } from "./Gift";
import type { GiftRepository } from "./GiftRepository";
import { parseGift, parseGifts } from "./validation";

const REQUEST_TIMEOUT_MS = 8000;

/** Talks to the Cloudflare Worker API; new gifts from other visitors arrive by polling. */
export class HttpGiftRepository implements GiftRepository {
  private latest = "";

  constructor(
    private readonly baseUrl: string,
    private readonly pollMs = 10_000,
  ) {}

  async list(): Promise<Gift[]> {
    const gifts = await this.fetchGifts();
    this.track(gifts);
    return gifts;
  }

  async create(input: NewGift): Promise<Gift> {
    const response = await fetch(this.url("/gifts"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message = (body as { error?: unknown } | null)?.error;
      throw new Error(typeof message === "string" ? message : `선물을 저장하지 못했습니다. (HTTP ${response.status})`);
    }
    const gift = parseGift((body as { gift?: unknown } | null)?.gift);
    if (!gift) throw new Error("서버 응답 형식이 올바르지 않습니다.");
    this.track([gift]);
    return gift;
  }

  subscribe(listener: (gifts: Gift[]) => void): () => void {
    let stopped = false;
    const poll = async (): Promise<void> => {
      try {
        const gifts = await this.fetchGifts(this.latest);
        if (!stopped && gifts.length > 0) {
          this.track(gifts);
          listener(gifts);
        }
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

  private async fetchGifts(since?: string): Promise<Gift[]> {
    const query = since ? `?since=${encodeURIComponent(since)}` : "";
    const response = await fetch(this.url(`/gifts${query}`), { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body: unknown = await response.json();
    return parseGifts((body as { gifts?: unknown } | null)?.gifts);
  }

  private track(gifts: readonly Gift[]): void {
    for (const gift of gifts) if (gift.createdAt > this.latest) this.latest = gift.createdAt;
  }

  private url(path: string): string {
    return `${this.baseUrl.replace(/\/+$/, "")}${path}`;
  }
}
