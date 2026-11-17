import { respond } from "@/server/apiError";
import { getAuthApi } from "@/server/authApis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return respond("auth", () => getAuthApi().session(request));
}
