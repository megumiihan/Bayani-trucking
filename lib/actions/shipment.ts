"use server";

import { revalidatePath } from "next/cache";
import type { ShipmentLog } from "@prisma/client";
import { requireAdmin, requireUser } from "@/lib/auth";
import {
  calculateDestinationPayout,
  calculateLivestockPayout,
  calculatePlatformPayout,
  calculateWeightPayout,
  hasAssignedHelper,
} from "@/lib/calculations";
import { LIVESTOCK_MAX_HEADS, parsePighead } from "@/lib/livestock";
import { isDestinationClient } from "@/lib/clients";
import { parsePlatformRate } from "@/lib/platform";
import { parseWeightKg } from "@/lib/weight";
import { mapShipmentLogToShipment } from "@/lib/mappers/shipmentLog";
import { trimOrNull } from "@/lib/mappers/shipmentRemarks";
import { prisma } from "@/lib/prisma";
import {
  getDefaultRouteRate,
  type DestinationClient,
} from "@/lib/rates";
import type { Shipment } from "@/lib/mockData";

/** Payload from the shipment input form. */
export interface ShipmentFormInput {
  date: string;
  truckId?: string | null;
  plateNumber: string;
  client: string;
  clientNumber: string;
  shipmentNumber: string;
  waybillNumber: string;
  farthestRoute: string;
  driver: string;
  helper: string;
  hasExtraHelper: boolean;
  extraHelper?: string;
  extraHelperNote?: string;
  remarks?: string;
  weightKg?: number | null;
  headCount?: number | null;
  pigheadCount?: number | null;
  platformRate?: number | null;
}

export type SaveShipmentResult =
  | { success: true; record: ShipmentLog }
  | { success: false; error: string };

async function resolveClient(clientName: string) {
  return prisma.client.findUnique({
    where: { name: clientName },
    select: {
      id: true,
      name: true,
      calcType: true,
      pigheadDriverRate: true,
      pigheadHelperRate: true,
      platformShare: true,
      platformDriverRate: true,
      platformHelperRate: true,
    },
  });
}

async function resolveTruckId(
  truckId: string | null | undefined,
  plateNumber: string
): Promise<string | null> {
  if (truckId) {
    const byId = await prisma.truck.findUnique({
      where: { id: truckId },
      select: { id: true },
    });
    if (byId) return byId.id;
  }

  const byPlate = await prisma.truck.findUnique({
    where: { plateNumber },
    select: { id: true },
  });
  return byPlate?.id ?? null;
}

async function resolveEmployeeId(fullName: string): Promise<string | null> {
  const employee = await prisma.employee.findFirst({
    where: { fullName },
    select: { id: true },
  });
  return employee?.id ?? null;
}

function buildRemarks(input: ShipmentFormInput): string | null {
  return trimOrNull(input.remarks);
}

type ResolvedPayout =
  | {
      ok: true;
      payout: {
        driverPayout: number;
        helperPayout: number;
        extraHelperPayout: number;
      };
      distance: string | null;
      pigheadCount: number | null;
      platformRate: number | null;
      weightKg: number | null;
      isDriverAsHelper: boolean;
    }
  | { ok: false; error: string };

