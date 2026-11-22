// Shared lead types and constants. Safe to import from client components.

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "QUOTED",
  "WON",
  "LOST",
  "DO_NOT_CONTACT",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  QUOTED: "Quoted",
  WON: "Won",
  LOST: "Lost",
  DO_NOT_CONTACT: "Do not contact",
};

export const LEAD_STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-slate-100 text-slate-700",
  INTERESTED: "bg-amber-100 text-amber-800",
  QUOTED: "bg-violet-100 text-violet-800",
  WON: "bg-emerald-100 text-emerald-800",
  LOST: "bg-gray-100 text-gray-500",
  DO_NOT_CONTACT: "bg-red-100 text-red-700",
};

export const LEAD_TYPES = ["CONTRACT", "ONE_TIME_MOVE"] as const;
export type LeadType = (typeof LEAD_TYPES)[number];
export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  CONTRACT: "Contract client",
  ONE_TIME_MOVE: "One-time move",
};

export const LEAD_SOURCES = [
  "WEBSITE",
  "FACEBOOK_SEARCH",
  "FACEBOOK_PAGE_INQUIRY",
  "REFERRAL",
  "WALK_IN",
  "OTHER",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];
export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  WEBSITE: "Company website",
  FACEBOOK_SEARCH: "Found on Facebook",
  FACEBOOK_PAGE_INQUIRY: "Inquiry on our FB page",
  REFERRAL: "Referral",
  WALK_IN: "Walk-in / call-in",
  OTHER: "Other",
};

export const LEAD_ACTIVITY_KINDS = [
  "CALL",
  "EMAIL",
  "FB_MESSAGE",
  "MEETING",
  "NOTE",
] as const;
export type LeadActivityKind = (typeof LEAD_ACTIVITY_KINDS)[number];
export const LEAD_ACTIVITY_LABELS: Record<LeadActivityKind, string> = {
  CALL: "Call",
  EMAIL: "Email",
  FB_MESSAGE: "FB message",
  MEETING: "Meeting",
  NOTE: "Note",
};

export const REGION_II_PROVINCES = [
  "Batanes",
  "Cagayan",
  "Isabela",
  "Nueva Vizcaya",
  "Quirino",
] as const;

/** Days until the next follow-up after an email goes out. */
export const DEFAULT_FOLLOW_UP_DAYS = 5;

export const OPT_OUT_FOOTER =
  "\n\n—\nIf you'd rather not hear from us, just reply STOP and we won't email you again.";

export type LeadUi = {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  website: string;
  facebookUrl: string;
  municipality: string;
  province: string;
  industry: string;
  type: LeadType;
  source: LeadSource;
  status: LeadStatus;
  /** YYYY-MM-DD, or "" when none is set. */
  nextFollowUpAt: string;
  notes: string;
  clientId: string | null;
  lastActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeadWriteInput = Omit<
  LeadUi,
  "id" | "clientId" | "lastActivityAt" | "createdAt" | "updatedAt"
>;

export type LeadActivityUi = {
  id: string;
  leadId: string;
  kind: LeadActivityKind;
  summary: string;
  outcome: string;
  occurredAt: string;
  emailSubject: string | null;
  createdByEmail: string;
};

export type LeadActivityWriteInput = {
  leadId: string;
  kind: LeadActivityKind;
  summary: string;
  outcome: string;
  /** YYYY-MM-DD; defaults to today. */
  occurredAt?: string;
  /** YYYY-MM-DD to reschedule, "" to clear, undefined to leave alone. */
  nextFollowUpAt?: string;
};

export type EmailTemplateUi = {
  id: string;
  name: string;
  subject: string;
  body: string;
};

export type EmailTemplateWriteInput = Omit<EmailTemplateUi, "id">;

export const TEMPLATE_PLACEHOLDERS = [
  "contactPerson",
  "companyName",
  "municipality",
] as const;

/** Fills {{contactPerson}}, {{companyName}} and {{municipality}} from a lead. */
export function fillTemplate(text: string, lead: Pick<LeadUi, "contactPerson" | "companyName" | "municipality">) {
  const values: Record<string, string> = {
    contactPerson: lead.contactPerson.trim() || "Sir/Ma'am",
    companyName: lead.companyName.trim(),
    municipality: lead.municipality.trim() || "your area",
  };
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    key in values ? values[key] : match
  );
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Leads whose follow-up date is today or earlier, excluding closed ones. */
export function isFollowUpDue(lead: Pick<LeadUi, "nextFollowUpAt" | "status">, today = todayISO()) {
  if (!lead.nextFollowUpAt) return false;
  if (lead.status === "WON" || lead.status === "LOST" || lead.status === "DO_NOT_CONTACT") {
    return false;
  }
  return lead.nextFollowUpAt <= today;
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
