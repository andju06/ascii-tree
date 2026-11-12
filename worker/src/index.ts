import type { Gift } from "../../src/gifts/Gift";
import { validateNewGift } from "../../src/gifts/validation";

export interface Env {
  readonly DB: D1Database;
  /** Comma-separated list of allowed origins, or `*`. */
  readonly ALLOWED_ORIGIN: string;
  /** Secret mixed into the client IP hash so raw IPs are never stored. */
  readonly IP_SALT?: string;
}

const LIST_LIMIT = 200;
const MAX_BODY_BYTES = 2048;
const COOLDOWN_SECONDS = 30;

const SELECT_COLUMNS = "id, author, message, shape, color, size, created_at AS createdAt";

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = env.ALLOWED_ORIGIN.split(",").map((value) => value.trim());
  const allowOrigin = allowed.includes("*") ? "*" : allowed.includes(origin) ? origin : "";
  return {
    ...(allowOrigin ? { "Access-Control-Allow-Origin": allowOrigin } : {}),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  });
}

async function hashIp(ip: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${ip}`));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function listGifts(url: URL, env: Env): Promise<Gift[]> {
  const since = url.searchParams.get("since");
  if (since) {
    const { results } = await env.DB.prepare(
      `SELECT ${SELECT_COLUMNS} FROM gifts WHERE created_at > ?1 ORDER BY created_at ASC, id ASC LIMIT ?2`,
    )
      .bind(since, LIST_LIMIT)
      .all<Gift>();
    return results;
  }
  const { results } = await env.DB.prepare(
    `SELECT * FROM (SELECT ${SELECT_COLUMNS} FROM gifts ORDER BY created_at DESC, id DESC LIMIT ?1)
     ORDER BY createdAt ASC, id ASC`,
  )
    .bind(LIST_LIMIT)
    .all<Gift>();
  return results;
}

async function createGift(request: Request, env: Env, headers: Record<string, string>): Promise<Response> {
  const length = Number(request.headers.get("Content-Length") ?? 0);
  if (length > MAX_BODY_BYTES) return json({ error: "요청이 너무 큽니다." }, 413, headers);

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return json({ error: "요청이 너무 큽니다." }, 413, headers);

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return json({ error: "JSON 형식이 올바르지 않습니다." }, 400, headers);
  }

  const result = validateNewGift(payload);
  if (!result.ok) return json({ error: result.error }, 400, headers);

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const ipHash = await hashIp(ip, env.IP_SALT ?? "");
  const now = new Date();
  const cooldownStart = new Date(now.getTime() - COOLDOWN_SECONDS * 1000).toISOString();

  const recent = await env.DB.prepare("SELECT 1 FROM gifts WHERE ip_hash = ?1 AND created_at > ?2 LIMIT 1")
    .bind(ipHash, cooldownStart)
    .first();
  if (recent) return json({ error: `${COOLDOWN_SECONDS}초 후에 다시 선물할 수 있어요.` }, 429, headers);

  const gift: Gift = { ...result.value, id: crypto.randomUUID(), createdAt: now.toISOString() };
  await env.DB.prepare(
    "INSERT INTO gifts (id, author, message, shape, color, size, created_at, ip_hash) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
  )
    .bind(gift.id, gift.author, gift.message, gift.shape, gift.color, gift.size, gift.createdAt, ipHash)
    .run();

  return json({ gift }, 201, headers);
}

export default {
  async fetch(request, env): Promise<Response> {
    const headers = corsHeaders(request, env);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (url.pathname !== "/gifts") return json({ error: "Not found" }, 404, headers);

    try {
      if (request.method === "GET") return json({ gifts: await listGifts(url, env) }, 200, headers);
      if (request.method === "POST") return await createGift(request, env, headers);
      return json({ error: "Method not allowed" }, 405, headers);
    } catch (error) {
      console.error("[gifts] request failed", error);
      return json({ error: "서버 오류가 발생했습니다." }, 500, headers);
    }
  },
} satisfies ExportedHandler<Env>;
