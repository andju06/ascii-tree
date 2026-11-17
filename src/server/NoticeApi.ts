import "server-only";
import type { Notice } from "@/notices/Notice";
import { validateNoticeMessage } from "@/notices/validation";
import { readJson } from "./request";
import { isRecordId } from "./recordId";
import { requireAdmin } from "./requireAdmin";
import type { NoticeStore } from "./NoticeStore";

const MAX_BODY_BYTES = 2048;

export class NoticeApi {
  constructor(private readonly notices: NoticeStore) {}

  async latest(): Promise<Response> {
    return Response.json({ notice: await this.notices.latest() });
  }

  async list(request: Request): Promise<Response> {
    const admin = await requireAdmin(request);
    if (!admin.ok) return admin.response;
    return Response.json({ notices: await this.notices.list() });
  }

  async create(request: Request): Promise<Response> {
    const admin = await requireAdmin(request);
    if (!admin.ok) return admin.response;
    const message = await this.message(request);
    if (message instanceof Response) return message;

    const now = new Date().toISOString();
    const notice: Notice = { id: crypto.randomUUID(), message, createdAt: now, updatedAt: now };
    await this.notices.insert(notice);
    return Response.json({ notice }, { status: 201 });
  }

  async update(request: Request, id: string): Promise<Response> {
    const admin = await requireAdmin(request);
    if (!admin.ok) return admin.response;
    if (!isRecordId(id)) return errorResponse("공지를 찾지 못했습니다.", 404);
    const message = await this.message(request);
    if (message instanceof Response) return message;
    const updated = await this.notices.update(id, message, new Date());
    if (!updated) return errorResponse("공지를 찾지 못했습니다.", 404);
    return Response.json({ id, message });
  }

  async delete(request: Request, id: string): Promise<Response> {
    const admin = await requireAdmin(request);
    if (!admin.ok) return admin.response;
    if (!isRecordId(id)) return errorResponse("공지를 찾지 못했습니다.", 404);
    const deleted = await this.notices.delete(id);
    if (!deleted) return errorResponse("공지를 찾지 못했습니다.", 404);
    return new Response(null, { status: 204 });
  }

  private async message(request: Request): Promise<string | Response> {
    const body = await readJson(request, MAX_BODY_BYTES);
    if (!body.ok) return body.response;
    const result = validateNoticeMessage(body.value);
    if (!result.ok) return errorResponse(result.error, 400);
    return result.value.message;
  }
}

function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}
