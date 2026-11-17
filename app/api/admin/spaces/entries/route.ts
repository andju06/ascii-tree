import { respond } from "@/server/apiError";
import { getSpaceAdminApi } from "@/server/adminApis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return respond("admin", () => getSpaceAdminApi().entries(request));
}
