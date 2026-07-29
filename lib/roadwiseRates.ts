import type { DestinationRouteRate } from "./rates";

/** Roadwise farthest routes — fixed driver/helper rates (no distance bands). */
export const roadwiseDestinationRates: Omit<
  DestinationRouteRate,
  "description"
>[] = [
  {
    id: "roadwise-pmftc-dry-regional",
    client: "Roadwise",
    routeName: "PMFTC DRY- ILAGAN, TUMAUINI, ROXAS, CABATUAN, SANTIAGO",
    distance: "",
    driverBaseRate: 500,
    helperBaseRate: 400,
    extraHelperBaseRate: 400,
  },
  {
    id: "roadwise-pmftc-dry-far",
    client: "Roadwise",
    routeName: "PMFTC DRY- SOLANO, TUGUEGARAO, QUIRINO",
    distance: "",
    driverBaseRate: 700,
    helperBaseRate: 500,
    extraHelperBaseRate: 500,
  },
  {
    id: "roadwise-frozen-regional",
    client: "Roadwise",
    routeName: "FROZEN- CAUAYAN, ILAGAN, TUMAUINI, ROXAS, CABATUAN, SANTIAGO",
    distance: "",
    driverBaseRate: 800,
    helperBaseRate: 500,
    extraHelperBaseRate: 500,
  },
  {
    id: "roadwise-frozen-far",
    client: "Roadwise",
    routeName: "FROZEN- SOLANO, TUGUEGARAO, QUIRINO",
    distance: "",
    driverBaseRate: 1000,
    helperBaseRate: 700,
    extraHelperBaseRate: 700,
  },
];