async function resolvePayout(input: {
  client: {
    id: string;
    name: string;
    calcType: "DESTINATION" | "WEIGHT" | "ANIMAL_HEADCOUNT" | "PLATFORM";
    pigheadDriverRate: number | null;
    pigheadHelperRate: number | null;
    platformShare: number | null;
    platformDriverRate: number | null;
    platformHelperRate: number | null;
  };
  farthestRoute: string;
  hasExtraHelper: boolean;
  pigheadCount?: number | null;
  platformRate?: number | null;
  weightKg?: number | null;
  driver?: string;
  helper?: string | null;
  extraHelper?: string | null;
}): Promise<ResolvedPayout> {
  const hasHelper = hasAssignedHelper(input.helper);

  if (input.client.calcType === "ANIMAL_HEADCOUNT") {
    const pigheadCount = parsePighead(input.pigheadCount);
    if (pigheadCount == null) {
      return {
        ok: false,
        error: `Enter a number of heads between 1 and ${LIVESTOCK_MAX_HEADS} for livestock clients.`,
      };
    }

    const route = await prisma.destinationRoute.findFirst({
      where: {
        clientId: input.client.id,
        routeName: input.farthestRoute,
      },
    });

    if (!route) {
      return {
        ok: false,
        error: `No livestock route found for "${input.farthestRoute}". Add it on Routes & Rates.`,
      };
    }

    const payout = calculateLivestockPayout({
      pighead: pigheadCount,
      driverBase: route.driverBaseRate,
      helperBase: route.helperBaseRate,
      driverRate: input.client.pigheadDriverRate ?? NaN,
      helperRate: input.client.pigheadHelperRate ?? NaN,
      hasExtraHelper: input.hasExtraHelper,
      hasHelper,
    });

    if (!payout) {
      return {
        ok: false,
        error: `Set per-head rates for ${input.client.name} on Routes & Rates.`,
      };
    }

    return {
      ok: true,
      payout,
      distance: route.distance || null,
      pigheadCount,
      platformRate: null,
      weightKg: null,
      isDriverAsHelper: false,
    };
  }

  if (input.client.calcType === "WEIGHT") {
    const weightKg = parseWeightKg(input.weightKg);
    if (weightKg == null) {
      return {
        ok: false,
        error: "Select a weight tier (2000, 3000, or 4000 kg).",
      };
    }

    const route = await prisma.destinationRoute.findFirst({
      where: {
        clientId: input.client.id,
        routeName: input.farthestRoute,
        weightKg,
      },
    });

    if (!route) {
      return {
        ok: false,
        error: `No weight rate found for "${input.farthestRoute}" at ${weightKg} kg.`,
      };
    }

    const [driver, helper, extraHelper] = await Promise.all([
      input.driver
        ? prisma.employee.findFirst({
            where: { fullName: input.driver },
            select: { id: true, role: true, bountyExp: true },
          })
        : Promise.resolve(null),
      input.helper
        ? prisma.employee.findFirst({
            where: { fullName: input.helper },
            select: { id: true, role: true, bountyExp: true },
          })
        : Promise.resolve(null),
      input.extraHelper
        ? prisma.employee.findFirst({
            where: { fullName: input.extraHelper },
            select: { bountyExp: true },
          })
        : Promise.resolve(null),
    ]);

    const driverAsHelper =
      hasHelper &&
      helper != null &&
      (helper.role === "DRIVER" || helper.role === "BOTH");

    const payout = calculateWeightPayout({
      helperRate: route.helperBaseRate,
      driverRate: route.driverBaseRate,
      sameDriverRate: route.sameDriverRate ?? NaN,
      newHelperRate: route.newHelperRate ?? NaN,
      newDriverRate: route.newDriverRate ?? NaN,
      driverExp: driver?.bountyExp ?? null,
      helperExp: helper?.bountyExp ?? null,
      extraHelperExp: extraHelper?.bountyExp ?? null,
      driverAsHelper,
      samePerson: Boolean(driver && helper && driver.id === helper.id),
      hasExtraHelper: input.hasExtraHelper,
      hasHelper,
    });

    if (!payout) {
      return {
        ok: false,
        error: `Could not calculate weight payouts for ${input.client.name}.`,
      };
    }

    return {
      ok: true,
      payout,
      distance: route.distance || null,
      pigheadCount: null,
      platformRate: null,
      weightKg,
      isDriverAsHelper: driverAsHelper,
    };
  }

  if (input.client.calcType === "PLATFORM") {
    const platformRate = parsePlatformRate(input.platformRate);
    if (platformRate == null) {
      return {
        ok: false,
        error: "Enter the platform rate for this trip.",
      };
    }

    const payout = calculatePlatformPayout({
      platformRate,
      platformShare: input.client.platformShare ?? NaN,
      platformDriverRate: input.client.platformDriverRate ?? NaN,
      platformHelperRate: input.client.platformHelperRate ?? NaN,
      hasExtraHelper: input.hasExtraHelper,
      hasHelper,
    });

    if (!payout) {
      return {
        ok: false,
        error: `Set platform share and crew rates for ${input.client.name} on Routes & Rates.`,
      };
    }

    return {
      ok: true,
      payout,
      distance: null,
      pigheadCount: null,
      platformRate,
      weightKg: null,
      isDriverAsHelper: false,
    };
  }

  if (isDestinationClient(input.client.name)) {
    const selectedRoute = getDefaultRouteRate(
      input.client.name as DestinationClient,
      input.farthestRoute
    );
    const payout = calculateDestinationPayout({
      client: input.client.name as DestinationClient,
      routeName: input.farthestRoute,
      distance: selectedRoute?.distance ?? "",
      hasExtraHelper: input.hasExtraHelper,
      hasHelper,
    });

    if (!payout) {
      return {
        ok: false,
        error: `No payout rate found for route "${input.farthestRoute}".`,
      };
    }

    return {
      ok: true,
      payout,
      distance: selectedRoute?.distance || null,
      pigheadCount: null,
      platformRate: null,
      weightKg: null,
      isDriverAsHelper: false,
    };
  }

  return {
    ok: false,
    error: `Payout calculation for "${input.client.name}" is not supported yet.`,
  };
}

