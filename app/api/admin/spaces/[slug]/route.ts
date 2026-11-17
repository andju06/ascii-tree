import { respond } from "@/server/apiError";
import { getSpaceAdminApi } from "@/server/adminApis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ slug: string }> };

export function PATCH(request: Request, context: Context): Promise<Response> {
  return respond("admin", async () => getSpaceAdminApi().update(request, (await context.params).slug));
}

export function DELETE(request: Request, context: Context): Promise<Response> {
  return respond("admin", async () => getSpaceAdminApi().remove(request, (await context.params).slug));
}
