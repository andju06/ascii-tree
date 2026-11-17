import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TreeSetupForm } from "@/spaces/TreeSetupForm";
import { defaultTreeName } from "@/spaces/treeName";
import { currentAccount } from "@/server/currentAccount";
import { getSpaceStore } from "@/server/spaceApis";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "트리 꾸미기" };

export default async function TreeSetupPage() {
  const account = await currentAccount();
  if (!account) redirect("/login?next=/me/setup");
  const space = await getSpaceStore().findByOwner(account.id);
  if (space) redirect(`/t/${space.slug}`);
  return <TreeSetupForm defaultName={defaultTreeName(account.email)} />;
}
