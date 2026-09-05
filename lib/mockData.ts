// ─── Types ───────────────────────────────────────────────────────────────────

import { destinationRates } from "./rates";
export { trucks, getTruckById, getTruckByPlateNumber, formatTruckLabel, type Truck } from "./trucks";

export type EmployeeRole = "Driver" | "Helper";
export type TenureStatus = "new" | "6 months" | "inactive";
export type PayoutStatus = "Pending" | "Paid" | "Partial";

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  position: string;
  employeeNo: string;
  dateOfBirth: string;
  address: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string | null;
  tenureStatus: TenureStatus;
  remarks: string;
}

export interface Shipment {
  id: string;
  date: string;
  plateNumber: string;
  truckId: string | null;
  client: string;
  shipmentNumber: string;
  clientNumber: string;
  waybillNumber: string;
  farthestRoute: string;
  distanceBand: string | null;
  driver: string;
  helper: string;
  extraHelper: string | null;
  extraHelperNote: string | null;
  remarks: string;
  payoutStatus: PayoutStatus;
  flagged: boolean;
  approved: boolean;
  uploadedByUserId: string;
  /** Resolved from the Profile table at query time; absent for legacy seeded rows. */
  uploadedByName?: string;
  /** Stored payout snapshots from the database (when loaded from ShipmentLog). */
  driverPayout?: number;
  helperPayout?: number;
  extraHelperPayout?: number;
  pigheadCount?: number | null;
  platformRate?: number | null;
}

export interface RouteRate {
  id: string;
  routeName: string;
  client: string;
  driverBase: number;
  helperBase: number;
  extraHelperBase: number;
  description: string;
}

// ─── Employees ───────────────────────────────────────────────────────────────

