import "server-only";
import { randomBytes } from "node:crypto";
import { hashPassword, verifyPassword } from "@/auth/password";
import { validateCredentials } from "@/auth/validation";
import { isAdminEmail } from "./admin";
import { readJson, sha256Hex } from "./request";
import { clearSessionCookie, readCookie, SESSION_COOKIE, sessionCookie } from "./sessionCookie";
import type { SessionStore } from "./SessionStore";
import type { Account, UserStore } from "./UserStore";

const SESSION_MS = 1000 * 60 * 60 * 24 * 14;
const MAX_BODY_BYTES = 2048;
const DUMMY_SALT = "ascii-tree-missing-user";
const DUMMY_HASH = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export class AuthApi {
  constructor(
    private readonly users: UserStore,
    private readonly sessions: SessionStore,
  ) {}

  async signup(request: Request): Promise<Response> {
    const credentials = await this.credentials(request);
    if (credentials instanceof Response) return credentials;

    const account = {
      id: crypto.randomUUID(),
      email: credentials.email,
      passwordSalt: randomBytes(16).toString("base64url"),
      passwordHash: "",
    };
    account.passwordHash = await hashPassword(credentials.password, account.passwordSalt);
    const created = await this.users.insert(account);
    if (!created) return errorResponse("이미 가입한 이메일입니다.", 409);

    return this.startSession(account.id, account.email, 201);
  }

  async login(request: Request): Promise<Response> {
    const credentials = await this.credentials(request);
    if (credentials instanceof Response) return credentials;

    const account = await this.users.findByEmail(credentials.email);
    const salt = account?.passwordSalt ?? DUMMY_SALT;
    const expected = account?.passwordHash ?? DUMMY_HASH;
    const matches = await verifyPassword(credentials.password, salt, expected);
    if (!account || !matches) return errorResponse("이메일 또는 비밀번호가 올바르지 않습니다.", 401);

    return this.startSession(account.id, account.email, 200);
  }

  async logout(request: Request): Promise<Response> {
    const token = readCookie(request, SESSION_COOKIE);
    if (token) await this.sessions.delete(await sha256Hex(token));
    return new Response(null, { status: 204, headers: { "set-cookie": clearSessionCookie() } });
  }

  async identify(request: Request): Promise<Account | null> {
    const token = readCookie(request, SESSION_COOKIE);
    if (!token) return null;
    const userId = await this.sessions.findUserId(await sha256Hex(token), new Date());
    if (!userId) return null;
    return this.users.findById(userId);
  }

  async session(request: Request): Promise<Response> {
    const account = await this.identify(request);
    if (!account) return errorResponse("로그인이 필요합니다.", 401);
    return Response.json({ email: account.email, admin: isAdminEmail(account.email) });
  }

  private async credentials(request: Request): Promise<{ email: string; password: string } | Response> {
    const body = await readJson(request, MAX_BODY_BYTES);
    if (!body.ok) return body.response;
    const result = validateCredentials(body.value);
    if (!result.ok) return errorResponse(result.error, 400);
    return result.value;
  }

  private async startSession(userId: string, email: string, status: number): Promise<Response> {
    const token = randomBytes(32).toString("base64url");
    await this.sessions.insert({
      tokenHash: await sha256Hex(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_MS),
    });
    return Response.json({ email }, { status, headers: { "set-cookie": sessionCookie(token) } });
  }
}

function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}
