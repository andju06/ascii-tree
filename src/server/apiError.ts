export function respond(label: string, run: () => Promise<Response>): Promise<Response> {
  return run().catch((error: unknown) => {
    console.error(`[${label}] request failed`, error);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  });
}
