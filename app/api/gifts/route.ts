import { getGiftApi } from "@/server/apis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    console.error("[gifts] request failed", error);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export function GET(request: Request): Promise<Response> {
  return handle(() => getGiftApi().list(new URL(request.url)));
}

export function POST(request: Request): Promise<Response> {
  return handle(() => getGiftApi().create(request));
}
