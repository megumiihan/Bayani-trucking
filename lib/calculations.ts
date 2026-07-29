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
