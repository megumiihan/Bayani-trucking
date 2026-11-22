"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createTruck } from "@/lib/actions/truck";
import { todayISO } from "@/lib/truckMaintenance";
import type { Truck } from "@/lib/trucks";
import { inputClass } from "@/components/ui/formStyles";
import { useEscapeToClose } from "@/components/ui/useEscapeToClose";

interface NewTruckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (truck: Truck) => void;
}

const emptyForm = () => ({
  plateNumber: "",
  mvFileNo: "",
  engineNo: "",
  chassisNo: "",
  make: "",
  yearModel: "",
  truckType: "",
  wheelCount: "6",
  crIssueDate: todayISO(),
  firstRegistrationDate: todayISO(),
  purchaseYear: "",
  purchasePrice: "",
});

type Form = ReturnType<typeof emptyForm>;

export default function NewTruckModal({ isOpen, onClose, onCreated }: NewTruckModalProps) {
  const [form, setForm] = useState<Form>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(emptyForm());
    setError(null);
  }, [isOpen]);

  useEscapeToClose(isOpen, onClose, isSaving);
  if (!isOpen) return null;

  const set = (key: keyof Form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    const result = await createTruck({
      plateNumber: form.plateNumber,
      mvFileNo: form.mvFileNo,
      engineNo: form.engineNo,
      chassisNo: form.chassisNo,
      make: form.make,
      yearModel: Number(form.yearModel),
      truckType: form.truckType,
      wheelCount: Number(form.wheelCount),
      crIssueDate: form.crIssueDate,
      firstRegistrationDate: form.firstRegistrationDate,
      purchaseYear: form.purchaseYear.trim() ? Number(form.purchaseYear) : null,
      purchasePrice: form.purchasePrice.trim() ? Number(form.purchasePrice) : null,
    });
    setIsSaving(false);
    if (!result.success) return setError(result.error);
    onCreated(result.truck);
  };

  const thisYear = new Date().getFullYear();

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
        aria-labelledby="new-truck-title"
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <h2 id="new-truck-title" className="text-lg font-semibold text-gray-900">
          Add truck
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Copy the details from the truck&apos;s Certificate of Registration (CR). You can upload the certificate after saving.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Plate number">
              <input required value={form.plateNumber} onChange={set("plateNumber")} placeholder="e.g. CCR 4635" className={inputClass} />
            </Field>
            <Field label="MV file no.">
              <input required value={form.mvFileNo} onChange={set("mvFileNo")} className={inputClass} />
            </Field>
            <Field label="Make">
              <input required value={form.make} onChange={set("make")} placeholder="e.g. ISUZU" className={inputClass} />
            </Field>
            <Field label="Year model">
              <input
                required
                type="number"
                min={1950}
                max={thisYear + 1}
                value={form.yearModel}
                onChange={set("yearModel")}
                className={inputClass}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Truck type">
                <input
                  required
                  value={form.truckType}
                  onChange={set("truckType")}
                  placeholder="e.g. REEFER VAN TRUCK"
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Engine no.">
              <input required value={form.engineNo} onChange={set("engineNo")} className={inputClass} />
            </Field>
            <Field label="Chassis no.">
              <input required value={form.chassisNo} onChange={set("chassisNo")} className={inputClass} />
            </Field>
            <Field label="Wheels">
              <input
                required
                type="number"
                min={2}
                max={22}
                value={form.wheelCount}
                onChange={set("wheelCount")}
                className={inputClass}
              />
            </Field>
            <Field label="CR issue date">
              <input required type="date" value={form.crIssueDate} onChange={set("crIssueDate")} className={inputClass} />
            </Field>
            <Field label="First registration">
              <input
                required
                type="date"
                value={form.firstRegistrationDate}
                onChange={set("firstRegistrationDate")}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
            <Field label="Year purchased (optional)">
              <input
                type="number"
                min={1950}
                max={thisYear}
                value={form.purchaseYear}
                onChange={set("purchaseYear")}
                className={inputClass}
              />
            </Field>
            <Field label="Purchase price ₱ (optional)">
              <input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={form.purchasePrice}
                onChange={set("purchasePrice")}
                className={inputClass}
              />
            </Field>
          </div>

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
              {isSaving ? "Saving…" : "Add truck"}
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
