import "server-only";
import { isAdminEmail } from "./admin";
import { getAuthApi } from "./authApis";

export async function requireAdmin(request: Request): Promise<{ ok: true } | { ok: false; response: Response }> {
  const account = await getAuthApi().identify(request);
  if (!account) return { ok: false, response: Response.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  if (!isAdminEmail(account.email)) {
    return { ok: false, response: Response.json({ error: "관리자만 할 수 있습니다." }, { status: 403 }) };
  }
  return { ok: true };
}
