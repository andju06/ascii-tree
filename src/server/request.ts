function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6 = /^[0-9a-f:]{2,45}$/i;

/** First list entry that is an IP. Anything else is ignored so it cannot become a cooldown key. */
function firstIp(header: string | null): string | null {
  const value = header?.split(",")[0]?.trim().replace(/^\[|\]$/g, "") ?? "";
  if (IPV4.test(value)) {
    return value.split(".").every((octet) => Number(octet) <= 255) ? value : null;
  }
  if (value.includes(":") && IPV6.test(value)) return value.toLowerCase();
  return null;
}

/**
 * Address Vercel observed. `x-vercel-forwarded-for` stays Vercel's own value when another proxy
 * rewrites `x-forwarded-for`. A client-supplied forwarding header is not a cooldown key.
 */
export function clientIp(request: Request): string {
  return firstIp(request.headers.get("x-vercel-forwarded-for")) ?? firstIp(request.headers.get("x-real-ip")) ?? "unknown";
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Reads a JSON body, rejecting payloads over `maxBodyBytes`. */
export async function readJson(
  request: Request,
  maxBodyBytes: number,
): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
  if (Number(request.headers.get("content-length") ?? 0) > maxBodyBytes) {
    return { ok: false, response: errorResponse("요청이 너무 큽니다.", 413) };
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBodyBytes) {
    return { ok: false, response: errorResponse("요청이 너무 큽니다.", 413) };
  }

  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, response: errorResponse("JSON 형식이 올바르지 않습니다.", 400) };
  }
}
