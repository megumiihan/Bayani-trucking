"use client";

import { useEffect, useMemo, useState } from "react";
import { useRole } from "@/context/RoleContext";
import {
  convertLeadToClient,
  createLead,
  deleteEmailTemplate,
  deleteLead,
  importLeads,
  logLeadActivity,
  saveEmailTemplate,
  sendLeadEmail,
  updateLead,
} from "@/lib/actions/leads";
import {
  LEAD_SOURCE_LABELS,
  LEAD_SOURCES,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_STYLES,
  LEAD_STATUSES,
  LEAD_TYPE_LABELS,
  LEAD_TYPES,
  REGION_II_PROVINCES,
  isFollowUpDue,
  todayISO,
  type EmailTemplateUi,
  type EmailTemplateWriteInput,
  type LeadActivityWriteInput,
  type LeadUi,
  type LeadWriteInput,
} from "@/lib/leads";
import EmailTemplateModal from "@/components/admin/EmailTemplateModal";
import ImportLeadsModal from "@/components/admin/ImportLeadsModal";
import LeadDetailDrawer from "@/components/admin/LeadDetailDrawer";
import LeadModal from "@/components/admin/LeadModal";
import SendEmailModal from "@/components/admin/SendEmailModal";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { filterInputClass } from "@/components/ui/formStyles";

type Tab = "all" | "due" | "templates";

interface AdminLeadsProps {
  initialLeads: LeadUi[];
  initialTemplates: EmailTemplateUi[];
  emailConfigured: boolean;
  emailFrom: string | null;
}

type Filters = {
  search: string;
  status: string;
  type: string;
  province: string;
  source: string;
};

const NO_FILTERS: Filters = { search: "", status: "", type: "", province: "", source: "" };

