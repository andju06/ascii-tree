import { respond } from "@/server/apiError";
import { getNoticeApi } from "@/server/adminApis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return respond("notices", () => getNoticeApi().latest());
}
