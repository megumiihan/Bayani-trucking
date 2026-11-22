"use client";

import { useEffect, useState, type FormEvent } from "react";
import { fetchLeadActivities } from "@/lib/actions/leads";
import {
  LEAD_ACTIVITY_KINDS,
  LEAD_ACTIVITY_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_STYLES,
  LEAD_TYPE_LABELS,
  todayISO,
  type LeadActivityKind,
  type LeadActivityUi,
  type LeadActivityWriteInput,
  type LeadUi,
} from "@/lib/leads";
import Badge from "@/components/ui/Badge";
import { inputClass } from "@/components/ui/formStyles";
import { useEscapeToClose } from "@/components/ui/useEscapeToClose";

interface LeadDetailDrawerProps {
  lead: LeadUi | null;
  /** Bumped by the parent after an email is sent so the history reloads. */
  refreshKey: number;
  isBusy: boolean;
  error: string | null;
  onClose: () => void;
  onEdit: (lead: LeadUi) => void;
  onEmail: (lead: LeadUi) => void;
  onConvert: (lead: LeadUi) => Promise<void>;
  onLogActivity: (input: LeadActivityWriteInput) => Promise<LeadActivityUi | null>;
}

function addDaysISO(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function LeadDetailDrawer({
  lead,
  refreshKey,
  isBusy,
  error,
  onClose,
  onEdit,
  onEmail,
  onConvert,
  onLogActivity,
}: LeadDetailDrawerProps) {
  const isOpen = Boolean(lead);
  const [activities, setActivities] = useState<LeadActivityUi[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [kind, setKind] = useState<LeadActivityKind>("CALL");
  const [summary, setSummary] = useState("");
  const [outcome, setOutcome] = useState("");
  const [followUp, setFollowUp] = useState("");

  const leadId = lead?.id;

  useEffect(() => {
    if (!leadId) return;
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    fetchLeadActivities(leadId).then((result) => {
      if (cancelled) return;
      setIsLoading(false);
      if (result.success) setActivities(result.activities);
      else setLoadError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [leadId, refreshKey]);

  useEffect(() => {
    if (!leadId) return;
    setKind("CALL");
    setSummary("");
    setOutcome("");
    setFollowUp(addDaysISO(7));
  }, [leadId]);

  useEscapeToClose(isOpen, onClose, isBusy);
  if (!lead) return null;

  const blocked = lead.status === "DO_NOT_CONTACT";

  const handleLog = async (event: FormEvent) => {
    event.preventDefault();
    if (isBusy) return;
    const activity = await onLogActivity({
      leadId: lead.id,
      kind,
      summary,
      outcome,
      occurredAt: todayISO(),
      nextFollowUpAt: followUp,
    });
    if (activity) {
      setActivities((current) => [activity, ...current]);
      setSummary("");
      setOutcome("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 bg-gray-900/40"
        onClick={isBusy ? undefined : onClose}
      />
      <aside
        role="dialog"
        aria-labelledby="lead-drawer-title"
        className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-xl"
      >
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="lead-drawer-title" className="text-lg font-semibold text-slate-900">
                {lead.companyName}
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {[lead.industry, lead.municipality, lead.province].filter(Boolean).join(" · ") ||
                  "No location yet"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
            >
              Close
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge label={LEAD_STATUS_LABELS[lead.status]} className={LEAD_STATUS_STYLES[lead.status]} />
            <Badge label={LEAD_TYPE_LABELS[lead.type]} />
            <Badge label={LEAD_SOURCE_LABELS[lead.source]} />
            {lead.clientId && <Badge label="Billing client" className="bg-emerald-50 text-emerald-700" />}
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-y-1.5 text-sm">
            {lead.contactPerson && <Row label="Contact" value={lead.contactPerson} />}
            {lead.phone && (
              <Row
                label="Phone"
                value={
                  <a href={`tel:${lead.phone}`} className="text-blue-700 hover:underline">
                    {lead.phone}
                  </a>
                }
              />
            )}
            {lead.email && <Row label="Email" value={lead.email} />}
            {lead.website && (
              <Row
                label="Website"
                value={
                  <a href={lead.website} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                    Open
                  </a>
                }
              />
            )}
            {lead.facebookUrl && (
              <Row
                label="Facebook"
                value={
                  <a href={lead.facebookUrl} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                    Open page
                  </a>
                }
              />
            )}
            <Row label="Follow up" value={lead.nextFollowUpAt || "Not scheduled"} />
          </dl>
          {lead.notes && (
            <p className="mt-3 whitespace-pre-line rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {lead.notes}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onEmail(lead)}
              disabled={isBusy || blocked || !lead.email}
              title={blocked ? "This lead asked not to be contacted" : !lead.email ? "Add an email first" : undefined}
              className="rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Send email
            </button>
            <button
              type="button"
              onClick={() => onEdit(lead)}
              disabled={isBusy}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Edit
            </button>
            {!lead.clientId && (
              <button
                type="button"
                onClick={() => onConvert(lead)}
                disabled={isBusy}
                className="rounded-lg border border-emerald-300 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
              >
                Mark won → add as client
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleLog} className="space-y-3 border-b border-slate-100 px-6 py-5">
          <h3 className="text-sm font-semibold text-slate-900">Log what happened</h3>
          <div className="flex flex-wrap gap-1.5">
            {LEAD_ACTIVITY_KINDS.filter((k) => k !== "EMAIL").map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  kind === k ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {LEAD_ACTIVITY_LABELS[k]}
              </button>
            ))}
          </div>
          <input
            required
            placeholder="e.g. Talked to the owner about weekly feed deliveries"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className={inputClass}
          />
          <input
            placeholder="Outcome (optional), e.g. wants a quote for 10 trips/month"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className={inputClass}
          />
          <label className="flex items-center gap-3 text-sm text-slate-700">
            Next follow-up
            <input
              type="date"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              className={`${inputClass} max-w-[11rem]`}
            />
          </label>
          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isBusy}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-gray-300"
          >
            {isBusy ? "Saving…" : "Save to history"}
          </button>
        </form>

        <div className="px-6 py-5">
          <h3 className="text-sm font-semibold text-slate-900">History</h3>
          {isLoading && <p className="mt-3 text-sm text-slate-500">Loading…</p>}
          {loadError && <p className="mt-3 text-sm text-red-700">{loadError}</p>}
          {!isLoading && !loadError && activities.length === 0 && (
            <p className="mt-3 text-sm text-slate-500">Nothing logged yet.</p>
          )}
          <ol className="mt-3 space-y-3">
            {activities.map((a) => (
              <li key={a.id} className="rounded-lg border border-slate-100 px-3 py-2">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{LEAD_ACTIVITY_LABELS[a.kind]}</span>
                  <span>{formatWhen(a.occurredAt)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-800">
                  {a.emailSubject ? `“${a.emailSubject}”` : a.summary}
                </p>
                {a.emailSubject && <p className="text-xs text-slate-500">{a.summary}</p>}
                {a.outcome && <p className="mt-0.5 text-sm text-slate-600">→ {a.outcome}</p>}
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-slate-800">{value}</dd>
    </div>
  );
}
