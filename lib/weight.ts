export const BOUNTY_EXP_OLD = "oldbounty";
export const BOUNTY_EXP_NEW = "newbounty";
export const WEIGHT_TIER_KGS = [2000, 3000, 4000] as const;

/** Seed rows for Bounty. Written to DestinationRoute. */
export const bountyWeightRates = [
  {
    client: "Bounty",
    routeName: "DOWNSTREAM/ PICK UP / BLASTING (DESTINATION)",
    distance: "1-120KM",
    weightKg: 2000,
    helperRate: 2025,
    driverRate: 2475,
    sameDriverRate: 2250,
    newHelperRate: 2000,
    newDriverRate: 2250,
  },
  {
    client: "Bounty",
    routeName: "DOWNSTREAM/ PICK UP / BLASTING (DESTINATION)",
    distance: "1-120KM",
    weightKg: 3000,
    helperRate: 2700,
    driverRate: 3300,
    sameDriverRate: 3000,
    newHelperRate: 2500,
    newDriverRate: 3000,
  },
  {
    client: "Bounty",
    routeName: "DOWNSTREAM/ PICK UP / BLASTING (DESTINATION)",
    distance: "1-120KM",
    weightKg: 4000,
    helperRate: 3600,
    driverRate: 4400,
    sameDriverRate: 4000,
    newHelperRate: 3000,
    newDriverRate: 4000,
  },
  {
    client: "Bounty",
    routeName: "CENTRAL TUMAUINI/ BAGGAO",
    distance: "",
    weightKg: 2000,
    helperRate: 1000,
    driverRate: 1400,
    sameDriverRate: 1250,
    newHelperRate: 1000,
    newDriverRate: 1400,
  },
  {
    client: "Bounty",
    routeName: "CENTRAL TUMAUINI/ BAGGAO",
    distance: "",
    weightKg: 3000,
    helperRate: 1300,
    driverRate: 1700,
    sameDriverRate: 1500,
    newHelperRate: 1100,
    newDriverRate: 1700,
  },
  {
    client: "Bounty",
    routeName: "CENTRAL TUMAUINI/ BAGGAO",
    distance: "",
    weightKg: 4000,
    helperRate: 1600,
    driverRate: 2400,
    sameDriverRate: 2000,
    newHelperRate: 1400,
    newDriverRate: 2000,
  },
  {
    client: "Bounty",
    routeName: "BLASTING/PICK UP ROYALE PLARIDEL",
    distance: "",
    weightKg: 4000,
    helperRate: 2025,
    driverRate: 2475,
    sameDriverRate: 2250,
    newHelperRate: 2000,
    newDriverRate: 2475,
  },
] as const;

export function parseWeightKg(value: unknown): number | null {
  const kg = typeof value === "string" ? Number(value) : value;
  if (kg !== 2000 && kg !== 3000 && kg !== 4000) return null;
  return kg;
}

export function isNewBountyExp(tag: string | null | undefined) {
  return Boolean(tag && tag !== BOUNTY_EXP_OLD);
}

export function uniqueWeightRouteNames(
  routes: { routeName: string }[]
) {
  return [...new Set(routes.map((route) => route.routeName))];
}

export function weightTiersForRoute(
  routes: { routeName: string; weightKg?: number | null }[],
  routeName: string
) {
  return routes
    .filter((route) => route.routeName === routeName && route.weightKg != null)
    .map((route) => route.weightKg as number)
    .sort((a, b) => a - b);
}
