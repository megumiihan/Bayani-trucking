"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { mapClientToUi } from "@/lib/mappers/client";
import { prisma } from "@/lib/prisma";
import type { Client } from "@/lib/clients";

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
    await requireAdmin();

    const driverInvalid = parseRate(input.pigheadDriverRate, "Driver per-head rate");
    if (driverInvalid) return { success: false, error: driverInvalid };
    const helperInvalid = parseRate(input.pigheadHelperRate, "Helper per-head rate");
    if (helperInvalid) return { success: false, error: helperInvalid };

    const existing = await prisma.client.findUnique({
      where: { id: input.id },
      select: { id: true, calcType: true },
    });
    if (!existing) return { success: false, error: "Client not found." };
    if (existing.calcType !== "ANIMAL_HEADCOUNT") {
      return { success: false, error: "Only livestock clients have per-head rates." };
    }

    const record = await prisma.client.update({
      where: { id: input.id },
      data: {
        pigheadDriverRate: input.pigheadDriverRate,
        pigheadHelperRate: input.pigheadHelperRate,
      },
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
    await requireAdmin();

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

    await prisma.destinationRoute.create({
      data: {
        clientId: client.id,
        routeName,
        distance: "",
        driverBaseRate: input.driverBaseRate,
        helperBaseRate: input.helperBaseRate,
        extraHelperBaseRate: input.helperBaseRate,
      },
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
