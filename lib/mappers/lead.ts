import type {
  EmailTemplate as DbEmailTemplate,
  Lead as DbLead,
  LeadActivity as DbLeadActivity,
} from "@prisma/client";
import type { EmailTemplateUi, LeadActivityUi, LeadUi } from "@/lib/leads";

function isoDate(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export function mapLeadToUi(
  record: DbLead & { activities?: Pick<DbLeadActivity, "occurredAt">[] }
): LeadUi {
  const last = record.activities?.[0]?.occurredAt ?? null;
  return {
    id: record.id,
    companyName: record.companyName,
    contactPerson: record.contactPerson,
    phone: record.phone,
    email: record.email,
    website: record.website,
    facebookUrl: record.facebookUrl,
    municipality: record.municipality,
    province: record.province,
    industry: record.industry,
    type: record.type,
    source: record.source,
    status: record.status,
    nextFollowUpAt: isoDate(record.nextFollowUpAt),
    notes: record.notes,
    clientId: record.clientId,
    lastActivityAt: last ? last.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function mapLeadActivityToUi(
  record: DbLeadActivity & { createdBy?: { email: string } | null }
): LeadActivityUi {
  return {
    id: record.id,
    leadId: record.leadId,
    kind: record.kind,
    summary: record.summary,
    outcome: record.outcome,
    occurredAt: record.occurredAt.toISOString(),
    emailSubject: record.emailSubject,
    createdByEmail: record.createdBy?.email ?? "",
  };
}

export function mapEmailTemplateToUi(record: DbEmailTemplate): EmailTemplateUi {
  return {
    id: record.id,
    name: record.name,
    subject: record.subject,
    body: record.body,
  };
}

/** Prisma include that pulls only the newest activity date for list rows. */
export const leadListInclude = {
  activities: {
    select: { occurredAt: true },
    orderBy: { occurredAt: "desc" as const },
    take: 1,
  },
};
