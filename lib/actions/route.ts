"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { mapDestinationRouteToUi } from "@/lib/mappers/route";
import { mapRouteHistoryToUi } from "@/lib/mappers/routeHistory";
import type { DestinationRouteRate } from "@/lib/rates";
import { prisma } from "@/lib/prisma";

export type RouteActionResult =
  | { success: true; routes: DestinationRouteRate[] }
  | { success: false; error: string };

export type RouteHistoryResult =
  | {
      success: true;
      entries: ReturnType<typeof mapRouteHistoryToUi>[];
    }
  | { success: false; error: string };

function parseRate(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    return `${label} must be zero or greater.`;
  }
  return null;
}

export type DestinationRateUpdate = {
  routeId: string;
  driverBaseRate: number;
  helperBaseRate: number;
  extraHelperBaseRate: number;
};

export async function updateDestinationRates(
  updates: DestinationRateUpdate[]
): Promise<RouteActionResult> {
  try {
    const admin = await requireAdmin();

    if (updates.length === 0) {
      return { success: false, error: "Select at least one route to update." };
    }

    const updatedRoutes: DestinationRouteRate[] = [];

    await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        const driverInvalid = parseRate(update.driverBaseRate, "Driver rate");
        if (driverInvalid) throw new Error(driverInvalid);
        const helperInvalid = parseRate(update.helperBaseRate, "Helper rate");
        if (helperInvalid) throw new Error(helperInvalid);
        const extraInvalid = parseRate(
          update.extraHelperBaseRate,
          "Extra helper rate"
        );
        if (extraInvalid) throw new Error(extraInvalid);

        const existing = await tx.destinationRoute.findUnique({
          where: { id: update.routeId },
          include: { client: { select: { id: true, name: true, calcType: true } } },
        });

        if (!existing) {
          throw new Error("One or more routes could not be found.");
        }

        if (existing.client.calcType !== "DESTINATION") {
          throw new Error(
            `Only destination-based clients can be edited here (${existing.client.name}).`
          );
        }

        if (existing.weightKg != null) {
          throw new Error("Weight-based routes cannot be edited in this panel.");
        }

        const unchanged =
          existing.driverBaseRate === update.driverBaseRate &&
          existing.helperBaseRate === update.helperBaseRate &&
          existing.extraHelperBaseRate === update.extraHelperBaseRate;

        if (unchanged) continue;

        const record = await tx.destinationRoute.update({
          where: { id: update.routeId },
          data: {
            driverBaseRate: update.driverBaseRate,
            helperBaseRate: update.helperBaseRate,
            extraHelperBaseRate: update.extraHelperBaseRate,
          },
          include: { client: { select: { name: true } } },
        });

        await tx.destinationRateHistory.create({
          data: {
            clientId: existing.clientId,
            destinationRouteId: existing.id,
            routeName: existing.routeName,
            distance: existing.distance,
            prevDriverBaseRate: existing.driverBaseRate,
            prevHelperBaseRate: existing.helperBaseRate,
            prevExtraHelperBaseRate: existing.extraHelperBaseRate,
            newDriverBaseRate: update.driverBaseRate,
            newHelperBaseRate: update.helperBaseRate,
            newExtraHelperBaseRate: update.extraHelperBaseRate,
            changedById: admin.id,
          },
        });

        updatedRoutes.push(mapDestinationRouteToUi(record));
      }
    });

    if (updatedRoutes.length === 0) {
      return { success: false, error: "No rates were changed." };
    }

    revalidatePath("/admin/routes");
    revalidatePath("/employee/shipments/new");
    revalidatePath("/");

    return { success: true, routes: updatedRoutes };
  } catch (error) {
    console.error("[updateDestinationRates]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not update destination rates.",
    };
  }
}

export async function fetchDestinationRateHistory(
  clientId: string
): Promise<RouteHistoryResult> {
  try {
    await requireAdmin();

    const records = await prisma.destinationRateHistory.findMany({
      where: { clientId },
      orderBy: { changedAt: "desc" },
      take: 100,
      include: { changedBy: { select: { email: true } } },
    });

    return { success: true, entries: records.map(mapRouteHistoryToUi) };
  } catch (error) {
    console.error("[fetchDestinationRateHistory]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not load rate history.",
    };
  }
}
