"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createSupplier, deleteSupplier, updateSupplier } from "@/lib/actions/supplier";
import type { Supplier } from "@/lib/suppliers";
import { inputClass } from "@/components/ui/formStyles";
import { useEscapeToClose } from "@/components/ui/useEscapeToClose";

interface SupplierModalProps {
  isOpen: boolean;
  /** Null to add a new supplier. */
  supplier: Supplier | null;
  onClose: () => void;
  onSaved: (supplier: Supplier) => void;
  onDeleted: (id: string) => void;
}

const formFrom = (supplier: Supplier | null) => ({
  name: supplier?.name ?? "",
  address: supplier?.address ?? "",
  tin: supplier?.tin ?? "",
});

type Form = ReturnType<typeof formFrom>;

export default function SupplierModal({
  isOpen,
  supplier,
  onClose,
  onSaved,
  onDeleted,
}: SupplierModalProps) {
  const [form, setForm] = useState<Form>(() => formFrom(supplier));
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(formFrom(supplier));
    setConfirmDelete(false);
    setError(null);
  }, [isOpen, supplier]);

  useEscapeToClose(isOpen, onClose, isSaving);
  if (!isOpen) return null;

  const isNew = supplier === null;
  const set = (key: keyof Form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    const result = isNew
      ? await createSupplier(form)
      : await updateSupplier({ ...form, id: supplier.id });
    setIsSaving(false);
    if (!result.success) return setError(result.error);
    onSaved(result.supplier);
  };

  const handleDelete = async () => {
    if (!supplier || isSaving) return;
    if (!confirmDelete) return setConfirmDelete(true);
    setIsSaving(true);
    setError(null);
    const result = await deleteSupplier(supplier.id);
    setIsSaving(false);
    if (!result.success) return setError(result.error);
    onDeleted(supplier.id);
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
        aria-labelledby="supplier-title"
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <h2 id="supplier-title" className="text-lg font-semibold text-gray-900">
          {isNew ? "Add supplier" : "Edit supplier"}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          These details fill in expenses and disbursements. Add each branch separately if it has its
          own address or TIN. Changes apply to new entries only; logged entries keep what they were
          saved with.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <Field label="Registered name">
            <input
              required
              value={form.name}
              onChange={set("name")}
              placeholder="e.g. JL CLEAN FUEL INCORPORATED"
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
              placeholder="000 000 000 00000"
              className={`${inputClass} tabular-nums`}
            />
          </Field>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-between gap-2 pt-2">
            <div>
              {!isNew && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSaving}
                  className={`rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 ${
                    confirmDelete
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "text-red-700 hover:bg-red-50"
                  }`}
                >
                  {confirmDelete ? "Confirm delete" : "Delete"}
                </button>
              )}
            </div>
            <div className="flex gap-2">
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
                {isSaving ? "Saving…" : isNew ? "Add supplier" : "Save"}
              </button>
            </div>
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
