import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TreeApp } from "@/components/TreeApp";
import { currentSession } from "@/server/currentAccount";
import { AccountGate } from "@/spaces/AccountGate";
import { isSpaceSlug } from "@/spaces/slug";
import { getSpaceStore } from "@/server/spaceApis";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "내 트리" };

export default async function SharedTreePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isSpaceSlug(slug)) notFound();
  const space = await getSpaceStore().findBySlug(slug);
  if (!space) notFound();
  const session = await currentSession();
  const account = session?.account ?? null;
  return (
    <>
    <TreeApp
      giftApiUrl={`/api/spaces/${space.slug}`}
      entryPasscode
      share
      notice={false}
      features={space.features}
      signedIn={account !== null}
      admin={session?.desk === true}
      treeLabel={space.name ?? (account?.id === space.ownerId ? "내 트리" : "개인 트리")}
    />
    {account ? <AccountGate /> : null}
    </>
  );
}
