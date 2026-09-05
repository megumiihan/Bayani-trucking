export const LIVESTOCK_MAX_HEADS = 200;

/** Seed / default farthest routes for livestock clients. Live lookups use DestinationRoute. */
export const livestockDestinationRates = [
  {
    client: "Charoen",
    routeName: "AURORA, CABATUAN",
    distance: "",
    driverBaseRate: 700,
    helperBaseRate: 700,
    extraHelperBaseRate: 700,
  },
  {
    client: "Charoen",
    routeName: "AURORA, CABATUAN, SAN ISIDRO",
    distance: "",
    driverBaseRate: 700,
    helperBaseRate: 700,
    extraHelperBaseRate: 700,
  },
] as const;

export function parsePighead(value: number | string | null | undefined) {
  const pighead = typeof value === "string" ? Number(value) : value;
  if (
    pighead == null ||
    !Number.isInteger(pighead) ||
    pighead < 1 ||
    pighead > LIVESTOCK_MAX_HEADS
  ) {
    return null;
  }
  return pighead;
}
