"use client";

import { useState } from "react";
import {
  createEmployeeLogin,
  getEmployeeCredentials,
  resetEmployeePassword,
} from "@/lib/actions/employee";
import CredentialsPanel, { CopyButton } from "@/components/admin/CredentialsPanel";

interface EmployeeLoginCardProps {
  employeeId: string;
  employeeName: string;
  isActive: boolean;
  initialLoginEmail: string | null;
  /** Render without its own card chrome, for use inside another card. */
  embedded?: boolean;
}

/** Admin-only: shows an employee's login, reveals/resets the password, or creates one. */
export default function EmployeeLoginCard({
  employeeId,
  employeeName,
  isActive,
  initialLoginEmail,
  embedded = false,
}: EmployeeLoginCardProps) {
  const [email, setEmail] = useState(initialLoginEmail);
  const [password, setPassword] = useState<string | null>(null);
  const [notOnFile, setNotOnFile] = useState(false);
  const [justIssued, setJustIssued] = useState(false);
  const [busy, setBusy] = useState<"show" | "reset" | "create" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleShow = async () => {
    if (password) {
      setPassword(null);
      return;
    }
    setBusy("show");
    setError(null);
    const result = await getEmployeeCredentials(employeeId);
    setBusy(null);
    if (!result.success) return setError(result.error);
    if (result.credentials.passwordError) return setError(result.credentials.passwordError);
    if (!result.credentials.password) return setNotOnFile(true);
    setPassword(result.credentials.password);
  };

  const handleReset = async () => {
    const ok = window.confirm(
      `Give ${employeeName} a new password? Their current password will stop working immediately.`
    );
    if (!ok) return;
    setBusy("reset");
    setError(null);
    const result = await resetEmployeePassword(employeeId);
    setBusy(null);
    if (!result.success) return setError(result.error);
    setPassword(result.credentials.password);
    setNotOnFile(false);
    setJustIssued(true);
  };

  const handleCreate = async () => {
    setBusy("create");
    setError(null);
    const result = await createEmployeeLogin(employeeId);
    setBusy(null);
    if (!result.success) return setError(result.error);
    setEmail(result.credentials.email);
    setPassword(result.credentials.password);
    setJustIssued(true);
  };

  return (
    <section
      className={
        embedded ? "" : "mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
      }
    >
      <h2
        className={
          embedded
            ? "text-xs font-medium uppercase tracking-wider text-gray-500"
            : "text-sm font-semibold uppercase tracking-wider text-gray-500"
        }
      >
        App login
      </h2>

      {!email ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            {employeeName} has no login yet, so they can’t sign in to log deliveries.
          </p>
          <button
            type="button"
            onClick={handleCreate}
            disabled={busy !== null || !isActive}
            title={isActive ? undefined : "Mark the employee active first"}
            className="rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {busy === "create" ? "Creating…" : "Create login"}
          </button>
        </div>
      ) : justIssued && password ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-gray-600">
            New credentials for {employeeName}. Give these to them now; they’re also saved
            here for later.
          </p>
          <CredentialsPanel email={email} password={password} />
          <button
            type="button"
            onClick={() => setJustIssued(false)}
            className="text-sm font-medium text-blue-700 hover:underline"
          >
            Done
          </button>
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
          <div>
            <p className="text-xs text-gray-500">Login</p>
            <div className="mt-0.5 flex items-center gap-2">
              <code className="break-all font-mono text-sm text-gray-900">{email}</code>
              <CopyButton value={email} />
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500">Password</p>
            <div className="mt-0.5 flex items-center gap-2">
              {notOnFile ? (
                <span className="text-sm text-amber-700">
                  Not on file — reset to generate one
                </span>
              ) : (
                <>
                  <code className="font-mono text-sm text-gray-900">
                    {password ?? "••••••••"}
                  </code>
                  <button
                    type="button"
                    onClick={handleShow}
                    disabled={busy !== null}
                    className="text-xs font-medium text-blue-700 hover:underline disabled:opacity-50"
                  >
                    {busy === "show" ? "Loading…" : password ? "Hide" : "Show"}
                  </button>
                  {password && <CopyButton value={password} />}
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            disabled={busy !== null}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {busy === "reset" ? "Resetting…" : "Reset password"}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
