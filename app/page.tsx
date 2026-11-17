import { AuthGate } from "@/auth/AuthGate";
import { TreeApp } from "@/components/TreeApp";
import { AccountGate } from "@/spaces/AccountGate";
import { currentSession } from "@/server/currentAccount";
import { getSpaceStore } from "@/server/spaceApis";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await currentSession();
  const account = session?.account ?? null;
  const space = account ? await getSpaceStore().findByOwner(account.id) : null;
  return (
    <>
      <TreeApp hasTree={space !== null} signedIn={account !== null} admin={session?.desk === true} />
      {account ? <AccountGate /> : <AuthGate />}
    </>
  );
}
