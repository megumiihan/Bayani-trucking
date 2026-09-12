"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { CollectionReceiptWriteInput } from "@/lib/bookkeeping";
import type { Client } from "@/lib/clients";
import { inputClass } from "@/components/ui/formStyles";
import { useEscapeToClose } from "@/components/ui/useEscapeToClose";

interface LogCollectionReceiptModalProps {
  isOpen: boolean;
  isSaving: boolean;
  error: string | null;
  clients: Client[];
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
  clients,
  onClose,
  onSave,
}: LogCollectionReceiptModalProps) {
  const [clientId, setClientId] = useState("");
  const [orNumber, setOrNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDetails, setPaymentDetails] = useState("");
  const [datePaid, setDatePaid] = useState(todayISO);
  const [whoPaid, setWhoPaid] = useState("");
  const [whoReceived, setWhoReceived] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setClientId("");
    setOrNumber("");
    setAmount("");
    setPaymentDetails("");
    setDatePaid(todayISO());
    setWhoPaid("");
    setWhoReceived("");
  }, [isOpen]);

  useEscapeToClose(isOpen, onClose, isSaving);

  if (!isOpen) return null;

  const parsedAmount = Number(amount);
  const hasValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving || !hasValidAmount) return;
    await onSave({
      clientId,
      orNumber,
      amount: parsedAmount,
      paymentDetails,
      datePaid,
      whoPaid,
      whoReceived,
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
          Record an official receipt for money collected.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Client
            </span>
            <select
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={inputClass}
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              OR number
            </span>
            <input
              type="text"
              required
              value={orNumber}
              onChange={(e) => setOrNumber(e.target.value)}
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
              Payment details
            </span>
            <input
              type="text"
              required
              value={paymentDetails}
              onChange={(e) => setPaymentDetails(e.target.value)}
              placeholder="Check number"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Date paid
            </span>
            <input
              type="date"
              required
              value={datePaid}
              onChange={(e) => setDatePaid(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Who paid
            </span>
            <input
              type="text"
              required
              value={whoPaid}
              onChange={(e) => setWhoPaid(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Who received
            </span>
            <input
              type="text"
              required
              value={whoReceived}
              onChange={(e) => setWhoReceived(e.target.value)}
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
              disabled={isSaving || !hasValidAmount}
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
