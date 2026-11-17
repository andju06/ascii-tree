import { respond } from "@/server/apiError";
import { getNoticeApi } from "@/server/adminApis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Context): Promise<Response> {
  return respond("admin", async () => getNoticeApi().update(request, (await context.params).id));
}

export function DELETE(request: Request, context: Context): Promise<Response> {
  return respond("admin", async () => getNoticeApi().delete(request, (await context.params).id));
}
