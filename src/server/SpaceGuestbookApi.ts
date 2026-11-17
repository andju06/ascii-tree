import "server-only";
import { randomBytes } from "node:crypto";
import { hashPassword, verifyPassword } from "@/auth/password";
import { validateGiftText, validateNewGift } from "@/gifts/validation";
import type { Gift } from "@/gifts/Gift";
import { REPLY_LIMITS, type Reply } from "@/replies/Reply";
import { validateNewReply, validateReplyText } from "@/replies/validation";
import { validatePasscode } from "@/spaces/passcode";
import { isSpaceSlug } from "@/spaces/slug";
import { isRecordId } from "./recordId";
import { clientIp, readJson, sha256Hex } from "./request";
import type { MongoSpaceGiftStore } from "./MongoSpaceGiftStore";
import type { MongoSpaceReplyStore } from "./MongoSpaceReplyStore";
import type { MongoSpaceStore } from "./MongoSpaceStore";

const LIST_LIMIT = 200;
const MAX_BODY_BYTES = 2048;
const COOLDOWN_SECONDS = 30;
const DUMMY_SALT = "ascii-tree-missing-entry";
const DUMMY_HASH = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/** Guestbook for one personal tree. Entry edits require the password set at creation. */
export class SpaceGuestbookApi {
  constructor(
    private readonly spaces: MongoSpaceStore,
    private readonly gifts: MongoSpaceGiftStore,
    private readonly replies: MongoSpaceReplyStore,
    private readonly ipSalt: string,
  ) {}

  async list(slug: string, url: URL): Promise<Response> {
    if (!isSpaceSlug(slug)) return errorResponse("트리를 찾을 수 없습니다.", 404);
    if (!(await this.spaces.findBySlug(slug))) return errorResponse("트리를 찾을 수 없습니다.", 404);

    const sinceParam = url.searchParams.get("since");
    if (sinceParam === null) {
      const gifts = await this.gifts.latest(slug, LIST_LIMIT);
      const replies = await this.replies.forParents(slug, gifts.map((gift) => gift.id));
      return Response.json({ gifts, replies });
    }

    const since = new Date(sinceParam);
    if (Number.isNaN(since.getTime())) return errorResponse("since 값이 올바르지 않습니다.", 400);
    const [gifts, replies] = await Promise.all([
      this.gifts.createdAfter(slug, since, LIST_LIMIT),
      this.replies.createdAfter(slug, since, LIST_LIMIT),
    ]);
    return Response.json({ gifts, replies });
  }

  async createGift(slug: string, request: Request): Promise<Response> {
    if (!isSpaceSlug(slug) || !(await this.spaces.findBySlug(slug))) return errorResponse("트리를 찾을 수 없습니다.", 404);
    const body = await readJson(request, MAX_BODY_BYTES);
    if (!body.ok) return body.response;

    const result = validateNewGift(body.value);
    if (!result.ok) return errorResponse(result.error, 400);
    const passcode = readPasscode(body.value);
    if (!passcode.ok) return errorResponse(passcode.error, 400);

    const ipHash = await this.ipHash(request);
    const now = new Date();
    if (await this.coolingDown(slug, ipHash, now)) return this.cooldown();

    const salt = randomBytes(16).toString("base64url");
    const gift: Gift = { ...result.value, id: crypto.randomUUID(), createdAt: now.toISOString() };
    await this.gifts.insert(slug, gift, ipHash, { salt, hash: await hashPassword(passcode.value, salt) });
    return Response.json({ gift }, { status: 201 });
  }

  async updateGift(slug: string, id: string, request: Request): Promise<Response> {
    if (!isSpaceSlug(slug) || !isRecordId(id)) return errorResponse("글을 찾을 수 없습니다.", 404);
    const body = await readJson(request, MAX_BODY_BYTES);
    if (!body.ok) return body.response;
    const text = validateGiftText(body.value);
    if (!text.ok) return errorResponse(text.error, 400);
    const passcode = readPasscode(body.value);
    if (!passcode.ok) return errorResponse(passcode.error, 400);
    if (!(await this.passcodeMatches(slug, id, passcode.value))) return errorResponse("비밀번호가 올바르지 않습니다.", 401);

    const updated = await this.gifts.updateText(slug, id, text.value);
    if (!updated) return errorResponse("글을 찾을 수 없습니다.", 404);
    return Response.json({ gift: { id, ...text.value } });
  }

  async deleteGift(slug: string, id: string, request: Request): Promise<Response> {
    if (!isSpaceSlug(slug) || !isRecordId(id)) return errorResponse("글을 찾을 수 없습니다.", 404);
    const body = await readJson(request, MAX_BODY_BYTES);
    if (!body.ok) return body.response;
    const passcode = readPasscode(body.value);
    if (!passcode.ok) return errorResponse(passcode.error, 400);
    if (!(await this.passcodeMatches(slug, id, passcode.value))) return errorResponse("비밀번호가 올바르지 않습니다.", 401);

    await this.replies.deleteForParent(slug, id);
    const deleted = await this.gifts.delete(slug, id);
    if (!deleted) return errorResponse("글을 찾을 수 없습니다.", 404);
    return new Response(null, { status: 204 });
  }

