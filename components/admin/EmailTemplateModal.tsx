"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  TEMPLATE_PLACEHOLDERS,
  type EmailTemplateUi,
  type EmailTemplateWriteInput,
} from "@/lib/leads";
import { inputClass } from "@/components/ui/formStyles";
import { useEscapeToClose } from "@/components/ui/useEscapeToClose";

interface EmailTemplateModalProps {
  isOpen: boolean;
  isSaving: boolean;
  error: string | null;
  template?: EmailTemplateUi | null;
  onClose: () => void;
  onSave: (input: EmailTemplateWriteInput) => Promise<void>;
}

const STARTER: EmailTemplateWriteInput = {
  name: "Intro — contract hauling",
  subject: "Trucking services for {{companyName}}",
  body: `Good day, {{contactPerson}}!

We're Bayani Trucking, a trucking company serving Region II. We'd like to offer {{companyName}} reliable hauling for your deliveries in and around {{municipality}}.

We can set up a regular schedule or a contract rate that fits your volume. Would you be open to a short call this week so we can give you a quote?

Thank you, and we hope to work with you.

Bayani Trucking`,
};

export default function EmailTemplateModal({
  isOpen,
  isSaving,
  error,
  template,
  onClose,
  onSave,
}: EmailTemplateModalProps) {
  const [form, setForm] = useState<EmailTemplateWriteInput>(STARTER);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      template
        ? { name: template.name, subject: template.subject, body: template.body }
        : STARTER
    );
  }, [isOpen, template]);

  useEscapeToClose(isOpen, onClose, isSaving);
  if (!isOpen) return null;

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
        aria-labelledby="template-modal-title"
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <h2 id="template-modal-title" className="text-lg font-semibold text-gray-900">
          {template ? "Edit template" : "New email template"}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          These placeholders get filled in from the lead:{" "}
          {TEMPLATE_PLACEHOLDERS.map((p) => (
            <code key={p} className="mr-1 rounded bg-slate-100 px-1 text-xs">
              {`{{${p}}}`}
            </code>
          ))}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Template name</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Subject</span>
            <input
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Message</span>
            <textarea
              required
              rows={12}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
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
              disabled={isSaving}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isSaving ? "Saving…" : "Save template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
