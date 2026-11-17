import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountForm } from "@/spaces/AccountForm";
import { currentAccount } from "@/server/currentAccount";
import { getSpaceStore } from "@/server/spaceApis";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "내정보" };

export default async function AccountPage() {
  const account = await currentAccount();
  if (!account) redirect("/login?next=/account");
  const space = await getSpaceStore().findByOwner(account.id);
  return (
    <AccountForm
      loginId={account.email}
      features={space?.features ?? null}
      name={space?.name ?? null}
      slug={space?.slug ?? null}
      passwordStatus={account.passwordStatus}
    />
  );
}