export const employees: Employee[] = [
  {
    id: "emp-001",
    name: "Arsenio Tumanan",
    role: "Helper",
    position: "Cargo Handler",
    employeeNo: "BT-CH-20260001",
    dateOfBirth: "1975-06-12",
    address: "Purok Uno, San Fermin, Cauayan City, Isabela",
    emergencyContactName: "Blanchie Mendoza Tumanan",
    emergencyContactRelationship: "Wife",
    emergencyContactPhone: "0935 673 5789",
    tenureStatus: "new",
    remarks: "",
  },
  {
    id: "emp-002",
    name: "Bryan Abon",
    role: "Helper",
    position: "Cargo Handler",
    employeeNo: "BT-CH-20260002",
    dateOfBirth: "2002-09-24",
    address: "Purok 5, Patul, Santiago City, Isabela",
    emergencyContactName: "Melvin Abon",
    emergencyContactRelationship: "Cousin",
    emergencyContactPhone: "0993 301 4762",
    tenureStatus: "new",
    remarks: "",
  },
  {
    id: "emp-003",
    name: "Melvin Abon",
    role: "Helper",
    position: "Cargo Handler",
    employeeNo: "BT-CH-20260003",
    dateOfBirth: "1995-08-16",
    address: "Labinab Pequeño, Reina Mercedes, Isabela",
    emergencyContactName: "Jessie Mae B. Abon",
    emergencyContactRelationship: "Wife",
    emergencyContactPhone: "0967 678 3366",
    tenureStatus: "new",
    remarks: "",
  },
  {
    id: "emp-004",
    name: "Axel Apostol",
    role: "Helper",
    position: "Cargo Handler",
    employeeNo: "BT-CH-20260011",
    dateOfBirth: "1996-04-27",
    address: "Purok 6, Marabulig 2, Cauayan City, Isabela",
    emergencyContactName: "Nora Apostol",
    emergencyContactRelationship: "Mother",
    emergencyContactPhone: "0951 154 5952",
    tenureStatus: "new",
    remarks: "",
  },
  {
    id: "emp-005",
    name: "Joel Ancheta",
    role: "Helper",
    position: "Cargo Handler",
    employeeNo: "BT-CH-20260012",
    dateOfBirth: "1982-07-07",
    address: "Purok 2, Gomez, Benito Soliven, Isabela",
    emergencyContactName: "Jinalyn Ancheta",
    emergencyContactRelationship: "Wife",
    emergencyContactPhone: "0931 894 7491",
    tenureStatus: "new",
    remarks: "",
  },
  {
    id: "emp-006",
    name: "Marc Joe Marcos",
    role: "Helper",
    position: "Cargo Handler",
    employeeNo: "BT-CH-20260013",
    dateOfBirth: "2003-01-21",
    address: "Rizalina, Alicia, Isabela",
    emergencyContactName: "Mercy Marcos",
    emergencyContactRelationship: "Mother",
    emergencyContactPhone: "0965 935 6709",
    tenureStatus: "new",
    remarks: "",
  },
  {
    id: "emp-007",
    name: "Leo Watanabe",
    role: "Driver",
    position: "Delivery Driver",
    employeeNo: "BT-CH-20260014",
    dateOfBirth: "1987-02-14",
    address: "San Fermin, Cauayan City, Isabela",
    emergencyContactName: "Merry Joy R. Sta. Eglesia",
    emergencyContactRelationship: "Colleague / Co-worker",
    emergencyContactPhone: "0919 816 6480",
    tenureStatus: "new",
    remarks: "",
  },
  {
    id: "emp-008",
    name: "Rolando Mabborang",
    role: "Driver",
    position: "Cargo Driver",
    employeeNo: "BT-CH-20260015",
    dateOfBirth: "1997-12-15",
    address: "Purok 3, Casalatan, Cauayan City, Isabela",
    emergencyContactName: "Charlenne Mae Mabborang",
    emergencyContactRelationship: "Spouse",
    emergencyContactPhone: "0906 961 4867",
    tenureStatus: "new",
    remarks: "",
  },
  {
    id: "emp-009",
    name: "Junel Batuy",
    role: "Driver",
    position: "Cargo Driver",
    employeeNo: "BT-DV-20260004",
    dateOfBirth: "1991-06-21",
    address: "Casalatan, Cauayan City, Isabela",
    emergencyContactName: "Melanie Batuy",
    emergencyContactRelationship: "Wife",
    emergencyContactPhone: "0955 384 8004",
    tenureStatus: "new",
    remarks: "",
  },
  {
    id: "emp-010",
    name: "Freddie Flores",
    role: "Driver",
    position: "Cargo Driver",
    employeeNo: "BT-DV-20260005",
    dateOfBirth: "1989-09-20",
    address: "Purok 6, Bugallon, Cauayan City, Isabela",
    emergencyContactName: "Sheila Joy M. Flores",
    emergencyContactRelationship: "Wife",
    emergencyContactPhone: "0966 421 8243",
    tenureStatus: "new",
    remarks: "",
  },
  {
    id: "emp-011",
    name: "Elvert Sta. Eglesia",
    role: "Driver",
    position: "Cargo Driver",
    employeeNo: "BT-DV-20260006",
    dateOfBirth: "1997-07-30",
    address: "Airport Rd., Cauayan City, Isabela",
    emergencyContactName: "Merry Joy R. Sta. Eglesia",
    emergencyContactRelationship: "Wife",
    emergencyContactPhone: "0919 816 6480",
    tenureStatus: "new",
    remarks: "",
  },
  {
    id: "emp-012",
    name: "Jomar Saguiped",
    role: "Driver",
    position: "Cargo Driver",
    employeeNo: "BT-DV-20260007",
    dateOfBirth: "1982-06-23",
    address: "Purok 1, Brgy. Rizalina, Aurora, Isabela",
    emergencyContactName: "John Carlo Torres",
    emergencyContactRelationship: "Sibling (Kapatid)",
    emergencyContactPhone: null,
    tenureStatus: "new",
    remarks: "",
  },
  {
    id: "emp-013",
    name: "Marino Marimon",
    role: "Driver",
    position: "Cargo Driver",
    employeeNo: "BT-DV-20260008",
    dateOfBirth: "1994-01-08",
    address: "Purok 4, Quirino, Naguilian, Isabela",
    emergencyContactName: "Yolanda dela Cruz Marimon",
    emergencyContactRelationship: "Wife",
    emergencyContactPhone: "0912 410 5334",
    tenureStatus: "new",
    remarks: "",
  },
  {
    id: "emp-014",
    name: "Edsel Alcantara",
    role: "Driver",
    position: "Cargo Driver",
    employeeNo: "BT-DV-20260009",
    dateOfBirth: "1984-07-08",
    address: "Dabburab, Cauayan City, Isabela",
    emergencyContactName: "Maricris D. Alcantara",
    emergencyContactRelationship: "Wife",
    emergencyContactPhone: "0975 586 8662",
    tenureStatus: "new",
    remarks: "",
  },
  {
    id: "emp-015",
    name: "Frederick Marcos",
    role: "Driver",
    position: "Cargo Driver",
    employeeNo: "BT-DV-20260010",
    dateOfBirth: "1981-07-31",
    address: "M.H. del Pilar, Purok 3, Alicia, Isabela",
    emergencyContactName: "Gretchen Marcos",
    emergencyContactRelationship: "Sister",
    emergencyContactPhone: "0935 067 0443",
    tenureStatus: "new",
    remarks: "",
  },
];

// ─── Shipments ───────────────────────────────────────────────────────────────

