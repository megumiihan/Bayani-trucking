"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  computeBillableBreakdown,
  type BillableUi,
  type BillableWriteInput,
} from "@/lib/bookkeeping";
import type { Client } from "@/lib/clients";
import { formatCurrency } from "@/lib/mockData";
import { inputClass } from "@/components/ui/formStyles";
import { useEscapeToClose } from "@/components/ui/useEscapeToClose";

interface LogBillableModalProps {
  isOpen: boolean;
  isSaving: boolean;
  error: string | null;
  clients: Client[];
  billable?: BillableUi | null;
  onClose: () => void;
  onSave: (input: BillableWriteInput) => Promise<void>;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function LogBillableModal({
  isOpen,
  isSaving,
  error,
  clients,
  billable,
  onClose,
  onSave,
}: LogBillableModalProps) {
  const isEditing = Boolean(billable);
  const [date, setDate] = useState(todayISO);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [vatRegNo, setVatRegNo] = useState("");
  const [clientId, setClientId] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [totalInvoiceAmt, setTotalInvoiceAmt] = useState("");
  const [vatDeduction, setVatDeduction] = useState(true);
  const [withholdingTaxDeduction, setWithholdingTaxDeduction] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (billable) {
      const matchingClient =
        clients.find((client) => client.id === billable.clientId) ??
        clients.find((client) => client.name === billable.buyerName);
      setDate(billable.date);
      setInvoiceNo(billable.invoiceNo);
      setVatRegNo(billable.vatRegNo);
      setClientId(matchingClient?.id ?? "");
      setBuyerAddress(billable.buyerAddress);
      setTotalInvoiceAmt(String(billable.totalInvoiceAmt));
      setVatDeduction(billable.vatDeduction);
      setWithholdingTaxDeduction(billable.withholdingTaxDeduction);
      return;
    }

    setDate(todayISO());
    setInvoiceNo("");
    setVatRegNo("");
    setClientId("");
    setBuyerAddress("");
    setTotalInvoiceAmt("");
    setVatDeduction(true);
    setWithholdingTaxDeduction(false);
  }, [isOpen, billable, clients]);

  const parsedAmount = Number(totalInvoiceAmt);
  const hasValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const preview = useMemo(
    () =>
      hasValidAmount
        ? computeBillableBreakdown(
            parsedAmount,
            vatDeduction,
            withholdingTaxDeduction
          )
        : null,
    [hasValidAmount, parsedAmount, vatDeduction, withholdingTaxDeduction]
  );

  useEscapeToClose(isOpen, onClose, isSaving);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving || !hasValidAmount) return;
    await onSave({
      date,
      invoiceNo,
      vatRegNo,
      clientId,
      buyerAddress,
      totalInvoiceAmt: parsedAmount,
      vatDeduction,
      withholdingTaxDeduction,
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
        aria-labelledby="log-billable-title"
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <h2 id="log-billable-title" className="text-lg font-semibold text-gray-900">
          {isEditing ? "Edit billable" : "Log billable"}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {isEditing
            ? "Update the invoice. Taxable amount, output tax, and withholding tax recalculate as you type."
            : "Enter the total invoice amount. Taxable amount, output tax, and withholding tax update as you type."}
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
              Invoice no.
            </span>
            <input
              type="text"
              required
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              className={inputClass}
            />
          </label>

          <fieldset className="space-y-4">
            <legend className="text-sm font-medium text-gray-700">
              Name and address of buyer
            </legend>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">
                Buyer name
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
                Buyer address
              </span>
              <textarea
                required
                rows={3}
                value={buyerAddress}
                onChange={(e) => setBuyerAddress(e.target.value)}
                className={inputClass}
              />
            </label>
          </fieldset>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              VAT Reg. No.
            </span>
            <input
              type="text"
              required
              value={vatRegNo}
              onChange={(e) => setVatRegNo(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Total invoice amount
            </span>
            <input
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              required
              value={totalInvoiceAmt}
              onChange={(e) => setTotalInvoiceAmt(e.target.value)}
              className={inputClass}
            />
          </label>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={vatDeduction}
                onChange={(e) => setVatDeduction(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-700 focus:ring-blue-500"
              />
              VAT deduction
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={withholdingTaxDeduction}
                onChange={(e) => setWithholdingTaxDeduction(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-700 focus:ring-blue-500"
              />
              Withholding tax deduction
            </label>
          </div>

          <div
            aria-live="polite"
            className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Preview
            </p>
            <dl className="mt-2 space-y-1.5 text-sm">
              <PreviewRow
                label="Taxable amount"
                hint="Total invoice amount ÷ 1.12"
                value={preview ? formatCurrency(preview.taxableAmt) : "—"}
              />
              <PreviewRow
                label="Output tax"
                hint={vatDeduction ? "Taxable amount × 0.12" : "VAT deduction off"}
                value={preview ? formatCurrency(preview.outputTax) : "—"}
              />
              <PreviewRow
                label="Withholding tax"
                hint={
                  withholdingTaxDeduction
                    ? "Taxable amount × 0.02"
                    : "Withholding tax deduction off"
                }
                value={preview ? formatCurrency(preview.withholdingTax) : "—"}
              />
              <PreviewRow
                label="Total tax"
                hint="Output tax + withholding tax"
                value={preview ? formatCurrency(preview.totalTax) : "—"}
                emphasize
              />
            </dl>
          </div>

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
              {isSaving ? "Saving…" : isEditing ? "Save changes" : "Save billable"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PreviewRow({
  label,
  hint,
  value,
  emphasize = false,
}: {
  label: string;
  hint: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <dt
          className={
            emphasize ? "font-semibold text-slate-900" : "text-slate-600"
          }
        >
          {label}
        </dt>
        <p className="text-xs text-slate-400">{hint}</p>
      </div>
      <dd
        className={`tabular-nums ${
          emphasize ? "font-semibold text-slate-900" : "text-slate-800"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
