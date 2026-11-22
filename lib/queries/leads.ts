import { prisma } from "@/lib/prisma";
import {
  leadListInclude,
  mapEmailTemplateToUi,
  mapLeadToUi,
} from "@/lib/mappers/lead";

export async function getLeads() {
  const records = await prisma.lead.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: leadListInclude,
  });
  return records.map(mapLeadToUi);
}

export async function getEmailTemplates() {
  const records = await prisma.emailTemplate.findMany({
    orderBy: { name: "asc" },
  });
  return records.map(mapEmailTemplateToUi);
}
