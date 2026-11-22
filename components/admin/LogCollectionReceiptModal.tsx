"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  billableAmountDue,
  roundMoney,
  type BillableUi,
  type CollectionReceiptWriteInput,
} from "@/lib/bookkeeping";
import type { Client } from "@/lib/clients";
import { formatCurrency } from "@/lib/mockData";
import BookkeepingClientSelect, { OTHERS_CLIENT } from "@/components/admin/BookkeepingClientSelect";
import { inputClass } from "@/components/ui/formStyles";
import { useEscapeToClose } from "@/components/ui/useEscapeToClose";

interface LogCollectionReceiptModalProps {
  isOpen: boolean;
  isSaving: boolean;
  error: string | null;
  clients: Client[];
  billables: BillableUi[];
  /** Billables already paid on another receipt; they can't be picked again. */
  collectedBillableIds: Set<string>;
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
  billables,
  collectedBillableIds,
  onClose,
  onSave,
}: LogCollectionReceiptModalProps) {
  const [clientId, setClientId] = useState("");
  const [orNumber, setOrNumber] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [paymentDetails, setPaymentDetails] = useState("");
  const [datePaid, setDatePaid] = useState(todayISO);
  const [whoPaid, setWhoPaid] = useState("");
  const [whoReceived, setWhoReceived] = useState("");
  const [other, setOther] = useState({ name: "", address: "", tin: "" });
  const [manualAmount, setManualAmount] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setClientId("");
    setOrNumber("");
    setSelectedIds(new Set());
    setPaymentDetails("");
    setDatePaid(todayISO());
    setWhoPaid("");
    setWhoReceived("");
    setOther({ name: "", address: "", tin: "" });
    setManualAmount("");
  }, [isOpen]);

  // The client's SIs that haven't been collected yet, oldest first.
  const openBillables = useMemo(
    () =>
      billables
        .filter((b) => b.clientId === clientId && !collectedBillableIds.has(b.id))
        .sort((a, b) => a.date.localeCompare(b.date) || a.invoiceNo.localeCompare(b.invoiceNo)),
    [billables, clientId, collectedBillableIds]
  );

  useEscapeToClose(isOpen, onClose, isSaving);

  if (!isOpen) return null;

  const selected = openBillables.filter((b) => selectedIds.has(b.id));
  const collectionAmount = roundMoney(
    selected.reduce((sum, b) => sum + billableAmountDue(b.totalInvoiceAmt, b.withholdingTax), 0)
  );
  const hasSelection = selected.length > 0;
  const isOthers = clientId === OTHERS_CLIENT;
  // One-off clients can be paid without an SI; the amount is typed in.
  const isTemporaryClient = isOthers || clients.some((c) => c.id === clientId && c.isTemporary);
  const usesManualAmount = isTemporaryClient && !hasSelection;
  const parsedManualAmount = Number(manualAmount);
  const hasManualAmount = Number.isFinite(parsedManualAmount) && parsedManualAmount > 0;
  const canSave = hasSelection || (usesManualAmount && hasManualAmount);

  const toggle = (id: string) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = openBillables.length > 0 && selected.length === openBillables.length;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving || !canSave) return;
    await onSave({
      clientId: isOthers ? "" : clientId,
      newClient: isOthers ? other : undefined,
      collectionAmount: usesManualAmount ? parsedManualAmount : undefined,
      orNumber,
      billableIds: selected.map((b) => b.id),
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
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <h2
          id="log-collection-receipt-title"
          className="text-lg font-semibold text-gray-900"
        >
          Log collection receipt
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Record an official receipt for money collected. Pick the client, then tick the
          SIs this payment covers. The collection amount is the sum of their amounts due.
          For a one-off client, pick Others and enter the amount.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Client
            </span>
            <BookkeepingClientSelect
              clients={clients}
              value={clientId}
              onChange={(next) => {
                setClientId(next);
                setSelectedIds(new Set());
              }}
            />
          </label>

          {isOthers && (
            <fieldset className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
              <legend className="px-1 text-xs font-medium text-gray-500">
                One-off client · shows on Clients &amp; suppliers, not on the Clients page
              </legend>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Name</span>
                <input
                  type="text"
                  required
                  value={other.name}
                  onChange={(e) => setOther((o) => ({ ...o, name: e.target.value }))}
                  placeholder="Registered business name"
                  className={inputClass}
                />
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Address (optional)</span>
                  <input
                    type="text"
                    value={other.address}
                    onChange={(e) => setOther((o) => ({ ...o, address: e.target.value }))}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">TIN (optional)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={other.tin}
                    onChange={(e) => setOther((o) => ({ ...o, tin: e.target.value }))}
                    placeholder="000 000 000 000"
                    className={`${inputClass} tabular-nums`}
                  />
                </label>
              </div>
            </fieldset>
          )}

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

          <fieldset>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <legend className="text-sm font-medium text-gray-700">
                SI / invoice numbers
              </legend>
              {openBillables.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedIds(allSelected ? new Set() : new Set(openBillables.map((b) => b.id)))
                  }
                  className="text-xs font-medium text-blue-700 hover:underline"
                >
                  {allSelected ? "Clear all" : "Select all"}
                </button>
              )}
            </div>
            {isOthers ? (
              <p className="rounded-lg border border-dashed border-gray-300 px-3 py-4 text-center text-sm text-gray-500">
                A new one-off client has no SIs yet. Enter the amount collected below.
              </p>
            ) : !clientId ? (
              <p className="rounded-lg border border-dashed border-gray-300 px-3 py-4 text-center text-sm text-gray-500">
                Choose a client to see their unpaid SIs.
              </p>
            ) : openBillables.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-300 px-3 py-4 text-center text-sm text-gray-500">
                This client has no uncollected billables.
              </p>
            ) : (
              <div className="max-h-64 overflow-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="w-8 px-3 py-2" />
                      <th className="px-3 py-2">SI no.</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Buyer</th>
                      <th className="px-3 py-2 text-right">Amount due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {openBillables.map((b) => {
                      const checked = selectedIds.has(b.id);
                      return (
                        <tr
                          key={b.id}
                          onClick={() => toggle(b.id)}
                          className={`cursor-pointer ${checked ? "bg-blue-50" : "hover:bg-gray-50"}`}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggle(b.id)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`SI ${b.invoiceNo}`}
                              className="h-4 w-4 rounded border-gray-300 text-blue-700 focus:ring-blue-500"
                            />
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">
                            {b.invoiceNo}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-gray-600">{b.date}</td>
                          <td className="px-3 py-2 text-gray-600">{b.buyerName || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-900">
                            {formatCurrency(billableAmountDue(b.totalInvoiceAmt, b.withholdingTax))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {usesManualAmount ? (
              <label className="mt-2 block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Collection amount
                  {!isOthers && openBillables.length > 0 && (
                    <span className="ml-1 text-xs font-normal text-gray-400">
                      (or tick SIs above)
                    </span>
                  )}
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  required
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className={inputClass}
                />
              </label>
            ) : (
            <div className="mt-2 flex items-baseline justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-sm text-gray-600">
                Collection amount
                <span className="ml-1 text-xs text-gray-400">
                  ({selected.length} SI{selected.length === 1 ? "" : "s"})
                </span>
              </span>
              <span className="text-lg font-bold tabular-nums text-gray-900">
                {formatCurrency(collectionAmount)}
              </span>
            </div>
            )}
          </fieldset>

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
              disabled={isSaving || !canSave}
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
