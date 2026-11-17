import { respond } from "@/server/apiError";
import { getAccountAdminApi } from "@/server/adminApis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return respond("admin", () => getAccountAdminApi().list(request));
}

export function POST(request: Request): Promise<Response> {
  return respond("admin", () => getAccountAdminApi().create(request));
}
