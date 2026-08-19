import { PrismaClient, type EmployeeRole } from "@prisma/client";
import { calculateDestinationPayout } from "../lib/calculations";
import { clients, toPrismaCalculationType } from "../lib/clients";
import { employees, shipments } from "../lib/mockData";
import { resolveShipmentRate, destinationRates, type DestinationClient } from "../lib/rates";
import { trucks } from "../lib/trucks";
import { trimOrNull } from "../lib/mappers/shipmentRemarks";

const prisma = new PrismaClient();

function toPrismaEmployeeRole(role: "Driver" | "Helper"): EmployeeRole {
  return role === "Driver" ? "DRIVER" : "HELPER";
}

async function main() {
  console.log("Clearing existing data…");
  await prisma.shipmentLog.deleteMany();
  await prisma.destinationRoute.deleteMany();
  await prisma.client.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.truck.deleteMany();

  console.log("Seeding clients…");
  const clientIdByName = new Map<string, string>();
  for (const client of clients) {
    const record = await prisma.client.create({
      data: {
        name: client.name,
        calcType: toPrismaCalculationType(client.calculationType),
      },
    });
    clientIdByName.set(record.name, record.id);
  }
  console.log(`  ${clients.length} clients`);

  console.log("Seeding employees…");
  for (const employee of employees) {
    await prisma.employee.create({
      data: {
        fullName: employee.name,
        role: toPrismaEmployeeRole(employee.role),
        isActive: employee.tenureStatus !== "inactive",
        remarks: trimOrNull(employee.remarks),
      },
    });
  }
  console.log(`  ${employees.length} employees`);

  console.log("Seeding trucks…");
  for (const truck of trucks) {
    await prisma.truck.create({
      data: {
        mvFileNo: truck.mvFileNo,
        plateNumber: truck.plateNumber,
        engineNo: truck.engineNo,
        chassisNo: truck.chassisNo,
        yearModel: truck.yearModel,
        make: truck.make,
        wheelCount: truck.wheelCount,
        truckType: truck.truckType,
        crIssueDate: new Date(truck.crIssueDate),
        firstRegistrationDate: new Date(truck.firstRegistrationDate),
        isActive: truck.isActive,
      },
    });
  }
  console.log(`  ${trucks.length} trucks`);

  console.log("Seeding destination routes…");
  let seededRoutes = 0;
  for (const rate of destinationRates) {
    const clientId = clientIdByName.get(rate.client);
    if (!clientId) continue;

    await prisma.destinationRoute.create({
      data: {
        clientId,
        routeName: rate.routeName,
        distance: rate.distance,
        driverBaseRate: rate.driverBaseRate,
        helperBaseRate: rate.helperBaseRate,
        extraHelperBaseRate: rate.extraHelperBaseRate,
      },
    });
    seededRoutes += 1;
  }
  console.log(`  ${seededRoutes} routes`);

  console.log("Seeding mock shipments…");
  const [dbEmployees, dbTrucks] = await Promise.all([
    prisma.employee.findMany({ select: { id: true, fullName: true } }),
    prisma.truck.findMany({ select: { id: true, plateNumber: true } }),
  ]);

  const employeeIdByName = new Map(
    dbEmployees.map((employee) => [employee.fullName, employee.id])
  );
  const truckIdByPlate = new Map(
    dbTrucks.map((truck) => [truck.plateNumber, truck.id])
  );

  let seededShipments = 0;
  for (const shipment of shipments) {
    const clientId = clientIdByName.get(shipment.client);
    if (!clientId) {
      console.warn(`  Skipping ${shipment.shipmentNumber}: unknown client`);
      continue;
    }

    const rate = resolveShipmentRate(
      shipment.client,
      shipment.farthestRoute,
      shipment.distanceBand
    );
    if (!rate) {
      console.warn(
        `  Skipping ${shipment.shipmentNumber}: no rate for ${shipment.farthestRoute}`
      );
      continue;
    }

    const payout = calculateDestinationPayout({
      client: shipment.client as DestinationClient,
      routeName: shipment.farthestRoute,
      distance: rate.distance,
      hasExtraHelper: Boolean(shipment.extraHelper),
    });
    if (!payout) {
      console.warn(`  Skipping ${shipment.shipmentNumber}: payout calculation failed`);
      continue;
    }

    await prisma.shipmentLog.create({
      data: {
        id: shipment.id,
        date: new Date(shipment.date),
        plateNumber: shipment.plateNumber,
        truckId: truckIdByPlate.get(shipment.plateNumber) ?? null,
        shipmentNumber: shipment.shipmentNumber,
        clientNumber: shipment.clientNumber || null,
        waybillNumber: shipment.waybillNumber || null,
        routeName: rate.routeName,
        distance: rate.distance || null,
        driverName: shipment.driver,
        driverId: employeeIdByName.get(shipment.driver) ?? null,
        helperName: shipment.helper || null,
        helperId: shipment.helper
          ? (employeeIdByName.get(shipment.helper) ?? null)
          : null,
        hasExtraHelper: Boolean(shipment.extraHelper),
        extraHelperName: shipment.extraHelper,
        extraHelperNote: shipment.extraHelper
          ? shipment.extraHelperNote?.trim() || null
          : null,
        driverPayout: payout.driverPayout,
        helperPayout: payout.helperPayout,
        extraHelperPayout: payout.extraHelperPayout,
        remarks: shipment.remarks?.trim() || null,
        isFlagged: shipment.flagged,
        isApproved: shipment.approved,
        clientId,
        createdById: shipment.uploadedByUserId,
      },
    });
    seededShipments += 1;
  }
  console.log(`  ${seededShipments} shipments`);

  const [clientCount, employeeCount, truckCount, routeCount, shipmentCount] =
    await Promise.all([
      prisma.client.count(),
      prisma.employee.count(),
      prisma.truck.count(),
      prisma.destinationRoute.count(),
      prisma.shipmentLog.count(),
    ]);

  console.log("\nSeed complete:");
  console.log(
    JSON.stringify(
      {
        clients: clientCount,
        employees: employeeCount,
        trucks: truckCount,
        routes: routeCount,
        shipments: shipmentCount,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
