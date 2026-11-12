import type { Gift } from "@/gifts/Gift";
import { validateNewGift } from "@/gifts/validation";
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

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Framework-agnostic request handling for `GET/POST /gifts` on top of a `GiftStore`. */
export class GiftApi {
  constructor(
    private readonly store: GiftStore,
    private readonly config: GiftApiConfig,
  ) {}

  async list(url: URL): Promise<Response> {
    const sinceParam = url.searchParams.get("since");
    if (sinceParam === null) return Response.json({ gifts: await this.store.latest(this.config.listLimit) });

    const since = new Date(sinceParam);
    if (Number.isNaN(since.getTime())) return errorResponse("since 값이 올바르지 않습니다.", 400);
    return Response.json({ gifts: await this.store.createdAfter(since, this.config.listLimit) });
  }

  async create(request: Request): Promise<Response> {
    const { maxBodyBytes, cooldownSeconds, ipSalt } = this.config;
    if (Number(request.headers.get("content-length") ?? 0) > maxBodyBytes) return errorResponse("요청이 너무 큽니다.", 413);

    const text = await request.text();
    if (new TextEncoder().encode(text).length > maxBodyBytes) return errorResponse("요청이 너무 큽니다.", 413);

    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      return errorResponse("JSON 형식이 올바르지 않습니다.", 400);
    }

    const result = validateNewGift(payload);
    if (!result.ok) return errorResponse(result.error, 400);

    const ipHash = await sha256Hex(`${ipSalt}:${clientIp(request)}`);
    const now = new Date();
    if (await this.store.hasRecentFrom(ipHash, new Date(now.getTime() - cooldownSeconds * 1000))) {
      return errorResponse(`${cooldownSeconds}초 후에 다시 선물할 수 있어요.`, 429);
    }

    const gift: Gift = { ...result.value, id: crypto.randomUUID(), createdAt: now.toISOString() };
    await this.store.insert(gift, ipHash);
    return Response.json({ gift }, { status: 201 });
  }
}
