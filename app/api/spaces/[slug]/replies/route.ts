import { respond } from "@/server/apiError";
import { getSpaceGuestbookApi } from "@/server/spaceApis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request, context: { params: Promise<{ slug: string }> }): Promise<Response> {
  return respond("spaces", async () => getSpaceGuestbookApi().createReply((await context.params).slug, request));
}
