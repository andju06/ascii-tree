import { respond } from "@/server/apiError";
import { getGuestbookAdminApi } from "@/server/adminApis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Context): Promise<Response> {
  return respond("admin", async () => getGuestbookAdminApi().updateGift(request, (await context.params).id));
}

export function DELETE(request: Request, context: Context): Promise<Response> {
  return respond("admin", async () => getGuestbookAdminApi().deleteGift(request, (await context.params).id));
}
