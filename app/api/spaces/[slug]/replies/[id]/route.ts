import { respond } from "@/server/apiError";
import { getSpaceGuestbookApi } from "@/server/spaceApis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request, context: { params: Promise<{ slug: string; id: string }> }): Promise<Response> {
  return respond("spaces", async () => {
    const { slug, id } = await context.params;
    return getSpaceGuestbookApi().checkReply(slug, id, request);
  });
}

export function PATCH(request: Request, context: { params: Promise<{ slug: string; id: string }> }): Promise<Response> {
  return respond("spaces", async () => {
    const { slug, id } = await context.params;
    return getSpaceGuestbookApi().updateReply(slug, id, request);
  });
}

export function DELETE(request: Request, context: { params: Promise<{ slug: string; id: string }> }): Promise<Response> {
  return respond("spaces", async () => {
    const { slug, id } = await context.params;
    return getSpaceGuestbookApi().deleteReply(slug, id, request);
  });
}
