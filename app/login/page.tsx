import type { Metadata } from "next";
import { AuthForm } from "@/auth/AuthForm";
import { safeNext } from "@/auth/nextPath";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthForm mode="login" next={safeNext(next)} />;
}
