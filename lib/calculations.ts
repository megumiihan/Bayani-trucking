import { parsePighead } from "./livestock";
import { parsePlatformRate } from "./platform";
import { isNewBountyExp } from "./weight";
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

export interface PlatformPayoutInput {
  platformRate: number;
  platformShare: number;
  platformDriverRate: number;
  platformHelperRate: number;
  hasExtraHelper: boolean;
}

/**
 * Platform payouts: (rate − rate × platform share) × role rate.
 * Extra helper uses the helper rate.
 */
export function calculatePlatformPayout({
  platformRate,
  platformShare,
  platformDriverRate,
  platformHelperRate,
  hasExtraHelper,
}: PlatformPayoutInput): DestinationPayoutResult | null {
  const rate = parsePlatformRate(platformRate);
  if (rate == null) return null;
  if (!Number.isFinite(platformShare) || platformShare < 0 || platformShare > 1) {
    return null;
  }
  if (
    !Number.isFinite(platformDriverRate) ||
    platformDriverRate < 0 ||
    platformDriverRate > 1
  ) {
    return null;
  }
  if (
    !Number.isFinite(platformHelperRate) ||
    platformHelperRate < 0 ||
    platformHelperRate > 1
  ) {
    return null;
  }

  const afterShare = rate - rate * platformShare;
  const driverPayout = afterShare * platformDriverRate;
  const helperPayout = afterShare * platformHelperRate;

  return {
    driverPayout,
    helperPayout,
    extraHelperPayout: hasExtraHelper ? helperPayout : 0,
  };
}

export interface WeightPayoutInput {
  helperRate: number;
  driverRate: number;
  sameDriverRate: number;
  newHelperRate: number;
  newDriverRate: number;
  driverExp: string | null;
  helperExp: string | null;
  extraHelperExp?: string | null;
  driverAsHelper: boolean;
  samePerson: boolean;
  hasExtraHelper: boolean;
}

function weightRoleRate(
  rates: Pick<
    WeightPayoutInput,
    | "helperRate"
    | "driverRate"
    | "sameDriverRate"
    | "newHelperRate"
    | "newDriverRate"
  >,
  role: "driver" | "helper",
  exp: string | null,
  driverAsHelper: boolean
) {
  const isNew = isNewBountyExp(exp);
  if (driverAsHelper) {
    return rates.sameDriverRate;
  }
  if (role === "driver") return isNew ? rates.newDriverRate : rates.driverRate;
  return isNew ? rates.newHelperRate : rates.helperRate;
}

/**
 * Weight-based payouts (Bounty): route + kg tier, then old/new bounty
 * experience. Same-driver rate wins whenever the helper is a driver.
 */
export function calculateWeightPayout({
  helperRate,
  driverRate,
  sameDriverRate,
  newHelperRate,
  newDriverRate,
  driverExp,
  helperExp,
  extraHelperExp,
  driverAsHelper,
  samePerson,
  hasExtraHelper,
}: WeightPayoutInput): DestinationPayoutResult | null {
  const rates = {
    helperRate,
    driverRate,
    sameDriverRate,
    newHelperRate,
    newDriverRate,
  };
  const values = Object.values(rates);
  if (values.some((value) => !Number.isFinite(value) || value < 0)) return null;

  const driverPayout = weightRoleRate(rates, "driver", driverExp, driverAsHelper);
  const helperPayout =
    driverAsHelper && samePerson
      ? 0
      : weightRoleRate(rates, "helper", helperExp, driverAsHelper);
  const extraHelperPayout = hasExtraHelper
    ? weightRoleRate(rates, "helper", extraHelperExp ?? null, false)
    : 0;

  return { driverPayout, helperPayout, extraHelperPayout };
}
