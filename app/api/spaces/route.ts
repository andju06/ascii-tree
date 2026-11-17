import { getAuthApi } from "@/server/authApis";
import { respond } from "@/server/apiError";
import { createOwnedSpace } from "@/server/createOwnedSpace";
import { readJson } from "@/server/request";
import { getSpaceStore } from "@/server/spaceApis";
import { parseTreeFeatures } from "@/spaces/features";
import { parseTreeName } from "@/spaces/treeName";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return respond("spaces", async () => {
    const account = await getAuthApi().identify(request);
    if (!account) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    const space = await getSpaceStore().findByOwner(account.id);
    return Response.json({
      loginId: account.email,
      passwordStatus: account.passwordStatus,
      slug: space?.slug ?? null,
      name: space?.name ?? null,
      features: space?.features ?? null,
    });
  });
}

export function POST(request: Request): Promise<Response> {
  return respond("spaces", async () => {
    const account = await getAuthApi().identify(request);
    if (!account) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const body = await readJson(request, 2048);
    if (!body.ok) return body.response;
    const features = parseTreeFeatures(body.value);
    if (!features.ok) return Response.json({ error: features.error }, { status: 400 });
    const name = parseTreeName(readName(body.value));
    if (!name.ok) return Response.json({ error: name.error }, { status: 400 });

    const space = await createOwnedSpace(account.id, features.value, name.value);
    if (!space) return Response.json({ error: "이미 트리가 있습니다." }, { status: 409 });
    return Response.json({ slug: space.slug }, { status: 201 });
  });
}

export function PATCH(request: Request): Promise<Response> {
  return respond("spaces", async () => {
    const account = await getAuthApi().identify(request);
    if (!account) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const body = await readJson(request, 2048);
    if (!body.ok) return body.response;
    const features = parseTreeFeatures(body.value);
    if (!features.ok) return Response.json({ error: features.error }, { status: 400 });
    const name = parseTreeName(readName(body.value));
    if (!name.ok) return Response.json({ error: name.error }, { status: 400 });

    const space = await getSpaceStore().updateOwned(account.id, features.value, name.value);
    if (!space) return Response.json({ error: "트리가 없습니다." }, { status: 404 });
    return Response.json({ slug: space.slug, name: space.name, features: space.features });
  });
}

function readName(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return undefined;
  return (value as Record<string, unknown>).name;
}
