import "server-only";
import { cookies } from "next/headers";
import { getAuthApi } from "./authApis";
import { SESSION_COOKIE } from "./sessionCookie";
import type { Account } from "./UserStore";

export async function currentAccount(): Promise<Account | null> {
  const opened = await currentSession();
  return opened?.account ?? null;
}

/** The signed-in account, and whether this login started from the admin desk. */
export async function currentSession(): Promise<{ account: Account; desk: boolean } | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const request = new Request("http://tree.local/", {
    headers: token ? { cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}` } : {},
  });
  return getAuthApi().openSession(request);
}
