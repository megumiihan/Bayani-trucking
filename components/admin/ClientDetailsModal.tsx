"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createClientRecord, updateClientDetails } from "@/lib/actions/client";
import type { Client } from "@/lib/clients";
import { inputClass } from "@/components/ui/formStyles";
import { useEscapeToClose } from "@/components/ui/useEscapeToClose";

interface ClientDetailsModalProps {
  isOpen: boolean;
  /** Null to add a new client. */
  client: Client | null;
  onClose: () => void;
  onSaved: (client: Client) => void;
}

const formFrom = (client: Client | null) => ({
  name: client?.name ?? "",
  legalName: client?.legalName ?? "",
  address: client?.address ?? "",
  tin: client?.tin ?? "",
  isTemporary: client?.isTemporary ?? false,
});

type Form = ReturnType<typeof formFrom>;

export default function ClientDetailsModal({
  isOpen,
  client,
  onClose,
  onSaved,
}: ClientDetailsModalProps) {
  const [form, setForm] = useState<Form>(() => formFrom(client));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(formFrom(client));
    setError(null);
  }, [isOpen, client]);

  useEscapeToClose(isOpen, onClose, isSaving);
  if (!isOpen) return null;

  const isNew = client === null;
  const set = (key: Exclude<keyof Form, "isTemporary">) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    const result = isNew
      ? await createClientRecord(form)
      : await updateClientDetails({ ...form, id: client.id });
    setIsSaving(false);
    if (!result.success) return setError(result.error);
    onSaved(result.client);
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
        aria-labelledby="client-details-title"
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <h2 id="client-details-title" className="text-lg font-semibold text-gray-900">
          {isNew ? "Add client" : `Edit ${client.name}`}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {isNew
            ? "New clients start on destination pricing. Set their rates on Routes & Rates."
            : "The short name appears in shipment logs and dropdowns. Renaming it updates every page that uses it."}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <Field label="Short name">
            <input required value={form.name} onChange={set("name")} placeholder="e.g. Pepsi" className={inputClass} />
          </Field>
          <Field label="Registered name">
            <input
              value={form.legalName}
              onChange={set("legalName")}
              placeholder="e.g. PEPSI COLA PRODUCTS PHILIPPINES INC"
              className={inputClass}
            />
          </Field>
          <Field label="Address">
            <textarea rows={2} value={form.address} onChange={set("address")} className={inputClass} />
          </Field>
          <Field label="TIN">
            <input
              value={form.tin}
              onChange={set("tin")}
              placeholder="000 000 000 000"
              inputMode="numeric"
              className={`${inputClass} tabular-nums`}
            />
          </Field>

          {!isNew && (
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isTemporary}
                onChange={(e) => setForm((f) => ({ ...f, isTemporary: e.target.checked }))}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-700 focus:ring-blue-500"
              />
              <span>
                One-off client
                <span className="block text-xs text-gray-500">
                  Added from Bookkeeping → Others. Hidden from the Clients page, Routes &amp; Rates
                  and the shipment form. Untick to make it a regular client.
                </span>
              </span>
            </label>
          )}

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
              disabled={isSaving}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {isSaving ? "Saving…" : isNew ? "Add client" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
