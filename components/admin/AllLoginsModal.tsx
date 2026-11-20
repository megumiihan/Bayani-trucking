"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAllEmployeeCredentials, type EmployeeLoginRow } from "@/lib/actions/employee";
import { useEscapeToClose } from "@/components/ui/useEscapeToClose";
import { CopyButton } from "@/components/admin/CredentialsPanel";

interface AllLoginsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AllLoginsModal({ isOpen, onClose }: AllLoginsModalProps) {
  const [rows, setRows] = useState<EmployeeLoginRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  useEscapeToClose(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setRows(null);
    setError(null);
    setRevealed(new Set());
    getAllEmployeeCredentials().then((result) => {
      if (cancelled) return;
      if (result.success) setRows(result.rows);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const toggle = (id: string) =>
    setRevealed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const copyAllText = (rows ?? [])
    .map(
      (row) =>
        `${row.name}\t${row.email}\t${row.password ?? "(not on file — reset on their page)"}`
    )
    .join("\n");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-gray-900/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-labelledby="all-logins-title"
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="all-logins-title" className="text-lg font-semibold text-gray-900">
              Employee logins
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              For helping employees sign in. Keep this private: anyone with these can
              log in as that employee.
            </p>
          </div>
          {rows && rows.length > 0 && <CopyButton value={copyAllText} label="Copy all" />}
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-auto">
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {error}
            </p>
          )}
          {!rows && !error && <p className="text-sm text-gray-500">Loading…</p>}
          {rows && rows.length === 0 && (
            <p className="text-sm text-gray-500">No employee has a login yet.</p>
          )}
          {rows && rows.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-white text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Employee</th>
                  <th className="py-2 pr-3 font-medium">Login</th>
                  <th className="py-2 font-medium">Password</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.employeeId} className="align-middle">
                    <td className="py-2 pr-3">
                      <Link
                        href={`/admin/employees/${row.employeeId}`}
                        className="font-medium text-blue-700 hover:underline"
                      >
                        {row.name}
                      </Link>
                      <span className="block text-xs text-gray-500">
                        {row.role}
                        {!row.isActive && " · inactive"}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <code className="break-all font-mono text-xs">{row.email}</code>
                        <CopyButton value={row.email} />
                      </div>
                    </td>
                    <td className="py-2">
                      {row.password ? (
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs">
                            {revealed.has(row.employeeId) ? row.password : "••••••••"}
                          </code>
                          <button
                            type="button"
                            onClick={() => toggle(row.employeeId)}
                            className="text-xs font-medium text-blue-700 hover:underline"
                          >
                            {revealed.has(row.employeeId) ? "Hide" : "Show"}
                          </button>
                          <CopyButton value={row.password} />
                        </div>
                      ) : (
                        <span className="text-xs text-amber-700">
                          {row.passwordError ?? "Not on file — reset on their page"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
