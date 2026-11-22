"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  LEAD_SOURCE_LABELS,
  LEAD_SOURCES,
  LEAD_STATUS_LABELS,
  LEAD_STATUSES,
  LEAD_TYPE_LABELS,
  LEAD_TYPES,
  REGION_II_PROVINCES,
  type LeadUi,
  type LeadWriteInput,
} from "@/lib/leads";
import { inputClass } from "@/components/ui/formStyles";
import { useEscapeToClose } from "@/components/ui/useEscapeToClose";

interface LeadModalProps {
  isOpen: boolean;
  isSaving: boolean;
  error: string | null;
  lead?: LeadUi | null;
  onClose: () => void;
  onSave: (input: LeadWriteInput) => Promise<void>;
}

const EMPTY: LeadWriteInput = {
  companyName: "",
  contactPerson: "",
  phone: "",
  email: "",
  website: "",
  facebookUrl: "",
  municipality: "",
  province: "",
  industry: "",
  type: "CONTRACT",
  source: "WEBSITE",
  status: "NEW",
  nextFollowUpAt: "",
  notes: "",
};

export default function LeadModal({
  isOpen,
  isSaving,
  error,
  lead,
  onClose,
  onSave,
}: LeadModalProps) {
  const [form, setForm] = useState<LeadWriteInput>(EMPTY);

  useEffect(() => {
    if (!isOpen) return;
    if (lead) {
      setForm({
        companyName: lead.companyName,
        contactPerson: lead.contactPerson,
        phone: lead.phone,
        email: lead.email,
        website: lead.website,
        facebookUrl: lead.facebookUrl,
        municipality: lead.municipality,
        province: lead.province,
        industry: lead.industry,
        type: lead.type,
        source: lead.source,
        status: lead.status,
        nextFollowUpAt: lead.nextFollowUpAt,
        notes: lead.notes,
      });
    } else {
      setForm(EMPTY);
    }
  }, [isOpen, lead]);

  useEscapeToClose(isOpen, onClose, isSaving);
  if (!isOpen) return null;

  const set = <K extends keyof LeadWriteInput>(key: K, value: LeadWriteInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    await onSave(form);
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
        aria-labelledby="lead-modal-title"
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <h2 id="lead-modal-title" className="text-lg font-semibold text-gray-900">
          {lead ? "Edit lead" : "Add lead"}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          A business that might need trucking. Only the company name is required.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Company name" className="sm:col-span-2">
            <input
              required
              value={form.companyName}
              onChange={(e) => set("companyName", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Contact person">
            <input
              value={form.contactPerson}
              onChange={(e) => set("contactPerson", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Industry">
            <input
              placeholder="e.g. poultry, rice mill, hardware"
              value={form.industry}
              onChange={(e) => set("industry", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Website">
            <input
              type="url"
              placeholder="https://"
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Facebook page">
            <input
              type="url"
              placeholder="https://facebook.com/…"
              value={form.facebookUrl}
              onChange={(e) => set("facebookUrl", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Municipality / city">
            <input
              value={form.municipality}
              onChange={(e) => set("municipality", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Province">
            <input
              list="region-ii-provinces"
              value={form.province}
              onChange={(e) => set("province", e.target.value)}
              className={inputClass}
            />
            <datalist id="region-ii-provinces">
              {REGION_II_PROVINCES.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>
          <Field label="Kind of client">
            <select
              value={form.type}
              onChange={(e) => set("type", e.target.value as LeadWriteInput["type"])}
              className={inputClass}
            >
              {LEAD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {LEAD_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Where we found them">
            <select
              value={form.source}
              onChange={(e) => set("source", e.target.value as LeadWriteInput["source"])}
              className={inputClass}
            >
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {LEAD_SOURCE_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as LeadWriteInput["status"])}
              className={inputClass}
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {LEAD_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Next follow-up">
            <input
              type="date"
              value={form.nextFollowUpAt}
              onChange={(e) => set("nextFollowUpAt", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className={inputClass}
            />
          </Field>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 sm:col-span-2"
            >
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1 sm:col-span-2">
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
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isSaving ? "Saving…" : lead ? "Save changes" : "Add lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