export async function saveShipment(
  input: ShipmentFormInput
): Promise<SaveShipmentResult> {
  try {
    const user = await requireUser();

    if (!input.plateNumber?.trim()) {
      return { success: false, error: "Plate number is required." };
    }
    if (!input.shipmentNumber?.trim()) {
      return { success: false, error: "Shipment number is required." };
    }
    if (!input.driver?.trim()) {
      return { success: false, error: "Driver is required." };
    }
    if (!input.farthestRoute?.trim()) {
      return { success: false, error: "Farthest route is required." };
    }

    const client = await resolveClient(input.client);
    if (!client) {
      return {
        success: false,
        error: `Client "${input.client}" was not found in the database.`,
      };
    }

    const resolved = await resolvePayout({
      client,
      farthestRoute: input.farthestRoute,
      hasExtraHelper: input.hasExtraHelper,
      pigheadCount: input.pigheadCount,
      platformRate: input.platformRate,
      weightKg: input.weightKg,
      driver: input.driver,
      helper: input.helper,
      extraHelper: input.extraHelper,
    });
    if (!resolved.ok) {
      return { success: false, error: resolved.error };
    }

    const [truckId, driverId, helperId] = await Promise.all([
      resolveTruckId(input.truckId, input.plateNumber),
      resolveEmployeeId(input.driver),
      hasAssignedHelper(input.helper)
        ? resolveEmployeeId(input.helper!)
        : Promise.resolve(null),
    ]);

    const record = await prisma.shipmentLog.create({
      data: {
        date: input.date ? new Date(input.date) : new Date(),
        plateNumber: input.plateNumber,
        truckId,
        shipmentNumber: input.shipmentNumber,
        clientNumber: input.clientNumber || null,
        waybillNumber: input.waybillNumber || null,
        routeName: input.farthestRoute,
        distance: resolved.distance,
        weightKg: resolved.weightKg,
        isDriverAsHelper: resolved.isDriverAsHelper,
        headCount: input.headCount ?? null,
        pigheadCount: resolved.pigheadCount,
        platformRate: resolved.platformRate,
        driverName: input.driver,
        driverId,
        helperName: hasAssignedHelper(input.helper) ? input.helper!.trim() : null,
        helperId,
        hasExtraHelper: input.hasExtraHelper,
        extraHelperName: input.hasExtraHelper ? input.extraHelper || null : null,
        extraHelperNote: input.hasExtraHelper
          ? trimOrNull(input.extraHelperNote)
          : null,
        driverPayout: resolved.payout.driverPayout,
        helperPayout: resolved.payout.helperPayout,
        extraHelperPayout: resolved.payout.extraHelperPayout,
        remarks: buildRemarks(input),
        isFlagged: false,
        isApproved: user.role === "admin",
        clientId: client.id,
        createdById: user.id,
      },
    });

    revalidatePath("/");
    revalidatePath("/employee/profile");
    revalidatePath("/admin/employees");

    return { success: true, record };
  } catch (error) {
    console.error("[saveShipment]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while saving the shipment.",
    };
  }
}

