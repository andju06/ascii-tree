import { respond } from "@/server/apiError";
import { getSpaceGuestbookApi } from "@/server/spaceApis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request, context: { params: Promise<{ slug: string }> }): Promise<Response> {
  return respond("spaces", async () => getSpaceGuestbookApi().list((await context.params).slug, new URL(request.url)));
}

export function POST(request: Request, context: { params: Promise<{ slug: string }> }): Promise<Response> {
  return respond("spaces", async () => getSpaceGuestbookApi().createGift((await context.params).slug, request));
}