function matches(lead: LeadUi, f: Filters) {
  if (f.status && lead.status !== f.status) return false;
  if (f.type && lead.type !== f.type) return false;
  if (f.source && lead.source !== f.source) return false;
  if (f.province && lead.province.toLowerCase() !== f.province.toLowerCase()) return false;
  if (f.search) {
    const q = f.search.toLowerCase();
    const haystack = [
      lead.companyName,
      lead.contactPerson,
      lead.email,
      lead.phone,
      lead.municipality,
      lead.industry,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

export default function AdminLeads({
  initialLeads,
  initialTemplates,
  emailConfigured,
  emailFrom,
}: AdminLeadsProps) {
  const { role } = useRole();
  const [tab, setTab] = useState<Tab>("all");
  const [leads, setLeads] = useState(initialLeads);
  const [templates, setTemplates] = useState(initialTemplates);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);

  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadUi | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [emailingLead, setEmailingLead] = useState<LeadUi | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplateUi | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => setLeads(initialLeads), [initialLeads]);
  useEffect(() => setTemplates(initialTemplates), [initialTemplates]);

  const today = todayISO();
  const viewingLead = leads.find((l) => l.id === viewingId) ?? null;

  const stats = useMemo(() => {
    const month = today.slice(0, 7);
    return {
      due: leads.filter((l) => isFollowUpDue(l, today)).length,
      fresh: leads.filter((l) => l.status === "NEW").length,
      quoted: leads.filter((l) => l.status === "QUOTED" || l.status === "INTERESTED").length,
      wonThisMonth: leads.filter(
        (l) => l.status === "WON" && l.updatedAt.slice(0, 7) === month
      ).length,
    };
  }, [leads, today]);

  const visible = useMemo(() => {
    const base = tab === "due" ? leads.filter((l) => isFollowUpDue(l, today)) : leads;
    const filtered = base.filter((l) => matches(l, filters));
    if (tab === "due") {
      return [...filtered].sort((a, b) => a.nextFollowUpAt.localeCompare(b.nextFollowUpAt));
    }
    return filtered;
  }, [leads, filters, tab, today]);

  if (role !== "admin") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
        Admin access required. Switch to Admin view using the role toggle.
      </div>
    );
  }

  const replaceLead = (lead: LeadUi) =>
    setLeads((current) => {
      const rest = current.filter((l) => l.id !== lead.id);
      return [lead, ...rest];
    });

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 4000);
  };

  // ── Lead create/edit ──
  const openNewLead = () => {
    setError(null);
    setEditingLead(null);
    setLeadModalOpen(true);
  };
  const openEditLead = (lead: LeadUi) => {
    setError(null);
    setEditingLead(lead);
    setLeadModalOpen(true);
  };
  const handleSaveLead = async (input: LeadWriteInput) => {
    setIsSaving(true);
    setError(null);
    const result = editingLead ? await updateLead(editingLead.id, input) : await createLead(input);
    setIsSaving(false);
    if (!result.success) return setError(result.error);
    replaceLead(result.lead);
    setLeadModalOpen(false);
    setEditingLead(null);
  };
  const handleDeleteLead = async (lead: LeadUi) => {
    if (!window.confirm(`Delete ${lead.companyName} and its history?`)) return;
    const result = await deleteLead(lead.id);
    if (!result.success) return flash(result.error);
    setLeads((current) => current.filter((l) => l.id !== lead.id));
    if (viewingId === lead.id) setViewingId(null);
  };

  // ── Drawer actions ──
  const openLead = (lead: LeadUi) => {
    setError(null);
    setViewingId(lead.id);
  };
  const handleLogActivity = async (input: LeadActivityWriteInput) => {
    setIsSaving(true);
    setError(null);
    const result = await logLeadActivity(input);
    setIsSaving(false);
    if (!result.success) {
      setError(result.error);
      return null;
    }
    replaceLead(result.lead);
    return result.activity;
  };
  const handleConvert = async (lead: LeadUi) => {
    if (
      !window.confirm(
        `Mark ${lead.companyName} as won and add it as a billing client? You can set its rates in Routes & Rates.`
      )
    )
      return;
    setIsSaving(true);
    setError(null);
    const result = await convertLeadToClient(lead.id);
    setIsSaving(false);
    if (!result.success) return setError(result.error);
    replaceLead(result.lead);
    flash(`${lead.companyName} is now a client. Set its rates in Routes & Rates.`);
  };

  // ── Email ──
  const openEmail = (lead: LeadUi) => {
    setError(null);
    setEmailingLead(lead);
  };
  const handleSend = async (input: { subject: string; body: string }) => {
    if (!emailingLead) return;
    setIsSaving(true);
    setError(null);
    const result = await sendLeadEmail({ leadId: emailingLead.id, ...input });
    setIsSaving(false);
    if (!result.success) return setError(result.error);
    replaceLead(result.lead);
    setHistoryKey((k) => k + 1);
    flash(`Email sent to ${emailingLead.email}. Follow-up set for ${result.lead.nextFollowUpAt}.`);
    setEmailingLead(null);
  };

  // ── Templates ──
  const openTemplate = (template: EmailTemplateUi | null) => {
    setError(null);
    setEditingTemplate(template);
    setTemplateModalOpen(true);
  };
  const handleSaveTemplate = async (input: EmailTemplateWriteInput) => {
    setIsSaving(true);
    setError(null);
    const result = await saveEmailTemplate(editingTemplate?.id ?? null, input);
    setIsSaving(false);
    if (!result.success) return setError(result.error);
    setTemplates((current) =>
      [...current.filter((t) => t.id !== result.template.id), result.template].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    );
    setTemplateModalOpen(false);
    setEditingTemplate(null);
  };
  const handleDeleteTemplate = async (template: EmailTemplateUi) => {
    if (!window.confirm(`Delete the template "${template.name}"?`)) return;
    const result = await deleteEmailTemplate(template.id);
    if (!result.success) return flash(result.error);
    setTemplates((current) => current.filter((t) => t.id !== template.id));
  };

  // ── Import ──
  const handleImport = async (rows: Partial<LeadWriteInput>[]) => {
    setIsSaving(true);
    setError(null);
    const result = await importLeads(rows);
    setIsSaving(false);
    if (!result.success) return setError(result.error);
    setLeads(result.leads);
    setImportOpen(false);
    flash(
      `Imported ${result.created} lead${result.created === 1 ? "" : "s"}` +
        (result.skipped ? `, skipped ${result.skipped} (duplicates or missing names).` : ".")
    );
  };

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Businesses we're reaching out to. Log calls and messages, send pitch emails, and keep follow-ups from slipping."
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setImportOpen(true);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Import CSV / Excel
            </button>
            <button
              type="button"
              onClick={openNewLead}
              className="rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Add lead
            </button>
          </>
        }
      />

      {notice && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800"
        >
          {notice}
        </p>
      )}

      {!emailConfigured && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Sending email is off until <code>GMAIL_USER</code> and <code>GMAIL_APP_PASSWORD</code>{" "}
          are set. Everything else works.
        </p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Follow-ups due" value={String(stats.due)} accent={stats.due ? "amber" : "slate"} icon={<Dot />} hint="Today or overdue" />
        <StatCard label="New" value={String(stats.fresh)} accent="blue" icon={<Dot />} hint="Not contacted yet" />
        <StatCard label="Interested / quoted" value={String(stats.quoted)} accent="slate" icon={<Dot />} />
        <StatCard label="Won this month" value={String(stats.wonThisMonth)} accent="green" icon={<Dot />} />
      </div>

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {(
          [
            ["all", `All leads (${leads.length})`],
            ["due", `Follow-ups due (${stats.due})`],
            ["templates", `Email templates (${templates.length})`],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === key
                ? "border-blue-700 text-blue-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "templates" ? (
        <section className="card-surface overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Email templates</h2>
            <button
              type="button"
              onClick={() => openTemplate(null)}
              className="rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              New template
            </button>
          </div>
          {templates.length === 0 ? (
            <EmptyState
              icon={<Dot />}
              title="No templates yet"
              description="Write your pitch once, then send it to each lead with their name and town filled in."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {templates.map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{t.name}</p>
                    <p className="text-sm text-slate-500">{t.subject}</p>
                    <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-slate-400">{t.body}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => openTemplate(t)} className="text-sm text-blue-700 hover:underline">
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDeleteTemplate(t)} className="text-sm text-red-600 hover:underline">
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className="card-surface overflow-hidden rounded-2xl">
          <div className="grid grid-cols-2 gap-2 border-b border-slate-100 px-4 py-3 sm:grid-cols-3 lg:grid-cols-6">
            <input
              type="search"
              placeholder="Search name, phone, town…"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className={`${filterInputClass} col-span-2 sm:col-span-3 lg:col-span-2`}
            />
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className={filterInputClass}>
              <option value="">Any status</option>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
              ))}
            </select>
            <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className={filterInputClass}>
              <option value="">Any kind</option>
              {LEAD_TYPES.map((t) => (
                <option key={t} value={t}>{LEAD_TYPE_LABELS[t]}</option>
              ))}
            </select>
            <select value={filters.province} onChange={(e) => setFilters({ ...filters, province: e.target.value })} className={filterInputClass}>
              <option value="">Any province</option>
              {REGION_II_PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })} className={filterInputClass}>
              <option value="">Any source</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>{LEAD_SOURCE_LABELS[s]}</option>
              ))}
            </select>
          </div>
          {hasFilters && (
            <div className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
              Showing {visible.length} of {tab === "due" ? stats.due : leads.length}.{" "}
              <button type="button" onClick={() => setFilters(NO_FILTERS)} className="text-blue-700 hover:underline">
                Clear filters
              </button>
            </div>
          )}

          {visible.length === 0 ? (
            <EmptyState
              icon={<Dot />}
              title={tab === "due" ? "Nothing due" : leads.length ? "No leads match" : "No leads yet"}
              description={
                tab === "due"
                  ? "No follow-ups are due today. Nice."
                  : leads.length
                    ? "Try clearing the filters."
                    : "Add businesses you find on websites or Facebook, or import a spreadsheet."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[56rem] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Company</th>
                    <th className="px-4 py-3 font-semibold">Contact</th>
                    <th className="px-4 py-3 font-semibold">Location</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Follow up</th>
                    <th className="px-4 py-3 font-semibold"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((lead) => {
                    const due = isFollowUpDue(lead, today);
                    const blocked = lead.status === "DO_NOT_CONTACT";
                    return (
                      <tr key={lead.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => openLead(lead)}
                            className="text-left font-medium text-slate-900 hover:text-blue-700 hover:underline"
                          >
                            {lead.companyName}
                          </button>
                          <p className="text-xs text-slate-500">
                            {LEAD_TYPE_LABELS[lead.type]}
                            {lead.industry ? ` · ${lead.industry}` : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-800">{lead.contactPerson || "—"}</p>
                          <p className="text-xs text-slate-500">
                            {lead.phone ? (
                              <a href={`tel:${lead.phone}`} className="hover:text-blue-700 hover:underline">
                                {lead.phone}
                              </a>
                            ) : null}
                            {lead.phone && lead.email ? " · " : ""}
                            {lead.email}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {[lead.municipality, lead.province].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge label={LEAD_STATUS_LABELS[lead.status]} className={LEAD_STATUS_STYLES[lead.status]} />
                        </td>
                        <td className={`px-4 py-3 tabular-nums ${due ? "font-semibold text-red-700" : "text-slate-600"}`}>
                          {lead.nextFollowUpAt || "—"}
                          {due && lead.nextFollowUpAt < today && <span className="ml-1 text-xs font-normal">overdue</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-3 text-sm">
                            <button
                              type="button"
                              onClick={() => openEmail(lead)}
                              disabled={blocked || !lead.email}
                              className="text-blue-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
                            >
                              Email
                            </button>
                            <button type="button" onClick={() => openLead(lead)} className="text-slate-700 hover:underline">
                              Log
                            </button>
                            <button type="button" onClick={() => openEditLead(lead)} className="text-slate-700 hover:underline">
                              Edit
                            </button>
                            <button type="button" onClick={() => handleDeleteLead(lead)} className="text-red-600 hover:underline">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <LeadModal
        isOpen={leadModalOpen}
        isSaving={isSaving}
        error={error}
        lead={editingLead}
        onClose={() => {
          if (isSaving) return;
          setLeadModalOpen(false);
          setEditingLead(null);
        }}
        onSave={handleSaveLead}
      />

      <LeadDetailDrawer
        lead={leadModalOpen || emailingLead ? null : viewingLead}
        refreshKey={historyKey}
        isBusy={isSaving}
        error={error}
        onClose={() => setViewingId(null)}
        onEdit={openEditLead}
        onEmail={openEmail}
        onConvert={handleConvert}
        onLogActivity={handleLogActivity}
      />

      <SendEmailModal
        lead={emailingLead}
        templates={templates}
        emailConfigured={emailConfigured}
        emailFrom={emailFrom}
        isSending={isSaving}
        error={error}
        onClose={() => {
          if (isSaving) return;
          setEmailingLead(null);
        }}
        onSend={handleSend}
      />

      <EmailTemplateModal
        isOpen={templateModalOpen}
        isSaving={isSaving}
        error={error}
        template={editingTemplate}
        onClose={() => {
          if (isSaving) return;
          setTemplateModalOpen(false);
          setEditingTemplate(null);
        }}
        onSave={handleSaveTemplate}
      />

      <ImportLeadsModal
        isOpen={importOpen}
        isSaving={isSaving}
        error={error}
        onClose={() => {
          if (isSaving) return;
          setImportOpen(false);
        }}
        onImport={handleImport}
      />
    </div>
  );
}

function Dot() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-5 w-5">
      <path d="M2 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1.2l-8 4.6-8-4.6V5Zm0 3.5V15a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5l-7.5 4.3a1 1 0 0 1-1 0L2 8.5Z" />
    </svg>
  );
}
