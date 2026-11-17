import type { Metadata } from "next";
import { AuthForm } from "@/auth/AuthForm";
import { safeNext } from "@/auth/nextPath";

export const metadata: Metadata = { title: "회원가입" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthForm mode="signup" next={safeNext(next)} />;
}
