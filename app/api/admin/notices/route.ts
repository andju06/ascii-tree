import { respond } from "@/server/apiError";
import { getNoticeApi } from "@/server/adminApis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return respond("admin", () => getNoticeApi().list(request));
}

export function POST(request: Request): Promise<Response> {
  return respond("admin", () => getNoticeApi().create(request));
}
