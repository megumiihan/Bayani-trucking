import type { ShipmentLog } from "@prisma/client";

function trimOrNull(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Split legacy rows that stored remarks + extraHelperNote in one field. */
export function resolveShipmentRemarkFields(record: ShipmentLog): {
  remarks: string;
  extraHelperNote: string | null;
} {
  if (record.extraHelperNote) {
    return {
      remarks: record.remarks ?? "",
      extraHelperNote: record.extraHelperNote,
    };
  }

  const raw = record.remarks ?? "";
  if (record.hasExtraHelper && raw.includes("\n")) {
    const newlineIndex = raw.indexOf("\n");
    return {
      remarks: raw.slice(0, newlineIndex),
      extraHelperNote: trimOrNull(raw.slice(newlineIndex + 1)),
    };
  }

  return {
    remarks: raw,
    extraHelperNote: null,
  };
}

export { trimOrNull };
