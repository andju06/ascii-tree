"use client";

import { useEffect, useState } from "react";
import { PasswordChangeModal } from "./PasswordChangeModal";

/** Opens the password change modal when the signed-in account still has a temporary password. */
export function TempPasswordGate() {
  const [required, setRequired] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/auth/session", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { passwordStatus?: unknown };
        if (body.passwordStatus === "temporary") setRequired(true);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (!required) return null;
  return <PasswordChangeModal onDone={() => window.location.reload()} />;
}
