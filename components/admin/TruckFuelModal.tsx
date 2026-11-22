"use client";

import { useEffect, useState, type FormEvent } from "react";
import { todayISO } from "@/lib/truckMaintenance";
import type { FuelWriteInput } from "@/lib/truckRecords";
import { inputClass } from "@/components/ui/formStyles";
import { useEscapeToClose } from "@/components/ui/useEscapeToClose";

interface TruckFuelModalProps {
  isOpen: boolean;
  isSaving: boolean;
  error: string | null;
  plateNumber: string;
  onClose: () => void;
  onSave: (input: FuelWriteInput) => Promise<void>;
}

export default function TruckFuelModal({
  isOpen,
  isSaving,
  error,
  plateNumber,
  onClose,
  onSave,
}: TruckFuelModalProps) {
  const [date, setDate] = useState(todayISO);
  const [amount, setAmount] = useState("");
  const [station, setStation] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setDate(todayISO());
    setAmount("");
    setStation("");
    setInvoiceNo("");
    setNotes("");
  }, [isOpen]);

  useEscapeToClose(isOpen, onClose, isSaving);
  if (!isOpen) return null;

  const parsedAmount = Number(amount);
  const amountValid = amount.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount > 0;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving || !amountValid) return;
    await onSave({ date, amount: parsedAmount, station, invoiceNo, notes });
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
        aria-labelledby="truck-fuel-title"
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <h2 id="truck-fuel-title" className="text-lg font-semibold text-gray-900">
          Log fuel · {plateNumber}
        </h2>
        <p className="mt-1 text-sm text-gray-500">Also recorded as a Fuel expense in Bookkeeping.</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Date</span>
              <input
                type="date"
                required
                value={date}
                max={todayISO()}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Amount (₱)</span>
              <input
                type="number"
                required
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Gas station</span>
            <input
              type="text"
              value={station}
              onChange={(e) => setStation(e.target.value)}
              placeholder="e.g. Petron, Balintawak"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Receipt / invoice no.</span>
            <input
              type="text"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Notes</span>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional, e.g. 40 L diesel"
              className={inputClass}
            />
          </label>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
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
              disabled={isSaving || !amountValid}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Log fuel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
