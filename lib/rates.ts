import {
  DESTINATION_CLIENT_NAMES,
  type DestinationClientName,
} from "./clients";
import { generatedDestinationRates } from "./destinationRates.generated";
import { roadwiseDestinationRates } from "./roadwiseRates";

export type DestinationClient = DestinationClientName;
export type { DestinationClientName };

export interface DestinationRouteRate {
  id: string;
  client: DestinationClient;
  routeName: string;
  /** Distance band from rate sheet, e.g. "1-120KM". Empty for Big Mak area routes. */
  distance: string;
  driverBaseRate: number;
  helperBaseRate: number;
  extraHelperBaseRate: number;
  description?: string;
}

export const DESTINATION_CLIENTS: DestinationClientName[] = [
  ...DESTINATION_CLIENT_NAMES,
] as DestinationClientName[];

/** Pepsi distance-band tiers (from rate sheet) */
export const PEPSI_DISTANCE_TIERS = {
  "1-120KM": { driver: 500, helper: 400, extraHelper: 400 },
  "121-200KM": { driver: 650, helper: 450, extraHelper: 450 },
  "201-260KM": { driver: 800, helper: 500, extraHelper: 500 },
} as const;

export const destinationRates: DestinationRouteRate[] = [
  ...(generatedDestinationRates as Omit<DestinationRouteRate, "description">[]),
  ...roadwiseDestinationRates,
].map((rate) => ({
  ...rate,
  description: formatRouteDescription(rate),
}));

function formatRouteDescription(rate: DestinationRouteRate): string {
  if (rate.distance) {
    return `${rate.routeName} (${rate.distance})`;
  }
  return rate.routeName;
}

export function formatRouteLabel(rate: DestinationRouteRate): string {
  if (rate.distance) {
    return `${rate.routeName} — ${rate.distance}`;
  }
  return rate.routeName;
}

export function getRoutesForClient(client: DestinationClient): DestinationRouteRate[] {
  return destinationRates.filter((rate) => rate.client === client);
}

/** Unique farthest route names for dropdowns (distance excluded from UI). */
export function getUniqueRouteNamesForClient(
  client: DestinationClient
): string[] {
  const names = new Set(
    destinationRates
      .filter((rate) => rate.client === client)
      .map((rate) => rate.routeName)
  );
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

const DISTANCE_BAND_ORDER = ["1-120KM", "121-200KM", "201-260KM", ""];

/**
 * Default rate for a route when distance band is not yet assigned.
 * Uses the only matching entry, or the nearest (shortest) band when multiple exist.
 */
export function getDefaultRouteRate(
  client: DestinationClient,
  routeName: string
): DestinationRouteRate | undefined {
  const matches = destinationRates.filter(
    (rate) => rate.client === client && rate.routeName === routeName
  );
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];

  return [...matches].sort(
    (a, b) =>
      DISTANCE_BAND_ORDER.indexOf(a.distance) -
      DISTANCE_BAND_ORDER.indexOf(b.distance)
  )[0];
}

export function getDestinationRouteById(id: string): DestinationRouteRate | undefined {
  return destinationRates.find((rate) => rate.id === id);
}

export function getDestinationRoute(
  client: DestinationClient,
  routeName: string,
  distance = ""
): DestinationRouteRate | undefined {
  const exact = destinationRates.find(
    (rate) =>
      rate.client === client &&
      rate.routeName === routeName &&
      rate.distance === distance
  );
  if (exact) return exact;

  const matches = destinationRates.filter(
    (rate) => rate.client === client && rate.routeName === routeName
  );
  if (matches.length === 1) return matches[0];

  return undefined;
}

/** Resolve legacy short route names from early mock data */
const LEGACY_ROUTE_ALIASES: Record<
  string,
  { client: DestinationClient; routeName: string; distance: string }
> = {
  Tuguegarao: {
    client: "Pepsi",
    routeName: "TUGUEGARAO CITY, CAGAYAN",
    distance: "121-200KM",
  },
  Ilagan: {
    client: "Pepsi",
    routeName: "ILAGAN CITY, ISABELA",
    distance: "1-120KM",
  },
  Santiago: {
    client: "Pepsi",
    routeName: "SANTIAGO CITY, ISABELA",
    distance: "1-120KM",
  },
  Solano: {
    client: "Pepsi",
    routeName: "SOLANO, NUEVA VIZCAYA",
    distance: "201-260KM",
  },
};

export function resolveShipmentRate(
  client: string,
  routeName: string,
  distanceBand: string | null | undefined
): DestinationRouteRate | undefined {
  if (distanceBand) {
    const byExact = getDestinationRoute(
      client as DestinationClient,
      routeName,
      distanceBand
    );
    if (byExact) return byExact;
  }

  const defaultRate = getDefaultRouteRate(
    client as DestinationClient,
    routeName
  );
  if (defaultRate) return defaultRate;

  const alias = LEGACY_ROUTE_ALIASES[routeName];
  if (alias && alias.client === client) {
    return getDestinationRoute(alias.client, alias.routeName, alias.distance);
  }

  return undefined;
}

export function getExtraHelperRateForClient(rate: DestinationRouteRate): number {
  return rate.extraHelperBaseRate;
}
