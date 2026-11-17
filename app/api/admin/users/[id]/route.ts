import { respond } from "@/server/apiError";
import { getAccountAdminApi } from "@/server/adminApis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Context): Promise<Response> {
  return respond("admin", async () => getAccountAdminApi().setPasswordStatus(request, (await context.params).id));
}

export function DELETE(request: Request, context: Context): Promise<Response> {
  return respond("admin", async () => getAccountAdminApi().remove(request, (await context.params).id));
}
