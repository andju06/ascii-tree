import "server-only";
import { validateGiftText } from "@/gifts/validation";
import { validateReplyText } from "@/replies/validation";
import { readJson } from "./request";
import { isRecordId } from "./recordId";
import { requireAdmin } from "./requireAdmin";
import type { GiftStore } from "./GiftStore";
import type { ReplyStore } from "./ReplyStore";

const MAX_BODY_BYTES = 2048;

type EntryText = { readonly author: string; readonly message: string };
type TextResult = { readonly ok: true; readonly value: EntryText } | { readonly ok: false; readonly error: string };

export class GuestbookAdminApi {
  constructor(
    private readonly gifts: GiftStore,
    private readonly replies: ReplyStore,
  ) {}

  async updateGift(request: Request, id: string): Promise<Response> {
    return this.update(request, id, validateGiftText, (text) => this.gifts.updateText(id, text));
  }

  async deleteGift(request: Request, id: string): Promise<Response> {
    const admin = await requireAdmin(request);
    if (!admin.ok) return admin.response;
    if (!isRecordId(id)) return missing();
    await this.replies.deleteForParent(id);
    const deleted = await this.gifts.delete(id);
    if (!deleted) return missing();
    return new Response(null, { status: 204 });
  }

  async updateReply(request: Request, id: string): Promise<Response> {
    return this.update(request, id, validateReplyText, (text) => this.replies.updateText(id, text));
  }

  async deleteReply(request: Request, id: string): Promise<Response> {
    const admin = await requireAdmin(request);
    if (!admin.ok) return admin.response;
    if (!isRecordId(id)) return missing();
    const deleted = await this.replies.delete(id);
    if (!deleted) return missing();
    return new Response(null, { status: 204 });
  }

  private async update(
    request: Request,
    id: string,
    validate: (input: unknown) => TextResult,
    save: (text: EntryText) => Promise<boolean>,
  ): Promise<Response> {
    const admin = await requireAdmin(request);
    if (!admin.ok) return admin.response;
    if (!isRecordId(id)) return missing();
    const body = await readJson(request, MAX_BODY_BYTES);
    if (!body.ok) return body.response;
    const text = validate(body.value);
    if (!text.ok) return Response.json({ error: text.error }, { status: 400 });
    const updated = await save(text.value);
    if (!updated) return missing();
    return Response.json({ id, ...text.value });
  }
}

function missing(): Response {
  return Response.json({ error: "글을 찾지 못했습니다." }, { status: 404 });
}
