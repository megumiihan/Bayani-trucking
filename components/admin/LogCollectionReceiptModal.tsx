"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { CollectionReceiptWriteInput } from "@/lib/bookkeeping";
import { inputClass } from "@/components/ui/formStyles";
import { useEscapeToClose } from "@/components/ui/useEscapeToClose";

interface LogCollectionReceiptModalProps {
  isOpen: boolean;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: CollectionReceiptWriteInput) => Promise<void>;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function LogCollectionReceiptModal({
  isOpen,
  isSaving,
  error,
  onClose,
  onSave,
}: LogCollectionReceiptModalProps) {
  const [date, setDate] = useState(todayISO);
  const [receivedFrom, setReceivedFrom] = useState("");
  const [amount, setAmount] = useState("");
  const [receiptNo, setReceiptNo] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setDate(todayISO());
    setReceivedFrom("");
    setAmount("");
    setReceiptNo("");
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
      receivedFrom,
      amount: parsedAmount,
      receiptNo,
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
        aria-labelledby="log-collection-receipt-title"
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <h2
          id="log-collection-receipt-title"
          className="text-lg font-semibold text-gray-900"
        >
          Log collection receipt
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Record money received. Description is optional.
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
              Received from
            </span>
            <input
              type="text"
              required
              value={receivedFrom}
              onChange={(e) => setReceivedFrom(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Receipt no.
            </span>
            <input
              type="text"
              required
              value={receiptNo}
              onChange={(e) => setReceiptNo(e.target.value)}
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
              {isSaving ? "Saving…" : "Save collection receipt"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
