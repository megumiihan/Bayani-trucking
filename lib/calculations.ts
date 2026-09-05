import { parsePighead } from "./livestock";
import {
  getDestinationRoute,
  getDestinationRouteById,
  resolveShipmentRate,
  getExtraHelperRateForClient,
  type DestinationClient,
} from "./rates";

export interface DestinationPayoutInput {
  client: DestinationClient;
  routeName: string;
  distance?: string;
  routeId?: string;
  hasExtraHelper: boolean;
}

export interface DestinationPayoutResult {
  driverPayout: number;
  helperPayout: number;
  extraHelperPayout: number;
}

/**
 * Calculates destination-based payouts for Pepsi, Big Mak, and Roadwise.
 *
 * Business rules:
 * - Driver and helper payouts come from the client + destination (+ distance band) rate table.
 * - Extra helper: when toggled, uses the route's additional helper rate from the sheet.
 */
export function calculateDestinationPayout({
  client,
  routeName,
  distance = "",
  routeId,
  hasExtraHelper,
}: DestinationPayoutInput): DestinationPayoutResult | null {
  const rate = routeId
    ? getDestinationRouteById(routeId)
    : resolveShipmentRate(client, routeName, distance) ??
      getDestinationRoute(client, routeName, distance);

  if (!rate) return null;

  const extraHelperPayout = hasExtraHelper
    ? getExtraHelperRateForClient(rate)
    : 0;

  return {
    driverPayout: rate.driverBaseRate,
    helperPayout: rate.helperBaseRate,
    extraHelperPayout,
  };
}

export interface LivestockPayoutInput {
  pighead: number;
  driverBase: number;
  helperBase: number;
  driverRate: number;
  helperRate: number;
  hasExtraHelper: boolean;
}

/**
 * Livestock payouts: role base + (heads × that role's per-head rate).
 * Extra helper uses the helper base and helper per-head rate.
 */
export function calculateLivestockPayout({
  pighead,
  driverBase,
  helperBase,
  driverRate,
  helperRate,
  hasExtraHelper,
}: LivestockPayoutInput): DestinationPayoutResult | null {
  const heads = parsePighead(pighead);
  if (heads == null) return null;
  if (!Number.isFinite(driverBase) || driverBase < 0) return null;
  if (!Number.isFinite(helperBase) || helperBase < 0) return null;
  if (!Number.isFinite(driverRate) || driverRate < 0) return null;
  if (!Number.isFinite(helperRate) || helperRate < 0) return null;

  const driverPayout = driverBase + heads * driverRate;
  const helperPayout = helperBase + heads * helperRate;

  return {
    driverPayout,
    helperPayout,
    extraHelperPayout: hasExtraHelper ? helperPayout : 0,
  };
}
