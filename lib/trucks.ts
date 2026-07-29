export interface Truck {
  id: string;
  mvFileNo: string;
  plateNumber: string;
  engineNo: string;
  chassisNo: string;
  yearModel: number;
  make: string;
  wheelCount: number;
  truckType: string;
  crIssueDate: string;
  firstRegistrationDate: string;
  isActive: boolean;
}

export const trucks: Truck[] = [
  {
    id: "trk-001",
    mvFileNo: "0386-00000292066",
    plateNumber: "WKQ502",
    engineNo: "4HG1-794689",
    chassisNo: "NPR71P-7410968",
    yearModel: 2000,
    make: "ISUZU",
    wheelCount: 6,
    truckType: "DROPSIDE (UTILITY VEHICLE)",
    crIssueDate: "2016-11-21",
    firstRegistrationDate: "2013-10-03",
    isActive: true,
  },
  {
    id: "trk-002",
    mvFileNo: "0386-00000270313",
    plateNumber: "RMT596",
    engineNo: "4HL1-105335",
    chassisNo: "NPR81L-7009526",
    yearModel: 1999,
    make: "ISUZU",
    wheelCount: 6,
    truckType: "ALUMINUM CLOSED VAN",
    crIssueDate: "2020-11-09",
    firstRegistrationDate: "2012-12-05",
    isActive: true,
  },
  {
    id: "trk-003",
    mvFileNo: "38925005569242",
    plateNumber: "CCR 4635",
    engineNo: "4JJ1-181408",
    chassisNo: "NMR85-7016086",
    yearModel: 2010,
    make: "ISUZU",
    wheelCount: 6,
    truckType: "REEFER VAN TRUCK",
    crIssueDate: "2025-09-02",
    firstRegistrationDate: "2025-09-01",
    isActive: true,
  },
  {
    id: "trk-004",
    mvFileNo: "38925005018035",
    plateNumber: "CCR 3261",
    engineNo: "4JJ1-1F1072",
    chassisNo: "NPR85-7075437",
    yearModel: 2010,
    make: "ISUZU",
    wheelCount: 6,
    truckType: "REEFER VAN TRUCK",
    crIssueDate: "2025-07-14",
    firstRegistrationDate: "2025-06-25",
    isActive: true,
  },
  {
    id: "trk-005",
    mvFileNo: "38925004523701",
    plateNumber: "CCP 2682",
    engineNo: "ZD30-330960K",
    chassisNo: "TZ2F24-140693",
    yearModel: 2010,
    make: "NISSAN",
    wheelCount: 6,
    truckType: "REEFER VAN TRUCK",
    crIssueDate: "2025-07-10",
    firstRegistrationDate: "2025-04-25",
    isActive: true,
  },
  {
    id: "trk-006",
    mvFileNo: "30100000257731",
    plateNumber: "CCO8239",
    engineNo: "4HL1-304582",
    chassisNo: "NPR81-7028309",
    yearModel: 2006,
    make: "ISUZU",
    wheelCount: 6,
    truckType: "UTILITY VEHICLE ALUMINUM VAN TRUCK",
    crIssueDate: "2021-09-30",
    firstRegistrationDate: "2016-10-24",
    isActive: true,
  },
  {
    id: "trk-007",
    mvFileNo: "0389-00000061002",
    plateNumber: "CBS8875",
    engineNo: "4M50-C65612",
    chassisNo: "FE82DEV-522866",
    yearModel: 2010,
    make: "MITSUBISHI",
    wheelCount: 6,
    truckType: "REEFER VAN TRUCK (UTILITY VEHICLE)",
    crIssueDate: "2023-10-05",
    firstRegistrationDate: "2023-06-22",
    isActive: true,
  },
  {
    id: "trk-008",
    mvFileNo: "30100000680861",
    plateNumber: "CAJ8006",
    engineNo: "4HL1-200747",
    chassisNo: "NPR81-7006724",
    yearModel: 2007,
    make: "ISUZU",
    wheelCount: 6,
    truckType: "REEFER VAN (UTILITY VEHICLE)",
    crIssueDate: "2022-03-25",
    firstRegistrationDate: "2018-03-15",
    isActive: true,
  },
  {
    id: "trk-009",
    mvFileNo: "30100000402713",
    plateNumber: "CAD7307",
    engineNo: "4HL1-254118",
    chassisNo: "NPR81-7011484",
    yearModel: 2006,
    make: "ISUZU",
    wheelCount: 6,
    truckType: "UTILITY VEHICLE ALUMINUM VAN TRUCK",
    crIssueDate: "2021-10-11",
    firstRegistrationDate: "2017-04-26",
    isActive: true,
  },
  {
    id: "trk-010",
    mvFileNo: "0301-00000337043",
    plateNumber: "CAA9821",
    engineNo: "4M51-B20933",
    chassisNo: "FE82EEV-502023",
    yearModel: 2006,
    make: "FUSO",
    wheelCount: 6,
    truckType: "ALUMINUM VAN TRUCK (UTILITY VEHICLE)",
    crIssueDate: "2017-03-14",
    firstRegistrationDate: "2017-02-09",
    isActive: true,
  },
  {
    id: "trk-011",
    mvFileNo: "38900000069294",
    plateNumber: "CCE1082",
    engineNo: "6HK1-450228",
    chassisNo: "FRR34L4-7011405",
    yearModel: 2010,
    make: "ISUZU",
    wheelCount: 6,
    truckType: "TRUCK ALUMINUM WING VAN",
    crIssueDate: "2024-07-15",
    firstRegistrationDate: "2024-01-29",
    isActive: true,
  },
];

export function getTruckById(truckId: string): Truck | undefined {
  return trucks.find((truck) => truck.id === truckId);
}

export function getTruckByPlateNumber(plateNumber: string): Truck | undefined {
  return trucks.find((truck) => truck.plateNumber === plateNumber);
}

export function formatTruckLabel(truck: Truck): string {
  return `${truck.plateNumber} — ${truck.make} ${truck.yearModel} (${truck.truckType})`;
}
