function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
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
