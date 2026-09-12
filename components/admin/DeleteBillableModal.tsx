"use client";

import { useEffect, useState } from "react";
import type { BillableUi } from "@/lib/bookkeeping";
import { formatCurrency } from "@/lib/mockData";
import { useEscapeToClose } from "@/components/ui/useEscapeToClose";

interface DeleteBillableModalProps {
  billable: BillableUi | null;
  isDeleting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

export default function DeleteBillableModal({
  billable,
  isDeleting,
  error,
  onClose,
  onConfirm,
}: DeleteBillableModalProps) {
  const [step, setStep] = useState<"preview" | "confirm">("preview");
  const [typedInvoice, setTypedInvoice] = useState("");

  useEffect(() => {
    setStep("preview");
    setTypedInvoice("");
  }, [billable?.id]);

  useEscapeToClose(Boolean(billable), onClose, isDeleting);

  if (!billable) return null;

  const invoiceMatches = typedInvoice.trim() === billable.invoiceNo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-gray-900/50"
        onClick={isDeleting ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-labelledby="delete-billable-title"
        className="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <h2
          id="delete-billable-title"
          className="text-lg font-semibold text-gray-900"
        >
          {step === "preview"
            ? "Delete this billable?"
            : "Confirm permanent delete"}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {step === "preview"
            ? "Review the entry below. Nothing has been deleted yet."
            : "This cannot be undone. The row will disappear from the billables table and CSV exports."}
        </p>

        <dl className="mt-5 space-y-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm">
          <PreviewRow label="Date" value={billable.date} />
          <PreviewRow label="Invoice no." value={billable.invoiceNo} />
          <PreviewRow label="Buyer" value={billable.buyerName || "—"} />
          <PreviewRow label="Address" value={billable.buyerAddress || "—"} />
          <PreviewRow
            label="Total tax"
            value={formatCurrency(billable.totalTax)}
          />
        </dl>

        {step === "confirm" && (
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Type the invoice no. to confirm
            </span>
            <input
              type="text"
              autoComplete="off"
              value={typedInvoice}
              onChange={(e) => setTypedInvoice(e.target.value)}
              placeholder={billable.invoiceNo}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </label>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          {step === "preview" ? (
            <button
              type="button"
              onClick={() => setStep("confirm")}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={!invoiceMatches || isDeleting}
              onClick={() => onConfirm(billable.id)}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isDeleting ? "Deleting…" : "Delete permanently"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-red-800/70">{label}</dt>
      <dd className="text-right font-medium text-red-950">{value}</dd>
    </div>
  );
}
