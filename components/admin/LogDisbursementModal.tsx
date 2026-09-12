"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { DisbursementWriteInput } from "@/lib/bookkeeping";
import { inputClass } from "@/components/ui/formStyles";
import { useEscapeToClose } from "@/components/ui/useEscapeToClose";

interface LogDisbursementModalProps {
  isOpen: boolean;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: DisbursementWriteInput) => Promise<void>;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function LogDisbursementModal({
  isOpen,
  isSaving,
  error,
  onClose,
  onSave,
}: LogDisbursementModalProps) {
  const [date, setDate] = useState(todayISO);
  const [payee, setPayee] = useState("");
  const [amount, setAmount] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setDate(todayISO());
    setPayee("");
    setAmount("");
    setReferenceNo("");
    setDescription("");
  }, [isOpen]);

  useEscapeToClose(isOpen, onClose, isSaving);

  if (!isOpen) return null;

  const parsedAmount = Number(amount);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    await onSave({
      date,
      payee,
      amount: parsedAmount,
      referenceNo,
      description,
    });
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
        aria-labelledby="log-disbursement-title"
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <h2
          id="log-disbursement-title"
          className="text-lg font-semibold text-gray-900"
        >
          Log disbursement
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Record money paid out. Reference number and description are optional.
        </p>
        <p
          role="status"
          className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          Not yet usable. Features to be discussed.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Date
            </span>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Payee
            </span>
            <input
              type="text"
              required
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Amount
            </span>
            <input
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Reference no.
              <span className="ml-1 font-normal text-gray-400">(optional)</span>
            </span>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Description
              <span className="ml-1 font-normal text-gray-400">(optional)</span>
            </span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
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
              disabled={
                isSaving || !Number.isFinite(parsedAmount) || parsedAmount <= 0
              }
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isSaving ? "Saving…" : "Save disbursement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
