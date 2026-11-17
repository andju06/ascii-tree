import "server-only";
import { randomBytes } from "node:crypto";
import { hashPassword, verifyPassword } from "@/auth/password";
import { AUTH_LIMITS, validateCredentials } from "@/auth/validation";
import { isAdminEmail } from "./admin";
import { readJson, sha256Hex } from "./request";
import { clearSessionCookie, readCookie, SESSION_COOKIE, sessionCookie } from "./sessionCookie";
import type { SessionStore } from "./SessionStore";
import type { Account, PasswordStatus, UserStore } from "./UserStore";

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
    const credentials = await this.credentials(request, "signup");
    if (credentials instanceof Response) return credentials;

    const account = {
      id: crypto.randomUUID(),
      email: credentials.loginId,
      passwordSalt: randomBytes(16).toString("base64url"),
      passwordHash: "",
      passwordStatus: "confirmed" as const,
    };
    account.passwordHash = await hashPassword(credentials.password, account.passwordSalt);
    const created = await this.users.insert(account);
    if (!created) return errorResponse("이미 있는 아이디입니다.", 409);

    return this.startSession(account.id, account.email, 201, false, "confirmed");
  }

  async login(request: Request): Promise<Response> {
    const body = await readJson(request, MAX_BODY_BYTES);
    if (!body.ok) return body.response;
    const credentials = validateCredentials(body.value, "login");
    if (!credentials.ok) return errorResponse(credentials.error, 400);

    const account = await this.users.findByEmail(credentials.value.loginId);
    const salt = account?.passwordSalt ?? DUMMY_SALT;
    const expected = account?.passwordHash ?? DUMMY_HASH;
    const matches = await verifyPassword(credentials.value.password, salt, expected);
    if (!account || !matches) return errorResponse("아이디 또는 비밀번호가 올바르지 않습니다.", 401);

    const desk = requestedDesk(body.value) && isAdminEmail(account.email);
    return this.startSession(account.id, account.email, 200, desk, account.passwordStatus);
  }

  async changePassword(request: Request): Promise<Response> {
    const account = await this.identify(request);
    if (!account) return errorResponse("로그인이 필요합니다.", 401);
    const body = await readJson(request, MAX_BODY_BYTES);
    if (!body.ok) return body.response;
    const raw = body.value;
    const current = typeof raw === "object" && raw !== null && "password" in raw && typeof raw.password === "string" ? raw.password : "";
    const next = typeof raw === "object" && raw !== null && "nextPassword" in raw && typeof raw.nextPassword === "string" ? raw.nextPassword : "";
    if (next.length < AUTH_LIMITS.passwordMin || next.length > AUTH_LIMITS.passwordMax) {
      return errorResponse(`비밀번호는 ${AUTH_LIMITS.passwordMin}자 이상 ${AUTH_LIMITS.passwordMax}자 이하로 입력해 주세요.`, 400);
    }
    const matches = await verifyPassword(current, account.passwordSalt, account.passwordHash);
    if (!matches) return errorResponse("현재 비밀번호가 올바르지 않습니다.", 401);
    const passwordSalt = randomBytes(16).toString("base64url");
    const passwordHash = await hashPassword(next, passwordSalt);
    const updated = await this.users.confirmPassword(account.id, passwordHash, passwordSalt);
    if (!updated) return errorResponse("계정을 찾지 못했습니다.", 404);
    return Response.json({ passwordStatus: "confirmed" });
  }

  async logout(request: Request): Promise<Response> {
    const token = readCookie(request, SESSION_COOKIE);
    if (token) await this.sessions.delete(await sha256Hex(token));
    return new Response(null, { status: 204, headers: { "set-cookie": clearSessionCookie() } });
  }

  async identify(request: Request): Promise<Account | null> {
    const opened = await this.openSession(request);
    return opened?.account ?? null;
  }

  /** Account plus whether this login was started from the admin desk. */
  async openSession(request: Request): Promise<{ account: Account; desk: boolean } | null> {
    const token = readCookie(request, SESSION_COOKIE);
    if (!token) return null;
    const found = await this.sessions.find(await sha256Hex(token), new Date());
    if (!found) return null;
    const account = await this.users.findById(found.userId);
    if (!account) return null;
    return { account, desk: found.desk && isAdminEmail(account.email) };
  }

  async session(request: Request): Promise<Response> {
    const opened = await this.openSession(request);
    if (!opened) return errorResponse("로그인이 필요합니다.", 401);
    return Response.json({
      loginId: opened.account.email,
      admin: isAdminEmail(opened.account.email),
      passwordStatus: opened.account.passwordStatus,
    });
  }

  private async credentials(
    request: Request,
    mode: "login" | "signup",
  ): Promise<{ loginId: string; password: string } | Response> {
    const body = await readJson(request, MAX_BODY_BYTES);
    if (!body.ok) return body.response;
    const result = validateCredentials(body.value, mode);
    if (!result.ok) return errorResponse(result.error, 400);
    return result.value;
  }

  private async startSession(
    userId: string,
    email: string,
    status: number,
    admin: boolean,
    passwordStatus: PasswordStatus,
  ): Promise<Response> {
    const token = randomBytes(32).toString("base64url");
    await this.sessions.insert({
      tokenHash: await sha256Hex(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_MS),
      desk: admin,
    });
    return Response.json({ loginId: email, admin, passwordStatus }, { status, headers: { "set-cookie": sessionCookie(token) } });
  }
}

function requestedDesk(value: unknown): boolean {
  return typeof value === "object" && value !== null && "desk" in value && value.desk === true;
}

function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}
