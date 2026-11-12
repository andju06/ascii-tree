import { DEFAULT_GIFT_API_CONFIG, GiftApi } from "@/server/GiftApi";
import { getMongoDb } from "@/server/mongoClient";
import { MongoGiftStore } from "@/server/MongoGiftStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let api: GiftApi | null = null;

function getApi(): GiftApi {
  if (!api) {
    const ipSalt = process.env.IP_SALT ?? "";
    if (!ipSalt) console.warn("[gifts] IP_SALT is not set; IP hashes are unsalted");
    api = new GiftApi(new MongoGiftStore(getMongoDb), { ...DEFAULT_GIFT_API_CONFIG, ipSalt });
  }
  return api;
}

async function handle(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    console.error("[gifts] request failed", error);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export function GET(request: Request): Promise<Response> {
  return handle(() => getApi().list(new URL(request.url)));
}

export function POST(request: Request): Promise<Response> {
  return handle(() => getApi().create(request));
}
