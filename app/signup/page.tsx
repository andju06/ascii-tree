import type { Metadata } from "next";
import { AuthForm } from "@/auth/AuthForm";

export const metadata: Metadata = { title: "회원가입" };

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