export const shipments: Shipment[] = [
  {
    id: "shp-001",
    date: "2026-07-20",
    plateNumber: "CCR 4635",
    truckId: "trk-003",
    client: "Pepsi",
    shipmentNumber: "SHP-2026-07120",
    clientNumber: "CLI-PEPSI-001",
    waybillNumber: "WB-887654",
    farthestRoute: "Tuguegarao",
    distanceBand: null,
    driver: "Leo Watanabe",
    helper: "Arsenio Tumanan",
    extraHelper: null,
    extraHelperNote: null,
    remarks: "Delivered on time, no issues.",
    payoutStatus: "Paid",
    flagged: false,
    approved: true,
    uploadedByUserId: "user-001",
  },
  {
    id: "shp-002",
    date: "2026-07-21",
    plateNumber: "CCE1082",
    truckId: "trk-011",
    client: "Pepsi",
    shipmentNumber: "SHP-2026-07121",
    clientNumber: "CLI-PEPSI-001",
    waybillNumber: "WB-887701",
    farthestRoute: "Ilagan",
    distanceBand: null,
    driver: "Rolando Mabborang",
    helper: "Bryan Abon",
    extraHelper: "Melvin Abon",
    extraHelperNote: "Heavy load required an additional helper.",
    remarks: "Extra helper needed due to heavy load.",
    payoutStatus: "Pending",
    flagged: true,
    approved: false,
    uploadedByUserId: "user-002",
  },
  {
    id: "shp-003",
    date: "2026-07-22",
    plateNumber: "CAJ8006",
    truckId: "trk-008",
    client: "Pepsi",
    shipmentNumber: "SHP-2026-07122",
    clientNumber: "CLI-PEPSI-001",
    waybillNumber: "WB-887812",
    farthestRoute: "Santiago",
    distanceBand: null,
    driver: "Junel Batuy",
    helper: "Axel Apostol",
    extraHelper: null,
    extraHelperNote: null,
    remarks: "Minor delay due to traffic on EDSA.",
    payoutStatus: "Partial",
    flagged: false,
    approved: false,
    uploadedByUserId: "user-012",
  },
  {
    id: "shp-004",
    date: "2026-07-22",
    plateNumber: "CCR 3261",
    truckId: "trk-004",
    client: "Pepsi",
    shipmentNumber: "SHP-2026-07123",
    clientNumber: "CLI-PEPSI-001",
    waybillNumber: "WB-887845",
    farthestRoute: "Solano",
    distanceBand: null,
    driver: "Leo Watanabe",
    helper: "Arsenio Tumanan",
    extraHelper: null,
    extraHelperNote: null,
    remarks: "Client requested early morning delivery.",
    payoutStatus: "Pending",
    flagged: true,
    approved: false,
    uploadedByUserId: "user-001",
  },
  {
    id: "shp-005",
    date: "2026-07-23",
    plateNumber: "CBS8875",
    truckId: "trk-007",
    client: "Pepsi",
    shipmentNumber: "SHP-2026-07124",
    clientNumber: "CLI-PEPSI-001",
    waybillNumber: "WB-887901",
    farthestRoute: "Tuguegarao",
    distanceBand: null,
    driver: "Freddie Flores",
    helper: "Marc Joe Marcos",
    extraHelper: "Joel Ancheta",
    extraHelperNote: "Long-haul run with extra unloading support.",
    remarks: "Long-haul run; fuel surcharge applies.",
    payoutStatus: "Paid",
    flagged: false,
    approved: true,
    uploadedByUserId: "user-010",
  },
  {
    id: "shp-006",
    date: "2026-06-12",
    plateNumber: "WKQ502",
    truckId: "trk-001",
    client: "Pepsi",
    shipmentNumber: "SHP-2026-06120",
    clientNumber: "CLI-PEPSI-001",
    waybillNumber: "WB-886120",
    farthestRoute: "Solano",
    distanceBand: null,
    driver: "Leo Watanabe",
    helper: "Arsenio Tumanan",
    extraHelper: null,
    extraHelperNote: null,
    remarks: "Routine June delivery.",
    payoutStatus: "Paid",
    flagged: false,
    approved: true,
    uploadedByUserId: "user-001",
  },
  {
    id: "shp-007",
    date: "2026-06-25",
    plateNumber: "CCP 2682",
    truckId: "trk-005",
    client: "Pepsi",
    shipmentNumber: "SHP-2026-06250",
    clientNumber: "CLI-PEPSI-001",
    waybillNumber: "WB-886250",
    farthestRoute: "Tuguegarao",
    distanceBand: null,
    driver: "Frederick Marcos",
    helper: "Joel Ancheta",
    extraHelper: null,
    extraHelperNote: null,
    remarks: "End-of-month long haul.",
    payoutStatus: "Paid",
    flagged: false,
    approved: true,
    uploadedByUserId: "user-015",
  },
];

// ─── Routes / Rates (re-exported from lib/rates.ts) ─────────────────────────

export const routeRates: RouteRate[] = destinationRates.map((rate) => ({
  id: rate.id,
  routeName: rate.routeName,
  client: rate.client,
  driverBase: rate.driverBaseRate,
  helperBase: rate.helperBaseRate,
  extraHelperBase: rate.extraHelperBaseRate,
  description: rate.description ?? rate.routeName,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString("en-PH")}`;
}

export function sortShipmentsByDateDesc(shipments: Shipment[]): Shipment[] {
  return [...shipments].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.id.localeCompare(a.id);
  });
}

export const tenureStatusColors: Record<TenureStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  "6 months": "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-600",
};

export const payoutStatusColors: Record<PayoutStatus, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Paid: "bg-green-100 text-green-800",
  Partial: "bg-orange-100 text-orange-800",
};

export const shipmentRoleColors: Record<
  "Driver" | "Helper" | "Extra Helper",
  string
> = {
  Driver: "bg-blue-100 text-blue-800",
  Helper: "bg-emerald-100 text-emerald-800",
  "Extra Helper": "bg-violet-100 text-violet-800",
};
