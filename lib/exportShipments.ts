import * as XLSX from "xlsx";
import { employees, type Shipment } from "./mockData";
import {
  getEmployeeShipmentEntries,
  getShipmentTotalPayout,
  getDriverPayoutForShipment,
  getHelperPayoutForShipment,
  getExtraHelperPayoutForShipment,
} from "./payout";

function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, "").slice(0, 31);
}

function shipmentToMasterRow(shipment: Shipment) {
  return {
    Flagged: shipment.flagged ? "Yes" : "No",
    Approved: shipment.approved ? "Yes" : "No",
    Date: shipment.date,
    "Plate #": shipment.plateNumber,
    Client: shipment.client,
    "Shipment #": shipment.shipmentNumber,
    "Client #": shipment.clientNumber,
    "Waybill #": shipment.waybillNumber,
    "Pig heads": shipment.pigheadCount ?? "",
    "Platform rate": shipment.platformRate ?? "",
    KG: shipment.weightKg ?? "",
    "Farthest Route": shipment.distanceBand
      ? `${shipment.farthestRoute} (${shipment.distanceBand})`
      : shipment.farthestRoute,
    Driver: shipment.driver,
    "Driver Rate": getDriverPayoutForShipment(
      shipment.farthestRoute,
      shipment.client,
      shipment.distanceBand,
      shipment
    ),
    Helper: shipment.helper,
    "Helper Rate": getHelperPayoutForShipment(
      shipment.farthestRoute,
      shipment.client,
      shipment.distanceBand,
      shipment
    ),
    "Extra Helper": shipment.extraHelper ?? "",
    "Extra Helper Rate": shipment.extraHelper
      ? getExtraHelperPayoutForShipment(
          shipment.farthestRoute,
          shipment.client,
          shipment.distanceBand,
          shipment
        )
      : 0,
    "Extra Helper Note": shipment.extraHelperNote ?? "",
    Remarks: shipment.remarks,
    "Payout Status": shipment.payoutStatus,
    "Total Payout": getShipmentTotalPayout(shipment),
  };
}

export function exportShipmentsToExcel(shipments: Shipment[]) {
  const workbook = XLSX.utils.book_new();

  const masterRows = shipments.map(shipmentToMasterRow);
  const masterSheet = XLSX.utils.json_to_sheet(masterRows);
  XLSX.utils.book_append_sheet(workbook, masterSheet, "All Shipments");

  const activeEmployees = employees.filter((e) => e.tenureStatus !== "inactive");

  for (const employee of activeEmployees) {
    const entries = getEmployeeShipmentEntries(shipments, employee.name);
    if (entries.length === 0) continue;

    const rows: Record<string, string | number>[] = entries.map((entry) => ({
      Date: entry.shipment.date,
      "Shipment #": entry.shipment.shipmentNumber,
      "Waybill #": entry.shipment.waybillNumber,
      Client: entry.shipment.client,
      Route: entry.shipment.farthestRoute,
      Role: entry.role,
      Payout: entry.payout,
      Remarks: entry.shipment.remarks,
    }));

    const totalPayout = entries.reduce((sum, entry) => sum + entry.payout, 0);
    rows.push({
      Date: "",
      "Shipment #": "",
      "Waybill #": "",
      Client: "",
      Route: "",
      Role: "TOTAL",
      Payout: totalPayout,
      Remarks: "",
    });

    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(
      workbook,
      sheet,
      sanitizeSheetName(employee.name)
    );
  }

  const fileName = `bayani-shipments-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
