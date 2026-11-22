"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { sendGmail } from "@/lib/email/gmail";
import {
  DEFAULT_FOLLOW_UP_DAYS,
  LEAD_ACTIVITY_KINDS,
  LEAD_SOURCES,
  LEAD_STATUSES,
  LEAD_TYPES,
  OPT_OUT_FOOTER,
  isValidEmail,
  type EmailTemplateUi,
  type EmailTemplateWriteInput,
  type LeadActivityUi,
  type LeadActivityWriteInput,
  type LeadStatus,
  type LeadUi,
  type LeadWriteInput,
} from "@/lib/leads";
import {
  leadListInclude,
  mapEmailTemplateToUi,
  mapLeadActivityToUi,
  mapLeadToUi,
} from "@/lib/mappers/lead";
import { prisma } from "@/lib/prisma";

type Fail = { success: false; error: string };
export type LeadResult = { success: true; lead: LeadUi } | Fail;
export type OkResult = { success: true } | Fail;

function fail(scope: string, error: unknown, fallback: string): Fail {
  console.error(`[${scope}]`, error);
  return {
    success: false,
    error: error instanceof Error ? error.message : fallback,
  };
}

function revalidateLeads() {
  revalidatePath("/admin/leads");
  revalidatePath("/");
}

/** "YYYY-MM-DD" → Date at noon UTC (so it never slips a day in PH time). */
function parseDay(value: string | undefined): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid date: ${value}`);
  return new Date(`${value}T12:00:00.000Z`);
}

function addDays(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(12, 0, 0, 0);
  return date;
}

function cleanLeadInput(input: LeadWriteInput) {
  const companyName = input.companyName.trim();
  if (!companyName) throw new Error("Company name is required.");
  const email = input.email.trim().toLowerCase();
  if (email && !isValidEmail(email)) throw new Error("That email address doesn't look right.");
  if (!LEAD_TYPES.includes(input.type)) throw new Error("Unknown lead type.");
  if (!LEAD_SOURCES.includes(input.source)) throw new Error("Unknown lead source.");
  if (!LEAD_STATUSES.includes(input.status)) throw new Error("Unknown status.");

  return {
    companyName,
    contactPerson: input.contactPerson.trim(),
    phone: input.phone.trim(),
    email,
    website: input.website.trim(),
    facebookUrl: input.facebookUrl.trim(),
    municipality: input.municipality.trim(),
    province: input.province.trim(),
    industry: input.industry.trim(),
    type: input.type,
    source: input.source,
    status: input.status,
    nextFollowUpAt: parseDay(input.nextFollowUpAt),
    notes: input.notes.trim(),
  } satisfies Prisma.LeadUncheckedUpdateInput;
}

export async function createLead(input: LeadWriteInput): Promise<LeadResult> {
  try {
    const admin = await requireAdmin();
    const record = await prisma.lead.create({
      data: { ...cleanLeadInput(input), createdById: admin.id },
      include: leadListInclude,
    });
    revalidateLeads();
    return { success: true, lead: mapLeadToUi(record) };
  } catch (error) {
    return fail("createLead", error, "Could not save the lead.");
  }
}

export async function updateLead(id: string, input: LeadWriteInput): Promise<LeadResult> {
  try {
    await requireAdmin();
    const record = await prisma.lead.update({
      where: { id },
      data: cleanLeadInput(input),
      include: leadListInclude,
    });
    revalidateLeads();
    return { success: true, lead: mapLeadToUi(record) };
  } catch (error) {
    return fail("updateLead", error, "Could not update the lead.");
  }
}

export async function deleteLead(id: string): Promise<OkResult> {
  try {
    await requireAdmin();
    await prisma.lead.delete({ where: { id } });
    revalidateLeads();
    return { success: true };
  } catch (error) {
    return fail("deleteLead", error, "Could not delete the lead.");
  }
}

export async function setLeadStatus(id: string, status: LeadStatus): Promise<LeadResult> {
  try {
    await requireAdmin();
    if (!LEAD_STATUSES.includes(status)) throw new Error("Unknown status.");
    const closed = status === "LOST" || status === "DO_NOT_CONTACT";
    const record = await prisma.lead.update({
      where: { id },
      data: { status, ...(closed ? { nextFollowUpAt: null } : {}) },
      include: leadListInclude,
    });
    revalidateLeads();
    return { success: true, lead: mapLeadToUi(record) };
  } catch (error) {
    return fail("setLeadStatus", error, "Could not change the status.");
  }
}

// ── Activity log ────────────────────────────────────────────────────────────

export type ActivitiesResult =
  | { success: true; activities: LeadActivityUi[] }
  | Fail;

export async function fetchLeadActivities(leadId: string): Promise<ActivitiesResult> {
  try {
    await requireAdmin();
    const records = await prisma.leadActivity.findMany({
      where: { leadId },
      orderBy: { occurredAt: "desc" },
      take: 200,
      include: { createdBy: { select: { email: true } } },
    });
    return { success: true, activities: records.map(mapLeadActivityToUi) };
  } catch (error) {
    return fail("fetchLeadActivities", error, "Could not load the history.");
  }
}

export type LogActivityResult =
  | { success: true; lead: LeadUi; activity: LeadActivityUi }
  | Fail;

export async function logLeadActivity(input: LeadActivityWriteInput): Promise<LogActivityResult> {
  try {
    const admin = await requireAdmin();
    const summary = input.summary.trim();
    if (!summary) throw new Error("Add a short summary of what happened.");
    if (!LEAD_ACTIVITY_KINDS.includes(input.kind)) throw new Error("Unknown activity type.");

    const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
    if (!lead) throw new Error("Lead not found.");

    const occurredAt = parseDay(input.occurredAt) ?? new Date();
    const leadUpdate: Prisma.LeadUpdateInput = {};
    if (input.nextFollowUpAt !== undefined) {
      leadUpdate.nextFollowUpAt = parseDay(input.nextFollowUpAt);
    }
    // Reaching out moves a fresh lead along the pipeline.
    if (lead.status === "NEW" && input.kind !== "NOTE") {
      leadUpdate.status = "CONTACTED";
    }

    const [activity, updated] = await prisma.$transaction([
      prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          kind: input.kind,
          summary,
          outcome: input.outcome.trim(),
          occurredAt,
          createdById: admin.id,
        },
        include: { createdBy: { select: { email: true } } },
      }),
      prisma.lead.update({
        where: { id: lead.id },
        data: leadUpdate,
        include: leadListInclude,
      }),
    ]);

    revalidateLeads();
    return {
      success: true,
      lead: mapLeadToUi(updated),
      activity: mapLeadActivityToUi(activity),
    };
  } catch (error) {
    return fail("logLeadActivity", error, "Could not log the activity.");
  }
}

// ── Email ───────────────────────────────────────────────────────────────────

export async function sendLeadEmail(input: {
  leadId: string;
  subject: string;
  body: string;
}): Promise<LogActivityResult> {
  try {
    const admin = await requireAdmin();
    const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
    if (!lead) throw new Error("Lead not found.");
    if (lead.status === "DO_NOT_CONTACT") {
      throw new Error("This lead asked not to be contacted.");
    }
    if (!lead.email || !isValidEmail(lead.email)) {
      throw new Error("This lead has no valid email address.");
    }
    const subject = input.subject.trim();
    const body = input.body.trim();
    if (!subject || !body) throw new Error("Subject and message are required.");

    const { messageId } = await sendGmail({
      to: lead.email,
      subject,
      text: body + OPT_OUT_FOOTER,
    });

    const [activity, updated] = await prisma.$transaction([
      prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          kind: "EMAIL",
          summary: `Sent email to ${lead.email}`,
          emailSubject: subject,
          gmailMessageId: messageId,
          createdById: admin.id,
        },
        include: { createdBy: { select: { email: true } } },
      }),
      prisma.lead.update({
        where: { id: lead.id },
        data: {
          ...(lead.status === "NEW" ? { status: "CONTACTED" as const } : {}),
          nextFollowUpAt: addDays(DEFAULT_FOLLOW_UP_DAYS),
        },
        include: leadListInclude,
      }),
    ]);

    revalidateLeads();
    return {
      success: true,
      lead: mapLeadToUi(updated),
      activity: mapLeadActivityToUi(activity),
    };
  } catch (error) {
    return fail("sendLeadEmail", error, "Could not send the email.");
  }
}

// ── Email templates ─────────────────────────────────────────────────────────

export type TemplateResult = { success: true; template: EmailTemplateUi } | Fail;

function cleanTemplate(input: EmailTemplateWriteInput) {
  const name = input.name.trim();
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!name || !subject || !body) {
    throw new Error("Name, subject and message are all required.");
  }
  return { name, subject, body };
}

export async function saveEmailTemplate(
  id: string | null,
  input: EmailTemplateWriteInput
): Promise<TemplateResult> {
  try {
    await requireAdmin();
    const data = cleanTemplate(input);
    const clash = await prisma.emailTemplate.findUnique({ where: { name: data.name } });
    if (clash && clash.id !== id) {
      throw new Error(`A template named "${data.name}" already exists.`);
    }
    const record = id
      ? await prisma.emailTemplate.update({ where: { id }, data })
      : await prisma.emailTemplate.create({ data });
    revalidatePath("/admin/leads");
    return { success: true, template: mapEmailTemplateToUi(record) };
  } catch (error) {
    return fail("saveEmailTemplate", error, "Could not save the template.");
  }
}

export async function deleteEmailTemplate(id: string): Promise<OkResult> {
  try {
    await requireAdmin();
    await prisma.emailTemplate.delete({ where: { id } });
    revalidatePath("/admin/leads");
    return { success: true };
  } catch (error) {
    return fail("deleteEmailTemplate", error, "Could not delete the template.");
  }
}

// ── Convert to client ───────────────────────────────────────────────────────

export async function convertLeadToClient(leadId: string): Promise<LeadResult> {
  try {
    await requireAdmin();
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new Error("Lead not found.");
    if (lead.clientId) throw new Error("This lead is already a client.");

    const record = await prisma.$transaction(async (tx) => {
      // Reuse an existing client with the same name rather than failing on the
      // unique constraint — the lead may be a returning customer.
      const client =
        (await tx.client.findUnique({ where: { name: lead.companyName } })) ??
        (await tx.client.create({
          data: { name: lead.companyName, calcType: "DESTINATION" },
        }));
      return tx.lead.update({
        where: { id: lead.id },
        data: { clientId: client.id, status: "WON", nextFollowUpAt: null },
        include: leadListInclude,
      });
    });

    revalidateLeads();
    revalidatePath("/admin/routes");
    revalidatePath("/admin/bookkeeping");
    revalidatePath("/employee/shipments/new");
    return { success: true, lead: mapLeadToUi(record) };
  } catch (error) {
    return fail("convertLeadToClient", error, "Could not convert the lead.");
  }
}

// ── Import ──────────────────────────────────────────────────────────────────

export type ImportResult =
  | { success: true; created: number; skipped: number; leads: LeadUi[] }
  | Fail;

/** Rows come from a parsed CSV/XLSX (see components/admin/ImportLeadsModal.tsx). */
export async function importLeads(rows: Partial<LeadWriteInput>[]): Promise<ImportResult> {
  try {
    const admin = await requireAdmin();
    if (rows.length > 1000) throw new Error("Import up to 1,000 rows at a time.");

    const existing = await prisma.lead.findMany({ select: { companyName: true } });
    const seen = new Set(existing.map((row) => row.companyName.trim().toLowerCase()));

    const data: Prisma.LeadCreateManyInput[] = [];
    let skipped = 0;
    for (const row of rows) {
      const name = (row.companyName ?? "").trim();
      if (!name || seen.has(name.toLowerCase())) {
        skipped += 1;
        continue;
      }
      try {
        const clean = cleanLeadInput({
          companyName: name,
          contactPerson: row.contactPerson ?? "",
          phone: row.phone ?? "",
          email: row.email ?? "",
          website: row.website ?? "",
          facebookUrl: row.facebookUrl ?? "",
          municipality: row.municipality ?? "",
          province: row.province ?? "",
          industry: row.industry ?? "",
          type: row.type && LEAD_TYPES.includes(row.type) ? row.type : "CONTRACT",
          source: row.source && LEAD_SOURCES.includes(row.source) ? row.source : "OTHER",
          status: "NEW",
          nextFollowUpAt: "",
          notes: row.notes ?? "",
        });
        data.push({ ...clean, createdById: admin.id });
        seen.add(name.toLowerCase());
      } catch {
        skipped += 1;
      }
    }

    if (data.length > 0) await prisma.lead.createMany({ data });

    const leads = await prisma.lead.findMany({
      orderBy: [{ updatedAt: "desc" }],
      include: leadListInclude,
    });
    revalidateLeads();
    return {
      success: true,
      created: data.length,
      skipped,
      leads: leads.map(mapLeadToUi),
    };
  } catch (error) {
    return fail("importLeads", error, "Could not import the leads.");
  }
}
