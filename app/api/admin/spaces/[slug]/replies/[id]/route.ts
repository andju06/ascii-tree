import { respond } from "@/server/apiError";
import { getSpaceAdminApi } from "@/server/adminApis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ slug: string; id: string }> };

export function PATCH(request: Request, context: Context): Promise<Response> {
  return respond("admin", async () => {
    const { slug, id } = await context.params;
    return getSpaceAdminApi().updateReply(request, slug, id);
  });
}

export function DELETE(request: Request, context: Context): Promise<Response> {
  return respond("admin", async () => {
    const { slug, id } = await context.params;
    return getSpaceAdminApi().deleteReply(request, slug, id);
  });
}
