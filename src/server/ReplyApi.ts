import type { Reply } from "@/replies/Reply";
import { REPLY_LIMITS } from "@/replies/Reply";
import { validateNewReply } from "@/replies/validation";
import type { GiftApiConfig } from "./GiftApi";
import type { GiftStore } from "./GiftStore";
import { clientIp, readJson, sha256Hex } from "./request";
import type { RecentWrites } from "./RecentWrites";
import type { ReplyStore } from "./ReplyStore";

function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/** Creates a reply on a guestbook entry that is still in the public gift list. */
export class ReplyApi {
  constructor(
    private readonly gifts: GiftStore,
    private readonly replies: ReplyStore,
    private readonly recent: RecentWrites,
    private readonly config: GiftApiConfig,
  ) {}

  async create(request: Request): Promise<Response> {
    const { maxBodyBytes, cooldownSeconds, ipSalt, listLimit } = this.config;
    const body = await readJson(request, maxBodyBytes);
    if (!body.ok) return body.response;

    const result = validateNewReply(body.value);
    if (!result.ok) return errorResponse(result.error, 400);

    const listed = await this.gifts.latest(listLimit);
    if (!listed.some((gift) => gift.id === result.value.parentId)) {
      return errorResponse("목록에 없는 글에는 답글을 달 수 없습니다.", 404);
    }
    if ((await this.replies.countFor(result.value.parentId)) >= REPLY_LIMITS.perParent) {
      return errorResponse("이 글에는 답글을 더 달 수 없습니다.", 409);
    }

    const ipHash = await sha256Hex(`${ipSalt}:${clientIp(request)}`);
    const now = new Date();
    if (await this.recent.hasRecentFrom(ipHash, new Date(now.getTime() - cooldownSeconds * 1000))) {
      return errorResponse(`${cooldownSeconds}초 후에 다시 남길 수 있어요.`, 429);
    }

    const reply: Reply = { ...result.value, id: crypto.randomUUID(), createdAt: now.toISOString() };
    await this.replies.insert(reply, ipHash);
    return Response.json({ reply }, { status: 201 });
  }
}
