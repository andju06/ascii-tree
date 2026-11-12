import type { Gift } from "@/gifts/Gift";
import { validateNewGift } from "@/gifts/validation";
import { clientIp, readJson, sha256Hex } from "./request";
import type { RecentWrites } from "./RecentWrites";
import type { ReplyStore } from "./ReplyStore";
import type { GiftStore } from "./GiftStore";

export interface GiftApiConfig {
  readonly listLimit: number;
  readonly maxBodyBytes: number;
  readonly cooldownSeconds: number;
  /** Secret mixed into client IP hashes so raw IPs are never stored. */
  readonly ipSalt: string;
}

export const DEFAULT_GIFT_API_CONFIG: Omit<GiftApiConfig, "ipSalt"> = {
  listLimit: 200,
  maxBodyBytes: 2048,
  cooldownSeconds: 30,
};

function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/** Framework-agnostic request handling for `GET/POST /gifts` on top of a `GiftStore`. */
export class GiftApi {
  constructor(
    private readonly store: GiftStore,
    private readonly replies: ReplyStore,
    private readonly recent: RecentWrites,
    private readonly config: GiftApiConfig,
  ) {}

  async list(url: URL): Promise<Response> {
    const sinceParam = url.searchParams.get("since");
    if (sinceParam === null) {
      const gifts = await this.store.latest(this.config.listLimit);
      const replies = await this.replies.forParents(gifts.map((gift) => gift.id));
      return Response.json({ gifts, replies });
    }

    const since = new Date(sinceParam);
    if (Number.isNaN(since.getTime())) return errorResponse("since 값이 올바르지 않습니다.", 400);
    const [gifts, replies] = await Promise.all([
      this.store.createdAfter(since, this.config.listLimit),
      this.replies.createdAfter(since, this.config.listLimit),
    ]);
    return Response.json({ gifts, replies });
  }

  async create(request: Request): Promise<Response> {
    const { maxBodyBytes, cooldownSeconds, ipSalt } = this.config;
    const body = await readJson(request, maxBodyBytes);
    if (!body.ok) return body.response;

    const result = validateNewGift(body.value);
    if (!result.ok) return errorResponse(result.error, 400);

    const ipHash = await sha256Hex(`${ipSalt}:${clientIp(request)}`);
    const now = new Date();
    if (await this.recent.hasRecentFrom(ipHash, new Date(now.getTime() - cooldownSeconds * 1000))) {
      return errorResponse(`${cooldownSeconds}초 후에 다시 선물할 수 있어요.`, 429);
    }

    const gift: Gift = { ...result.value, id: crypto.randomUUID(), createdAt: now.toISOString() };
    await this.store.insert(gift, ipHash);
    return Response.json({ gift }, { status: 201 });
  }
}
