import { redirect } from "next/navigation";
import { currentAccount } from "@/server/currentAccount";
import { getSpaceStore } from "@/server/spaceApis";

export const dynamic = "force-dynamic";

export default async function MyTreePage() {
  const account = await currentAccount();
  if (!account) redirect("/login?next=/me");

  const space = await getSpaceStore().findByOwner(account.id);
  if (!space) redirect("/me/setup");
  redirect(`/t/${space.slug}`);
}
