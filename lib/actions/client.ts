"use server";

import type { ClientRateHistoryKind } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { mapClientToUi } from "@/lib/mappers/client";
import { mapClientRateHistoryToUi } from "@/lib/mappers/clientRateHistory";
import { prisma } from "@/lib/prisma";
import type { Client } from "@/lib/clients";
import { formatTin } from "@/lib/clientDirectory";

export type ClientActionResult =
  | { success: true; client: Client }
  | { success: false; error: string };

function parseRate(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    return `${label} must be zero or greater.`;
  }
  return null;
}

export async function createLivestockClient(input: {
  name: string;
  pigheadDriverRate: number;
  pigheadHelperRate: number;
}): Promise<ClientActionResult> {
  try {
    await requireAdmin();

    const name = input.name.trim();
    if (!name) return { success: false, error: "Client name is required." };

    const driverInvalid = parseRate(input.pigheadDriverRate, "Driver per-head rate");
    if (driverInvalid) return { success: false, error: driverInvalid };
    const helperInvalid = parseRate(input.pigheadHelperRate, "Helper per-head rate");
    if (helperInvalid) return { success: false, error: helperInvalid };

    const existing = await prisma.client.findUnique({
      where: { name },
      select: { id: true },
    });
    if (existing) {
      return { success: false, error: `A client named "${name}" already exists.` };
    }

    const record = await prisma.client.create({
      data: {
        name,
        calcType: "ANIMAL_HEADCOUNT",
        pigheadDriverRate: input.pigheadDriverRate,
        pigheadHelperRate: input.pigheadHelperRate,
      },
    });

    revalidatePath("/admin/routes");
    revalidatePath("/employee/shipments/new");
    revalidatePath("/");

    return { success: true, client: mapClientToUi(record) };
  } catch (error) {
    console.error("[createLivestockClient]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not create the livestock client.",
    };
  }
}

export async function updateLivestockRates(input: {
  id: string;
  pigheadDriverRate: number;
  pigheadHelperRate: number;
}): Promise<ClientActionResult> {
  try {
    const admin = await requireAdmin();

    const driverInvalid = parseRate(input.pigheadDriverRate, "Driver per-head rate");
    if (driverInvalid) return { success: false, error: driverInvalid };
    const helperInvalid = parseRate(input.pigheadHelperRate, "Helper per-head rate");
    if (helperInvalid) return { success: false, error: helperInvalid };

    const existing = await prisma.client.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        calcType: true,
        pigheadDriverRate: true,
        pigheadHelperRate: true,
      },
    });
    if (!existing) return { success: false, error: "Client not found." };
    if (existing.calcType !== "ANIMAL_HEADCOUNT") {
      return { success: false, error: "Only livestock clients have per-head rates." };
    }

    const unchanged =
      existing.pigheadDriverRate === input.pigheadDriverRate &&
      existing.pigheadHelperRate === input.pigheadHelperRate;

    if (unchanged) {
      return { success: false, error: "No rates were changed." };
    }

    const record = await prisma.$transaction(async (tx) => {
      const updated = await tx.client.update({
        where: { id: input.id },
        data: {
          pigheadDriverRate: input.pigheadDriverRate,
          pigheadHelperRate: input.pigheadHelperRate,
        },
      });

      await tx.clientRateHistory.create({
        data: {
          clientId: existing.id,
          kind: "LIVESTOCK",
          prevPigheadDriverRate: existing.pigheadDriverRate,
          prevPigheadHelperRate: existing.pigheadHelperRate,
          newPigheadDriverRate: input.pigheadDriverRate,
          newPigheadHelperRate: input.pigheadHelperRate,
          changedById: admin.id,
        },
      });

      return updated;
    });

    revalidatePath("/admin/routes");
    revalidatePath("/employee/shipments/new");
    revalidatePath("/");

    return { success: true, client: mapClientToUi(record) };
  } catch (error) {
    console.error("[updateLivestockRates]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not update livestock rates.",
    };
  }
}

export type LivestockRouteResult =
  | { success: true }
  | { success: false; error: string };