export type ToggleShipmentFlagResult =
  | { success: true; shipment: Shipment }
  | { success: false; error: string };

export type SetShipmentApprovalResult =
  | { success: true; shipment: Shipment }
  | { success: false; error: string };

export type ApproveShipmentsResult =
  | { success: true; count: number }
  | { success: false; error: string };

export async function setShipmentApproval(
  id: string,
  approved: boolean
): Promise<SetShipmentApprovalResult> {
  try {
    await requireAdmin();

    const updated = await prisma.shipmentLog.update({
      where: { id },
      data: { isApproved: approved },
      include: { client: { select: { name: true } } },
    });

    revalidatePath("/");
    revalidatePath("/employee/profile");
    revalidatePath("/admin/employees");

    return {
      success: true,
      shipment: mapShipmentLogToShipment(updated),
    };
  } catch (error) {
    console.error("[setShipmentApproval]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while updating approval.",
    };
  }
}

export async function approveShipments(
  ids: string[]
): Promise<ApproveShipmentsResult> {
  try {
    await requireAdmin();

    if (ids.length === 0) {
      return { success: true, count: 0 };
    }

    const result = await prisma.shipmentLog.updateMany({
      where: { id: { in: ids }, isApproved: false },
      data: { isApproved: true },
    });

    revalidatePath("/");
    revalidatePath("/employee/profile");
    revalidatePath("/admin/employees");

    return { success: true, count: result.count };
  } catch (error) {
    console.error("[approveShipments]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while approving shipments.",
    };
  }
}

export async function toggleShipmentFlag(
  id: string
): Promise<ToggleShipmentFlagResult> {
  try {
    await requireAdmin();

    const current = await prisma.shipmentLog.findUnique({
      where: { id },
      select: { isFlagged: true },
    });

    if (!current) {
      return { success: false, error: "Shipment not found." };
    }

    const updated = await prisma.shipmentLog.update({
      where: { id },
      data: { isFlagged: !current.isFlagged },
      include: { client: { select: { name: true } } },
    });

    revalidatePath("/");
    revalidatePath("/employee/profile");
    revalidatePath("/admin/employees");

    return {
      success: true,
      shipment: mapShipmentLogToShipment(updated),
    };
  } catch (error) {
    console.error("[toggleShipmentFlag]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while updating the shipment.",
    };
  }
}


export interface UpdateShipmentInput {
  date: string;
  truckId?: string | null;
  plateNumber: string;
  client: string;
  clientNumber: string;
  shipmentNumber: string;
  waybillNumber: string;
  farthestRoute: string;
  driver: string;
  helper: string;
  extraHelper?: string | null;
  extraHelperNote?: string | null;
  remarks?: string | null;
  flagged: boolean;
  approved: boolean;
  pigheadCount?: number | null;
  platformRate?: number | null;
  weightKg?: number | null;
}

export type UpdateShipmentResult =
  | { success: true; shipment: Shipment }
  | { success: false; error: string };

function updateRemarks(input: UpdateShipmentInput): string | null {
  return trimOrNull(input.remarks);
}

