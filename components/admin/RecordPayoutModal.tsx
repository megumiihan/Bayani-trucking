"use client";

import { useEffect, useState, type FormEvent } from "react";
import { formatCurrency } from "@/lib/mockData";

interface RecordPayoutModalProps {
  employeeName: string;
  balanceDue: number;
  isOpen: boolean;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (amount: number, paidAt: string, note: string) => Promise<void>;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function RecordPayoutModal({
  employeeName,
  balanceDue,
  isOpen,
  isSaving,
  error,
  onClose,
  onSave,
}: RecordPayoutModalProps) {
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(todayISO);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (isOpen) {
      setAmount(balanceDue > 0 ? String(balanceDue) : "");
      setPaidAt(todayISO());
      setNote("");
    }
  }, [isOpen, balanceDue]);

  if (!isOpen) return null;

  const parsedAmount = Number(amount);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    await onSave(parsedAmount, paidAt, note);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-gray-900/50"
        onClick={isSaving ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-labelledby="record-payout-title"
        className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <h2
          id="record-payout-title"
          className="text-lg font-semibold text-gray-900"
        >
          Record payout
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Log cash paid to {employeeName}. This does not delete shipment
          earnings — it adds a payment row to the ledger.
        </p>

        <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Balance due
          </p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            {formatCurrency(balanceDue)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Amount paid
            </span>
            <input
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Date paid
            </span>
            <input
              type="date"
              required
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Note
            </span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional — e.g. Paid via Gcash by Kirsten"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
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
              disabled={isSaving || !Number.isFinite(parsedAmount) || parsedAmount <= 0}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isSaving ? "Saving…" : "Save payout"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
