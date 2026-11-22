"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { mapClientToUi } from "@/lib/mappers/client";
import { mapDestinationRouteToUi } from "@/lib/mappers/route";
import { mapRouteHistoryToUi } from "@/lib/mappers/routeHistory";
import type { Client } from "@/lib/clients";
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

function revalidateRatePaths() {
  revalidatePath("/admin/routes");
  revalidatePath("/employee/shipments/new");
  revalidatePath("/");
}

function errorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error != null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  ) {
    return "That route already exists for this client.";
  }
  return error instanceof Error ? error.message : fallback;
}

export type RateClientResult =
  | { success: true; client: Client }
  | { success: false; error: string };

/** Adds a destination-based or weight-based client from Routes & Rates. */
export async function createRateClient(input: {
  name: string;
  calcType: "DESTINATION" | "WEIGHT";
}): Promise<RateClientResult> {
  try {
    await requireAdmin();

    const name = input.name.trim();
    if (!name) return { success: false, error: "Client name is required." };
    if (input.calcType !== "DESTINATION" && input.calcType !== "WEIGHT") {
      return { success: false, error: "Unsupported client type." };
    }

    const existing = await prisma.client.findUnique({
      where: { name },
      select: { id: true },
    });
    if (existing) {
      return { success: false, error: `A client named "${name}" already exists.` };
    }

    const record = await prisma.client.create({
      data: { name, calcType: input.calcType },
    });

    revalidateRatePaths();
    return { success: true, client: mapClientToUi(record) };
  } catch (error) {
    console.error("[createRateClient]", error);
    return { success: false, error: errorMessage(error, "Could not create the client.") };
  }
}

export type SingleRouteResult =
  | { success: true; route: DestinationRouteRate }
  | { success: false; error: string };

export async function createDestinationRoute(input: {
  clientId: string;
  routeName: string;
  distance: string;
  driverBaseRate: number;
  helperBaseRate: number;
  extraHelperBaseRate: number;
}): Promise<SingleRouteResult> {
  try {
    const admin = await requireAdmin();

    const routeName = input.routeName.trim().toUpperCase();
    const distance = input.distance.trim().toUpperCase();
    if (!routeName) return { success: false, error: "Route name is required." };

    for (const [value, label] of [
      [input.driverBaseRate, "Driver rate"],
      [input.helperBaseRate, "Helper rate"],
      [input.extraHelperBaseRate, "Extra helper rate"],
    ] as const) {
      const invalid = parseRate(value, label);
      if (invalid) return { success: false, error: invalid };
    }

    const client = await prisma.client.findUnique({
      where: { id: input.clientId },
      select: { id: true, calcType: true },
    });
    if (!client) return { success: false, error: "Client not found." };
    if (client.calcType !== "DESTINATION") {
      return { success: false, error: "Only destination-based clients can get routes here." };
    }

    const duplicate = await prisma.destinationRoute.findFirst({
      where: { clientId: client.id, routeName, distance, weightKg: null },
      select: { id: true },
    });
    if (duplicate) {
      return { success: false, error: "That route and distance already exist for this client." };
    }

    const record = await prisma.$transaction(async (tx) => {
      const created = await tx.destinationRoute.create({
        data: {
          clientId: client.id,
          routeName,
          distance,
          driverBaseRate: input.driverBaseRate,
          helperBaseRate: input.helperBaseRate,
          extraHelperBaseRate: input.extraHelperBaseRate,
        },
        include: { client: { select: { name: true } } },
      });

      await tx.destinationRateHistory.create({
        data: {
          clientId: client.id,
          destinationRouteId: created.id,
          routeName,
          distance,
          isCreated: true,
          prevDriverBaseRate: 0,
          prevHelperBaseRate: 0,
          prevExtraHelperBaseRate: 0,
          newDriverBaseRate: input.driverBaseRate,
          newHelperBaseRate: input.helperBaseRate,
          newExtraHelperBaseRate: input.extraHelperBaseRate,
          changedById: admin.id,
        },
      });

      return created;
    });

    revalidateRatePaths();
    return { success: true, route: mapDestinationRouteToUi(record) };
  } catch (error) {
    console.error("[createDestinationRoute]", error);
    return { success: false, error: errorMessage(error, "Could not add the route.") };
  }
}

export type WeightRateValues = {
  helperBaseRate: number;
  driverBaseRate: number;
  sameDriverRate: number;
  newHelperRate: number;
  newDriverRate: number;
};

function validateWeightRates(values: WeightRateValues) {
  for (const [value, label] of [
    [values.helperBaseRate, "Helper rate"],
    [values.driverBaseRate, "Driver rate"],
    [values.sameDriverRate, "Same-driver rate"],
    [values.newHelperRate, "Inexperienced helper rate"],
    [values.newDriverRate, "Inexperienced driver rate"],
  ] as const) {
    const invalid = parseRate(value, label);
    if (invalid) return invalid;
  }
  return null;
}