export async function createLivestockRoute(input: {
  clientId: string;
  routeName: string;
  driverBaseRate: number;
  helperBaseRate: number;
}): Promise<LivestockRouteResult> {
  try {
    const admin = await requireAdmin();

    const routeName = input.routeName.trim();
    if (!routeName) return { success: false, error: "Route name is required." };

    const driverInvalid = parseRate(input.driverBaseRate, "Driver base");
    if (driverInvalid) return { success: false, error: driverInvalid };
    const helperInvalid = parseRate(input.helperBaseRate, "Helper base");
    if (helperInvalid) return { success: false, error: helperInvalid };

    const client = await prisma.client.findUnique({
      where: { id: input.clientId },
      select: { id: true, calcType: true },
    });
    if (!client) return { success: false, error: "Client not found." };
    if (client.calcType !== "ANIMAL_HEADCOUNT") {
      return { success: false, error: "Routes can only be added to livestock clients here." };
    }

    await prisma.$transaction(async (tx) => {
      const created = await tx.destinationRoute.create({
        data: {
          clientId: client.id,
          routeName,
          distance: "",
          driverBaseRate: input.driverBaseRate,
          helperBaseRate: input.helperBaseRate,
          extraHelperBaseRate: input.helperBaseRate,
        },
      });

      await tx.destinationRateHistory.create({
        data: {
          clientId: client.id,
          destinationRouteId: created.id,
          routeName,
          distance: "",
          isCreated: true,
          prevDriverBaseRate: 0,
          prevHelperBaseRate: 0,
          prevExtraHelperBaseRate: 0,
          newDriverBaseRate: input.driverBaseRate,
          newHelperBaseRate: input.helperBaseRate,
          newExtraHelperBaseRate: input.helperBaseRate,
          changedById: admin.id,
        },
      });
    });

    revalidatePath("/admin/routes");
    revalidatePath("/employee/shipments/new");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("[createLivestockRoute]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not create the livestock route.",
    };
  }
}

function parseFraction(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    return `${label} must be between 0 and 100%.`;
  }
  return null;
}

export async function createPlatformClient(input: {
  name: string;
  platformShare: number;
  platformDriverRate: number;
  platformHelperRate: number;
}): Promise<ClientActionResult> {
  try {
    await requireAdmin();

    const name = input.name.trim();
    if (!name) return { success: false, error: "Client name is required." };

    const shareInvalid = parseFraction(input.platformShare, "Platform share");
    if (shareInvalid) return { success: false, error: shareInvalid };
    const driverInvalid = parseFraction(input.platformDriverRate, "Driver rate");
    if (driverInvalid) return { success: false, error: driverInvalid };
    const helperInvalid = parseFraction(input.platformHelperRate, "Helper rate");
    if (helperInvalid) return { success: false, error: helperInvalid };

    const existing = await prisma.client.findUnique({
      where: { name },
      select: { id: true },
    });
    if (existing) {
      return { success: false, error: `A client named "${name}" already exists.` };
    }

    const record = await prisma.client.create({
      data: {
        name,
        calcType: "PLATFORM",
        platformShare: input.platformShare,
        platformDriverRate: input.platformDriverRate,
        platformHelperRate: input.platformHelperRate,
      },
    });

    revalidatePath("/admin/routes");
    revalidatePath("/employee/shipments/new");
    revalidatePath("/");

    return { success: true, client: mapClientToUi(record) };
  } catch (error) {
    console.error("[createPlatformClient]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not create the platform client.",
    };
  }
}

