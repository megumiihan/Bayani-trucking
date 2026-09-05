export const DEFAULT_PLATFORM_SHARE = 0.2;
export const DEFAULT_PLATFORM_DRIVER_RATE = 0.17;
export const DEFAULT_PLATFORM_HELPER_RATE = 0.12;

export function parsePlatformRate(value: unknown): number | null {
  const rate = typeof value === "string" ? Number(value) : value;
  if (rate == null || typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    return null;
  }
  return rate;
}

/** Admin UI percents (20) → stored fraction (0.2). */
export function parsePercentToFraction(value: unknown): number | null {
  const percent = typeof value === "string" ? Number(value) : value;
  if (
    percent == null ||
    typeof percent !== "number" ||
    !Number.isFinite(percent) ||
    percent < 0 ||
    percent > 100
  ) {
    return null;
  }
  return percent / 100;
}

export function fractionToPercentInput(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return String(Number((value * 100).toFixed(4)));
}