export async function createWeightRoute(
  input: {
    clientId: string;
    routeName: string;
    distance: string;
    weightKg: number;
  } & WeightRateValues
): Promise<SingleRouteResult> {
  try {
    const admin = await requireAdmin();

    const routeName = input.routeName.trim().toUpperCase();
    const distance = input.distance.trim().toUpperCase();
    if (!routeName) return { success: false, error: "Destination is required." };
    if (!Number.isInteger(input.weightKg) || input.weightKg <= 0) {
      return { success: false, error: "Weight tier must be a whole number of kg." };
    }
    const invalid = validateWeightRates(input);
    if (invalid) return { success: false, error: invalid };

    const client = await prisma.client.findUnique({
      where: { id: input.clientId },
      select: { id: true, calcType: true },
    });
    if (!client) return { success: false, error: "Client not found." };
    if (client.calcType !== "WEIGHT") {
      return { success: false, error: "Only weight-based clients can get weight tiers." };
    }

    const record = await prisma.$transaction(async (tx) => {
      const created = await tx.destinationRoute.create({
        data: {
          clientId: client.id,
          routeName,
          distance,
          weightKg: input.weightKg,
          helperBaseRate: input.helperBaseRate,
          driverBaseRate: input.driverBaseRate,
          // Weight payouts pay the extra helper at the helper rate.
          extraHelperBaseRate: input.helperBaseRate,
          sameDriverRate: input.sameDriverRate,
          newHelperRate: input.newHelperRate,
          newDriverRate: input.newDriverRate,
        },
        include: { client: { select: { name: true } } },
      });

      await tx.destinationRateHistory.create({
        data: {
          clientId: client.id,
          destinationRouteId: created.id,
          routeName,
          distance,
          weightKg: input.weightKg,
          isCreated: true,
          prevDriverBaseRate: 0,
          prevHelperBaseRate: 0,
          prevExtraHelperBaseRate: 0,
          newDriverBaseRate: input.driverBaseRate,
          newHelperBaseRate: input.helperBaseRate,
          newExtraHelperBaseRate: input.helperBaseRate,
          newSameDriverRate: input.sameDriverRate,
          newNewHelperRate: input.newHelperRate,
          newNewDriverRate: input.newDriverRate,
          changedById: admin.id,
        },
      });

      return created;
    });

    revalidateRatePaths();
    return { success: true, route: mapDestinationRouteToUi(record) };
  } catch (error) {
    console.error("[createWeightRoute]", error);
    return { success: false, error: errorMessage(error, "Could not add the weight tier.") };
  }
}

/** Edits one weight tier (e.g. Bounty) and records the change in rate history. */
export async function updateWeightRate(
  input: { routeId: string } & WeightRateValues
): Promise<SingleRouteResult> {
  try {
    const admin = await requireAdmin();

    const invalid = validateWeightRates(input);
    if (invalid) return { success: false, error: invalid };

    const existing = await prisma.destinationRoute.findUnique({
      where: { id: input.routeId },
      include: { client: { select: { name: true, calcType: true } } },
    });
    if (!existing) return { success: false, error: "Weight tier not found." };
    if (existing.client.calcType !== "WEIGHT" || existing.weightKg == null) {
      return { success: false, error: "Only weight-based tiers can be edited here." };
    }

    const unchanged =
      existing.helperBaseRate === input.helperBaseRate &&
      existing.driverBaseRate === input.driverBaseRate &&
      existing.sameDriverRate === input.sameDriverRate &&
      existing.newHelperRate === input.newHelperRate &&
      existing.newDriverRate === input.newDriverRate;
    if (unchanged) return { success: false, error: "No rates were changed." };

    const record = await prisma.$transaction(async (tx) => {
      const updated = await tx.destinationRoute.update({
        where: { id: existing.id },
        data: {
          helperBaseRate: input.helperBaseRate,
          driverBaseRate: input.driverBaseRate,
          extraHelperBaseRate: input.helperBaseRate,
          sameDriverRate: input.sameDriverRate,
          newHelperRate: input.newHelperRate,
          newDriverRate: input.newDriverRate,
        },
        include: { client: { select: { name: true } } },
      });

      await tx.destinationRateHistory.create({
        data: {
          clientId: existing.clientId,
          destinationRouteId: existing.id,
          routeName: existing.routeName,
          distance: existing.distance,
          weightKg: existing.weightKg,
          prevDriverBaseRate: existing.driverBaseRate,
          prevHelperBaseRate: existing.helperBaseRate,
          prevExtraHelperBaseRate: existing.extraHelperBaseRate,
          newDriverBaseRate: input.driverBaseRate,
          newHelperBaseRate: input.helperBaseRate,
          newExtraHelperBaseRate: input.helperBaseRate,
          prevSameDriverRate: existing.sameDriverRate,
          prevNewHelperRate: existing.newHelperRate,
          prevNewDriverRate: existing.newDriverRate,
          newSameDriverRate: input.sameDriverRate,
          newNewHelperRate: input.newHelperRate,
          newNewDriverRate: input.newDriverRate,
          changedById: admin.id,
        },
      });

      return updated;
    });

    revalidateRatePaths();
    return { success: true, route: mapDestinationRouteToUi(record) };
  } catch (error) {
    console.error("[updateWeightRate]", error);
    return { success: false, error: errorMessage(error, "Could not update the weight tier.") };
  }
}