  async createReply(slug: string, request: Request): Promise<Response> {
    if (!isSpaceSlug(slug) || !(await this.spaces.findBySlug(slug))) return errorResponse("트리를 찾을 수 없습니다.", 404);
    const body = await readJson(request, MAX_BODY_BYTES);
    if (!body.ok) return body.response;
    const result = validateNewReply(body.value);
    if (!result.ok) return errorResponse(result.error, 400);

    const passcode = readPasscode(body.value);
    if (!passcode.ok) return errorResponse(passcode.error, 400);

    const listed = await this.gifts.latest(slug, LIST_LIMIT);
    if (!listed.some((gift) => gift.id === result.value.parentId)) {
      return errorResponse("목록에 없는 글에는 답글을 달 수 없습니다.", 404);
    }
    if ((await this.replies.countFor(slug, result.value.parentId)) >= REPLY_LIMITS.perParent) {
      return errorResponse("이 글에는 답글을 더 달 수 없습니다.", 409);
    }

    const ipHash = await this.ipHash(request);
    const now = new Date();
    if (await this.coolingDown(slug, ipHash, now)) return this.cooldown();

    const salt = randomBytes(16).toString("base64url");
    const reply: Reply = { ...result.value, id: crypto.randomUUID(), createdAt: now.toISOString() };
    await this.replies.insert(slug, reply, ipHash, { salt, hash: await hashPassword(passcode.value, salt) });
    return Response.json({ reply }, { status: 201 });
  }

  async checkGift(slug: string, id: string, request: Request): Promise<Response> {
    return this.check("gift", slug, id, request);
  }

  async checkReply(slug: string, id: string, request: Request): Promise<Response> {
    return this.check("reply", slug, id, request);
  }

  async updateReply(slug: string, id: string, request: Request): Promise<Response> {
    if (!isSpaceSlug(slug) || !isRecordId(id)) return errorResponse("글을 찾을 수 없습니다.", 404);
    const body = await readJson(request, MAX_BODY_BYTES);
    if (!body.ok) return body.response;
    const text = validateReplyText(body.value);
    if (!text.ok) return errorResponse(text.error, 400);
    const passcode = readPasscode(body.value);
    if (!passcode.ok) return errorResponse(passcode.error, 400);
    if (!(await this.replyPasscodeMatches(slug, id, passcode.value))) return errorResponse("비밀번호가 올바르지 않습니다.", 401);
    const updated = await this.replies.updateText(slug, id, text.value);
    if (!updated) return errorResponse("글을 찾을 수 없습니다.", 404);
    return Response.json({ reply: { id, ...text.value } });
  }

  async deleteReply(slug: string, id: string, request: Request): Promise<Response> {
    if (!isSpaceSlug(slug) || !isRecordId(id)) return errorResponse("글을 찾을 수 없습니다.", 404);
    const body = await readJson(request, MAX_BODY_BYTES);
    if (!body.ok) return body.response;
    const passcode = readPasscode(body.value);
    if (!passcode.ok) return errorResponse(passcode.error, 400);
    if (!(await this.replyPasscodeMatches(slug, id, passcode.value))) return errorResponse("비밀번호가 올바르지 않습니다.", 401);
    const deleted = await this.replies.delete(slug, id);
    if (!deleted) return errorResponse("글을 찾을 수 없습니다.", 404);
    return new Response(null, { status: 204 });
  }

  private async check(kind: "gift" | "reply", slug: string, id: string, request: Request): Promise<Response> {
    if (!isSpaceSlug(slug) || !isRecordId(id)) return errorResponse("글을 찾을 수 없습니다.", 404);
    const body = await readJson(request, MAX_BODY_BYTES);
    if (!body.ok) return body.response;
    const passcode = readPasscode(body.value);
    if (!passcode.ok) return errorResponse(passcode.error, 400);
    const matches =
      kind === "gift"
        ? await this.passcodeMatches(slug, id, passcode.value)
        : await this.replyPasscodeMatches(slug, id, passcode.value);
    if (!matches) return errorResponse("비밀번호가 올바르지 않습니다.", 401);
    return new Response(null, { status: 204 });
  }

  private async replyPasscodeMatches(slug: string, id: string, passcode: string): Promise<boolean> {
    const secret = await this.replies.secret(slug, id);
    return verifyPassword(passcode, secret?.salt ?? DUMMY_SALT, secret?.hash ?? DUMMY_HASH).then((ok) => ok && secret !== null);
  }

  private async passcodeMatches(slug: string, id: string, passcode: string): Promise<boolean> {
    const secret = await this.gifts.secret(slug, id);
    return verifyPassword(passcode, secret?.salt ?? DUMMY_SALT, secret?.hash ?? DUMMY_HASH).then((ok) => ok && secret !== null);
  }

  private async coolingDown(slug: string, ipHash: string, now: Date): Promise<boolean> {
    const after = new Date(now.getTime() - COOLDOWN_SECONDS * 1000);
    const [gift, reply] = await Promise.all([
      this.gifts.hasRecentFrom(slug, ipHash, after),
      this.replies.hasRecentFrom(slug, ipHash, after),
    ]);
    return gift || reply;
  }

  private cooldown(): Response {
    return errorResponse(`${COOLDOWN_SECONDS}초 후에 다시 남길 수 있어요.`, 429);
  }

  private async ipHash(request: Request): Promise<string> {
    return sha256Hex(`${this.ipSalt}:${clientIp(request)}`);
  }
}

function readPasscode(value: unknown): ReturnType<typeof validatePasscode> {
  if (typeof value !== "object" || value === null) return { ok: false, error: "잘못된 요청입니다." };
  return validatePasscode((value as { passcode?: unknown }).passcode);
}