export async function updateShipment(
  id: string,
  input: UpdateShipmentInput
): Promise<UpdateShipmentResult> {
  try {
    await requireAdmin();

    const existing = await prisma.shipmentLog.findUnique({
      where: { id },
    });

    if (!existing) {
      return { success: false, error: "Shipment not found." };
    }

    if (!input.plateNumber?.trim()) {
      return { success: false, error: "Plate number is required." };
    }
    if (!input.shipmentNumber?.trim()) {
      return { success: false, error: "Shipment number is required." };
    }
    if (!input.driver?.trim()) {
      return { success: false, error: "Driver is required." };
    }
    if (!input.farthestRoute?.trim()) {
      return { success: false, error: "Farthest route is required." };
    }
    if (!input.date?.trim()) {
      return { success: false, error: "Date is required." };
    }

    const client = await resolveClient(input.client);
    if (!client) {
      return {
        success: false,
        error: `Client "${input.client}" was not found in the database.`,
      };
    }

    const hasExtraHelper = Boolean(input.extraHelper?.trim());
    const resolved = await resolvePayout({
      client,
      farthestRoute: input.farthestRoute,
      hasExtraHelper,
      pigheadCount: input.pigheadCount,
      platformRate: input.platformRate,
      weightKg: input.weightKg,
      driver: input.driver,
      helper: input.helper,
      extraHelper: input.extraHelper,
    });
    if (!resolved.ok) {
      return { success: false, error: resolved.error };
    }

    const { payout, distance, pigheadCount, platformRate, weightKg, isDriverAsHelper } =
      resolved;
    const driverPayout = payout.driverPayout;
    const helperPayout = payout.helperPayout;
    const extraHelperPayout = payout.extraHelperPayout;

    const [truckId, driverId, helperId] = await Promise.all([
      resolveTruckId(input.truckId, input.plateNumber),
      resolveEmployeeId(input.driver),
      hasAssignedHelper(input.helper)
        ? resolveEmployeeId(input.helper!)
        : Promise.resolve(null),
    ]);

    const updated = await prisma.shipmentLog.update({
      where: { id },
      data: {
        date: new Date(input.date),
        plateNumber: input.plateNumber,
        truckId,
        shipmentNumber: input.shipmentNumber,
        clientNumber: input.clientNumber || null,
        waybillNumber: input.waybillNumber || null,
        routeName: input.farthestRoute,
        distance,
        weightKg,
        isDriverAsHelper,
        pigheadCount,
        platformRate,
        driverName: input.driver,
        driverId,
        helperName: hasAssignedHelper(input.helper) ? input.helper!.trim() : null,
        helperId,
        extraHelperName: hasExtraHelper ? input.extraHelper || null : null,
        hasExtraHelper,
        extraHelperNote: hasExtraHelper
          ? trimOrNull(input.extraHelperNote)
          : null,
        remarks: updateRemarks(input),
        isFlagged: input.flagged,
        isApproved: input.approved,
        driverPayout,
        helperPayout,
        extraHelperPayout,
        clientId: client.id,
      },
      include: { client: { select: { name: true } } },
    });

    revalidatePath("/");
    revalidatePath("/employee/profile");
    revalidatePath("/admin/employees");

    return {
      success: true,
      shipment: mapShipmentLogToShipment(updated),
    };
  } catch (error) {
    console.error("[updateShipment]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while updating the shipment.",
    };
  }
}

export type DeleteShipmentResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteShipment(
  id: string
): Promise<DeleteShipmentResult> {
  try {
    await requireAdmin();

    const existing = await prisma.shipmentLog.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return { success: false, error: "Shipment not found." };
    }

    await prisma.shipmentLog.delete({ where: { id } });

    revalidatePath("/");
    revalidatePath("/employee/profile");
    revalidatePath("/admin/employees");

    return { success: true };
  } catch (error) {
    console.error("[deleteShipment]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while deleting the shipment.",
    };
  }
}
