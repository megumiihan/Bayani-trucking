import { requirePageRole } from "@/lib/auth";
import { isGmailConfigured } from "@/lib/email/gmail";
import { getEmailTemplates, getLeads } from "@/lib/queries/leads";
import AdminLeads from "@/components/views/AdminLeads";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  await requirePageRole(["admin"]);
  const [leads, templates] = await Promise.all([getLeads(), getEmailTemplates()]);

  return (
    <AdminLeads
      initialLeads={leads}
      initialTemplates={templates}
      emailConfigured={isGmailConfigured()}
      emailFrom={process.env.GMAIL_USER ?? null}
    />
  );
}
