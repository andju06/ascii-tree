import { getReplyApi } from "@/server/apis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    return await getReplyApi().create(request);
  } catch (error) {
    console.error("[replies] request failed", error);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
