"use client";

import { useState } from "react";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard blocked (e.g. insecure context) — the value is still on screen.
        }
      }}
      className="shrink-0 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
    >
      {copied ? "Copied" : label}
    </button>
  );
}

/** Login + password block shown after creating a login or resetting a password. */
export default function CredentialsPanel({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-4">
      <CredentialRow label="Login" value={email} />
      <CredentialRow label="Password" value={password} />
      <CopyButton
        value={`Login: ${email}\nPassword: ${password}`}
        label="Copy both"
      />
    </div>
  );
}

function CredentialRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-green-800">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <code className="break-all font-mono text-sm text-gray-900">{value}</code>
        <CopyButton value={value} />
      </div>
    </div>
  );
}
