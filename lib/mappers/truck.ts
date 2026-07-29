import type { Truck as DbTruck } from "@prisma/client";
import type { Truck } from "@/lib/trucks";

export function mapTruckToUi(record: DbTruck): Truck {
  return {
    id: record.id,
    mvFileNo: record.mvFileNo,
    plateNumber: record.plateNumber,
    engineNo: record.engineNo,
    chassisNo: record.chassisNo,
    yearModel: record.yearModel,
    make: record.make,
    wheelCount: record.wheelCount,
    truckType: record.truckType,
    crIssueDate: record.crIssueDate.toISOString().slice(0, 10),
    firstRegistrationDate: record.firstRegistrationDate.toISOString().slice(0, 10),
    isActive: record.isActive,
  };
}
