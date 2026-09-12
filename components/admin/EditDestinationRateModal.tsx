"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { DestinationRouteRate } from "@/lib/rates";
import { formatCurrency } from "@/lib/mockData";
import { inputClass } from "@/components/ui/formStyles";
import { useEscapeToClose } from "@/components/ui/useEscapeToClose";

interface EditDestinationRateModalProps {
  rate: DestinationRouteRate | null;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (values: {
    driverBaseRate: number;
    helperBaseRate: number;
    extraHelperBaseRate: number;
  }) => void;
}

export default function EditDestinationRateModal({
  rate,
  isSaving,
  error,
  onClose,
  onSave,
}: EditDestinationRateModalProps) {
  const [driverRate, setDriverRate] = useState("");
  const [helperRate, setHelperRate] = useState("");
  const [extraHelperRate, setExtraHelperRate] = useState("");

  useEffect(() => {
    if (!rate) return;
    setDriverRate(String(rate.driverBaseRate));
    setHelperRate(String(rate.helperBaseRate));
    setExtraHelperRate(String(rate.extraHelperBaseRate));
  }, [rate]);

  useEscapeToClose(Boolean(rate), onClose, isSaving);

  if (!rate) return null;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      driverBaseRate: Number(driverRate),
      helperBaseRate: Number(helperRate),
      extraHelperBaseRate: Number(extraHelperRate),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-slate-900/50"
        onClick={isSaving ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-labelledby="edit-destination-rate-title"
        aria-modal="true"
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2
          id="edit-destination-rate-title"
          className="text-lg font-semibold text-slate-900"
        >
          Edit Route Rates
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {rate.routeName}
          {rate.distance ? ` · ${rate.distance}` : ""}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <RateField
            label="Driver base rate"
            value={driverRate}
            onChange={setDriverRate}
            current={rate.driverBaseRate}
          />
          <RateField
            label="Helper base rate"
            value={helperRate}
            onChange={setHelperRate}
            current={rate.helperBaseRate}
          />
          <RateField
            label="Extra helper base rate"
            value={extraHelperRate}
            onChange={setExtraHelperRate}
            current={rate.extraHelperBaseRate}
          />

          {error && (
            <p
              role="alert"
              aria-live="polite"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Save Rates"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RateField({
  label,
  value,
  onChange,
  current,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  current: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
      <span className="mt-1 block text-xs text-slate-400">
        Current: {formatCurrency(current)}
      </span>
    </label>
  );
}
