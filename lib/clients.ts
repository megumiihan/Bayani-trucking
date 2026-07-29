export type CalculationType =
  | "Destination"
  | "Weight"
  | "AnimalHeadcount"
  | "Platform";

/** Prisma `CalculationType` enum values (SCREAMING_SNAKE_CASE). */
export type PrismaCalculationType =
  | "DESTINATION"
  | "WEIGHT"
  | "ANIMAL_HEADCOUNT"
  | "PLATFORM";

/** App CalculationType → Prisma enum */
export const CALCULATION_TYPE_TO_PRISMA: Record<
  CalculationType,
  PrismaCalculationType
> = {
  Destination: "DESTINATION",
  Weight: "WEIGHT",
  AnimalHeadcount: "ANIMAL_HEADCOUNT",
  Platform: "PLATFORM",
};

/** Prisma enum → app CalculationType */
export const PRISMA_TO_CALCULATION_TYPE: Record<
  PrismaCalculationType,
  CalculationType
> = {
  DESTINATION: "Destination",
  WEIGHT: "Weight",
  ANIMAL_HEADCOUNT: "AnimalHeadcount",
  PLATFORM: "Platform",
};

export function toPrismaCalculationType(
  type: CalculationType
): PrismaCalculationType {
  return CALCULATION_TYPE_TO_PRISMA[type];
}

export function fromPrismaCalculationType(
  type: PrismaCalculationType
): CalculationType {
  return PRISMA_TO_CALCULATION_TYPE[type];
}

export interface Client {
  id: string;
  name: string;
  calculationType: CalculationType;
}

export const clients: Client[] = [
  {
    id: "CLI-PEPSI-001",
    name: "Pepsi",
    calculationType: "Destination",
  },
  {
    id: "CLI-BIGMAK-001",
    name: "Big Mak",
    calculationType: "Destination",
  },
  {
    id: "CLI-ROADWISE-001",
    name: "Roadwise",
    calculationType: "Destination",
  },
  {
    id: "CLI-BOUNTY-001",
    name: "Bounty",
    calculationType: "Weight",
  },
  {
    id: "CLI-CHAROEN-001",
    name: "Charoen",
    calculationType: "AnimalHeadcount",
  },
  {
    id: "CLI-MOBERS-001",
    name: "Mobers",
    calculationType: "Platform",
  },
];

/** Clients that use destination + farthest route rate tables. */
export const DESTINATION_CLIENT_NAMES = clients
  .filter((client) => client.calculationType === "Destination")
  .map((client) => client.name);

export type DestinationClientName = "Pepsi" | "Big Mak" | "Roadwise";

export function getClientById(clientId: string): Client | undefined {
  return clients.find((client) => client.id === clientId);
}

export function getClientByName(name: string): Client | undefined {
  return clients.find((client) => client.name === name);
}

export function isDestinationClient(name: string): name is DestinationClientName {
  const client = getClientByName(name);
  return client?.calculationType === "Destination";
}

export function getCalculationTypeLabel(type: CalculationType): string {
  const labels: Record<CalculationType, string> = {
    Destination: "Destination",
    Weight: "Weight",
    AnimalHeadcount: "Animal Headcount",
    Platform: "Platform",
  };
  return labels[type];
}
