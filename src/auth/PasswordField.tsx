"use client";

import { useState } from "react";
import { AUTH_LIMITS } from "./validation";

function EyeIcon({ off }: { readonly off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {off ? <path d="M4 4 L20 20" /> : null}
    </svg>
  );
}

export function PasswordField({
  label,
  name,
  autoComplete,
  value,
  onChange,
  required = true,
}: {
  readonly label: string;
  readonly name: string;
  readonly autoComplete: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label>
      {label}
      <span className="password-field">
        <input
          type={visible ? "text" : "password"}
          name={name}
          autoComplete={autoComplete}
          minLength={required ? AUTH_LIMITS.passwordMin : undefined}
          maxLength={AUTH_LIMITS.passwordMax}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
          onClick={() => setVisible((current) => !current)}
        >
          <EyeIcon off={visible} />
        </button>
      </span>
    </label>
  );
}
