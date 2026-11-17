import "server-only";
import type { Gift } from "@/gifts/Gift";
import type { Reply } from "@/replies/Reply";
import { validateGiftText } from "@/gifts/validation";
import { validateReplyText } from "@/replies/validation";
import { parseTreeFeatures } from "@/spaces/features";
import { isSpaceSlug } from "@/spaces/slug";
import { isAdminEmail } from "./admin";
import { getAuthApi } from "./authApis";
import { isRecordId } from "./recordId";
import { readJson } from "./request";
import type { MongoSpaceGiftStore } from "./MongoSpaceGiftStore";
import type { MongoSpaceReplyStore } from "./MongoSpaceReplyStore";
import type { MongoSpaceStore } from "./MongoSpaceStore";
import type { MongoUserStore } from "./MongoUserStore";

const LIST_LIMIT = 200;
const ENTRY_LIMIT = 100;
const MAX_BODY_BYTES = 2048;

function denied(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

interface TreeRow {
  readonly slug: string;
  readonly loginId: string;
  readonly name: string;
  readonly createdAt: string;
  readonly features: { rudolph: boolean; santa: boolean; snowman: boolean };
}

interface EntryRow {
  readonly slug: string;
  readonly loginId: string;
  readonly name: string;
  readonly gift: Gift;
  readonly replies: readonly Reply[];
}

/** Admin view of personal trees and the guestbook on those trees. */
export class SpaceAdminApi {
  constructor(
    private readonly users: MongoUserStore,
    private readonly spaces: MongoSpaceStore,
    private readonly gifts: MongoSpaceGiftStore,
    private readonly replies: MongoSpaceReplyStore,
  ) {}

  async list(request: Request): Promise<Response> {
    const admin = await this.gate(request);
    if (!admin.ok) return admin.response;
    const spaces = await this.spaces.list(LIST_LIMIT);
    const names = await this.names(spaces.map((space) => space.ownerId));
    const trees: TreeRow[] = spaces.map((space) => ({
      slug: space.slug,
      loginId: names.get(space.ownerId) ?? "",
      name: space.name ?? "",
      createdAt: space.createdAt,
      features: space.features,
    }));
    return Response.json({ trees });
  }

  async update(request: Request, slug: string): Promise<Response> {
    const admin = await this.gate(request);
    if (!admin.ok) return admin.response;
    if (!isSpaceSlug(slug)) return denied(404, "트리를 찾지 못했습니다.");
    const body = await readJson(request, MAX_BODY_BYTES);
    if (!body.ok) return body.response;
    const features = parseTreeFeatures(body.value);
    if (!features.ok) return denied(400, features.error);
    const space = await this.spaces.updateFeaturesBySlug(slug, features.value);
    if (!space) return denied(404, "트리를 찾지 못했습니다.");
    return Response.json({ slug: space.slug, features: space.features });
  }

  async remove(request: Request, slug: string): Promise<Response> {
    const admin = await this.gate(request);
    if (!admin.ok) return admin.response;
    if (!isSpaceSlug(slug)) return denied(404, "트리를 찾지 못했습니다.");
    const space = await this.spaces.findBySlug(slug);
    if (!space) return denied(404, "트리를 찾지 못했습니다.");
    await this.replies.deleteForSpace(slug);
    await this.gifts.deleteForSpace(slug);
    await this.spaces.deleteBySlug(slug);
    return new Response(null, { status: 204 });
  }

  async entries(request: Request): Promise<Response> {
    const admin = await this.gate(request);
    if (!admin.ok) return admin.response;
    const rows = await this.gifts.latestAcross(ENTRY_LIMIT);
    const replies = await this.replies.forGifts(rows.map((row) => ({ spaceId: row.spaceId, id: row.gift.id })));
    const spaces = await Promise.all([...new Set(rows.map((row) => row.spaceId))].map((slug) => this.spaces.findBySlug(slug)));
    const names = await this.names(spaces.flatMap((space) => (space ? [space.ownerId] : [])));
    const bySlug = new Map(spaces.flatMap((space) => (space ? [[space.slug, space] as const] : [])));
    const entries: EntryRow[] = rows.map((row) => {
      const space = bySlug.get(row.spaceId);
      return {
        slug: row.spaceId,
        loginId: space ? (names.get(space.ownerId) ?? "") : "",
        name: space?.name ?? "",
        gift: row.gift,
        replies: replies.filter((reply) => reply.spaceId === row.spaceId && reply.parentId === row.gift.id),
      };
    });
    return Response.json({ entries });
  }

  async updateGift(request: Request, slug: string, id: string): Promise<Response> {
    return this.changeText(request, slug, id, validateGiftText, (text) => this.gifts.updateText(slug, id, text));
  }

  async deleteGift(request: Request, slug: string, id: string): Promise<Response> {
    const admin = await this.gate(request);
    if (!admin.ok) return admin.response;
    if (!isSpaceSlug(slug) || !isRecordId(id)) return denied(404, "글을 찾지 못했습니다.");
    await this.replies.deleteForParent(slug, id);
    const deleted = await this.gifts.delete(slug, id);
    if (!deleted) return denied(404, "글을 찾지 못했습니다.");
    return new Response(null, { status: 204 });
  }

  async updateReply(request: Request, slug: string, id: string): Promise<Response> {
    return this.changeText(request, slug, id, validateReplyText, (text) => this.replies.updateText(slug, id, text));
  }

  async deleteReply(request: Request, slug: string, id: string): Promise<Response> {
    const admin = await this.gate(request);
    if (!admin.ok) return admin.response;
    if (!isSpaceSlug(slug) || !isRecordId(id)) return denied(404, "글을 찾지 못했습니다.");
    const deleted = await this.replies.delete(slug, id);
    if (!deleted) return denied(404, "글을 찾지 못했습니다.");
    return new Response(null, { status: 204 });
  }

  private async changeText(
    request: Request,
    slug: string,
    id: string,
    validate: (input: unknown) => { ok: true; value: { author: string; message: string } } | { ok: false; error: string },
    save: (text: { author: string; message: string }) => Promise<boolean>,
  ): Promise<Response> {
    const admin = await this.gate(request);
    if (!admin.ok) return admin.response;
    if (!isSpaceSlug(slug) || !isRecordId(id)) return denied(404, "글을 찾지 못했습니다.");
    const body = await readJson(request, MAX_BODY_BYTES);
    if (!body.ok) return body.response;
    const text = validate(body.value);
    if (!text.ok) return denied(400, text.error);
    const updated = await save(text.value);
    if (!updated) return denied(404, "글을 찾지 못했습니다.");
    return Response.json({ id, ...text.value });
  }

  private async names(ownerIds: readonly string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ownerIds)];
    const accounts = await Promise.all(unique.map((id) => this.users.findById(id)));
    return new Map(accounts.flatMap((account) => (account ? [[account.id, account.email] as const] : [])));
  }

  private async gate(request: Request): Promise<{ ok: true } | { ok: false; response: Response }> {
    const opened = await getAuthApi().openSession(request);
    if (!opened) return { ok: false, response: denied(401, "로그인이 필요합니다.") };
    if (!isAdminEmail(opened.account.email)) {
      return { ok: false, response: denied(403, "관리자만 할 수 있습니다.") };
    }
    return { ok: true };
  }
}
