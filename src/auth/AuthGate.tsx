"use client";

import { useEffect, useState } from "react";
import { AuthForm } from "./AuthForm";

/** Opens the login modal when the tree dispatches `auth-open`. */
export function AuthGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("auth-open", show);
    return () => window.removeEventListener("auth-open", show);
  }, []);

  if (!open) return null;
  return <AuthForm mode="login" onClose={() => setOpen(false)} />;
}