export async function updatePlatformRates(input: {
  id: string;
  platformShare: number;
  platformDriverRate: number;
  platformHelperRate: number;
}): Promise<ClientActionResult> {
  try {
    const admin = await requireAdmin();

    const shareInvalid = parseFraction(input.platformShare, "Platform share");
    if (shareInvalid) return { success: false, error: shareInvalid };
    const driverInvalid = parseFraction(input.platformDriverRate, "Driver rate");
    if (driverInvalid) return { success: false, error: driverInvalid };
    const helperInvalid = parseFraction(input.platformHelperRate, "Helper rate");
    if (helperInvalid) return { success: false, error: helperInvalid };

    const existing = await prisma.client.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        calcType: true,
        platformShare: true,
        platformDriverRate: true,
        platformHelperRate: true,
      },
    });
    if (!existing) return { success: false, error: "Client not found." };
    if (existing.calcType !== "PLATFORM") {
      return { success: false, error: "Only platform clients have these rates." };
    }

    const unchanged =
      existing.platformShare === input.platformShare &&
      existing.platformDriverRate === input.platformDriverRate &&
      existing.platformHelperRate === input.platformHelperRate;

    if (unchanged) {
      return { success: false, error: "No rates were changed." };
    }

    const record = await prisma.$transaction(async (tx) => {
      const updated = await tx.client.update({
        where: { id: input.id },
        data: {
          platformShare: input.platformShare,
          platformDriverRate: input.platformDriverRate,
          platformHelperRate: input.platformHelperRate,
        },
      });

      await tx.clientRateHistory.create({
        data: {
          clientId: existing.id,
          kind: "PLATFORM",
          prevPlatformShare: existing.platformShare,
          prevPlatformDriverRate: existing.platformDriverRate,
          prevPlatformHelperRate: existing.platformHelperRate,
          newPlatformShare: input.platformShare,
          newPlatformDriverRate: input.platformDriverRate,
          newPlatformHelperRate: input.platformHelperRate,
          changedById: admin.id,
        },
      });

      return updated;
    });

    revalidatePath("/admin/routes");
    revalidatePath("/employee/shipments/new");
    revalidatePath("/");

    return { success: true, client: mapClientToUi(record) };
  } catch (error) {
    console.error("[updatePlatformRates]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not update platform rates.",
    };
  }
}

export type ClientRateHistoryResult =
  | { success: true; entries: ReturnType<typeof mapClientRateHistoryToUi>[] }
  | { success: false; error: string };

export async function fetchClientRateHistory(
  clientId: string,
  kind: ClientRateHistoryKind
): Promise<ClientRateHistoryResult> {
  try {
    await requireAdmin();

    const records = await prisma.clientRateHistory.findMany({
      where: { clientId, kind },
      orderBy: { changedAt: "desc" },
      take: 100,
      include: { changedBy: { select: { email: true } } },
    });

    return { success: true, entries: records.map(mapClientRateHistoryToUi) };
  } catch (error) {
    console.error("[fetchClientRateHistory]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not load rate history.",
    };
  }
}

// ── Client directory (Clients tab) ──────────────────────────────────────────

export interface ClientDetailsInput {
  name: string;
  legalName: string;
  address: string;
  tin: string;
  /** One-off client: hidden from the Clients page. Omit to leave unchanged. */
  isTemporary?: boolean;
}

function cleanDetails(input: ClientDetailsInput) {
  const name = input.name.trim();
  if (!name) throw new Error("Short name is required.");
  return {
    name,
    legalName: input.legalName.trim(),
    address: input.address.trim(),
    tin: formatTin(input.tin),
    ...(input.isTemporary === undefined ? {} : { isTemporary: input.isTemporary }),
  };
}

function revalidateClientPages() {
  revalidatePath("/admin/clients");
  revalidatePath("/admin/bookkeeping/directory");
  revalidatePath("/admin/routes");
  revalidatePath("/admin/bookkeeping");
  revalidatePath("/employee/shipments/new");
  revalidatePath("/");
}

/** New clients start on destination pricing; set rates on Routes & Rates. */
export async function createClientRecord(
  input: ClientDetailsInput,
): Promise<ClientActionResult> {
  try {
    await requireAdmin();
    const data = cleanDetails(input);
    const existing = await prisma.client.findUnique({
      where: { name: data.name },
      select: { id: true },
    });
    if (existing) {
      return { success: false, error: `A client named "${data.name}" already exists.` };
    }
    const record = await prisma.client.create({
      data: { ...data, calcType: "DESTINATION" },
    });
    revalidateClientPages();
    return { success: true, client: mapClientToUi(record) };
  } catch (error) {
    console.error("[createClientRecord]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not add the client.",
    };
  }
}

export async function updateClientDetails(
  input: ClientDetailsInput & { id: string },
): Promise<ClientActionResult> {
  try {
    await requireAdmin();
    const data = cleanDetails(input);
    const clash = await prisma.client.findUnique({
      where: { name: data.name },
      select: { id: true },
    });
    if (clash && clash.id !== input.id) {
      return { success: false, error: `A client named "${data.name}" already exists.` };
    }
    const record = await prisma.client.update({ where: { id: input.id }, data });
    revalidateClientPages();
    return { success: true, client: mapClientToUi(record) };
  } catch (error) {
    console.error("[updateClientDetails]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not save the client.",
    };
  }
}
