/**
 * PhilHealth / SSS details for regular employees. Client-safe helpers only.
 * The data itself is sensitive personal information (Data Privacy Act): it is
 * never part of the shared Employee type, only fetched for admins on the
 * employee detail page.
 */

/** PRIVATE Supabase Storage bucket for ID card photos and other documents. */
export const EMPLOYEE_DOCUMENT_BUCKET = "employee-documents";
export const EMPLOYEE_DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;
export const EMPLOYEE_DOCUMENT_TYPES = [
  "image/jpeg",
  "image/webp",
  "image/png",
  "application/pdf",
] as const;

/** Card photos are resized in the browser so the longest side is at most this. */
export const ID_CARD_MAX_SIDE = 1600;
/** Card photos go through a server action, so they must stay under Next's 1 MB body limit. */
export const ID_CARD_MAX_BYTES = 900 * 1024;

export type GovernmentIdKind = "philhealth" | "sss";

export const GOVERNMENT_ID_KINDS: GovernmentIdKind[] = ["philhealth", "sss"];

export const governmentIdMeta: Record<
  GovernmentIdKind,
  { label: string; digits: number; groups: number[]; placeholder: string }
> = {
  philhealth: {
    label: "PhilHealth",
    digits: 12,
    groups: [2, 9, 1],
    placeholder: "12-345678901-2",
  },
  sss: {
    label: "SSS",
    digits: 10,
    groups: [2, 7, 1],
    placeholder: "34-5678901-2",
  },
};

export interface GovernmentIds {
  philhealthNumber: string | null;
  sssNumber: string | null;
  hasPhilhealthCard: boolean;
  hasSssCard: boolean;
}

/** Formats digits into the ID's standard dashed groups (e.g. 12-345678901-2). */
export function formatGovernmentId(kind: GovernmentIdKind, value: string): string {
  const digits = value.replace(/\D/g, "");
  const parts: string[] = [];
  let index = 0;
  for (const size of governmentIdMeta[kind].groups) {
    if (index >= digits.length) break;
    parts.push(digits.slice(index, index + size));
    index += size;
  }
  return parts.join("-");
}

/** Returns the normalized number, null for blank, or an error message. */
export function normalizeGovernmentId(
  kind: GovernmentIdKind,
  value: string
): { ok: true; value: string | null } | { ok: false; error: string } {
  const digits = value.replace(/\D/g, "");
  if (!digits) return { ok: true, value: null };
  const { label, digits: expected } = governmentIdMeta[kind];
  if (digits.length !== expected) {
    return { ok: false, error: `${label} number must have ${expected} digits.` };
  }
  return { ok: true, value: formatGovernmentId(kind, digits) };
}
