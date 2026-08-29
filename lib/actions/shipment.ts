"use server";

import { revalidatePath } from "next/cache";
import type { ShipmentLog } from "@prisma/client";
import { requireAdmin, requireUser } from "@/lib/auth";
import { calculateDestinationPayout } from "@/lib/calculations";
import { isDestinationClient } from "@/lib/clients";
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
}

export type SaveShipmentResult =
  | { success: true; record: ShipmentLog }
  | { success: false; error: string };

async function resolveClientId(clientName: string): Promise<string | null> {
  const client = await prisma.client.findUnique({
    where: { name: clientName },
    select: { id: true },
  });
  return client?.id ?? null;
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

    const clientId = await resolveClientId(input.client);
    if (!clientId) {
      return {
        success: false,
        error: `Client "${input.client}" was not found in the database.`,
      };
    }

    if (!isDestinationClient(input.client)) {
      return {
        success: false,
        error: `Payout calculation for "${input.client}" is not supported yet.`,
      };
    }

    const selectedRoute = getDefaultRouteRate(
      input.client as DestinationClient,
      input.farthestRoute
    );

    const payout = calculateDestinationPayout({
      client: input.client as DestinationClient,
      routeName: input.farthestRoute,
      distance: selectedRoute?.distance ?? "",
      hasExtraHelper: input.hasExtraHelper,
    });

    if (!payout) {
      return {
        success: false,
        error: `No payout rate found for route "${input.farthestRoute}".`,
      };
    }

    const [truckId, driverId, helperId] = await Promise.all([
      resolveTruckId(input.truckId, input.plateNumber),
      resolveEmployeeId(input.driver),
      input.helper ? resolveEmployeeId(input.helper) : Promise.resolve(null),
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
        distance: selectedRoute?.distance || null,
        weightKg: input.weightKg ?? null,
        headCount: input.headCount ?? null,
        driverName: input.driver,
        driverId,
        helperName: input.helper || null,
        helperId,
        hasExtraHelper: input.hasExtraHelper,
        extraHelperName: input.hasExtraHelper ? input.extraHelper || null : null,
        extraHelperNote: input.hasExtraHelper
          ? trimOrNull(input.extraHelperNote)
          : null,
        isDriverAsHelper: false,
        driverPayout: payout.driverPayout,
        helperPayout: payout.helperPayout,
        extraHelperPayout: payout.extraHelperPayout,
        remarks: buildRemarks(input),
        isFlagged: false,
        clientId,
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
  driver: string;
  helper: string;
  extraHelper?: string | null;
  extraHelperNote?: string | null;
  remarks?: string | null;
  flagged: boolean;
  approved: boolean;
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
      select: { id: true },
    });

    if (!existing) {
      return { success: false, error: "Shipment not found." };
    }

    const [driverId, helperId] = await Promise.all([
      resolveEmployeeId(input.driver),
      input.helper ? resolveEmployeeId(input.helper) : Promise.resolve(null),
    ]);

    const updated = await prisma.shipmentLog.update({
      where: { id },
      data: {
        driverName: input.driver,
        driverId,
        helperName: input.helper || null,
        helperId,
        extraHelperName: input.extraHelper || null,
        hasExtraHelper: Boolean(input.extraHelper),
        extraHelperNote: input.extraHelper
          ? trimOrNull(input.extraHelperNote)
          : null,
        remarks: updateRemarks(input),
        isFlagged: input.flagged,
        isApproved: input.approved,
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
