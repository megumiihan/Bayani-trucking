export type CalculationType =
  | "Destination"
  | "Weight"
  | "Livestock"
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
  Livestock: "ANIMAL_HEADCOUNT",
  Platform: "PLATFORM",
};

/** Prisma enum → app CalculationType */
export const PRISMA_TO_CALCULATION_TYPE: Record<
  PrismaCalculationType,
  CalculationType
> = {
  DESTINATION: "Destination",
  WEIGHT: "Weight",
  ANIMAL_HEADCOUNT: "Livestock",
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
  pigheadDriverRate?: number | null;
  pigheadHelperRate?: number | null;
  platformShare?: number | null;
  platformDriverRate?: number | null;
  platformHelperRate?: number | null;
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
    calculationType: "Livestock",
    pigheadDriverRate: 25,
    pigheadHelperRate: 25,
  },
  {
    id: "CLI-MOBERS-001",
    name: "Mobers",
    calculationType: "Platform",
    platformShare: 0.2,
    platformDriverRate: 0.17,
    platformHelperRate: 0.12,
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

export function isLivestockClient(
  client: Pick<Client, "calculationType"> | string | null | undefined
) {
  if (!client) return false;
  if (typeof client === "string") {
    return getClientByName(client)?.calculationType === "Livestock";
  }
  return client.calculationType === "Livestock";
}

export function isPlatformClient(
  client: Pick<Client, "calculationType"> | string | null | undefined
) {
  if (!client) return false;
  if (typeof client === "string") {
    return getClientByName(client)?.calculationType === "Platform";
  }
  return client.calculationType === "Platform";
}

export function getCalculationTypeLabel(type: CalculationType) {
  const labels: Record<CalculationType, string> = {
    Destination: "Destination",
    Weight: "Weight",
    Livestock: "Livestock",
    Platform: "Platform",
  };
  return labels[type];
}
