"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createEmployee, type NewEmployeeInput } from "@/lib/actions/employee";
import type { LoginCredentials } from "@/lib/employeeAccounts";
import type { Employee } from "@/lib/mockData";
import { BOUNTY_EXP_NEW, BOUNTY_EXP_OLD, bountyExpLabel } from "@/lib/weight";
import { inputClass } from "@/components/ui/formStyles";
import { useEscapeToClose } from "@/components/ui/useEscapeToClose";
import CredentialsPanel from "@/components/admin/CredentialsPanel";

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (employee: Employee) => void;
}

const EMPTY_FORM: NewEmployeeInput = {
  name: "",
  role: "Driver",
  bountyExp: BOUNTY_EXP_OLD,
  remarks: "",
  createLogin: true,
};

type Outcome = {
  name: string;
  credentials: LoginCredentials | null;
  loginError: string | null;
};

export default function AddEmployeeModal({ isOpen, onClose, onCreated }: AddEmployeeModalProps) {
  const [form, setForm] = useState<NewEmployeeInput>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(EMPTY_FORM);
    setError(null);
    setOutcome(null);
  }, [isOpen]);

  // Once a login exists, don't let a stray Escape/backdrop click hide it.
  const lockClose = isSaving || outcome?.credentials != null;
  useEscapeToClose(isOpen, onClose, lockClose);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError(null);

    const result = await createEmployee(form);
    setIsSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onCreated(result.employee);
    if (!result.credentials && !result.loginError) {
      onClose();
      return;
    }
    setOutcome({
      name: result.employee.name,
      credentials: result.credentials,
      loginError: result.loginError,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-gray-900/50"
        onClick={lockClose ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-labelledby="add-employee-title"
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        {outcome ? (
          <>
            <h2 id="add-employee-title" className="text-lg font-semibold text-gray-900">
              {outcome.name} added
            </h2>
            {outcome.credentials && (
              <>
                <p className="mt-1 text-sm text-gray-500">
                  Give these to {outcome.name} so they can sign in. You can look them up
                  again any time on their employee page or under “View all logins”.
                </p>
                <div className="mt-4">
                  <CredentialsPanel {...outcome.credentials} />
                </div>
              </>
            )}
            {outcome.loginError && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
              >
                The employee was saved, but their login couldn’t be created:{" "}
                {outcome.loginError} You can try again later with “Create login” on their
                employee page.
              </p>
            )}
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="add-employee-title" className="text-lg font-semibold text-gray-900">
              Add employee
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Adds a driver or helper to the roster. They’ll appear in shipment and
              payout forms right away.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Full name</span>
                <input
                  type="text"
                  required
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Juan Dela Cruz"
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Role</span>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, role: e.target.value as NewEmployeeInput["role"] }))
                  }
                  className={inputClass}
                >
                  <option value="Driver">Driver</option>
                  <option value="Helper">Helper</option>
                  <option value="Secretary">Secretary</option>
                </select>
                {form.role === "Secretary" && (
                  <span className="mt-1.5 block text-xs text-gray-500">
                    Logs and edits shipments and payouts, sees employees and trucks. Never
                    assigned to a shipment and can&apos;t see payout totals.
                  </span>
                )}
              </label>

              {form.role !== "Secretary" && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Bounty experience
                </span>
                <select
                  value={form.bountyExp}
                  onChange={(e) => setForm((f) => ({ ...f, bountyExp: e.target.value }))}
                  className={inputClass}
                >
                  <option value={BOUNTY_EXP_OLD}>{bountyExpLabel(BOUNTY_EXP_OLD)}</option>
                  <option value={BOUNTY_EXP_NEW}>{bountyExpLabel(BOUNTY_EXP_NEW)}</option>
                </select>
              </label>
              )}

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Remarks
                  <span className="ml-1 font-normal text-gray-400">(optional)</span>
                </span>
                <textarea
                  rows={2}
                  value={form.remarks}
                  onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                  className={inputClass}
                />
              </label>

              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.createLogin}
                  onChange={(e) => setForm((f) => ({ ...f, createLogin: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-700 focus:ring-blue-500"
                />
                <span>
                  Create app login
                  <span className="block text-xs text-gray-500">
                    Generates a login and password so they can log their own deliveries.
                  </span>
                </span>
              </label>

              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                >
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !form.name.trim()}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isSaving ? "Saving…" : "Add employee"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
