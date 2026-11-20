"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  EMPLOYEE_DOCUMENT_BUCKET,
  ID_CARD_MAX_BYTES,
  governmentIdMeta,
  normalizeGovernmentId,
  type GovernmentIdKind,
  type GovernmentIds,
} from "@/lib/governmentIds";

type Result<T> = { success: true } & T | { success: false; error: string };

const CARD_TYPES = ["image/jpeg", "image/webp"];
const SIGNED_URL_SECONDS = 60;

const cardColumn = {
  philhealth: "philhealthCardPath",
  sss: "sssCardPath",
} as const satisfies Record<GovernmentIdKind, string>;

function isKind(kind: string): kind is GovernmentIdKind {
  return kind === "philhealth" || kind === "sss";
}

async function loadIds(id: string) {
  return prisma.employee.findUnique({
    where: { id },
    select: {
      isRegular: true,
      philhealthNumber: true,
      sssNumber: true,
      philhealthCardPath: true,
      sssCardPath: true,
    },
  });
}

function toGovernmentIds(record: NonNullable<Awaited<ReturnType<typeof loadIds>>>): GovernmentIds {
  return {
    philhealthNumber: record.philhealthNumber,
    sssNumber: record.sssNumber,
    hasPhilhealthCard: Boolean(record.philhealthCardPath),
    hasSssCard: Boolean(record.sssCardPath),
  };
}

function errorResult(scope: string, error: unknown, fallback: string) {
  console.error(`[${scope}]`, error);
  return { success: false as const, error: error instanceof Error ? error.message : fallback };
}

export async function updateGovernmentIdNumbers(
  id: string,
  input: { philhealthNumber: string; sssNumber: string }
): Promise<Result<{ ids: GovernmentIds }>> {
  try {
    await requireAdmin();

    const philhealth = normalizeGovernmentId("philhealth", input.philhealthNumber);
    if (!philhealth.ok) return { success: false, error: philhealth.error };
    const sss = normalizeGovernmentId("sss", input.sssNumber);
    if (!sss.ok) return { success: false, error: sss.error };

    const existing = await loadIds(id);
    if (!existing) return { success: false, error: "Employee not found." };
    if (!existing.isRegular) {
      return { success: false, error: "Only regular employees can have PhilHealth / SSS details." };
    }

    await prisma.employee.update({
      where: { id },
      data: { philhealthNumber: philhealth.value, sssNumber: sss.value },
    });

    revalidatePath(`/admin/employees/${id}`);
    const updated = await loadIds(id);
    return { success: true, ids: toGovernmentIds(updated!) };
  } catch (error) {
    return errorResult("updateGovernmentIdNumbers", error, "Could not save the ID numbers.");
  }
}

/** Expects FormData with a `card` image, already resized in the browser. */
export async function uploadGovernmentIdCard(
  id: string,
  kind: string,
  formData: FormData
): Promise<Result<{ ids: GovernmentIds }>> {
  try {
    await requireAdmin();
    if (!isKind(kind)) return { success: false, error: "Unknown ID type." };

    const card = formData.get("card");
    if (!(card instanceof File) || card.size === 0) {
      return { success: false, error: "Choose a photo of the card." };
    }
    if (!CARD_TYPES.includes(card.type)) {
      return { success: false, error: "Card photo must be a JPEG or WebP image." };
    }
    if (card.size > ID_CARD_MAX_BYTES) {
      return { success: false, error: "Card photo is too large." };
    }

    const existing = await loadIds(id);
    if (!existing) return { success: false, error: "Employee not found." };
    if (!existing.isRegular) {
      return { success: false, error: "Only regular employees can have PhilHealth / SSS details." };
    }

    const column = cardColumn[kind];
    const ext = card.type === "image/webp" ? "webp" : "jpg";
    const path = `${id}/${kind}-${Date.now()}.${ext}`;
    const storage = createSupabaseAdminClient().storage.from(EMPLOYEE_DOCUMENT_BUCKET);

    const { error: uploadError } = await storage.upload(path, card, {
      contentType: card.type,
      upsert: false,
    });
    if (uploadError) {
      return { success: false, error: `Upload failed: ${uploadError.message}` };
    }

    await prisma.employee.update({ where: { id }, data: { [column]: path } });

    const oldPath = existing[column];
    if (oldPath) {
      const { error } = await storage.remove([oldPath]);
      if (error) console.error("[uploadGovernmentIdCard] remove old", oldPath, error);
    }

    revalidatePath(`/admin/employees/${id}`);
    const updated = await loadIds(id);
    return { success: true, ids: toGovernmentIds(updated!) };
  } catch (error) {
    return errorResult("uploadGovernmentIdCard", error, "Could not upload the card photo.");
  }
}

export async function removeGovernmentIdCard(
  id: string,
  kind: string
): Promise<Result<{ ids: GovernmentIds }>> {
  try {
    await requireAdmin();
    if (!isKind(kind)) return { success: false, error: "Unknown ID type." };

    const existing = await loadIds(id);
    if (!existing) return { success: false, error: "Employee not found." };

    const column = cardColumn[kind];
    const oldPath = existing[column];
    await prisma.employee.update({ where: { id }, data: { [column]: null } });

    if (oldPath) {
      const { error } = await createSupabaseAdminClient()
        .storage.from(EMPLOYEE_DOCUMENT_BUCKET)
        .remove([oldPath]);
      if (error) console.error("[removeGovernmentIdCard]", oldPath, error);
    }

    revalidatePath(`/admin/employees/${id}`);
    const updated = await loadIds(id);
    return { success: true, ids: toGovernmentIds(updated!) };
  } catch (error) {
    return errorResult("removeGovernmentIdCard", error, "Could not remove the card photo.");
  }
}

/** Short-lived link to view a card photo. Generated per click; never stored. */
export async function getGovernmentIdCardUrl(
  id: string,
  kind: string
): Promise<Result<{ url: string }>> {
  try {
    const admin = await requireAdmin();
    if (!isKind(kind)) return { success: false, error: "Unknown ID type." };

    const existing = await loadIds(id);
    const path = existing?.[cardColumn[kind]];
    if (!path) return { success: false, error: `No ${governmentIdMeta[kind].label} card on file.` };

    const { data, error } = await createSupabaseAdminClient()
      .storage.from(EMPLOYEE_DOCUMENT_BUCKET)
      .createSignedUrl(path, SIGNED_URL_SECONDS);
    if (error || !data) {
      return { success: false, error: error?.message ?? "Could not open the card photo." };
    }

    console.info(`[getGovernmentIdCardUrl] ${admin.email} viewed ${kind} card of employee ${id}`);
    return { success: true, url: data.signedUrl };
  } catch (error) {
    return errorResult("getGovernmentIdCardUrl", error, "Could not open the card photo.");
  }
}
