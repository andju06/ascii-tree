import "server-only";
import { randomBytes } from "node:crypto";
import { hashPassword } from "@/auth/password";
import { validateCredentials } from "@/auth/validation";
import type { PasswordStatus } from "./UserStore";
import { isAdminEmail } from "./admin";
import { getAuthApi } from "./authApis";
import { isRecordId } from "./recordId";
import { readJson } from "./request";
import type { MongoSessionStore } from "./MongoSessionStore";
import type { MongoSpaceGiftStore } from "./MongoSpaceGiftStore";
import type { MongoSpaceReplyStore } from "./MongoSpaceReplyStore";
import type { MongoSpaceStore } from "./MongoSpaceStore";
import type { MongoUserStore } from "./MongoUserStore";

const LIST_LIMIT = 200;
const MAX_BODY_BYTES = 2048;

function readPasswordStatus(value: unknown): PasswordStatus | null {
  if (typeof value !== "object" || value === null || !("passwordStatus" in value)) return null;
  const status = value.passwordStatus;
  return status === "temporary" || status === "confirmed" ? status : null;
}

function denied(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

/** Lists accounts and removes one, including that account's tree and sessions. */
export class AccountAdminApi {
  constructor(
    private readonly users: MongoUserStore,
    private readonly sessions: MongoSessionStore,
    private readonly spaces: MongoSpaceStore,
    private readonly gifts: MongoSpaceGiftStore,
    private readonly replies: MongoSpaceReplyStore,
  ) {}

  async list(request: Request): Promise<Response> {
    const admin = await this.admin(request);
    if (!admin.ok) return admin.response;
    const users = await this.users.list(LIST_LIMIT);
    return Response.json({ users, loginId: admin.loginId });
  }

  async create(request: Request): Promise<Response> {
    const admin = await this.admin(request);
    if (!admin.ok) return admin.response;
    const body = await readJson(request, MAX_BODY_BYTES);
    if (!body.ok) return body.response;
    const credentials = validateCredentials(body.value, "signup");
    if (!credentials.ok) return denied(400, credentials.error);
    const passwordStatus = readPasswordStatus(body.value);
    if (!passwordStatus) return denied(400, "비밀번호를 임시 또는 확정으로 골라 주세요.");

    const passwordSalt = randomBytes(16).toString("base64url");
    const user = {
      id: crypto.randomUUID(),
      loginId: credentials.value.loginId,
      createdAt: new Date().toISOString(),
      passwordStatus,
    };
    const created = await this.users.insert({
      id: user.id,
      email: user.loginId,
      passwordSalt,
      passwordHash: await hashPassword(credentials.value.password, passwordSalt),
      passwordStatus,
    });
    if (!created) return denied(409, "이미 있는 아이디입니다.");
    return Response.json({ user }, { status: 201 });
  }

  async setPasswordStatus(request: Request, id: string): Promise<Response> {
    const admin = await this.admin(request);
    if (!admin.ok) return admin.response;
    if (!isRecordId(id)) return denied(404, "계정을 찾지 못했습니다.");
    const body = await readJson(request, MAX_BODY_BYTES);
    if (!body.ok) return body.response;
    const passwordStatus = readPasswordStatus(body.value);
    if (!passwordStatus) return denied(400, "비밀번호를 임시 또는 확정으로 골라 주세요.");
    const updated = await this.users.setPasswordStatus(id, passwordStatus);
    if (!updated) return denied(404, "계정을 찾지 못했습니다.");
    return Response.json({ passwordStatus });
  }

  async remove(request: Request, id: string): Promise<Response> {
    const admin = await this.admin(request);
    if (!admin.ok) return admin.response;
    if (!isRecordId(id)) return denied(404, "계정을 찾지 못했습니다.");
    if (id === admin.id) return denied(400, "로그인한 관리자 계정은 지울 수 없습니다.");

    const space = await this.spaces.findByOwner(id);
    if (space) await this.removeSpace(space.slug);
    await this.sessions.deleteForUser(id);
    const deleted = await this.users.delete(id);
    if (!deleted) return denied(404, "계정을 찾지 못했습니다.");
    return new Response(null, { status: 204 });
  }

  private async removeSpace(slug: string): Promise<void> {
    await this.replies.deleteForSpace(slug);
    await this.gifts.deleteForSpace(slug);
    await this.spaces.deleteBySlug(slug);
  }

  private async admin(request: Request): Promise<{ ok: true; id: string; loginId: string } | { ok: false; response: Response }> {
    const opened = await getAuthApi().openSession(request);
    if (!opened) return { ok: false, response: denied(401, "로그인이 필요합니다.") };
    if (!isAdminEmail(opened.account.email)) {
      return { ok: false, response: denied(403, "관리자만 할 수 있습니다.") };
    }
    return { ok: true, id: opened.account.id, loginId: opened.account.email };
  }
}
