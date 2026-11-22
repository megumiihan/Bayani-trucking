"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  OPT_OUT_FOOTER,
  fillTemplate,
  type EmailTemplateUi,
  type LeadUi,
} from "@/lib/leads";
import { inputClass } from "@/components/ui/formStyles";
import { useEscapeToClose } from "@/components/ui/useEscapeToClose";

interface SendEmailModalProps {
  lead: LeadUi | null;
  templates: EmailTemplateUi[];
  emailConfigured: boolean;
  emailFrom: string | null;
  isSending: boolean;
  error: string | null;
  onClose: () => void;
  onSend: (input: { subject: string; body: string }) => Promise<void>;
}

export default function SendEmailModal({
  lead,
  templates,
  emailConfigured,
  emailFrom,
  isSending,
  error,
  onClose,
  onSend,
}: SendEmailModalProps) {
  const isOpen = Boolean(lead);
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!lead) return;
    const first = templates[0];
    setTemplateId(first?.id ?? "");
    setSubject(first ? fillTemplate(first.subject, lead) : "");
    setBody(first ? fillTemplate(first.body, lead) : "");
  }, [lead, templates]);

  useEscapeToClose(isOpen, onClose, isSending);
  if (!lead) return null;

  const pickTemplate = (id: string) => {
    setTemplateId(id);
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    setSubject(fillTemplate(template.subject, lead));
    setBody(fillTemplate(template.body, lead));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSending || !emailConfigured) return;
    await onSend({ subject, body });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-gray-900/50"
        onClick={isSending ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-labelledby="send-email-title"
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <h2 id="send-email-title" className="text-lg font-semibold text-gray-900">
          Email {lead.companyName}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          To <span className="font-medium text-gray-700">{lead.email}</span>
          {emailFrom && (
            <>
              {" "}from <span className="font-medium text-gray-700">{emailFrom}</span>
            </>
          )}
          . It will show in that Gmail&apos;s Sent folder, and replies go to its inbox.
        </p>

        {!emailConfigured && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Email isn&apos;t set up yet. Add <code>GMAIL_USER</code> and{" "}
            <code>GMAIL_APP_PASSWORD</code> to the environment, then reload.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {templates.length > 0 ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Template</span>
              <select
                value={templateId}
                onChange={(e) => pickTemplate(e.target.value)}
                className={inputClass}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm text-gray-500">
              No templates yet. Write the email below, or add a template in the Templates tab.
            </p>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Subject</span>
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Message</span>
            <textarea
              required
              rows={12}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={inputClass}
            />
            <span className="mt-1.5 block whitespace-pre-line text-xs text-gray-400">
              Added automatically at the end:{OPT_OUT_FOOTER}
            </span>
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
              disabled={isSending}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending || !emailConfigured}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isSending ? "Sending…" : "Send email"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
